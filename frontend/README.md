# HippocampusHub – Build Models frontend (v2)

A new frontend for the Build Models section of the Hippocampus Hub, styled after
the /model section (its slate-blue panel colours as background, Titillium Web,
one accent colour per section), with the CNR logo and the "The Hippocampus Hub
- Build Models" title of the previous site. It reads the JSON files produced by the backend (`../backend`)
directly: search and filters run in the browser, so no backend server or
Elasticsearch is needed. The build is a static site.

## Pages

| Path | Content | Data file(s) |
|---|---|---|
| `/` | Overview, counts, data freshness | `manifest.json` + all below |
| `/data` | The Data section: Connections, Electrophysiology, Morphologies, with counts | – |
| `/data/morphology` | Internal CA1 + NeuroMorpho reconstructions | `internal/morphologies.json`, `neuromorpho/morphologies.json` |
| `/data/electrophysiology` | `.abf` traces that can go to the HH Neuron Builder | `internal/electrophysiologies.json` |
| `/data/connection` | Documented Hippocampome connections | `hippocampome/connections.json` |
| `/models` | ModelDB models and their `.mod` files | `modeldb/models.json` |
| `/about` | The previous site's About page (guide, terms, disclaimer, privacy and cookies, copyright, accessibility, contributors); the footer links point here | `src/content/about.json` (copied unchanged from the previous site) |

Every page has free-text search, filters with live counts, sorting and a
details panel. Search, filters, sort and the open record are kept in the URL
(e.g. `/data/electrophysiology?f.etype=bAC&item=…`), so any view can be shared.
The paths are those of the previous site; the short paths of an earlier version
(`/morphologies`, `/electrophysiology`, `/connections`) redirect to them.

The top menu is the previous site's: Home, Build Models (Data with its three
pages, Models), Explore Models, Contact us. The home page
banner is the previous site's neuron image (`public/images/banner_*.jpg`,
resized from `background_02.png`), blended into the background, with its credits.

**Hodgkin-Huxley Neuron Builder:** pick one morphology, any traces and `.mod`
files ("Builder"/"Add" buttons); the selection is kept in the browser
(localStorage) and the HH Neuron Builder button opens
`hhnb.ebrains-italy.eu/…/hhf-comm?hhf_dict=…` exactly as the previous site did.

NeuroMorpho downloads first ask to accept NeuroMorpho.org's terms of use, once
per browser session, as before.

## Run locally

Needs Node 18+ and the backend's data folder (`../backend/data`
by default).

```bash
npm install
npm run dev            # http://localhost:5173, serves the data folder at /data
```

Use another data folder with `HH_DATA_DIR=/path/to/data npm run dev`.

## Build and deploy

```bash
HH_BASE=/build/ npm run build    # site under https://www.hippocampushub.eu/build/
npm run preview                  # check the build locally
```

`dist/` then contains the site plus a copy of the data in `dist/data/` and a
`404.html` fallback, so deep links work on static hosts such as GitHub Pages.
Copy `dist/` to the web server. On nginx/Apache, send unknown paths under the
base to `index.html` (or rely on `404.html`).

To refresh the data: run the backend's `fetch_all.py` (and
`fetch_model_files.py`), then rebuild, or copy the new JSON files into
`dist/data/` on the server; no rebuild is needed for data-only updates.

## Code

- `src/lib/collections.tsx` – one entry per page: data files, filters,
  search fields, sort orders, card and details components.
- `src/lib/facets.ts` – client-side faceted search.
- `src/lib/hhnb.tsx` – HH Neuron Builder selection and launch URL.
- `src/components/records/` – card, details panel and actions per data type.
- `src/styles/global.css` – design tokens and all styles (no UI library).
