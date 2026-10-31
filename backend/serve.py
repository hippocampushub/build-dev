"""Local test server: the old backend's REST API, answered from the JSON files in data/.

Only meant to run the existing frontend (hippocampushub /build) against the new
data while the frontend is being restructured. Standard library only.

    python serve.py                 # http://localhost:5001
    python serve.py --port 5001 --data /path/to/data

Implemented endpoints (same paths and response shapes as hbp-backend-python):
    GET  /types/<index>
    GET  /filters/<index>[/<type>]
    POST /search/<index>[/<page>[/<hits_per_page>]]
    POST /search/<index>/all
    GET  /download/<index>[/all]     -> zip of the records' download_link files
"""
import argparse
import io
import json
import math
import re
import socket
import threading
import zipfile
from collections import Counter
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from providers.http import create_session

# index -> files in data/ that feed it
INDEX_FILES = {
    "dataset": ["internal/morphologies.json", "internal/electrophysiologies.json",
                "neuromorpho/morphologies.json",
                "hippocampome/connections.json"],
    # Like the old site: ModelDB only (EBRAINS models are fetched but not listed)
    "model": ["modeldb/models.json"],
}

# Same filter definitions as services/filter.py of the old backend
FILTERS = {
    "dataset": {
        "morphology": {
            "species": ("species", 1),
            "secondary_region": ("region", 2),
            "cell_type": ("cell type", 3),
        },
        "electrophysiology": {
            "secondary_region": ("region", 1),
            "layers": ("layers", 2),
        },
        # nested: (label, order, {field: (label, order)})
        "connection": {
            "presynaptic": ("presynaptic", 1, {"secondary_region": ("region", 1), "layers": ("layers", 2)}),
            "postsynaptic": ("postsynaptic", 2, {"secondary_region": ("region", 1), "layers": ("layers", 2)}),
        },
    },
    "model": {
        "cell_types": ("cell types", 1),
        "channels": ("channels", 1),
        "receptors": ("receptors", 2),
        "model_concepts": ("model concepts", 3),
        "implementers": ("implementers", 4),
    },
}

QUERY_FIELDS = ["name", "description", "cell_type", "cell_types", "secondary_region", "species",
                "channels", "model_concepts", "model_types", "layers", "etype"]


def as_list(value):
    if value is None or value == "":
        return []
    return value if isinstance(value, list) else [value]


def load_index(data_dir, index):
    items = []
    for name in INDEX_FILES[index]:
        path = data_dir / name
        if path.exists():
            with open(path, encoding="utf-8") as f:
                items.extend(json.load(f))
    return sorted(items, key=lambda x: (x.get("name") or "").lower())


def matches_query(item, query):
    terms = [t.strip().lower() for t in query.split("|") if t.strip()]
    if not terms:
        return True
    parts = [item] + [item[k] for k in ("presynaptic", "postsynaptic") if isinstance(item.get(k), dict)]
    text = " ".join(str(v) for part in parts for f in QUERY_FIELDS for v in as_list(part.get(f))).lower()
    return any(t in text for t in terms)


def matches_filters(item, filters):
    for key, wanted in (filters or {}).items():
        if isinstance(wanted, dict):  # nested, e.g. {"presynaptic": {"layers": [...]}}
            if not matches_filters(item.get(key) or {}, wanted):
                return False
            continue
        wanted = as_list(wanted)
        if wanted and not set(as_list(item.get(key))) & set(wanted):
            return False
    return True


def search(items, body):
    data_type = body.get("data_type")
    query = body.get("query") or ""
    filters = body.get("filters") or {}
    return [i for i in items
            if (not data_type or i.get("type") == data_type)
            and matches_filters(i, filters)
            and matches_query(i, query)]


