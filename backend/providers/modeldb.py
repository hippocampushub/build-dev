"""ModelDB hippocampal NEURON models via the ModelDB REST API.

Replaces helpers/providers/model_db.py of the old backend. Download link, page
link and paper references now come from the API (no senselab page scraping).
The .mod file list and README link are not fetched here: they are read from
cache/modeldb_files.json, which the offline script fetch_model_files.py fills
(see providers/modeldb_files.py). Models without a cached list get null.
"""
import logging
from concurrent.futures import ThreadPoolExecutor

import requests

from .http import get_json, load_config
from .modeldb_files import cached_files, load_cache

log = logging.getLogger("hh.modeldb")

NAME = "modeldb"
SOURCE = "ModelDB"
ID_PREFIX = "model_db"
BASE_URL = "https://modeldb.science"
API_URL = f"{BASE_URL}/api/v1"


def names(item, key):
    return [v["object_name"] for v in (item.get(key) or {}).get("value", [])]


def get_paper(session, paper_id):
    try:
        paper = get_json(session, f"{API_URL}/papers/{paper_id}")
    except requests.RequestException as ex:
        log.warning("paper %s: %s", paper_id, ex)
        return None
    doi = (paper.get("doi") or {}).get("value")
    pubmed = (paper.get("pubmed_id") or {}).get("value")
    url = f"https://doi.org/{doi}" if doi else (f"https://pubmed.ncbi.nlm.nih.gov/{pubmed}/" if pubmed else None)
    return {
        "label": paper.get("name"),
        "title": (paper.get("title") or {}).get("value"),
        "journal": (paper.get("journal") or {}).get("value"),
        "year": (paper.get("year") or {}).get("value"),
        "doi": doi,
        "pubmed_id": pubmed,
        "url": url,
    }


def map_model(session, item, file_lists):
    model_id = item["id"]
    identifier = f"{ID_PREFIX}-{model_id}"
    paper_refs = item.get("model_paper", {}).get("value", [])
    papers = [p for p in (get_paper(session, ref["object_id"]) for ref in paper_refs) if p]
    readme_link, model_files = cached_files(file_lists, model_id, item.get("ver_date"))
    return {
        "source_id": identifier,
        "id": str(model_id),
        "name": item.get("name"),
        "class_id": item.get("class_id"),
        "description": (item.get("notes") or {}).get("value", ""),
        "channels": names(item, "currents"),
        "cell_types": names(item, "neurons"),
        "page_link": f"{BASE_URL}/{model_id}",
        "download_link": f"{BASE_URL}/download/{model_id}",
        "github_link": f"https://github.com/ModelDBRepository/{model_id}",
        "model_types": names(item, "model_type"),
        "model_concepts": names(item, "model_concept"),
        "implementers": names(item, "implemented_by"),
        "modeling_application": names(item, "modeling_application"),
        "receptors": names(item, "receptors"),
        "regions": names(item, "region"),
        "genes": names(item, "gene"),
        "transmitters": names(item, "neurotransmitters"),
        "papers": papers,
        "readme_link": readme_link,
        "model_files": model_files,
        "created": item.get("created"),
        "updated": item.get("ver_date"),
        "type": "single",
        "source": SOURCE,
    }


def fetch(session):
    config = load_config(NAME)
    region_key = config.get("region_key", "hippocampus").lower()
    params = {}
    if config.get("modeling_application"):
        params["modeling_application"] = config["modeling_application"]
    file_lists = load_cache()

    model_ids = get_json(session, f"{API_URL}/models", params=params)
    log.info("%d models to inspect", len(model_ids))

    def get_model(model_id):
        try:
            return get_json(session, f"{API_URL}/models/{model_id}")
        except requests.RequestException as ex:
            log.warning("model %s: %s", model_id, ex)
            return None

    with ThreadPoolExecutor(max_workers=config.get("workers", 6)) as pool:
        details = [d for d in pool.map(get_model, model_ids) if d]

    # Same rule as the old backend: a cell type name mentions the region
    raw = [d for d in details if any(region_key in n.lower() for n in names(d, "neurons"))]
    log.info("%d hippocampal models", len(raw))

    with ThreadPoolExecutor(max_workers=config.get("workers", 6)) as pool:
        records = list(pool.map(lambda d: map_model(session, d, file_lists), raw))
    log.info("%d models with a cached .mod file list (fill it with fetch_model_files.py)",
             sum(1 for r in records if r["model_files"] is not None))
    return {"models": {"records": records, "raw": raw}}
