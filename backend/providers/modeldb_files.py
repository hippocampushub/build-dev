"""ModelDB .mod file lists: the offline part of the ModelDB pipeline.

Listing a model's files is the expensive step, so it is not done by
fetch_all.py. fetch_model_files.py fills cache/modeldb_files.json a batch at a
time, and fetch_all.py only reads that cache.

Sources, in order:
1. GitHub repository github.com/ModelDBRepository/<id> (linked from each ModelDB
   page). One API call lists all files; the files themselves are served by
   raw.githubusercontent.com, which has no rate limit. The API allows 60 calls
   per hour anonymously, 5000 with GITHUB_TOKEN.
2. Optionally (allow_zip) the official ModelDB zip, modeldb.science/download/<id>,
   when the GitHub quota is used up or there is no repository. This downloads
   the whole zip (3.5 MB on average).

A cache entry is valid while the model's ModelDB version date (ver_date) is
unchanged.
"""
import json
import logging
import os
import tempfile
import zipfile
from pathlib import Path
from urllib.parse import quote, urlencode

import requests

from .http import TIMEOUT

log = logging.getLogger("hh.modeldb_files")

BASE_URL = "https://modeldb.science"
GITHUB_API = "https://api.github.com/repos/ModelDBRepository"
GITHUB_RAW = "https://raw.githubusercontent.com/ModelDBRepository"
CACHE_FILE = Path(__file__).resolve().parent.parent / "cache" / "modeldb_files.json"


class GitHubQuotaExceeded(Exception):
    pass


def list_files(paths, url_for):
    """Pick the README and the .mod files out of a list of repository paths."""
    readme, mod_files = None, []
    for path in sorted(paths):
        filename = path.rsplit("/", 1)[-1]
        if not filename or path.startswith("__MACOSX/"):
            continue
        if readme is None and filename.lower().startswith("readme"):
            readme = url_for(path)
        if filename.lower().endswith(".mod"):
            mod_files.append({"label": filename, "path": path, "url": url_for(path)})
    return readme, mod_files


class GitHubTokenInvalid(Exception):
    pass


def github_headers():
    headers = {"Accept": "application/vnd.github+json"}
    if os.getenv("GITHUB_TOKEN"):
        headers["Authorization"] = f"Bearer {os.getenv('GITHUB_TOKEN')}"
    return headers


def github_quota():
    """(limit, remaining, reset epoch) of the GitHub core API for the current token (or anonymous)."""
    response = requests.get("https://api.github.com/rate_limit", headers=github_headers(), timeout=TIMEOUT)
    if response.status_code == 401:
        raise GitHubTokenInvalid()
    response.raise_for_status()
    core = response.json()["resources"]["core"]
    return core["limit"], core["remaining"], core["reset"]


def get_github_files(model_id):
    """(readme_link, [mod files]) from the GitHub mirror, or None if there is no repository."""
    headers = github_headers()
    # Plain requests (no retry session): a 403/429 means the quota is used up, retrying only wastes time
    response = requests.get(f"{GITHUB_API}/{model_id}/git/trees/HEAD", params={"recursive": 1},
                            headers=headers, timeout=TIMEOUT)
    if response.status_code == 401:
        raise GitHubTokenInvalid()
    if response.status_code in (403, 429) and response.headers.get("X-RateLimit-Remaining") == "0":
        raise GitHubQuotaExceeded()
    if response.status_code != 200:
        log.warning("GitHub files for model %s: HTTP %s", model_id, response.status_code)
        return None
    paths = [t["path"] for t in response.json().get("tree", []) if t["type"] == "blob"]
    return list_files(paths, lambda path: f"{GITHUB_RAW}/{model_id}/HEAD/{quote(path)}")


