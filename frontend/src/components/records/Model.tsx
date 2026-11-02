import type { Model } from "../../lib/types";
import { useHhnb } from "../../lib/hhnb";
import { useTerms } from "../../lib/terms";
import { formatDate } from "../../lib/format";
import { BuilderIcon, CheckIcon, SendIcon } from "../Icons";
import { DownloadButton } from "../DownloadButton";
import { Papers, Section, SourceBadge, SourceLink, Tags } from "./common";

export function ModelCard({ item, onOpen }: { item: Model; onOpen: () => void }) {
  const modCount = item.model_files?.length ?? 0;
  return (
    <article className="card model-card">
      <div className="card-body">
        <div className="model-head">
          <h2 className="card-title"><button onClick={onOpen}>{item.name}</button></h2>
          <SourceBadge source={item.source} />
        </div>
        {item.description && <p className="card-desc">{item.description}</p>}
        <div className="model-meta">
          {item.cell_types?.length ? (
            <div>
              <p className="meta-label">Cell types</p>
              <Tags values={item.cell_types} accent limit={3} />
            </div>
          ) : null}
          {item.channels?.length ? (
            <div>
              <p className="meta-label">Channels</p>
              <Tags values={item.channels} limit={5} />
            </div>
          ) : null}
          {item.model_concepts?.length ? (
            <div>
              <p className="meta-label">Concepts</p>
              <Tags values={item.model_concepts} limit={3} />
            </div>
          ) : null}
        </div>
        <div className="card-actions">
          <span className="hint">
            {item.papers?.[0]?.label}
            {modCount > 0 && ` · ${modCount} .mod file${modCount === 1 ? "" : "s"}`}
          </span>
          <span className="spacer" />
          <button className="btn btn-sm" onClick={onOpen}>Details & mod files</button>
          <DownloadButton url={item.download_link} source={item.source} label="ZIP" />
        </div>
      </div>
    </article>
  );
}

function ModFiles({ item }: { item: Model }) {
  const { hasModFile, toggleModFile } = useHhnb();
  const { guardLink } = useTerms();
  if (item.model_files === null || item.model_files === undefined) {
    return (
      <Section title="Mod files">
        <p className="hint">
          The file list for this model has not been fetched yet. The full model is available as a ZIP from ModelDB.
        </p>
      </Section>
    );
  }
  if (!item.model_files.length) {
    return (
      <Section title="Mod files">
        <p className="hint">This model has no .mod files.</p>
      </Section>
    );
  }
  const files = item.model_files.map((f) => ({ name: f.label, url: f.url, path: f.path }));
  const allSelected = files.every((f) => hasModFile(f.url));
  const toggleAll = () => files.forEach((f) => (allSelected || !hasModFile(f.url)) && toggleModFile({ name: f.name, url: f.url }));

  return (
    <Section title={`Mod files (${files.length})`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span className="hint">Add the mechanisms you need to the HH Neuron Builder selection.</span>
        <button className="link-button" onClick={toggleAll}>{allSelected ? "Remove all" : "Add all"}</button>
      </div>
      <div className="files">
        {files.map((f) => {
          const selected = hasModFile(f.url);
          return (
            <div className="file-row" key={f.url}>
              <span className="name">
                <a href={f.url} target="_blank" rel="noreferrer" onClick={guardLink(f.url)}>{f.name}</a>
                {f.path !== f.name && <div className="path">{f.path}</div>}
              </span>
              <button
                className={`btn btn-sm${selected ? " selected" : ""}`}
                onClick={() => toggleModFile({ name: f.name, url: f.url })}
                aria-pressed={selected}
                aria-label={`${selected ? "Remove" : "Add"} ${f.name} ${selected ? "from" : "to"} the HH Neuron Builder selection`}
              >
                {selected ? <CheckIcon size={16} /> : <SendIcon size={15} />}
                {selected ? "Added" : "HHNB"}
              </button>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function TagSection({ title, values }: { title: string; values?: string[] }) {
  return values?.length ? (
    <Section title={title}>
      <Tags values={values} />
    </Section>
  ) : null;
}

export function ModelDetail({ item }: { item: Model }) {
  return (
    <>
      {item.description && (
        <Section title="Description">
          <p className="prose">{item.description}</p>
        </Section>
      )}
      <div className="detail-links">
        <DownloadButton url={item.download_link} source={item.source} label="Download ZIP" small={false} primary />
        <span style={{ flex: 1 }} />
        <SourceLink url={item.readme_link} label="README" />
        <SourceLink url={item.github_link} label="GitHub" />
        <SourceLink url={item.page_link} label="ModelDB" />
      </div>
      <ModFiles item={item} />
      <TagSection title="Cell types" values={item.cell_types} />
      <TagSection title="Channels" values={item.channels} />
      <TagSection title="Receptors" values={item.receptors} />
      <TagSection title="Model type" values={item.model_types} />
      <TagSection title="Model concepts" values={item.model_concepts} />
      <TagSection title="Implemented by" values={item.implementers} />
      <Papers papers={item.papers} />
      <Section title="Record">
        <p className="hint" style={{ margin: 0 }}>
          ModelDB {item.id}
          {formatDate(item.created) && ` · created ${formatDate(item.created)}`}
          {formatDate(item.updated) && ` · updated ${formatDate(item.updated)}`}
        </p>
      </Section>
    </>
  );
}

/** The model's links sit under its title, so the footer is left to the HH Neuron Builder selection. */
export function ModelFooter() {
  const { count, setTrayOpen } = useHhnb();
  return (
    <button className="btn hhnb-open" onClick={() => setTrayOpen(true)}>
      <BuilderIcon size={20} />
      View selected HHNB items
      <span className="badge-count">{count}</span>
    </button>
  );
}
