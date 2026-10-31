import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Collection } from "../lib/collections";
import { loadAll, useLoad } from "../lib/data";
import { facetCounts, filterItems, type Selection } from "../lib/facets";
import { plural } from "../lib/format";
import { FacetGroup } from "../components/FacetPanel";
import { Drawer } from "../components/Overlay";
import { ArrowRightIcon, CloseIcon, FilterIcon, SearchIcon } from "../components/Icons";

type Item = { source_id: string; name: string };

const FACET_PREFIX = "f.";

function readSelection(params: URLSearchParams): Selection {
  const selection: Selection = {};
  params.forEach((value, key) => {
    if (key.startsWith(FACET_PREFIX)) (selection[key.slice(FACET_PREFIX.length)] ??= []).push(value);
  });
  return selection;
}

export function Browse<T extends Item>({ collection }: { collection: Collection<T> }) {
  const state = useLoad(() => loadAll<T>(collection.files), [collection.key]);
  const style = { "--accent": collection.accent } as React.CSSProperties;

  return (
    <div style={style}>
      <div className="container">
        <header className="page-header">
          <p className="eyebrow">
            {collection.group === "data" ? <Link to="/data">{collection.eyebrow}</Link> : collection.eyebrow}
          </p>
          <div className="page-title-row">
            <h1 className="page-title">{collection.title}</h1>
            {collection.group === "models" && (
              <Link to="/data" className="title-link" style={{ "--accent": "var(--peach)" } as React.CSSProperties}>
                <ArrowRightIcon size={18} /> Go to Data
              </Link>
            )}
          </div>
          <p className="page-lead">{collection.lead}</p>
        </header>
        {state.status === "loading" && <div className="loading"><div className="spinner" aria-label="Loading" /></div>}
        {state.status === "error" && (
          <div className="empty-state">
            <h2>The data could not be loaded</h2>
            <p>{state.error}</p>
          </div>
        )}
        {state.status === "ready" && <Results key={collection.key} collection={collection} items={state.data} />}
      </div>
    </div>
  );
}

function Results<T extends Item>({ collection, items }: { collection: Collection<T>; items: T[] }) {
  const [params, setParams] = useSearchParams();
  const [shown, setShown] = useState(collection.pageSize);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const query = params.get("q") ?? "";
  const sortKey = params.get("sort") ?? collection.sorts[0].key;
  const openId = params.get("item");
  const selection = useMemo(() => readSelection(params), [params]);

  const update = (change: (p: URLSearchParams) => void, replace = false) => {
    const next = new URLSearchParams(params);
    change(next);
    setParams(next, { replace });
    setShown(collection.pageSize);
  };

  const setQuery = (q: string) => update((p) => (q ? p.set("q", q) : p.delete("q")), true);
  const toggleValue = (facet: string, value: string) =>
    update((p) => {
      const key = FACET_PREFIX + facet;
      const values = p.getAll(key);
      p.delete(key);
      (values.includes(value) ? values.filter((v) => v !== value) : [...values, value]).forEach((v) => p.append(key, v));
    });
  const clearAll = () =>
    update((p) => {
      [...p.keys()].filter((k) => k.startsWith(FACET_PREFIX) || k === "q").forEach((k) => p.delete(k));
    });
  const openItem = (id: string | null) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (id) next.set("item", id);
      else next.delete("item");
      return next;
    });

  const results = useMemo(() => {
    const sort = collection.sorts.find((s) => s.key === sortKey) ?? collection.sorts[0];
    return filterItems(items, collection.facets, selection, query, collection.text).sort(sort.compare);
  }, [items, collection, selection, query, sortKey]);

  const active = collection.facets.flatMap((f) => (selection[f.key] ?? []).map((v) => ({ facet: f, value: v })));
  const openRecord = openId ? items.find((i) => i.source_id === openId) : undefined;
  const { Card, Detail, Footer } = collection;

  return (
    <div className="browse">
      <aside className={`sidebar${filtersOpen ? " open" : ""}`} aria-label="Filters">
        <div className="sidebar-head">
          Filters
          <button className="btn btn-ghost btn-icon" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
            <CloseIcon />
          </button>
        </div>
        <div className="search">
          <SearchIcon />
          <input
            className="input"
            type="search"
            placeholder={`Search ${collection.noun[1]}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={`Search ${collection.noun[1]}`}
          />
        </div>
        {collection.facets.map((facet) => (
          <FacetGroup
            key={facet.key}
            label={facet.label}
            options={facetCounts(items, collection.facets, facet, selection, query, collection.text)}
            selected={selection[facet.key] ?? []}
            onToggle={(v) => toggleValue(facet.key, v)}
          />
        ))}
        {filtersOpen && (
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 16 }} onClick={() => setFiltersOpen(false)}>
            Show {plural(results.length, collection.noun[0], collection.noun[1])}
          </button>
        )}
      </aside>

      <section aria-label="Results">
        <div className="toolbar">
          <span className="result-count" aria-live="polite">
            <strong>{results.length.toLocaleString("en")}</strong>{" "}
            {results.length === 1 ? collection.noun[0] : collection.noun[1]}
            {results.length !== items.length && ` of ${items.length.toLocaleString("en")}`}
          </span>
          <span className="toolbar-spacer" />
          <button className="btn filters-toggle" onClick={() => setFiltersOpen(true)}>
            <FilterIcon size={16} /> Filters{active.length + (query ? 1 : 0) > 0 && ` (${active.length + (query ? 1 : 0)})`}
          </button>
          <label className="sr-only" htmlFor="sort">Sort by</label>
          <select id="sort" className="select" value={sortKey} onChange={(e) => update((p) => p.set("sort", e.target.value), true)}>
            {collection.sorts.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        {(active.length > 0 || query) && (
          <div className="chips">
            {query && (
              <span className="chip">
                <span className="facet-name">Search:</span> “{query}”
                <button onClick={() => setQuery("")} aria-label="Clear search"><CloseIcon size={14} /></button>
              </span>
            )}
            {active.map(({ facet, value }) => (
              <span className="chip" key={facet.key + value}>
                <span className="facet-name">{facet.label}:</span> {value}
                <button onClick={() => toggleValue(facet.key, value)} aria-label={`Remove ${facet.label} ${value}`}>
                  <CloseIcon size={14} />
                </button>
              </span>
            ))}
            <button className="link-button" onClick={clearAll}>Clear all</button>
          </div>
        )}

        {results.length === 0 ? (
          <div className="empty-state">
            <h2>No {collection.noun[1]} match</h2>
            <p>Try fewer filters or a different search.</p>
            <button className="btn" onClick={clearAll}>Clear filters</button>
          </div>
        ) : (
          <>
            <div className={collection.layout}>
              {results.slice(0, shown).map((item) => (
                <Card key={item.source_id} item={item} onOpen={() => openItem(item.source_id)} />
              ))}
            </div>
            {shown < results.length && (
              <div className="more">
                <button className="btn" onClick={() => setShown((n) => n + collection.pageSize)}>
                  Show more ({(results.length - shown).toLocaleString("en")} left)
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {openRecord && (
        <Drawer
          eyebrow={collection.detailEyebrow(openRecord)}
          title={openRecord.name}
          accent={collection.accent}
          onClose={() => openItem(null)}
          footer={<Footer item={openRecord} />}
        >
          <Detail item={openRecord} />
        </Drawer>
      )}
    </div>
  );
}
