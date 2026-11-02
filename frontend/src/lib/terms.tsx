import { createContext, useCallback, useContext, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { Dialog } from "../components/Overlay";
import { loadAnalytics } from "./analytics";

// Same key and value as the previous site (www.hippocampushub.eu/build): whoever agreed there is not asked again
const STORAGE_KEY = "HFH_TOS";

function readAgreed() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")?.agree === true;
  } catch {
    return false;
  }
}

const SOURCES = [
  ["NeuroMorpho", "https://neuromorpho.org/useterm.jsp"],
  ["Hippocampome", "https://hippocampome.org/php/Help_Terms_of_Use.php"],
  ["ModelDB", "https://modeldb.science/"],
  ["EBRAINS Knowledge Graph", "https://kg.ebrains.eu/search-terms-of-use.html?v=2.2"],
];

/** The previous site's terms of use text, with the links to the four sources' terms. */
export function TermsText() {
  return (
    <>
      By downloading or using the resources linked in this section, you accept the Terms of Use of{" "}
      {SOURCES.map(([name, url], i) => (
        <span key={name}>
          <a href={url} target="_blank" rel="noreferrer">{name}</a>
          {i < SOURCES.length - 2 ? ", " : i === SOURCES.length - 2 ? " and " : "."}
        </span>
      ))}
      <br />
      Our site saves cookies on your device for technical and statistical reasons and should not be disabled. We do not
      use cookies for commercial or profiling purposes. By browsing our website you grant us permission to store cookies
      on your device.
    </>
  );
}

interface TermsContextValue {
  agreed: boolean;
  agree: () => void;
  /** Runs the action now if the terms are accepted, otherwise once the visitor accepts them in a dialog. */
  withTerms: (action: () => void) => void;
  /** onClick for a link to a resource (download, .mod file, Neuron Builder): asks for the terms first. */
  guardLink: (url: string) => (e: MouseEvent<HTMLAnchorElement>) => void;
}

const TermsContext = createContext<TermsContextValue | null>(null);

/** Browsing is free; downloading or opening the Neuron Builder needs the terms accepted once (which also allows the statistics). */
export function TermsProvider({ children }: { children: ReactNode }) {
  const [agreed, setAgreed] = useState(readAgreed);
  const [pending, setPending] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (agreed) loadAnalytics();
  }, [agreed]);

  const agree = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ agree: true }));
    } catch {
      // storage unavailable: agreed for this visit only
    }
    setAgreed(true);
  }, []);

  const withTerms = useCallback(
    (action: () => void) => (agreed ? action() : setPending(() => action)),
    [agreed],
  );

  const guardLink = useCallback(
    (url: string) => (e: MouseEvent<HTMLAnchorElement>) => {
      if (agreed) return;
      e.preventDefault();
      setPending(() => () => window.open(url, "_blank", "noopener"));
    },
    [agreed],
  );

  const value = useMemo(() => ({ agreed, agree, withTerms, guardLink }), [agreed, agree, withTerms, guardLink]);

  return (
    <TermsContext.Provider value={value}>
      {children}
      {pending && (
        <Dialog
          title="Terms of use"
          onClose={() => setPending(null)}
          actions={
            <>
              <button className="btn" onClick={() => setPending(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  agree();
                  setPending(null);
                  pending();
                }}
              >
                I agree and continue
              </button>
            </>
          }
        >
          <p className="terms-dialog-text"><TermsText /></p>
        </Dialog>
      )}
    </TermsContext.Provider>
  );
}

export function useTerms() {
  const value = useContext(TermsContext);
  if (!value) throw new Error("useTerms outside TermsProvider");
  return value;
}
