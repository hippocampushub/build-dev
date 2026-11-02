import { useState } from "react";
import { Dialog } from "./Overlay";
import { DownloadIcon } from "./Icons";
import { useTerms } from "../lib/terms";

const AGREED_KEY = "hh-build:neuromorpho-terms";
const TERMS_URL = "https://neuromorpho.org/useterm.jsp";

function hasAgreed() {
  try {
    return sessionStorage.getItem(AGREED_KEY) === "yes";
  } catch {
    return false;
  }
}

/** Opens a download link; NeuroMorpho files first ask to accept NeuroMorpho's terms of use (once per session). */
export function DownloadButton({
  url,
  source,
  label = "Download",
  small = true,
  primary = false,
}: {
  url?: string | null;
  source?: string;
  label?: string;
  small?: boolean;
  primary?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const { withTerms, guardLink } = useTerms();
  if (!url) return null;
  const needsTerms = source?.toLowerCase() === "neuromorpho";
  const className = `btn${small ? " btn-sm" : ""}${primary ? " btn-primary" : ""}`;
  // Icon-only buttons still need a name for screen readers and a tooltip
  const a11y = label ? {} : { "aria-label": "Download", title: "Download" };

  if (!needsTerms) {
    return (
      <a className={className} href={url} target="_blank" rel="noreferrer" onClick={guardLink(url)} {...a11y}>
        <DownloadIcon size={16} /> {label}
      </a>
    );
  }

  const download = () => window.open(url, "_blank", "noopener");
  const agree = () => {
    try {
      sessionStorage.setItem(AGREED_KEY, "yes");
    } catch {
      // ignore: asked again next time
    }
    setAsking(false);
    download();
  };

  return (
    <>
      <button className={className} onClick={() => withTerms(() => (hasAgreed() ? download() : setAsking(true)))} {...a11y}>
        <DownloadIcon size={16} /> {label}
      </button>
      {asking && (
        <Dialog
          title="NeuroMorpho.org terms of use"
          onClose={() => setAsking(false)}
          actions={
            <>
              <button className="btn" onClick={() => setAsking(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={agree}>Agree and download</button>
            </>
          }
        >
          <p>
            This reconstruction is distributed by NeuroMorpho.org. By downloading it you agree to NeuroMorpho.org's
            terms of use, including citing the original publication and NeuroMorpho.org when you use the data.
          </p>
          <p>
            <a href={TERMS_URL} target="_blank" rel="noreferrer">Read the terms of use</a>
          </p>
        </Dialog>
      )}
    </>
  );
}
