import { useEffect, useState } from "react";

const DURATION = 2000; // ms
const STEPS = 25; // counts only the last numbers before the total, e.g. 138 -> 163

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** A number that rolls up through its last values to `value`, at an even pace. */
export function CountUp({ value }: { value: number }) {
  const from = Math.max(0, value - STEPS);
  const [shown, setShown] = useState(() => (reducedMotion() ? value : from));

  useEffect(() => {
    if (reducedMotion()) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION);
      setShown(Math.floor(from + (value - from) * progress));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [from, value]);

  return <>{shown.toLocaleString("en")}</>;
}
