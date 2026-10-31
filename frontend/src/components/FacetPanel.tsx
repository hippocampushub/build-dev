import { useState } from "react";
import { ChevronIcon } from "./Icons";

const VISIBLE = 8;

export function FacetGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: [string, number][];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState("");
  if (!options.length) return null;

  const filtered = filter ? options.filter(([v]) => v.toLowerCase().includes(filter.toLowerCase())) : options;
  // Selected values always stay visible
  const shown = expanded || filter ? filtered : filtered.filter(([v], i) => i < VISIBLE || selected.includes(v));
  const id = `facet-${label.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <div className="facet">
      <button className="facet-title" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        {label}
        {selected.length > 0 && <span className="badge-count" style={{ marginLeft: "auto", marginRight: 8 }}>{selected.length}</span>}
        <ChevronIcon size={16} style={{ transform: open ? "none" : "rotate(-90deg)", transition: "transform .15s" }} />
      </button>
      {open && (
        <div id={id} role="group" aria-label={label}>
          {options.length > VISIBLE && (
            <input
              className="facet-filter"
              placeholder={`Filter ${label.toLowerCase()}…`}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label={`Filter ${label} options`}
            />
          )}
          {shown.map(([value, count]) => (
            <label key={value} className={`facet-option${count === 0 ? " empty" : ""}`}>
              <input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} />
              <span className="value">{value}</span>
              <span className="count">{count}</span>
            </label>
          ))}
          {!filter && filtered.length > VISIBLE && (
            <button className="link-button" onClick={() => setExpanded((e) => !e)}>
              {expanded ? "Show fewer" : `Show all ${filtered.length}`}
            </button>
          )}
          {filter && !filtered.length && <p className="hint" style={{ margin: "4px 0" }}>No match.</p>}
        </div>
      )}
    </div>
  );
}
