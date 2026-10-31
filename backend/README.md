# HippocampusHub backend – data fetcher

Restructured version of `hbp-backend-python`. Instead of a Flask app that
imports everything into Elasticsearch, this is a plain script that calls the
public APIs of each source and writes the results as JSON files in `data/`.
The frontend (to be restructured later) can read those files directly.


## Run

```bash
pip install -r requirements.txt
python fetch_all.py                    # all sources -> ./data
python fetch_all.py modeldb            # one source only
python fetch_all.py --raw              # also keep the unmapped API responses
python fetch_all.py --out /path/to/dir
```

A full run takes about 1.5 minutes. A failing source leaves its previous files
untouched and the script exits with status 1, so it can be run from cron.

## Test with the existing frontend

`serve.py` answers the old backend's REST API (`/types`, `/filters`, `/search`,
`/download`) from the JSON files, so the current `/build` frontend runs on the
new data without changes. It uses only the standard library and listens on
localhost only. Port 5001 is the default because macOS uses 5000 for AirPlay.

```bash
# terminal 1 – backend
python3 serve.py

# terminal 2 – frontend (hippocampushub-frontend = build-master)
cd ../hippocampushub-frontend
npm ci --legacy-peer-deps          # first time only
BACKEND_URL=http://localhost:5001 npx next dev -p 3000
```

Then open http://localhost:3000/data/morphology, `/data/electrophysiology` and `/models`.
`next.config.js` was changed to read `BACKEND_URL` from the environment
(default: the production backend). As on the old site, `/models` lists ModelDB
models only. EBRAINS datasets and models are fetched into `data/ebrains/` but
not served here.

## Output

```
data/
  manifest.json                 # per source: fetch time, duration, file + record count
  neuromorpho/morphologies.json
  modeldb/models.json
  ebrains/datasets.json
  ebrains/models.json
  internal/morphologies.json
  internal/electrophysiologies.json
  hippocampome/neuron_types.json
  hippocampome/connections.json
  */raw/*.json                  # only with --raw
```

Each file is a JSON array of records. Records keep the field names of the old
Elasticsearch documents (`source_id`, `id`, `name`, `description`, `type`,
`region`, `cell_type(s)`, `species`, `page_link`, `download_link`, `icon`,
`papers`, `source`, …) so the existing frontend mapping is easy to port; a few
fields were added (see below).

## Sources

| Source | API | Collection | Old provider |
|---|---|---|---|
| Internal (HippocampusHub CA1 data on EBRAINS) | none, lists in `config/internal_*.json` | `morphologies`, `electrophysiologies` | `nexus_*.py` |
| NeuroMorpho.org | `neuromorpho.org/api/neuron/select` | `morphologies` | `neuro_morpho.py` |
| ModelDB | `modeldb.science/api/v1` | `models` | `model_db.py` |
| EBRAINS KG Search (public group) | `search.kg.ebrains.eu/api` | `datasets` | – |
| EBRAINS Model Catalog | `model-validation-api.apps.ebrains.eu` | `models` | `knowledge.py` |
| Hippocampome.org | CSV files on GitHub (`Hippocampome-Org/csv2db_import_v2`) | `neuron_types`, `connections` | `hippocampome.py` |

Configuration for each source is in `config/<source>.json`.

### NeuroMorpho
Same filters as before (`config/neuromorpho.json`): hippocampus, domain
"Dendrites, Soma, Axon", attributes "Diameter, 3D, Angles", dendrites complete,
original file in `.asc`/`.swc`. The original-file link is no longer scraped
from `neuron_info.jsp`; it is built from archive and neuron name and checked
with a HEAD request (`verify_files`). Neurons whose file is missing are skipped.
New fields: `standardized_download_link` (CNG `.swc`), `all_regions`,
`all_cell_types`, `strain`, `reference_pmid`, `reference_doi`.
`icon` is now the remote NeuroMorpho PNG URL; images are not downloaded locally.
The API leaves `png_url` empty for a few neurons (e.g. 09HPP-161122-CLC3WT-A-F-2_cor);
for those the image path of the neuron page is used
(`/images/imageFiles/<archive>/<name>.png`).

### ModelDB
All NEURON models with a cell type that mentions "hippocampus", the same rule
as the old backend: 149 models. The old site lists 148; the extra one,
114355 (Rabinowitch and Segev 2006), matches the rule but is missing there,
probably because the old import failed on it.
No scraping of senselab pages: `download_link` is `modeldb.science/download/<id>`,
`papers` come from `/api/v1/papers/<id>` (title, journal, year, DOI, PubMed).
`readme_link` and `model_files` (`.mod` files) come from a separate offline
pipeline, because listing files costs one GitHub API call per model:

