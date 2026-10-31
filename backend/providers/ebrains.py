"""EBRAINS Knowledge Graph: hippocampal datasets and models.

Datasets come from the public KG Search API (search.kg.ebrains.eu, group
"public", no token needed). Models come from the EBRAINS Model Catalog API
(model-validation-api.apps.ebrains.eu), which is what the old KnowledgeProvider
used through hbp_validation_framework.ModelCatalog.
"""
import logging
from concurrent.futures import ThreadPoolExecutor

import requests

from .http import TIMEOUT, get_json, load_config

log = logging.getLogger("hh.ebrains")

NAME = "ebrains"
SOURCE = "EBRAINS"
KG_SEARCH_URL = "https://search.kg.ebrains.eu/api"
KG_PAGE_URL = "https://search.kg.ebrains.eu/instances"
MODEL_CATALOG_URL = "https://model-validation-api.apps.ebrains.eu"
MODEL_CATALOG_PAGE_URL = "https://model-catalog.brainsimulation.eu/#model_id"


def flatten(value):
    """Turn KG Search field payloads ({"value": ..}, [{"value": ..}, ..]) into plain values."""
    if isinstance(value, list):
        return [flatten(v) for v in value]
    if isinstance(value, dict):
        if "children" in value:
            return None
        if "url" in value and "value" in value:
            return {"label": value["value"], "url": value["url"]}
        if "value" in value:
            return value["value"]
    return value


def values(fields, key):
    v = flatten(fields.get(key))
    if v is None:
        return []
    return v if isinstance(v, list) else [v]


def first(fields, key):
    v = values(fields, key)
    return v[0] if v else None


def kg_search(session, query, doc_type, page_size):
    """Page through results; each hit carries a cursor to pass for the next page."""
    hits, cursor, total = [], None, None
    while total is None or len(hits) < total:
        params = {"group": "public", "type": doc_type, "q": query, "size": page_size}
        if cursor:
            params["cursor"] = cursor
        response = session.post(f"{KG_SEARCH_URL}/search", json={}, timeout=TIMEOUT, params=params)
        response.raise_for_status()
        data = response.json()
        total = data.get("total", 0)
        page = data.get("hits", [])
        if not page or not page[-1].get("cursor"):
            hits.extend(page)
            break
        hits.extend(page)
        cursor = page[-1]["cursor"]
    log.info("KG search %r type=%s: %d hits", query, doc_type, len(hits))
    return hits


def kg_document(session, doc_id):
    try:
        return get_json(session, f"{KG_SEARCH_URL}/groups/public/documents/{doc_id}")
    except requests.RequestException as ex:
        log.warning("KG document %s: %s", doc_id, ex)
        return None


def specimen_species(node, found=None):
    """Collect species names from the nested specimenBySubject tree."""
    found = {} if found is None else found
    if isinstance(node, dict):
        for s in (node.get("data") or {}).get("species") or []:
            if s.get("value"):
                found[s["value"]] = True
        for child in node.get("children") or []:
            specimen_species(child, found)
    return list(found)


def map_dataset(doc):
    fields = doc.get("fields", {})
    meta = doc.get("meta", {})
    doi = first(fields, "doi")
    data_descriptor = first(fields, "dataDescriptor")
    return {
        "source_id": f"ebrains-{doc['id']}",
        "id": doc["id"],
        "type": "dataset",
        "kg_type": doc.get("type"),
        "name": doc.get("title"),
        "version": meta.get("version"),
        "description": first(fields, "description"),
        "new_in_this_version": first(fields, "newInThisVersion"),
        "accessibility": first(fields, "accessibility"),
        "released_at": first(fields, "releasedAt"),
        "region": values(fields, "studiedBrainRegion"),
        "species": specimen_species(fields.get("specimenBySubject")),
        "keywords": values(fields, "keywords"),
        "experimental_approach": values(fields, "experimentalApproach"),
        "techniques": values(fields, "technique"),
        "preparation": values(fields, "preparation"),
        "study_targets": values(fields, "studyTargets"),
        "custodians": values(fields, "custodians"),
        "contributors": values(fields, "contributors"),
        "projects": values(fields, "projects"),
        "publications": values(fields, "publications"),
        "doi": doi,
        "license": first(fields, "license_info"),
        "data_descriptor": data_descriptor,
        "file_repository_id": fields.get("fileRepositoryId"),
        "page_link": f"{KG_PAGE_URL}/{doc['id']}",
        "download_link": f"https://doi.org/{doi}" if doi else None,
        "identifiers": meta.get("identifier"),
        "source": SOURCE,
    }


def fetch_datasets(session, config):
    hits = {}
    for doc_type in config.get("types", ["Dataset"]):
        for query in config.get("queries", ["hippocampus"]):
            for hit in kg_search(session, query, doc_type, config.get("page_size", 50)):
                hits.setdefault(hit["id"], hit)
    log.info("%d unique KG documents", len(hits))
    with ThreadPoolExecutor(max_workers=config.get("workers", 4)) as pool:
        raw = [d for d in pool.map(lambda i: kg_document(session, i), hits) if d]
    return {"records": [map_dataset(d) for d in raw], "raw": raw}


def person(p):
    return " ".join(x for x in (p.get("given_name"), p.get("family_name")) if x)


def map_model(model):
    instances = [{
        "id": i.get("id"),
        "version": i.get("version"),
        "description": i.get("description"),
        "source": i.get("source"),
        "parameters": i.get("parameters"),
        "morphology": i.get("morphology"),
        "code_format": i.get("code_format"),
        "license": i.get("license"),
        "timestamp": i.get("timestamp"),
    } for i in model.get("instances") or []]
    latest = instances[-1] if instances else {}
    return {
        "source_id": f"ebrains_model-{model['id']}",
        "id": model["id"],
        "name": model.get("name"),
        "alias": model.get("alias"),
        "description": model.get("description"),
        "cell_types": [model["cell_type"]] if model.get("cell_type") else [],
        "brain_region": model.get("brain_region"),
        "species": [s.strip() for s in (model.get("species") or "").split(",") if s.strip()],
        "model_scope": [s.strip() for s in (model.get("model_scope") or "").split(",") if s.strip()],
        "abstraction_level": model.get("abstraction_level"),
        "authors": [person(p) for p in model.get("author") or []],
        "owners": [person(p) for p in model.get("owner") or []],
        "organization": model.get("organization"),
        "format": model.get("format"),
        "date_created": model.get("date_created"),
        "images": model.get("images"),
        "instances": instances,
        "page_link": f"{MODEL_CATALOG_PAGE_URL}.{model['id']}",
        "download_link": latest.get("source"),
        "kg_uri": model.get("uri"),
        "type": "single" if (model.get("model_scope") or "").startswith("single") else "network",
        "source": SOURCE,
    }


def fetch_models(session, config):
    regions = config.get("brain_regions", [])
    size = config.get("page_size", 100)
    raw, start = [], 0
    while True:
        params = [("brain_region", r) for r in regions] + [("size", size), ("from_index", start)]
        page = get_json(session, f"{MODEL_CATALOG_URL}/models/", params=params)
        raw.extend(page)
        log.info("model catalog: %d models so far", len(raw))
        if len(page) < size:
            break
        start += size
    raw = [m for m in raw if not m.get("private")]
    return {"records": [map_model(m) for m in raw], "raw": raw}


def fetch(session):
    config = load_config(NAME)
    return {
        "datasets": fetch_datasets(session, config.get("kg_search", {})),
        "models": fetch_models(session, config.get("model_catalog", {})),
    }
