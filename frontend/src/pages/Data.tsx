import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { DATA_COLLECTIONS, pathOf, type Collection } from "../lib/collections";
import { loadAll, useLoad } from "../lib/data";
import { toList } from "../lib/facets";
import { secureUrl } from "../lib/format";
import type { Connection, Morphology, Trace } from "../lib/types";
import { ArrowRightIcon } from "../components/Icons";
import trace1 from "../assets/data/trace_1.png";
import trace2 from "../assets/data/trace_2.png";
import trace3 from "../assets/data/trace_3.png";

type Shot = { src: string; caption?: string; alt: string; to: string };
type Stat = [number, string];
type Feature = { stats: Stat[]; visual: ReactNode; sources: string };

const REGIONS = ["DG", "CA3", "CA2", "CA1", "Sub", "EC"];

// Voltage responses to current steps (-0.8 to +1.0 nA) of three of the site's
// recordings, drawn from their .abf files (backend/tools/draw_trace_figures.py). Imported, so the build names
// them after their content and browsers never show an outdated copy.
const TRACE_FIGURES = [
  { src: trace1, id: "internal_electrophysiologies-95912005", caption: "cAC · pyramidal" },
  { src: trace2, id: "internal_electrophysiologies-95810035", caption: "bAC · interneuron" },
  { src: trace3, id: "internal_electrophysiologies-98513011", caption: "cNAC · interneuron" },
];

const distinct = (values: (string | null | undefined)[]) => new Set(values.filter(Boolean)).size;
const recordLink = (c: Collection<any>, id: string) => `${c.path}?item=${encodeURIComponent(id)}`;

/** First record with an image for each distinct value of `key`, up to `n` */
function pick<T extends { source_id: string; icon?: string | null }>(items: T[], key: (item: T) => string | null | undefined, n: number) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (!item.icon || !k || seen.has(k)) continue;
    seen.add(k);
    out.push(item);
    if (out.length === n) break;
  }
  return out;
}

function Mosaic({ shots, variant }: { shots: Shot[]; variant: "plot" | "dark" }) {
  return (
    <div className={`mosaic mosaic-${variant}`}>
      {shots.map((s) => (
        <Link key={s.src} to={s.to} className="mosaic-tile">
          <img src={s.src} alt={s.alt} loading="lazy" />
          {s.caption && <span className="mosaic-caption">{s.caption}</span>}
        </Link>
      ))}
    </div>
  );
}

/** Documented connections between hippocampal regions, drawn from the connection records */
function ConnectionMatrix({ items, to }: { items: Connection[]; to: string }) {
  const counts = new Map<string, number>();
  for (const c of items)
    for (const pre of c.presynaptic.secondary_region)
      for (const post of c.postsynaptic.secondary_region) counts.set(`${pre}>${post}`, (counts.get(`${pre}>${post}`) ?? 0) + 1);
  const max = Math.max(1, ...counts.values());
  const cell = 46;
  const left = 64;
  const top = 58;
  const size = REGIONS.length * cell;

  return (
    <Link to={to} className="matrix" aria-label="Connections between hippocampal regions">
      <svg viewBox={`0 0 ${left + size + 8} ${top + size + 8}`} role="img">
        <title>Number of documented connections from each presynaptic region (rows) to each postsynaptic region (columns)</title>
        <text x={left + size / 2} y={14} className="matrix-axis" textAnchor="middle">Postsynaptic</text>
        <text x={14} y={top + size / 2} className="matrix-axis" textAnchor="middle" transform={`rotate(-90 14 ${top + size / 2})`}>
          Presynaptic
        </text>
        {REGIONS.map((r, i) => (
          <g key={r}>
            <text x={left + i * cell + cell / 2} y={top - 10} className="matrix-label" textAnchor="middle">{r}</text>
            <text x={left - 10} y={top + i * cell + cell / 2 + 5} className="matrix-label" textAnchor="end">{r}</text>
          </g>
        ))}
        {REGIONS.map((pre, i) =>
          REGIONS.map((post, j) => {
            const n = counts.get(`${pre}>${post}`) ?? 0;
            const strength = n ? 0.22 + 0.78 * Math.sqrt(n / max) : 0;
            return (
              <g key={`${pre}>${post}`}>
                <rect
                  x={left + j * cell + 2}
                  y={top + i * cell + 2}
                  width={cell - 4}
                  height={cell - 4}
                  rx={6}
                  className={n ? "matrix-cell" : "matrix-empty"}
                  style={n ? { opacity: strength } : undefined}
                >
                  <title>{`${pre} → ${post}: ${n} connection${n === 1 ? "" : "s"}`}</title>
                </rect>
                {n > 0 && (
                  <text
                    x={left + j * cell + cell / 2}
                    y={top + i * cell + cell / 2 + 5}
                    textAnchor="middle"
                    className={`matrix-count${strength > 0.55 ? " strong" : ""}`}
                  >
                    {n}
                  </text>
                )}
              </g>
            );
          }),
        )}
      </svg>
    </Link>
  );
}

