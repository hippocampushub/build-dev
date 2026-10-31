import { Link } from "react-router-dom";
import { hhnbLaunchUrl, useHhnb, type HhnbFile } from "../lib/hhnb";
import { Drawer } from "./Overlay";
import { CloseIcon, ExternalIcon, FileIcon } from "./Icons";
import { pathOf } from "../lib/collections";

function FileRow({ file, onRemove }: { file: HhnbFile; onRemove: () => void }) {
  return (
    <div className="file-row">
      <FileIcon size={16} />
      <span className="name">{file.name}</span>
      <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }} onClick={onRemove} aria-label={`Remove ${file.name}`}>
        <CloseIcon size={16} />
      </button>
    </div>
  );
}

function Group({ title, to, empty, files, onRemove }: {
  title: string;
  to: string;
  empty: string;
  files: HhnbFile[];
  onRemove: (file: HhnbFile) => void;
}) {
  const { setTrayOpen } = useHhnb();
  return (
    <div className="tray-group">
      <div className="section">
        <h3>{title}</h3>
        {files.length ? (
          <div className="files">
            {files.map((f) => <FileRow key={f.url} file={f} onRemove={() => onRemove(f)} />)}
          </div>
        ) : (
          <div className="tray-empty">
            {empty} <Link to={to} onClick={() => setTrayOpen(false)}>Browse</Link>
          </div>
        )}
      </div>
    </div>
  );
}

export function HhnbTray() {
  const { selection, count, trayOpen, setTrayOpen, setMorphology, toggleTrace, toggleModFile, clear } = useHhnb();
  if (!trayOpen) return null;

  return (
    <Drawer
      eyebrow="Your selection"
      title="HH Neuron Builder"
      accent="var(--c-hhnb)"
      onClose={() => setTrayOpen(false)}
      footer={
        <>
          <a className="btn btn-primary" href={hhnbLaunchUrl(selection)} target="_blank" rel="noreferrer">
            Open in HH Neuron Builder <ExternalIcon size={16} />
          </a>
          <span style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={clear} disabled={count === 0}>Clear all</button>
        </>
      }
    >
      <p className="hint" style={{ marginTop: 0 }}>
        Pick one morphology, the electrophysiology traces and the .mod files to start from, then open the Neuron
        Builder on EBRAINS to optimize and simulate a single-cell model.
      </p>
      <Group
        title="Morphology (one)"
        to={pathOf("morphology")}
        empty="No morphology selected."
        files={selection.morphology ? [selection.morphology] : []}
        onRemove={() => setMorphology(null)}
      />
      <Group
        title={`Electrophysiology traces (${selection.electrophysiologies.length})`}
        to={pathOf("electrophysiology")}
        empty="No traces selected."
        files={selection.electrophysiologies}
        onRemove={toggleTrace}
      />
      <Group
        title={`Mod files (${selection.modFiles.length})`}
        to={pathOf("model")}
        empty="No .mod files selected. Add them from a model's details."
        files={selection.modFiles}
        onRemove={toggleModFile}
      />
    </Drawer>
  );
}
