import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { hhnbLaunchUrl, useHhnb, type HhnbFile } from "../lib/hhnb";
import { Drawer } from "./Overlay";
import { BuilderIcon, CheckIcon, CloseIcon, ExternalIcon, FileIcon } from "./Icons";
import { pathOf } from "../lib/collections";
import { useTerms } from "../lib/terms";

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

/** One step of the selection: a numbered marker that turns into a check once something is picked. */
function Step({ n, title, to, empty, files, onRemove }: {
  n: number;
  title: string;
  to: string;
  empty: string;
  files: HhnbFile[];
  onRemove: (file: HhnbFile) => void;
}) {
  const { setTrayOpen } = useHhnb();
  const done = files.length > 0;
  return (
    <li className={`tray-step${done ? " done" : ""}`}>
      <span className="step-marker" aria-hidden="true">{done ? <CheckIcon size={14} /> : n}</span>
      <div className="step-body">
        <div className="step-head">
          <h3>{title}</h3>
          <span className="step-status">{done ? `${files.length} selected` : "Not selected"}</span>
        </div>
        {done ? (
          <div className="files">
            {files.map((f) => <FileRow key={f.url} file={f} onRemove={() => onRemove(f)} />)}
          </div>
        ) : (
          <div className="tray-empty">
            {empty} <Link to={to} onClick={() => setTrayOpen(false)}>Browse</Link>
          </div>
        )}
      </div>
    </li>
  );
}

export function HhnbTray() {
  const { selection, count, trayOpen, setTrayOpen, setMorphology, toggleTrace, toggleModFile, clear } = useHhnb();
  const { guardLink } = useTerms();
  if (!trayOpen) return null;
  const launchUrl = hhnbLaunchUrl(selection);

  return (
    <Drawer
      className="drawer-hhnb"
      icon={<BuilderIcon size={28} />}
      eyebrow="Your selection"
      title="HH Neuron Builder"
      accent="var(--c-hhnb)"
      onClose={() => setTrayOpen(false)}
      footer={
        <div className="tray-launch">
          <span className={`step-marker${count ? " ready" : ""}`} aria-hidden="true">4</span>
          <a className="btn btn-primary btn-lg" href={launchUrl} target="_blank" rel="noreferrer" onClick={guardLink(launchUrl)}>
            Open in HH Neuron Builder <ExternalIcon size={16} />
          </a>
        </div>
      }
    >
      <div className="tray-intro">
        <p className="hint">
          Pick one morphology, the electrophysiology traces and the .mod files to start from, then open the Neuron
          Builder on EBRAINS to optimize and simulate a single-cell model.
        </p>
        <button className="link-button" onClick={clear} disabled={count === 0}>Clear all</button>
      </div>
      <ol className="tray-steps">
        <Step
          n={1}
          title="Morphology"
          to={pathOf("morphology")}
          empty="No morphology selected."
          files={selection.morphology ? [selection.morphology] : []}
          onRemove={() => setMorphology(null)}
        />
        <Step
          n={2}
          title="Electrophysiology traces"
          to={pathOf("electrophysiology")}
          empty="No traces selected."
          files={selection.electrophysiologies}
          onRemove={toggleTrace}
        />
        <Step
          n={3}
          title="Mod files"
          to={pathOf("model")}
          empty="No .mod files selected. Add them from a model's details."
          files={selection.modFiles}
          onRemove={toggleModFile}
        />
      </ol>
    </Drawer>
  );
}

/** Short confirmation when something is added to the selection, with a shortcut to the tray. */
export function HhnbToast() {
  const { added, dismissAdded, count, trayOpen, setTrayOpen } = useHhnb();
  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(dismissAdded, 3500);
    return () => clearTimeout(timer);
  }, [added, dismissAdded]);
  if (!added || trayOpen) return null;

  return createPortal(
    <div className="hhnb-toast" role="status" key={added.id}>
      <BuilderIcon size={22} />
      <span className="text">
        <strong>{added.name}</strong> added to your HH Neuron Builder selection ({count})
      </span>
      <button className="link-button" onClick={() => { dismissAdded(); setTrayOpen(true); }}>View</button>
    </div>,
    document.body,
  );
}
