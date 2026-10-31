import { useEffect, useState } from "react";

// The last 15 values roll in 1.5 s: the first 11 quickly and evenly (600 ms),
// the last 4 slowing down (150, 200, 250 and 300 ms).
const FAST_STEPS = 11;
const FAST_TIME = 600; // ms
const SLOW_STEPS = [150, 200, 250, 300]; // ms each
const STEPS = FAST_STEPS + SLOW_STEPS.length;

// time (ms from the start) at which each step is shown
const STEP_TIMES = [
  ...Array.from({ length: FAST_STEPS }, (_, i) => ((i + 1) * FAST_TIME) / FAST_STEPS),
  ...SLOW_STEPS.map((_, i) => FAST_TIME + SLOW_STEPS.slice(0, i + 1).reduce((a, b) => a + b, 0)),
];
const DURATION = STEP_TIMES[STEP_TIMES.length - 1];

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
