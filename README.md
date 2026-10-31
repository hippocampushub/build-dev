# Hippocampus Hub – Build Models (test site)

Test deployment of the restructured Build Models section, published at
https://www.hippocampushub.eu/build-dev/ (GitHub Pages, `gh-pages` branch).
The live site, https://www.hippocampushub.eu/build/, is still served by the
`hippocampushub/build` repository and is not affected.

- `backend/` – Python scripts that fetch the data from NeuroMorpho.org, ModelDB,
  Hippocampome.org and the EBRAINS Knowledge Graph and write it as JSON files to
  `backend/data/`. No server or database. See `backend/README.md`.
- `frontend/` – the static site (Vite + React). It reads the JSON files; search and
  filters run in the browser. See `frontend/README.md`.
- `.github/workflows/deploy.yml` – refreshes the data every day at 01:00 Italian time, commits it,
  builds the site and publishes it to `gh-pages`. It also runs on every push to
  `main` (build and publish only) and on demand from the Actions tab.

If a source can't be reached, its previous data (committed in `backend/data/`) is
kept, the site is still published, and the run is marked as failed.

## Run locally

```bash
cd backend && pip install -r requirements.txt && python fetch_all.py && python fetch_model_files.py
cd ../frontend && npm install && npm run dev      # http://localhost:5173
```

## Moving to the live site

Use the same files in `hippocampushub/build` and set, in the workflow,
`HH_BASE: /build/` and `VITE_STAGING: ""` (no test banner, indexed by search engines).
