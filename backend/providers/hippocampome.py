"""Hippocampome.org neuron types and connectivity from its published CSV files.

Replaces helpers/providers/hippocampome.py of the old backend, which used the
JSON search API (now behind an authorization token) and scraped neuron pages.
The data comes from the CSV files Hippocampome loads into its own database,
published in github.com/Hippocampome-Org/csv2db_import_v2 (static/csv2db/dat),
downloaded from raw.githubusercontent.com (no API, no rate limit):

    type.csv               neuron types (name, subregion, excitatory/inhibitory)
    morphdata.csv          axon / dendrite / soma presence per layer, defining PMIDs
    markerdata.csv         molecular marker expression
    conndata.csv           connections (source of the search engine's Conndata table)

Marker codes are read as csv2db does: p/n = positive/negative, cp/cn =
confirmed, an "i" suffix = inferred (cpi/cni, "confirmed by inference", count
as positive/negative like on the site; pi/ni are kept as inferences).

Connections are selected exactly as the old backend's query did. Its
Connection:(Presynaptic:(Markers:... OR Morphology:...) AND Postsynaptic:(...))
query used all-wildcard morphology terms (e.g. Axons:DG:????), which match every
neuron type, so the result was the search engine's own connection rule
(php_v2/SearchEngine/Parser.php, findConnection): type pairs in Conndata with
status positive, excluding pairs that also have a negative row. Conndata is
loaded from conndata.csv by csv2db: 1/4/5 = positive, 0/-1 = negative, blank
rows are not imported (so no "potential" connections).

Neuron types are selected the same way as the old Neuron:(...) query: its
conditions again match every type, and findNeuron keeps the types that are the
source (Type1) of at least one Conndata row, positive or negative.
"""
import csv
import io
import logging
import re
from collections import defaultdict

from .http import load_config

log = logging.getLogger("hh.hippocampome")

NAME = "hippocampome"
SOURCE = "Hippocampome"
ID_PREFIX = "hippocampome"
PAGE_URL = "https://hippocampome.org/php/neuron_page.php?id={}"
PUBMED_URL = "https://pubmed.ncbi.nlm.nih.gov/{}/"

# Layer-code digit -> subregion (morphdata columns L101..L606)
SUBREGIONS = {"1": "DG", "2": "CA3", "3": "CA2", "4": "CA1", "5": "Sub", "6": "EC"}
EXCIT_INHIB = {"e": "excitatory", "i": "inhibitory"}
MARKER_STATUS = {
    "p": "positive", "cp": "positive",
    "n": "negative", "cn": "negative",
    "cpi": "positive", "cni": "negative",  # confirmed by inference: shown as positive/negative on the site
    "pi": "positive inference", "ni": "negative inference",
}
# conndata.csv "Connection?" values as imported by csv2db (conndata_to_conndata)
POSITIVE = {"1", "4", "5"}
NEGATIVE = {"0", "-1"}


def get_csv(session, base_url, name):
    response = session.get(f"{base_url}/{name}", timeout=120)
    response.raise_for_status()
    return list(csv.reader(io.StringIO(response.content.decode("utf-8", errors="replace"))))


def has_evidence(cell):
    """True when a morphdata cell lists evidence of presence (ids not prefixed by '-')."""
    return bool(re.search(r"(?<![-\d])\d+", cell or ""))


def pmids(*cells):
    found = []
    for cell in cells:
        for pmid in re.findall(r"\d{6,9}", cell or ""):
            if pmid not in found:
                found.append(pmid)
    return found


def read_types(rows):
    header = [h.strip() for h in rows[0]]
    types = {}
    for r in rows[1:]:
        row = dict(zip(header, r))
        if row.get("status") != "active" or not row.get("id", "").strip().isdigit():
            continue
        types[row["id"].strip()] = row
    return types


def read_morphology(rows):
    """type id -> {"axons": [...], "dendrites": [...], "somata": [...], "pmids": [...]}"""
    header_index = next(i for i, r in enumerate(rows) if r and r[0].strip() == "Class Status")
    abbrev_row = next(r for r in rows[:header_index] if "Layer Abbreviation->" in r)
    header = [h.strip() for h in rows[header_index]]
    # The header has many blank names, so columns are addressed by index, not by dict
    col = {name: header.index(name) for name in
           ("unique ID", "Neurites \\ Layer ID->", "Defining / background references", "Supplemental PMIDs")}
    layer_columns = {i: f"{SUBREGIONS.get(code[1], '?')}:{abbrev_row[i].strip()}"
                     for i, code in enumerate(header) if re.fullmatch(r"L\d{3}", code)}
    morphology = defaultdict(lambda: {"axons": [], "dendrites": [], "somata": [], "pmids": []})
    for r in rows[header_index + 1:]:
        cell = lambda name: r[col[name]].strip() if col[name] < len(r) else ""
        type_id, part = cell("unique ID"), cell("Neurites \\ Layer ID->")
        if not type_id.isdigit() or part not in ("axons", "dendrites", "somata"):
            continue
        entry = morphology[type_id]
        for i, layer in layer_columns.items():
            if i < len(r) and has_evidence(r[i]) and layer not in entry[part]:
                entry[part].append(layer)
        for pmid in pmids(cell("Defining / background references"), cell("Supplemental PMIDs")):
            if pmid not in entry["pmids"]:
                entry["pmids"].append(pmid)
    return morphology


