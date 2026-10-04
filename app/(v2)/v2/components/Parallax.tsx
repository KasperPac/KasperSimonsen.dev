"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Slow vertical drift relative to scroll. Measures the PARENT element so the
 * transform applied here never feeds back into the measurement.
 */
export default function Parallax({
  speed = 0.18,
  className = "",
  children,
}: {
  speed?: number;
  className?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const update = () => {
      const rect = parent.getBoundingClientRect();
      const mid = rect.top + rect.height / 2 - window.innerHeight / 2;
      el.style.transform = `translate3d(0, ${(-mid * speed).toFixed(1)}px, 0)`;
    };

    // rAF-driven (recompute only when the scroll position moved) — scroll
    // events are unreliable under Lenis for programmatic jumps.
    let lastY = -1;
    let raf = requestAnimationFrame(function loop() {
      if (window.scrollY !== lastY) {
        lastY = window.scrollY;
        update();
      }
      raf = requestAnimationFrame(loop);
    });
    const onResize = () => {
      lastY = -1;
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, [speed]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
