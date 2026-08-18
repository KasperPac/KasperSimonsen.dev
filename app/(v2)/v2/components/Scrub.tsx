"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Publishes scroll progress as CSS variables on its element, for descendants
 * to consume in `translate:` / `scale:` / `opacity:` declarations:
 *   --p   0 → 1 view progress (mode "view": enters bottom → leaves top;
 *              mode "exit": 0 while fully on screen → 1 once scrolled past)
 *   --pc  -1 → 1 centered progress (0 when element is mid-viewport)
 * Variables stay unset without JS or under reduced motion, so every consumer
 * must give a neutral fallback: var(--p, 0) / var(--pc, 0).
 */
export default function Scrub({
  mode = "view",
  className = "",
  id,
  style,
  children,
}: {
  mode?: "view" | "exit";
  className?: string;
  id?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p =
        mode === "exit"
          ? Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)))
          : Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
      el.style.setProperty("--p", p.toFixed(4));
      el.style.setProperty("--pc", (p * 2 - 1).toFixed(4));
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
  }, [mode]);

  return (
    <div ref={ref} id={id} className={className} style={style}>
      {children}
    </div>
  );
}
