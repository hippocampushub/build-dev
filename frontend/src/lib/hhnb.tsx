import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export const HHNB_URL = "https://hhnb.ebrains-italy.eu/hh-neuron-builder/";
const STORAGE_KEY = "hh-build:hhnb-selection";

export interface HhnbFile {
  name: string;
  url: string;
}

export interface HhnbSelection {
  morphology: HhnbFile | null;
  electrophysiologies: HhnbFile[];
  modFiles: HhnbFile[];
}

const EMPTY: HhnbSelection = { morphology: null, electrophysiologies: [], modFiles: [] };

/** Same hand-off as the previous site: hhf-comm?hhf_dict={"HHF-Comm": {...}} with URI-encoded values. */
export function hhnbLaunchUrl(selection: HhnbSelection): string {
  const comm: Record<string, unknown> = {};
  if (selection.morphology) {
    comm.morphology = {
      name: encodeURIComponent(selection.morphology.name),
      url: encodeURIComponent(selection.morphology.url),
    };
  }
  if (selection.electrophysiologies.length) {
    comm.electrophysiologies = selection.electrophysiologies.map((e) => ({
      name: encodeURIComponent(e.name),
      url: encodeURIComponent(e.url),
      metadata: encodeURIComponent("null"),
    }));
  }
  if (selection.modFiles.length) {
    comm.modFiles = selection.modFiles.map((m) => ({ name: encodeURIComponent(m.name), url: encodeURIComponent(m.url) }));
  }
  return Object.keys(comm).length
    ? `${HHNB_URL}/hhf-comm?hhf_dict=${JSON.stringify({ "HHF-Comm": comm })}`
    : HHNB_URL;
}

// The selection belongs to the browser tab (sessionStorage): it survives a reload, while a new tab starts empty.
function readStored(): HhnbSelection {
  try {
    // selections saved by earlier versions in localStorage (shared by all tabs) are dropped
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable
  }
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
    return stored ? { ...EMPTY, ...stored } : EMPTY;
  } catch {
    return EMPTY;
  }
}

interface HhnbContextValue {
  selection: HhnbSelection;
  count: number;
  setMorphology: (file: HhnbFile | null) => void;
  toggleTrace: (file: HhnbFile) => void;
  toggleModFile: (file: HhnbFile) => void;
  hasTrace: (url: string) => boolean;
  hasModFile: (url: string) => boolean;
  clear: () => void;
  trayOpen: boolean;
  setTrayOpen: (open: boolean) => void;
  /** The last file added to the selection, for the confirmation toast; id changes on every addition. */
  added: { id: number; name: string } | null;
  dismissAdded: () => void;
}

const HhnbContext = createContext<HhnbContextValue | null>(null);

const urls = (s: HhnbSelection) =>
  new Set([...(s.morphology ? [s.morphology] : []), ...s.electrophysiologies, ...s.modFiles].map((f) => f.url));

const toggle = (list: HhnbFile[], file: HhnbFile) =>
  list.some((f) => f.url === file.url) ? list.filter((f) => f.url !== file.url) : [...list, file];

export function HhnbProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<HhnbSelection>(readStored);
  const [trayOpen, setTrayOpen] = useState(false);
  const [added, setAdded] = useState<HhnbContextValue["added"]>(null);
  const previous = useRef(selection);
  const additions = useRef(0);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    } catch {
      // storage unavailable: the selection still works until the page is reloaded
    }
  }, [selection]);

  // announce whatever was just added (not removals, nor the selection restored from storage)
  useEffect(() => {
    const before = urls(previous.current);
    previous.current = selection;
    const fresh = [...(selection.morphology ? [selection.morphology] : []), ...selection.electrophysiologies, ...selection.modFiles]
      .filter((f) => !before.has(f.url));
    if (fresh.length) setAdded({ id: ++additions.current, name: fresh.length > 1 ? `${fresh.length} files` : fresh[0].name });
  }, [selection]);
  const dismissAdded = useCallback(() => setAdded(null), []);

  const setMorphology = useCallback((file: HhnbFile | null) => setSelection((s) => ({ ...s, morphology: file })), []);
  const toggleTrace = useCallback(
    (file: HhnbFile) => setSelection((s) => ({ ...s, electrophysiologies: toggle(s.electrophysiologies, file) })),
    [],
  );
  const toggleModFile = useCallback(
    (file: HhnbFile) => setSelection((s) => ({ ...s, modFiles: toggle(s.modFiles, file) })),
    [],
  );

  const value = useMemo<HhnbContextValue>(
    () => ({
      selection,
      count: (selection.morphology ? 1 : 0) + selection.electrophysiologies.length + selection.modFiles.length,
      setMorphology,
      toggleTrace,
      toggleModFile,
      hasTrace: (url) => selection.electrophysiologies.some((f) => f.url === url),
      hasModFile: (url) => selection.modFiles.some((f) => f.url === url),
      clear: () => setSelection(EMPTY),
      trayOpen,
      setTrayOpen,
      added,
      dismissAdded,
    }),
    [selection, trayOpen, added, setMorphology, toggleTrace, toggleModFile, dismissAdded],
  );

  return <HhnbContext.Provider value={value}>{children}</HhnbContext.Provider>;
}

export function useHhnb() {
  const value = useContext(HhnbContext);
  if (!value) throw new Error("useHhnb outside HhnbProvider");
  return value;
}
