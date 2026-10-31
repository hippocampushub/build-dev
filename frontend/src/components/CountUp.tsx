import { useEffect, useState } from "react";

// The last 15 values roll in 1.5 s, slowing down smoothly: each step lasts 15% longer
// than the previous one (from about 30 ms to about 220 ms).
const STEPS = 15;
const DURATION = 1500; // ms
const GROWTH = 1.15;

// time (ms from the start) at which each step is shown
const FIRST = (DURATION * (GROWTH - 1)) / (Math.pow(GROWTH, STEPS) - 1);
const STEP_TIMES = Array.from({ length: STEPS }, (_, i) => (FIRST * (Math.pow(GROWTH, i + 1) - 1)) / (GROWTH - 1));

/**
 * A number that rolls up through its last values to `value`, slowing down at the end.
 * It always rolls, also when the system asks to reduce motion: the effect is small.
 */
export function CountUp({ value }: { value: number }) {
  const from = Math.max(0, value - STEPS);
  const [shown, setShown] = useState(from);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = Math.max(0, now - start);
      const done = STEP_TIMES.filter((t) => t <= elapsed).length;
      setShown(Math.min(value, from + done));
      if (elapsed < DURATION) frame = requestAnimationFrame(step);
      else setShown(value);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [from, value]);

  return <>{shown.toLocaleString("en")}</>;
}