```bash
python fetch_model_files.py --limit 3            # test: first three models
python fetch_model_files.py                      # as many as the GitHub quota allows (60/hour)
python fetch_model_files.py --ask-token          # type a GitHub token (hidden): all models in one run
GITHUB_TOKEN=... python fetch_model_files.py     # same, token from the environment (5000/hour)
python fetch_model_files.py --download data/modeldb/files   # also save the .mod files
python fetch_model_files.py --allow-zip          # fall back to whole ModelDB zips
```

At the end the script writes the lists into `data/modeldb/models.json`, so the
site shows them right away (no restart, no second command). Recent models
that ModelDB has not mirrored to GitHub yet (e.g. 2017004, 2018003, 2018268)
only get a list with `--allow-zip`.

The lists come from the model's GitHub repository
`github.com/ModelDBRepository/<id>` (linked from the ModelDB page). File links
point to `raw.githubusercontent.com`, which has no rate limit. The lists are kept
in `cache/modeldb_files.json` per model version: each run resumes where the last
one stopped, and refreshes only new or updated models. `fetch_all.py` reads the
same cache; models without a list have `model_files: null`. Running
`fetch_model_files.py` hourly from cron covers all models within a few hours
without a token.

A GitHub token only needs read access to public repositories: create a
fine-grained personal access token at github.com/settings/personal-access-tokens
with no extra permissions. The script checks the token before starting, shows
the remaining quota, and never prints or saves it.

### EBRAINS
- `datasets`: full-text search for "hippocampus"/"hippocampal" in the public
  KG Search, then each document's detail. No token needed.
- `models`: Model Catalog models for the hippocampal brain regions listed in
  `config/ebrains.json`. `instances` holds every version with its code URL;
  `download_link` is the latest version's code. Not listed on the site, like
  in the old backend, where this provider was switched off.

### Hippocampome
The JSON search API the old backend used now requires an authorization token,
so the data is read from the CSV files Hippocampome loads into its own database
(`github.com/Hippocampome-Org/csv2db_import_v2`, folder `static/csv2db/dat`),
downloaded from `raw.githubusercontent.com` (no API calls, no rate limit, about 3 MB):

- `neuron_types` (105) from `type.csv`, `morphdata.csv` and `markerdata.csv`:
  name, subregion, excitatory/inhibitory, soma / axon / dendrite layers (e.g.
  `DG:SG`, `CA3:SL`), positive and negative markers, and the defining PMIDs as
  `papers`. `page_link` is the neuron page on hippocampome.org. Only the types
  the old backend's `Neuron:(...)` query returned are listed: its conditions
  also match every type, and Hippocampome's `findNeuron` keeps the types that
  are the source of at least one documented connection or documented absence
  (105 of the 170 active types).
- `connections` (195) from `conndata.csv`: the same connections the old
  backend got from its search query, with the `layers` where the two types
  meet and `presynaptic` / `postsynaptic` summaries. The old query's
  morphology terms were all wildcards (`Axons:DG:????`, …), which match every
  neuron type, so its result was Hippocampome's own connection rule
  (`findConnection` in `php_v2/SearchEngine/Parser.php`): pairs documented as
  positive (codes 1/4/5) and never documented as negative (0/-1). Rows without
  a code (potential connections) are not loaded by Hippocampome's import, so
  they were never returned.

Codes are read the way Hippocampome's own import code (`csv2db`) reads them.
For DG Granule the layers and markers match the live neuron page, except two
markers (NeuN, NeuroD) that the site has but the CSVs (last updated November
2022) don't: the live site may have a few newer additions. Representative
figures are not in the CSVs, so `icon` is null.

`serve.py` lists the connections under `/data/connection`. The neuron types are
not listed as datasets (the old backend showed them as electrophysiology, but
that page must only hold trace files that can be sent to the Hodgkin-Huxley
Neuron Builder); they appear inside the connection cards.

## What was dropped from the old backend

- Elasticsearch (storage and the `elasticsearch-dsl` queries), Flask, the
  search, filter and download routes, Docker and nginx. Search and filtering
  will move to the frontend, working on the JSON files.
- The BBP Nexus "INTERNAL" providers (`nexus_morphology.py`,
  `nexus_electrophysiology.py`): `bbp.epfl.ch/nexus` no longer responds (404).
  They are replaced by the `internal` source, built from the lists the frontend
  already kept in `data/morph.ts` and `data/etraces.ts` (28 CA1 morphologies,
  78 traces, files on EBRAINS). Cell type and e-type are parsed from the file
  paths; layers and papers are not available there. The morphology images
  (`icon`) come from the EBRAINS KG dataset the morphologies link to: its
  "Get data" file list (public KG Search API) has a `<cell>_morph.jpeg` next to
  each `.asc`; if the KG can't be reached, the placeholder is kept.
