"use client";

import { useEffect, useRef } from "react";

/**
 * Infinite ticker whose speed is coupled to scroll velocity — cruises slowly,
 * surges while you scroll. Odd-indexed items render in the serif italic.
 * Without JS the CSS keyframe animation takes over; under reduced motion it
 * holds still.
 */
export default function Marquee({ items }: { items: string[] }) {
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // JS drives from here — kill the CSS fallback animation.
    for (const track of Array.from(inner.children)) {
      (track as HTMLElement).style.animation = "none";
    }

    const trackWidth = () => (inner.children[0] as HTMLElement).offsetWidth;
    let x = 0;
    let lastY = window.scrollY;
    let velocity = 0;
    let lastTime = performance.now();
    let raf = 0;

    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;
      const y = window.scrollY;
      velocity = velocity * 0.9 + Math.abs(y - lastY) * 0.1;
      lastY = y;

      x -= (60 + Math.min(velocity * 22, 900)) * dt;
      const w = trackWidth();
      if (w > 0 && x <= -w) x += w;
      inner.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

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
      <div className="v2-marquee-inner" ref={innerRef}>
        {track(false)}
        {track(true)}
      </div>
    </div>
  );
}