function useFeatures() {
  return useLoad(async () => {
    const [traces, morphologies, connections] = await Promise.all(DATA_COLLECTIONS.map((c) => loadAll<any>(c.files))) as [
      Trace[],
      Morphology[],
      Connection[],
    ];
    const [traceCol, morphCol, connCol] = DATA_COLLECTIONS;
    const neuronTypes = new Set(connections.flatMap((c) => [c.presynaptic.id, c.postsynaptic.id]));
    const neuromorpho = morphologies.filter((m) => m.source === "Neuromorpho");

    const features: Record<string, Feature> = {
      electrophysiology: {
        stats: [
          [traces.length, "recordings"],
          [distinct(traces.map((t) => t.etype)), "e-types"],
          [distinct(traces.map((t) => t.cell_type)), "cell classes"],
        ],
        sources: "Source: EBRAINS",
        visual: (
          <Mosaic
            variant="plot"
            shots={TRACE_FIGURES.map((f) => ({
              src: f.src,
              caption: f.caption,
              alt: `Voltage responses to current steps, ${f.caption}`,
              to: recordLink(traceCol, f.id),
            }))}
          />
        ),
      },
      morphology: {
        stats: [
          [morphologies.length, "reconstructions"],
          [distinct(morphologies.flatMap((m) => toList(m.cell_type))), "cell types"],
          [distinct(morphologies.flatMap((m) => toList(m.species))), "species"],
        ],
        sources: "Source: EBRAINS · NeuroMorpho.org",
        visual: (
          <Mosaic
            variant="dark"
            shots={pick(neuromorpho, (m) => toList(m.cell_type)[0], 3).map((m) => ({
              src: secureUrl(m.icon)!,
              caption: toList(m.cell_type)[0] ?? m.name,
              alt: `Morphology ${m.name}`,
              to: recordLink(morphCol, m.source_id),
            }))}
          />
        ),
      },
      connection: {
        stats: [
          [connections.length, "connections"],
          [neuronTypes.size, "neuron types"],
          [distinct(connections.flatMap((c) => [...c.presynaptic.secondary_region, ...c.postsynaptic.secondary_region])), "regions"],
        ],
        sources: "Source: Hippocampome.org",
        visual: <ConnectionMatrix items={connections} to={connCol.path} />,
      },
    };
    return features;
  }, []);
}

export function Data() {
  const features = useFeatures();

  return (
    <div className="container">
      <header className="page-header">
        <p className="eyebrow">Build Models</p>
        <div className="page-title-row">
          <h1 className="page-title">Data</h1>
          <Link to={pathOf("model")} className="title-link" style={{ "--accent": "var(--c-model)" } as React.CSSProperties}>
            <ArrowRightIcon size={18} /> Go to Models
          </Link>
        </div>
        <p className="page-lead">
          The Data section of the Hippocampus Hub Build portal provides data resources on hippocampal cells
          Connections, Morphologies and Electrophysiology from internal and external sources. Data can be visualized
          and downloaded; links to data source web pages are provided.
        </p>
      </header>
      {features.status === "loading" && <div className="loading"><div className="spinner" aria-label="Loading" /></div>}
      <div className="features">
        {DATA_COLLECTIONS.map((c, i) => {
          const f = features.status === "ready" ? features.data[c.key] : undefined;
          return (
            <section key={c.key} className={`feature${i % 2 ? " reverse" : ""}`} style={{ "--accent": c.accent } as React.CSSProperties}>
              <div className="feature-visual">{f?.visual}</div>
              <div className="feature-text">
                <p className="feature-index">{String(i + 1).padStart(2, "0")} · Data</p>
                <h2>
                  <Link to={c.path}>{c.title}</Link>
                </h2>
                <p className="feature-lead">{c.lead}</p>
                {f && (
                  <dl className="feature-stats">
                    {f.stats.map(([value, label]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value.toLocaleString("en")}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <div className="feature-foot">
                  <Link className="btn btn-primary" to={c.path}>
                    Browse {c.title.toLowerCase()} <ArrowRightIcon size={16} />
                  </Link>
                  {f && <span className="feature-sources">{f.sources}</span>}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
