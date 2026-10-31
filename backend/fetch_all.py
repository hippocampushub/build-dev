"""Fetch hippocampal data from the external sources and write it as JSON files.

    python fetch_all.py                       # all sources into ./data
    python fetch_all.py neuromorpho modeldb   # only some sources
    python fetch_all.py --out /some/dir --raw # also keep the unmapped API responses

Output layout:
    <out>/manifest.json
    <out>/<source>/<collection>.json          # mapped records (uniform format)
    <out>/<source>/raw/<collection>.json      # with --raw
"""
import argparse
import json
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from providers import PROVIDERS
from providers.http import create_session

log = logging.getLogger("hh")


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    tmp.replace(path)


def load_manifest(path):
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"sources": {}}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("sources", nargs="*", choices=list(PROVIDERS),
                        help=f"sources to fetch (default: all of {', '.join(PROVIDERS)})")
    parser.add_argument("--out", default=str(Path(__file__).resolve().parent / "data"), help="output folder")
    parser.add_argument("--raw", action="store_true", help="also save the raw API responses")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    logging.getLogger("urllib3").setLevel(logging.WARNING)

    out = Path(args.out)
    manifest_path = out / "manifest.json"
    session = create_session()
    failed = []

    for name in args.sources or PROVIDERS:
        provider = PROVIDERS[name]
        log.info("=== %s", name)
        started = time.monotonic()
        try:
            collections = provider.fetch(session)
        except Exception:
            log.exception("%s failed, previous files left untouched", name)
            failed.append(name)
            continue
        entry = {"source": provider.SOURCE,
                 "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                 "duration_seconds": round(time.monotonic() - started, 1),
                 "collections": {}}
        for collection, result in collections.items():
            path = out / name / f"{collection}.json"
            write_json(path, result["records"])
            if args.raw:
                write_json(out / name / "raw" / f"{collection}.json", result["raw"])
            entry["collections"][collection] = {"file": str(path.relative_to(out)), "count": len(result["records"])}
            log.info("%s/%s: %d records -> %s", name, collection, len(result["records"]), path)
        manifest = load_manifest(manifest_path)  # re-read: another run may have updated it meanwhile
        manifest.setdefault("sources", {})[name] = entry
        manifest["updated_at"] = entry["fetched_at"]
        write_json(manifest_path, manifest)

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
