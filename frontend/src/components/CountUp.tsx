import { useEffect, useState } from "react";

const DURATION = 2000; // ms

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** A number that counts up from 0 to `value` (easing out) once it is known. */
export function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0));

  useEffect(() => {
    if (reducedMotion()) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION);
      setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{shown.toLocaleString("en")}</>;
}
