/** Infinite horizontal ticker. Odd-indexed items render in the serif italic. */
export default function Marquee({ items }: { items: string[] }) {
  const track = (hidden: boolean) => (
    <div className="v2-marquee-track" aria-hidden={hidden || undefined}>
      {Array.from({ length: 3 }).flatMap((_, rep) =>
        items.map((item, i) => (
          <span
            key={`${rep}-${i}`}
            className={i % 2 === 1 ? "v2-marquee-item v2-marquee-item--it" : "v2-marquee-item"}
          >
            {item}
          </span>
        ))
      )}
    </div>
  );

  return (
    <div className="v2-marquee">
      {track(false)}
      {track(true)}
    </div>
  );
}
