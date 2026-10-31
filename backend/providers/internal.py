"""HippocampusHub's own CA1 morphologies and electrophysiology traces.

These used to come from the BBP Nexus Elasticsearch view (nexus_morphology.py,
nexus_electrophysiology.py), which no longer exists. The files now live on
EBRAINS; config/internal_morphologies.json and config/internal_electrophysiologies.json
list them (copied from the frontend's data/morph.ts and data/etraces.ts).
Cell type and e-type are read from the file paths.

Morphology images: the morphologies are part of the EBRAINS KG dataset linked
by their page_url ("Optimization of single neuron models for CA1 hippocampal
neurons in rat"). Its "Get data" file list, read from the public KG Search API,
has a <cell>_morph.jpeg in each optimization folder; the one in the same folder
as the morphology's .asc file becomes the icon. If the KG cannot be reached,
the image_url from the config (a placeholder) is kept.
"""
import logging
import re

import requests

from .http import get_json, load_config

log = logging.getLogger("hh.internal")

NAME = "internal"
SOURCE = "INTERNAL"
REGION = "hippocampus"
SECONDARY_REGION = "CA1"
SPECIES = ["rat"]
CELL_TYPES = {"pyr": "pyramidal", "int": "interneuron"}

MORPH_PATTERN = re.compile(r"/(CA\d)_(pyr|int)_([A-Za-z]+?)(?:pyr)?_")
TRACE_PATTERN = re.compile(r"/abf-(pyr|int)-([A-Za-z]+)/")
KG_API = "https://search.kg.ebrains.eu/api/groups/public"
KG_INSTANCE = re.compile(r"search\.kg\.ebrains\.eu/instances/([0-9a-f-]{36})")
MORPH_IMAGE = re.compile(r"/optimizations/([^/]+)/([^/?]+)_morph\.jpe?g")
OPTIMIZATION_FOLDER = re.compile(r"/optimizations/([^/]+)/")


def kg_morphology_images(session, dataset_id):
    """{(folder, cell name): image URL} from the KG dataset's file list."""
    document = get_json(session, f"{KG_API}/documents/{dataset_id}")
    repository = document.get("fields", {}).get("fileRepositoryId")
    if not repository:
        return {}
    files = get_json(session, f"{KG_API}/repositories/{repository}/files", params={"size": 10000})
    images = {}
    for f in files.get("data", []):
        url = (f.get("iri") or {}).get("value", "")
        match = MORPH_IMAGE.search(url)
        if match:
            images[(match.group(1), match.group(2))] = url.split("?")[0]
    return images


def find_image(images, name, download_url):
    folder = OPTIMIZATION_FOLDER.search(download_url)
    if folder and (folder.group(1), name) in images:
        return images[(folder.group(1), name)]
    # same cell, other optimization (e.g. another e-type) of the same reconstruction
    return next((url for (_, cell), url in images.items() if cell == name), None)


def map_morphology(name, item, image=None):
    match = MORPH_PATTERN.search(item["download_url"])
    region, cell, etype = match.groups() if match else (SECONDARY_REGION, None, None)
    identifier = f"internal_morphologies-{name}"
    return {
        "source_id": identifier,
        "id": name,
        "type": "morphology",
        "name": name,
        "page_link": item.get("page_url"),
        "icon": image or item.get("image_url"),
        "region": REGION,
        "species": SPECIES,
        "download_filename": item["download_url"].rsplit("/", 1)[-1],
        "download_link": item["download_url"],
        "secondary_region": [region],
        "cell_type": CELL_TYPES.get(cell, cell),
        "etype": etype,
        "papers": [],
        "source": item.get("source", SOURCE),
    }


def map_trace(name, item):
    match = TRACE_PATTERN.search(item["download_url"])
    cell, etype = match.groups() if match else (None, None)
    identifier = f"internal_electrophysiologies-{name}"
    return {
        "source_id": identifier,
        "id": name,
        "type": "electrophysiology",
        "name": name,
        "page_link": item.get("page_url"),
        "icon": item.get("image_url"),
        "region": REGION,
        "species": SPECIES,
        "secondary_region": [SECONDARY_REGION],
        "layers": [],
        "download_filename": item["download_url"].rsplit("/", 1)[-1],
        "download_link": item["download_url"],
        "cell_type": CELL_TYPES.get(cell, cell),
        "etype": etype,
        "papers": [],
        "source": item.get("source", SOURCE),
    }


def fetch(session):
    morphologies = load_config("internal_morphologies")
    traces = load_config("internal_electrophysiologies")

    images = {}
    for dataset_id in {m.group(1) for v in morphologies.values() if (m := KG_INSTANCE.search(v.get("page_url", "")))}:
        try:
            images.update(kg_morphology_images(session, dataset_id))
        except requests.RequestException as ex:
            log.warning("morphology images from KG dataset %s: %s", dataset_id, ex)
    records = [map_morphology(k, v, find_image(images, k, v["download_url"])) for k, v in morphologies.items()]
    log.info("%d of %d morphologies with a KG image", sum(1 for r in records if "_morph." in (r["icon"] or "")), len(records))

    return {
        "morphologies": {"records": records,
                         "raw": morphologies},
        "electrophysiologies": {"records": [map_trace(k, v) for k, v in traces.items()],
                                "raw": traces},
    }