def read_markers(rows):
    """type id -> {marker: status}"""
    header_index = next(i for i, r in enumerate(rows) if len(r) > 1 and r[1].startswith("Active (N)"))
    abbrevs = rows[header_index - 1]
    first_marker_col = next(i for i, c in enumerate(abbrevs) if c.strip())
    markers = {}
    for r in rows[header_index + 1:]:
        match = re.fullmatch(r"(\d)-(\d{3})", r[5].strip()) if len(r) > 5 else None
        if not match:
            continue
        type_id = str(int(match.group(1)) * 1000 + int(match.group(2)))
        expression = {}
        for col in range(first_marker_col, min(len(r), len(abbrevs))):
            code = re.match(r"\s*\{([^}<]*)", r[col])
            status = MARKER_STATUS.get(code.group(1).strip()) if code else None
            name = abbrevs[col].strip()
            if status and name:
                expression[name] = status
        markers[type_id] = expression
    return markers


def display_name(row):
    name = row["short_name"].strip()
    return name if name.startswith(row["subregion"]) else f"{row['subregion']} {name}"


def map_type(type_id, row, morphology, markers):
    morph = morphology.get(type_id, {"axons": [], "dendrites": [], "somata": [], "pmids": []})
    expression = markers.get(type_id, {})
    layers = list(dict.fromkeys(morph["somata"] + morph["dendrites"] + morph["axons"]))
    excit_inhib = EXCIT_INHIB.get(row["excit_inhib"].strip().lower())
    return {
        "source_id": f"{ID_PREFIX}-{type_id}",
        "id": type_id,
        "type": "neuron_type",
        "name": display_name(row),
        "full_name": row["full_name"].strip(),
        "abbreviation": row["abbreviation"].strip(),
        "description": row["explanatory_notes"].strip(),
        "region": "hippocampal formation",
        "secondary_region": [row["subregion"].strip()],
        "cell_type": excit_inhib,
        "excit_inhib": excit_inhib,
        "supertype": row["supertype"].strip(),
        "layers": layers,
        "soma_layers": morph["somata"],
        "axon_layers": morph["axons"],
        "dendrite_layers": morph["dendrites"],
        "axon_dendrite_pattern": row["axon_dendrite_pattern"].strip(),
        "projection_pattern": row["projection_pattern"].strip(),
        "markers": sorted(m for m, s in expression.items() if s == "positive"),
        "markers_negative": sorted(m for m, s in expression.items() if s == "negative"),
        "marker_expression": expression,
        "papers": [{"label": f"PMID {p}", "url": PUBMED_URL.format(p)} for p in morph["pmids"]],
        "new_in_v2": row.get("v2.0", "").strip() == "1",
        "page_link": PAGE_URL.format(type_id),
        "icon": None,
        "source": SOURCE,
    }


def summary(neuron):
    """The neuron fields embedded in a connection record."""
    keys = ("source_id", "id", "name", "secondary_region", "cell_type", "layers",
            "markers", "papers", "page_link", "icon", "source")
    return {k: neuron[k] for k in keys}


def connection_sources(rows):
    """Type ids that are the source of an imported conndata.csv row (findNeuron)."""
    header = [h.strip() for h in rows[0]]
    sources = set()
    for r in rows[1:]:
        row = dict(zip(header, r))
        if row.get("Connection?", "").strip() in POSITIVE | NEGATIVE:
            sources.add(row.get("Source_ID", "").strip())
    return sources


def read_connections(rows, neurons):
    """Positive pairs from conndata.csv without any negative row, as findConnection returns them."""
    header = [h.strip() for h in rows[0]]
    pairs, negative = {}, set()
    for r in rows[1:]:
        row = dict(zip(header, r))
        pair = (row.get("Source_ID", "").strip(), row.get("Target_ID", "").strip())
        status = row.get("Connection?", "").strip()
        if status in NEGATIVE:
            negative.add(pair)
        elif status in POSITIVE:
            layers = pairs.setdefault(pair, [])
            for layer in row.get("Layers", "").split(";"):
                if layer.strip() and layer.strip() not in layers:
                    layers.append(layer.strip())
    connections, skipped = [], 0
    for (pre, post), layers in sorted(pairs.items()):
        if (pre, post) in negative:
            continue
        if pre not in neurons or post not in neurons:
            skipped += 1
            continue
        connections.append({
            "source_id": f"{ID_PREFIX}-{pre}-{post}",
            "id": f"{pre}-{post}",
            "type": "connection",
            "name": f"{neurons[pre]['name']} → {neurons[post]['name']}",
            "status": "documented",
            "layers": layers,
            "presynaptic": summary(neurons[pre]),
            "postsynaptic": summary(neurons[post]),
            "page_link": PAGE_URL.format(pre),
            "source": SOURCE,
        })
    if skipped:
        log.warning("%d connections skipped: neuron type not active in type.csv", skipped)
    return connections


def fetch(session):
    config = load_config(NAME)
    base_url = config["csv_base_url"]
    types = read_types(get_csv(session, base_url, "type.csv"))
    morphology = read_morphology(get_csv(session, base_url, "morphdata.csv"))
    markers = read_markers(get_csv(session, base_url, "markerdata.csv"))
    neurons = {type_id: map_type(type_id, row, morphology, markers) for type_id, row in types.items()}
    log.info("%d neuron types (%d with morphology, %d with markers)", len(neurons),
             sum(1 for t in neurons if t in morphology), sum(1 for t in neurons if t in markers))
    connection_rows = get_csv(session, base_url, "conndata.csv")
    connections = read_connections(connection_rows, neurons)
    sources = connection_sources(connection_rows)
    # All active types stay available for the connection summaries; only these are listed
    listed = [n for type_id, n in neurons.items() if type_id in sources]
    log.info("%d of %d neuron types listed (source of a connection), %d connections",
             len(listed), len(neurons), len(connections))
    return {
        "neuron_types": {"records": listed, "raw": types},
        "connections": {"records": connections, "raw": connection_rows},
    }
