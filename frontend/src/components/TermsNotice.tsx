import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTerms } from "../lib/terms";

/**
 * Asks once whether visits may be counted with Google Analytics. Accept and Reject are equally prominent,
 * nothing is loaded before Accept, and the choice can be changed from the footer ("Statistics preferences").
 */
export function TermsNotice() {
  const { statistics, setStatistics } = useTerms();
  const bar = useRef<HTMLDivElement>(null);
  const open = statistics === null;

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
  }, [open]);

  if (!open) return null;

  return (
    <div className="terms-notice" role="region" aria-label="Statistics cookies" ref={bar}>
      <div className="container terms-notice-inner">
        <p>
          With your consent, we use Google Analytics to count visits to this site and see which pages are used. Its
          statistics cookies are set only if you accept; we do not use cookies for commercial or profiling purposes.
          Browsing without accepting is fine, and you can change your choice at any time from "Statistics preferences"
          at the bottom of the page. <Link to="/about#privacy_and_cookie_policy">Privacy and cookie policy</Link>
        </p>
        <div className="terms-notice-actions">
          <button className="btn" onClick={() => setStatistics("denied")}>Reject</button>
          <button className="btn" onClick={() => setStatistics("granted")}>Accept</button>
        </div>
      </div>
    </div>
  );
}
