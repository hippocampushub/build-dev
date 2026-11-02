import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { loadAnalytics } from "../lib/analytics";

// Same key and value as the previous site (www.hippocampushub.eu/build): whoever agreed there is not asked again
const STORAGE_KEY = "HFH_TOS";

function hasAgreed() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")?.agree === true;
  } catch {
    return false;
  }
}

const TERMS = [
  ["NeuroMorpho", "https://neuromorpho.org/useterm.jsp"],
  ["Hippocampome", "https://hippocampome.org/php/Help_Terms_of_Use.php"],
  ["ModelDB", "https://modeldb.science/"],
  ["EBRAINS Knowledge Graph", "https://kg.ebrains.eu/search-terms-of-use.html?v=2.2"],
];

/** The previous site's terms of use notice; agreeing also allows the statistics (Google Analytics). */
export function TermsNotice() {
  const [agreed, setAgreed] = useState(hasAgreed);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (agreed) loadAnalytics();
  }, [agreed]);

  // other fixed elements at the bottom (the HHNB toast) sit above the bar while it is shown
  useLayoutEffect(() => {
    const root = document.documentElement;
    const el = bar.current;
    if (!el) {
      root.style.removeProperty("--notice-h");
      return;
    }
    const update = () => root.style.setProperty("--notice-h", `${el.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--notice-h");
    };
  }, [agreed]);

  if (agreed) return null;

  const agree = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ agree: true }));
    } catch {
      // storage unavailable: agreed for this visit only
    }
    setAgreed(true);
  };

  return (
    <div className="terms-notice" role="region" aria-label="Terms of use" ref={bar}>
      <div className="container terms-notice-inner">
        <p>
          By downloading or using the resources linked in this section, you accept the Terms of Use of{" "}
          {TERMS.map(([name, url], i) => (
            <span key={name}>
              <a href={url} target="_blank" rel="noreferrer">{name}</a>
              {i < TERMS.length - 2 ? ", " : i === TERMS.length - 2 ? " and " : "."}
            </span>
          ))}
          <br />
          Our site saves cookies on your device for technical and statistical reasons and should not be disabled. We do
          not use cookies for commercial or profiling purposes. By browsing our website you grant us permission to store
          cookies on your device.
        </p>
        <button className="btn btn-primary" onClick={agree}>I agree</button>
      </div>
    </div>
  );
}