class Handler(BaseHTTPRequestHandler):
    data_dir: Path = None
    session = None

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        super().end_headers()

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if not length:
            return {}
        try:
            return json.loads(self.rfile.read(length)) or {}
        except json.JSONDecodeError:
            return {}

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        self.route("GET")

    def do_POST(self):
        self.route("POST")

    def route(self, method):
        url = urlparse(self.path)
        parts = [p for p in url.path.split("/") if p]
        args = {k: v[-1] for k, v in parse_qs(url.query).items()}
        body = self.read_body() if method == "POST" else args
        if len(parts) < 2 or parts[1] not in INDEX_FILES:
            return self.send_json({"error": "not found"}, 404)
        action, index, rest = parts[0], parts[1], parts[2:]
        items = load_index(self.data_dir, index)

        if action == "types":
            return self.send_json({"label": "type", "values": sorted({i["type"] for i in items})})

        if action == "filters":
            data_type = rest[0] if rest else None
            fields = FILTERS[index].get(data_type, {}) if index == "dataset" else FILTERS[index]
            scoped = [i for i in items if not data_type or i.get("type") == data_type]
            def filter_entry(key, label, order, records):
                counts = Counter(v for i in records for v in as_list(i.get(key)) if v)
                return {"key": key, "label": label, "type": "multiple", "order": order,
                        "depends_on": ["secondary_region"] if key == "layers" else [],
                        "values": [v for v, _ in counts.most_common()]}

            result = {}
            for key, spec in fields.items():
                if len(spec) == 3:  # nested group (connections)
                    label, order, subfields = spec
                    records = [i.get(key) or {} for i in scoped]
                    result[key] = {"label": label, "order": order,
                                   "items": {k: filter_entry(k, l, o, records) for k, (l, o) in subfields.items()}}
                else:
                    result[key] = filter_entry(key, *spec, scoped)
            return self.send_json(result)

        if action == "search":
            if rest[:1] == ["all"]:
                ids = set(as_list(body.get("ids")))
                return self.send_json({"items": [i for i in items if not ids or i["source_id"] in ids]})
            page = int(rest[0]) if len(rest) > 0 else 0
            size = int(rest[1]) if len(rest) > 1 else 20
            found = search(items, body)
            return self.send_json({"total": len(found), "total_page": max(1, math.ceil(len(found) / size)),
                                   "items": found[page * size:(page + 1) * size], "page": page, "size": size})

        if action == "download":
            if rest[:1] == ["all"]:
                selected = search(items, body)
            else:
                ids = set(body.get("ids", "").split(",")) if isinstance(body.get("ids"), str) else set(as_list(body.get("ids")))
                selected = [i for i in items if i["source_id"] in ids or i.get("id") in ids]
            return self.send_zip(selected)

        self.send_json({"error": "not found"}, 404)

    def send_zip(self, items):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
            for item in items:
                url = item.get("download_link")
                if not url:
                    continue
                try:
                    response = self.session.get(url, timeout=120)
                    response.raise_for_status()
                except Exception as ex:
                    self.log_message("download failed %s: %s", url, ex)
                    continue
                name = item.get("download_filename") or re.sub(r"[?#].*", "", url).rstrip("/").rsplit("/", 1)[-1]
                archive.writestr(f"{item.get('source', 'files')}/{name}", response.content)
        body = buffer.getvalue()
        self.send_response(200)
        self.send_header("Content-Type", "application/zip")
        self.send_header("Content-Disposition", "attachment; filename=archive.zip")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class IPv6Server(ThreadingHTTPServer):
    address_family = socket.AF_INET6


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--port", type=int, default=5001)
    parser.add_argument("--data", default=str(Path(__file__).resolve().parent / "data"))
    args = parser.parse_args()
    Handler.data_dir = Path(args.data)
    Handler.session = create_session()
    # Loopback only, on both IPv4 and IPv6: Node resolves "localhost" to ::1, browsers may use 127.0.0.1
    try:
        ipv6_server = IPv6Server(("::1", args.port), Handler)
        server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    except OSError as ex:
        raise SystemExit(f"Cannot listen on port {args.port}: {ex.strerror}. "
                         f"Is serve.py already running? Stop it or use --port.")
    threading.Thread(target=ipv6_server.serve_forever, daemon=True).start()
    print(f"Serving {args.data} on http://localhost:{args.port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
