import { createContext, useCallback, useContext, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { Dialog } from "../components/Overlay";
import { clearAnalyticsCookies, loadAnalytics } from "./analytics";

// Terms of use: same key and value as the previous site (www.hippocampushub.eu/build), so whoever accepted them
// there is not asked again. It covers the terms only: it was never a valid consent to statistics.
const TERMS_KEY = "HFH_TOS";
// Statistics (Google Analytics): a separate, freely given choice that can be changed at any time
const STATS_KEY = "hh-build:statistics";

export type StatisticsChoice = "granted" | "denied" | null;

function read<T>(key: string, parse: (raw: string) => T, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : parse(raw);
  } catch {
    return fallback;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable: the choice holds for this visit only
  }
}

const SOURCES = [
  ["NeuroMorpho", "https://neuromorpho.org/useterm.jsp"],
  ["Hippocampome", "https://hippocampome.org/php/Help_Terms_of_Use.php"],
  ["ModelDB", "https://modeldb.science/"],
  ["EBRAINS Knowledge Graph", "https://kg.ebrains.eu/search-terms-of-use.html?v=2.2"],
];

/** The previous site's terms of use, with the links to the four sources' terms. */
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
    </>
  );
}

interface TermsContextValue {
  /** onClick for a link to a resource (download, .mod file, Neuron Builder): asks for the terms first. */
  guardLink: (url: string) => (e: MouseEvent<HTMLAnchorElement>) => void;
  /** Runs the action now if the terms are accepted, otherwise once the visitor accepts them in a dialog. */
  withTerms: (action: () => void) => void;
  statistics: StatisticsChoice;
  setStatistics: (choice: StatisticsChoice) => void;
}

const TermsContext = createContext<TermsContextValue | null>(null);

/**
 * Browsing is free. Downloads, .mod files and the Neuron Builder need the terms of use accepted once.
 * Statistics are a separate choice (accept or reject, equally easy), asked in the notice bar.
 */
export function TermsProvider({ children }: { children: ReactNode }) {
  const [agreed, setAgreed] = useState(() => read(TERMS_KEY, (raw) => JSON.parse(raw)?.agree === true, false));
  const [statistics, setStatisticsState] = useState<StatisticsChoice>(() =>
    read(STATS_KEY, (raw) => (raw === "granted" || raw === "denied" ? raw : null), null),
  );
  const [pending, setPending] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (statistics === "granted") loadAnalytics();
  }, [statistics]);

  const setStatistics = useCallback(
    (choice: StatisticsChoice) => {
      if (choice) write(STATS_KEY, choice);
      else {
        try {
          localStorage.removeItem(STATS_KEY);
        } catch {
          // nothing stored
        }
      }
      // withdrawing a consent already given: drop the statistics cookies and stop the loaded script
      if (statistics === "granted" && choice !== "granted") {
        clearAnalyticsCookies();
        window.location.reload();
        return;
      }
      setStatisticsState(choice);
    },
    [statistics],
  );

  const acceptTerms = useCallback(() => {
    write(TERMS_KEY, JSON.stringify({ agree: true }));
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

  const value = useMemo(
    () => ({ guardLink, withTerms, statistics, setStatistics }),
    [guardLink, withTerms, statistics, setStatistics],
  );

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
                  acceptTerms();
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
