import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import about from "../content/about.json";

type Row = { header?: string; columns: { content: string }[] };
type Section = { id: string; header: string; rows: Row[] };

// Text of the previous site's About page (json_data/pages/about.json), unchanged.
// The HTML comes from this repository, not from user input.
const SECTIONS = about.sections as Section[];

export function About() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="container">
      <header className="page-header">
        <p className="eyebrow">The Hippocampus Hub - Build Models</p>
        <h1 className="page-title">{about.title}</h1>
      </header>
      <div className="about">
        <nav className="about-menu" aria-label="Sections">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`}>{s.header}</a>
          ))}
        </nav>
        <div className="about-sections">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="about-section">
              <h2>{s.header}</h2>
              {s.rows.map((row, i) => (
                <div key={i} className="about-row">
                  {row.header && <h3>{row.header}</h3>}
                  {row.columns.map((col, j) => (
                    <div key={j} className="about-text" dangerouslySetInnerHTML={{ __html: col.content }} />
                  ))}
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
