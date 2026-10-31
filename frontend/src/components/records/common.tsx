import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Paper } from "../../lib/types";
import { secureUrl } from "../../lib/format";
import { ExternalIcon, InfoIcon, NeuronIcon } from "../Icons";

export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length));
  if (!shown.length) return null;
  return (
    <dl className="facts">
      {shown.map(([k, v]) => (
        <div key={k} style={{ display: "contents" }}>
          <dt>{k}</dt>
          <dd>{Array.isArray(v) ? v.join(", ") : v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Tags({ values, accent = false, limit }: { values?: string[] | null; accent?: boolean; limit?: number }) {
  if (!values?.length) return null;
  const shown = limit ? values.slice(0, limit) : values;
  return (
    <div className="tags">
      {shown.map((v) => <span key={v} className={`tag${accent ? " tag-accent" : ""}`}>{v}</span>)}
      {limit && values.length > limit && <span className="tag">+{values.length - limit}</span>}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function Papers({ papers }: { papers?: Paper[] }) {
  if (!papers?.length) return null;
  return (
    <Section title={`Publications (${papers.length})`}>
      <ul className="link-list">
        {papers.map((p) => (
          <li key={p.url ?? p.label}>
            {p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.title ?? p.label}</a> : p.title ?? p.label}
            {p.title && <div className="hint">{[p.label, p.journal].filter(Boolean).join(" · ")}</div>}
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function SourceLink({ url, label }: { url?: string | null; label: string }) {
  if (!url) return null;
  return (
    <a className="btn btn-sm btn-ghost" href={url} target="_blank" rel="noreferrer">
      {label} <ExternalIcon size={14} />
    </a>
  );
}

/** Thumbnail with a neutral placeholder when there is no image or it fails to load. */
export function Thumb({ src, alt, onClick, large = false }: { src?: string | null; alt: string; onClick?: () => void; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const url = secureUrl(src);
  const isPlaceholder = !url || failed || url.includes("placeholder");
  const content = isPlaceholder ? (
    <NeuronIcon size={large ? 72 : 48} />
  ) : (
    <img src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} />
  );
  if (large) {
    return isPlaceholder ? null : <div className="detail-image">{content}</div>;
  }
  return (
    <button className={`card-media${isPlaceholder ? " placeholder" : ""}`} onClick={onClick} aria-label={`Open ${alt}`} tabIndex={-1}>
      {content}
    </button>
  );
}

export function SourceBadge({ source, stacked = false }: { source?: string | null; stacked?: boolean }) {
  const name = useRef<HTMLSpanElement>(null);

  // Stacked (on a card's button row): the name shrinks, only if needed, to fit the
  // room left by the buttons, so a long name like NEUROMORPHO stays on the row.
  useLayoutEffect(() => {
    const el = name.current;
    const box = el?.parentElement;
    if (!stacked || !el || !box) return;
    const fit = () => {
      el.style.fontSize = "";
      const overflow = el.scrollWidth / Math.max(1, box.clientWidth);
      if (overflow > 1) el.style.fontSize = `${Math.max(8, parseFloat(getComputedStyle(el).fontSize) / overflow - 0.2)}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [stacked, source]);

  if (!source) return null;
  return (
    <span className={`source-badge${stacked ? " stacked" : ""}`}>
      <span className="source-label">Source</span> <span ref={name} className="source-name">{source}</span>
    </span>
  );
}

/** Small "i" button that opens the item's details panel. */
export function InfoButton({ onOpen, name }: { onOpen: () => void; name: string }) {
  return (
    <button className="btn btn-sm btn-icon" onClick={onOpen} aria-label={`Details of ${name}`} title="Details">
      <InfoIcon size={17} />
    </button>
  );
}
