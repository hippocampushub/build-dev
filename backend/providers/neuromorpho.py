"""NeuroMorpho.org hippocampal morphologies via the public REST API.

Replaces helpers/providers/neuro_morpho.py of the old backend. The original-format
file link used to be scraped from neuron_info.jsp; it is now built from the
archive/neuron name (the same path the page links to) and optionally verified
with a HEAD request.
"""
import logging
import os
from urllib.parse import quote

from .http import get_json, load_config, polite_sleep, post_json, url_exists

log = logging.getLogger("hh.neuromorpho")

NAME = "neuromorpho"
SOURCE = "Neuromorpho"
ID_PREFIX = "neuromorpho"
BASE_URL = "https://neuromorpho.org"
API_URL = f"{BASE_URL}/api"


def _tokens(value):
    return [x.strip(" \n\t").lower() for x in value.split(",")]


def filter_values(values, allowed=(), not_allowed=()):
    """Same semantics as the old backend: every allowed token must appear in the
    comma separated value, no not_allowed token may appear."""
    result = []
    for value in values:
        tokens = _tokens(value)
        if all(a in tokens for a in allowed) and not any(n in tokens for n in not_allowed):
            result.append(value)
    return result


def get_field_values(session, field, delay):
    values, page, total_pages = [], 0, 1
    while page < total_pages:
        data = get_json(session, f"{API_URL}/neuron/fields/{field}", params={"page": page, "size": 500})
        values.extend(data.get("fields", []))
        total_pages = data.get("page", {}).get("totalPages", 1)
        page += 1
        polite_sleep(delay)
    return values


def build_query(session, config):
    delay = config.get("request_delay_seconds", 1.0)
    query = {"brain_region": config.get("brain_regions", ["hippocampus"])}
    for field, key in (("domain", "domains"), ("attributes", "attributes"), ("Physical_Integrity", "physical_integrities")):
        rule = config.get(key, {})
        query[field] = filter_values(get_field_values(session, field, delay),
                                     rule.get("allowed", []), rule.get("not_allowed", []))
    formats = [f.lower() for f in config.get("original_formats", [])]
    if formats:
        query["original_format"] = [v for v in get_field_values(session, "original_format", delay)
                                    if os.path.splitext(v)[-1].lower() in formats]
    return query


def original_file_candidates(neuron):
    ext = os.path.splitext(neuron.get("original_format") or "")[-1]
    if not ext:
        return []
    base = f"{BASE_URL}/dableFiles/{quote(neuron['archive'].lower())}/Source-Version/{quote(neuron['neuron_name'])}"
    return [base + e for e in dict.fromkeys([ext, ext.lower(), ext.upper()])]


def map_neuron(neuron, download_link):
    regions = neuron.get("brain_region") or []
    cell_types = neuron.get("cell_type") or []
    identifier = f"{ID_PREFIX}-{neuron['neuron_id']}"
    archive = neuron["archive"]
    name = neuron["neuron_name"]
    return {
        "source_id": identifier,
        "id": str(neuron["neuron_id"]),
        "type": "morphology",
        "name": name,
        "description": neuron.get("note"),
        "archive": archive,
        "region": regions[0] if regions else "",
        "secondary_region": regions[1:2],
        "all_regions": regions,
        "cell_type": cell_types[0] if cell_types else "",
        "secondary_cell_type": cell_types[1] if len(cell_types) > 1 else "",
        "all_cell_types": cell_types,
        "species": neuron.get("species"),
        "strain": neuron.get("strain"),
        "age_classification": neuron.get("age_classification"),
        "gender": neuron.get("gender"),
        "experiment_condition": neuron.get("experiment_condition"),
        # png_url is missing from the API for a few neurons; the neuron page uses this path
        "icon": neuron.get("png_url") or f"{BASE_URL}/images/imageFiles/{quote(archive)}/{quote(name)}.png",
        "link": neuron.get("_links", {}).get("self", {}).get("href"),
        "original_format": neuron.get("original_format"),
        "physical_integrity": neuron.get("physical_Integrity"),
        "download_link": download_link,
        "standardized_download_link": f"{BASE_URL}/dableFiles/{quote(archive.lower())}/CNG%20version/{quote(name)}.CNG.swc",
        "page_link": f"{BASE_URL}/neuron_info.jsp?neuron_name={quote(name)}",
        "protocol": neuron.get("protocol"),
        "morphologies": neuron.get("attributes"),
        "structural_domains": neuron.get("domain"),
        "reference_pmid": neuron.get("reference_pmid"),
        "reference_doi": neuron.get("reference_doi"),
        "upload_date": neuron.get("upload_date"),
        "source": SOURCE,
    }


def fetch(session):
    config = load_config(NAME)
    delay = config.get("request_delay_seconds", 1.0)
    size = config.get("page_size", 500)
    verify = config.get("verify_files", True)

    query = build_query(session, config)
    log.info("query: %s", query)

    raw, page, total_pages = [], 0, 1
    while page < total_pages:
        data = post_json(session, f"{API_URL}/neuron/select", query, params={"page": page, "size": size})
        raw.extend(data.get("_embedded", {}).get("neuronResources", []))
        total_pages = data.get("page", {}).get("totalPages", 0)
        log.info("page %d/%d, %d neurons so far", page + 1, total_pages, len(raw))
        page += 1
        polite_sleep(delay)

    records, skipped = [], 0
    for neuron in raw:
        candidates = original_file_candidates(neuron)
        link = candidates[0] if candidates else None
        if verify:
            link = next((c for c in candidates if url_exists(session, c)), None)
        if link is None:
            skipped += 1
            continue
        records.append(map_neuron(neuron, link))
    if skipped:
        log.warning("%d neurons skipped: original file not found", skipped)
    return {"morphologies": {"records": records, "raw": raw}}
