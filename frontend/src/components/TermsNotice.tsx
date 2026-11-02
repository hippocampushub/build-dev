import { useLayoutEffect, useRef } from "react";
import { TermsText, useTerms } from "../lib/terms";

/** The previous site's terms of use notice, shown at the bottom of the page until the visitor agrees. */
export function TermsNotice() {
  const { agreed, agree } = useTerms();
  const bar = useRef<HTMLDivElement>(null);

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

  return (
    <div className="terms-notice" role="region" aria-label="Terms of use" ref={bar}>
      <div className="container terms-notice-inner">
        <p><TermsText /></p>
        <button className="btn btn-primary" onClick={agree}>I agree</button>
      </div>
    </div>
  );
}
