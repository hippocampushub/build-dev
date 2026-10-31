"""Offline pipeline: fetch the .mod file lists of the ModelDB models.

Works on the models in data/modeldb/models.json (run fetch_all.py modeldb first)
and fills cache/modeldb_files.json, which fetch_all.py then uses. Each run
processes the models that have no list yet, an outdated one, or one taken from
a zip, and saves after every model, so it can be stopped and resumed and run
from cron (e.g. hourly, to stay within the anonymous GitHub API quota).

    python fetch_model_files.py --limit 3          # test on the first three models
    python fetch_model_files.py                    # as many as the GitHub quota allows
    python fetch_model_files.py --ask-token        # type a GitHub token (hidden); all models in one run
    GITHUB_TOKEN=... python fetch_model_files.py   # same, token from the environment
    python fetch_model_files.py --allow-zip        # use ModelDB zips when GitHub is unavailable
    python fetch_model_files.py --download files   # also save the .mod files locally
    python fetch_model_files.py --ids 2796 87284   # only these models

At the end the lists are written into data/modeldb/models.json, so the site
(serve.py) shows them right away; fetch_all.py modeldb also reads them from
the cache on its next run.

GitHub token: a fine-grained personal access token with read access to public
repositories is enough (github.com/settings/personal-access-tokens, no extra
permissions). It raises the API limit from 60 to 5000 calls per hour. The
token is only sent to api.github.com and is never printed or saved.
"""
import argparse
import getpass
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path

from providers.http import create_session
from providers.modeldb_files import GitHubTokenInvalid, apply_cache, github_quota, update

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--limit", type=int, help="process at most N models")
    parser.add_argument("--ids", nargs="+", help="only these ModelDB model ids")
    parser.add_argument("--allow-zip", action="store_true",
                        help="fall back to the ModelDB zip when GitHub is unavailable (downloads whole zips)")
    parser.add_argument("--download", metavar="DIR", help="also save the .mod files under DIR/<model id>/")
    parser.add_argument("--data", default=str(ROOT / "data"), help="output folder of fetch_all.py")
    parser.add_argument("--ask-token", action="store_true",
                        help="prompt for a GitHub token (input hidden) instead of reading GITHUB_TOKEN")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    logging.getLogger("urllib3").setLevel(logging.WARNING)

    if args.ask_token:
        token = getpass.getpass("GitHub token (input hidden, empty = anonymous): ").strip()
        if token:
            os.environ["GITHUB_TOKEN"] = token  # only for this process
    try:
        limit, remaining, reset = github_quota()
    except GitHubTokenInvalid:
        sys.exit("GitHub rejected the token (401). Check that it is valid and not expired.")
    logging.info("GitHub API: %s, %d of %d calls left this hour (resets at %s)",
                 "token" if os.getenv("GITHUB_TOKEN") else "anonymous", remaining, limit,
                 datetime.fromtimestamp(reset).strftime("%H:%M"))

    models_file = Path(args.data) / "modeldb" / "models.json"
    try:
        models = json.loads(models_file.read_text())
    except FileNotFoundError:
        sys.exit(f"{models_file} not found: run `python fetch_all.py modeldb` first")
    if args.ids:
        models = [m for m in models if m["id"] in set(args.ids)]

    try:
        counts = update(create_session(), models, limit=args.limit, allow_zip=args.allow_zip,
                        download_dir=args.download)
    except GitHubTokenInvalid:
        sys.exit("GitHub rejected the token (401) during the run; lists fetched so far are saved.")
    logging.info("done: %s", counts)
    with_lists = apply_cache(models_file)
    logging.info("%s updated: %d of %d models have a .mod file list", models_file, with_lists,
                 len(json.loads(models_file.read_text())))
    return 1 if counts["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
