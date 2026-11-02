import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { COLLECTIONS, pathOf } from "../lib/collections";
import { loadAll, loadJson, useLoad } from "../lib/data";
import { formatDate } from "../lib/format";
import { useHhnb } from "../lib/hhnb";
import type { Manifest } from "../lib/types";
import { ArrowRightIcon, BuilderIcon } from "../components/Icons";
import { CountUp } from "../components/CountUp";
import { Dialog } from "../components/Overlay";

const CAROUSEL_CELLS = ["multipolar", "slender", "pyramidal"];

/** The three banner cells turning on a carousel; paused while the banner is scrolled out of view. */
function BannerCarousel() {
  const stage = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = stage.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div className={`carousel-stage${visible ? "" : " paused"}`} ref={stage} aria-hidden>
      {CAROUSEL_CELLS.map((cell) => (
        <img key={cell} className={`orbit-${cell}`} src={`${import.meta.env.BASE_URL}images/banner_cell_${cell}.webp`} alt="" />
      ))}
    </div>
  );
}

const TILE_TEXT: Record<string, string> = {
  morphology: "Reconstructed neurons to use as the cell's shape.",
  electrophysiology: "Recorded traces to fit the model's firing.",
  connection: "Documented links between neuron types.",
  model: "Published NEURON models and their mechanisms.",
};

const SOURCE_NAMES: Record<string, string> = {
  ebrains: "EBRAINS Knowledge Graph",
  neuromorpho: "NeuroMorpho.org",
  modeldb: "ModelDB",
  hippocampome: "Hippocampome.org",
};

// Banner image and credits of the previous site's home page (json_data/home-page.json)
const BANNER_CREDITS =
  "Morphologies: Markram, H., Hagens, O., &amp; Pezzoli, M. (2016). Wistar rat hippocampus CA1 pyramidal cell morphologies [Data set]. Zenodo. <a target='_blank' rel='noreferrer' href='http://doi.org/10.5281/zenodo.57082'>http://doi.org/10.5281/zenodo.57082</a>; Mercer A, Thomson AM. Cornu Ammonis Regions-Antecedents of Cortical Layers? 2017 Sep 26;11:83. doi: <a target='_blank' rel='noreferrer' href='https://doi.org/10.3389/fnana.2017.00083'>https://doi.org/10.3389/fnana.2017.00083</a>; Migliore et al. (2018). The physiological variability of channel density in hippocampal CA1 pyramidal cells and interneurons explored using a unified data-driven modeling workflow. PLoS Comput Biol; doi: <a target='_blank' rel='noreferrer' href='https://doi.org/10.1371/journal.pcbi.1006423'>https://doi.org/10.1371/journal.pcbi.1006423</a><br />Model: Migliore et al. (2018). The physiological variability of channel density in hippocampal CA1 pyramidal cells and interneurons explored using a unified data-driven modeling workflow. PLoS Comput Biol; doi: <a target='_blank' rel='noreferrer' href='https://doi.org/10.1371/journal.pcbi.1006423'>https://doi.org/10.1371/journal.pcbi.1006423</a>";

function useCounts() {
  return useLoad(
    () => Promise.all(COLLECTIONS.map((c) => loadAll(c.files).then((items) => [c.key, items.length] as const))).then(Object.fromEntries),
    [],
  );
}

export function Home() {
  const counts = useCounts();
  const manifest = useLoad(() => loadJson<Manifest>("manifest.json"), []);
  const { setTrayOpen } = useHhnb();
  const [creditsOpen, setCreditsOpen] = useState(false);

  return (
    <>
      <section className="banner">
        <BannerCarousel />
        <div className="container hero">
          <p className="eyebrow" style={{ color: "var(--peach)" }}>Build</p>
          <h1>
            Create your own <span>hippocampal single cell models</span>
          </h1>
          <p>
            Browse curated morphologies, electrophysiology recordings, connections and published models of hippocampal
            neurons, then send your selection to the Hodgkin-Huxley Neuron Builder on EBRAINS.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/data" style={{ "--accent": "var(--peach)" } as React.CSSProperties}>
              Explore the data <ArrowRightIcon size={16} />
            </Link>
            <Link className="btn" to={pathOf("model")}>Models</Link>
            <button className="btn" onClick={() => setTrayOpen(true)}>
              <BuilderIcon size={20} /> HH Neuron Builder selection
            </button>
          </div>
        </div>
        <div className="banner-credits container">
          <button className="link-button" onClick={() => setCreditsOpen(true)}>Image credits</button>
        </div>
        {creditsOpen && (
          <Dialog
            title="Image credits"
            onClose={() => setCreditsOpen(false)}
            actions={<button className="btn" onClick={() => setCreditsOpen(false)}>Close</button>}
          >
            <div className="credits-text" dangerouslySetInnerHTML={{ __html: BANNER_CREDITS }} />
          </Dialog>
        )}
      </section>

      <div className="container">
      <section className="tiles" aria-label="Data collections">
        {COLLECTIONS.map((c) => (
          <Link key={c.key} to={c.path} className="tile" style={{ "--accent": c.accent } as React.CSSProperties}>
            <span className="tile-count">
              {counts.status === "ready" ? (counts.data[c.key] != null ? <CountUp value={counts.data[c.key]} /> : "–") : "\u00a0"}
            </span>
            <span className="tile-title">{c.title}</span>
            <span className="tile-text">{TILE_TEXT[c.key]}</span>
            <span className="tile-go">Browse <ArrowRightIcon size={16} /></span>
          </Link>
        ))}
      </section>

      <section className="two-col">
        <div className="panel">
          <h2>Build a model in three steps</h2>
          <ol className="steps">
            <li>
              <span><strong>Pick a morphology.</strong> Open a reconstruction and choose “Use in HH Neuron Builder”.</span>
            </li>
            <li>
              <span><strong>Add electrophysiology and mechanisms.</strong> Select the traces to fit and the .mod files from a published model.</span>
            </li>
            <li>
              <span><strong>Open the HH Neuron Builder.</strong> Your selection opens on EBRAINS, ready for optimization and simulation.</span>
            </li>
          </ol>
        </div>
        <div className="panel">
          <h2>Data sources</h2>
          <ul className="sources">
            {Object.entries(SOURCE_NAMES).map(([key, name]) => {
              const entry = manifest.status === "ready" ? manifest.data.sources[key] : undefined;
              return (
                <li key={key}>
                  {name}
                  <span>{entry ? `updated ${formatDate(entry.fetched_at)}` : manifest.status === "loading" ? "…" : "–"}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      </div>
    </>
  );
}
