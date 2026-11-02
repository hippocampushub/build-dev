/**
 * A number whose digits fade in one after the other, without moving.
 * It always runs, also when the system asks to reduce motion: only the opacity changes.
 */
export function FadeInNumber({ value }: { value: number }) {
  const text = value.toLocaleString("en");
  return (
    <span className="fade-number" aria-label={text}>
      {[...text].map((ch, i) => (
        <span key={i} aria-hidden style={{ "--i": i } as React.CSSProperties}>
          {ch}
        </span>
      ))}
    </span>
  );
}