def get_zip_files(session, model_id):
    """(readme_link, [mod files]) from the official ModelDB zip, or None on failure."""
    try:
        with tempfile.TemporaryFile() as tmp:
            with session.get(f"{BASE_URL}/download/{model_id}", stream=True, timeout=TIMEOUT) as response:
                response.raise_for_status()
                for chunk in response.iter_content(1 << 20):
                    tmp.write(chunk)
            names_in_zip = zipfile.ZipFile(tmp).namelist()
    except (requests.RequestException, zipfile.BadZipFile) as ex:
        log.warning("zip files for model %s: %s", model_id, ex)
        return None
    return list_files(names_in_zip,
                      lambda path: f"{BASE_URL}/getModelFile?{urlencode({'model': model_id, 'file': path})}")


def load_cache(path=CACHE_FILE):
    try:
        return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_cache(entries, path=CACHE_FILE):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(entries, indent=1))
    tmp.replace(path)


def cached_files(entries, model_id, ver_date):
    """(readme_link, model_files) if the cache is up to date for this model version, else (None, None)."""
    entry = entries.get(str(model_id))
    if entry and entry["ver_date"] == ver_date:
        return entry["readme_link"], entry["model_files"]
    return None, None


def needs_update(entries, model_id, ver_date):
    """Missing, outdated, or only from a zip (upgraded to GitHub links when quota allows)."""
    entry = entries.get(str(model_id))
    return not entry or entry["ver_date"] != ver_date or entry.get("origin") != "github"


def update(session, models, limit=None, allow_zip=False, download_dir=None):
    """Fetch file lists for up to `limit` models that need it; save after each model.

    models: [{"id": ..., "updated": <ver_date>}, ...] (records of data/modeldb/models.json).
    Returns counts per outcome.
    """
    entries = load_cache()
    todo = [m for m in models if needs_update(entries, m["id"], m.get("updated"))]
    if limit is not None:
        todo = todo[:limit]
    log.info("%d models need a file list, processing %d", sum(
        needs_update(entries, m["id"], m.get("updated")) for m in models), len(todo))
    counts = {"github": 0, "zip": 0, "failed": 0, "skipped": 0}
    github_available = True
    for model in todo:
        model_id, ver_date = model["id"], model.get("updated")
        result, origin = None, None
        if github_available:
            try:
                result, origin = get_github_files(model_id), "github"
            except GitHubQuotaExceeded:
                github_available = False
                log.warning("GitHub API quota used up%s", "; using ModelDB zips" if allow_zip
                            else "; run again later or set GITHUB_TOKEN")
        if result is None and allow_zip:
            result, origin = get_zip_files(session, model_id), "zip"
        if result is None:
            counts["skipped" if not github_available and not allow_zip else "failed"] += 1
            if not github_available and not allow_zip:
                break
            continue
        readme, mod_files = result
        entries[str(model_id)] = {"ver_date": ver_date, "origin": origin,
                                  "readme_link": readme, "model_files": mod_files}
        save_cache(entries)
        counts[origin] += 1
        log.info("model %s: %d .mod files (%s)", model_id, len(mod_files), origin)
        if download_dir:
            download_files(session, model_id, mod_files, Path(download_dir))
    return counts


def apply_cache(models_file):
    """Write the cached lists into models.json (no network). Returns the number of models with a list."""
    entries = load_cache()
    models = json.loads(models_file.read_text())
    for model in models:
        readme, mod_files = cached_files(entries, model["id"], model.get("updated"))
        model["readme_link"], model["model_files"] = readme, mod_files
    tmp = models_file.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(models, ensure_ascii=False, indent=2))
    tmp.replace(models_file)
    return sum(1 for m in models if m["model_files"] is not None)


def download_files(session, model_id, mod_files, download_dir):
    """Save the .mod files under <download_dir>/<model id>/<path>."""
    for f in mod_files:
        target = download_dir / str(model_id) / f["path"]
        if target.exists():
            continue
        try:
            response = session.get(f["url"], timeout=TIMEOUT)
            response.raise_for_status()
        except requests.RequestException as ex:
            log.warning("download %s: %s", f["url"], ex)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(response.content)
