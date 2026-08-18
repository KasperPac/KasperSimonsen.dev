"use client";

import { useEffect, useRef } from "react";

export default function InversionCursor({
  children,
}: {
  children: React.ReactNode;
}) {
  const wrapRef   = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const stateRef  = useRef({
    x: 0, y: 0, tx: 0, ty: 0,
    scale: 0, targetScale: 0,
    raf: 0,
  });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;

    const wrap   = wrapRef.current;
    const cursor = cursorRef.current;
    if (!wrap || !cursor) return;

    const HALF = 90;
    const s = stateRef.current;

    function tick() {
      s.x     += (s.tx     - s.x)     * 0.25;
      s.y     += (s.ty     - s.y)     * 0.25;
      s.scale += (s.targetScale - s.scale) * 0.15;
      cursor!.style.transform =
        `translate3d(${s.x}px, ${s.y}px, 0) scale(${s.scale})`;
      s.raf = requestAnimationFrame(tick);
    }

    function onMove(e: MouseEvent) {
      s.tx = e.clientX - HALF;
      s.ty = e.clientY - HALF;
    }

    function onEnter() {
      s.targetScale = 1;
      wrap!.style.cursor = "none";
    }

    function onLeave() {
      s.targetScale = 0;
      wrap!.style.cursor = "";
    }

    wrap.addEventListener("mousemove", onMove);
    wrap.addEventListener("mouseenter", onEnter);
    wrap.addEventListener("mouseleave", onLeave);
    s.raf = requestAnimationFrame(tick);

    return () => {
      wrap.removeEventListener("mousemove", onMove);
      wrap.removeEventListener("mouseenter", onEnter);
      wrap.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(s.raf);
    };
  }, []);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {children}
      {/*
        mix-blend-mode must be on the fixed element itself, not a child.
        A wrapper with willChange/zIndex creates an isolated stacking context
        that prevents blending with page content behind it.
      */}
      <div
        ref={cursorRef}
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "white",
          mixBlendMode: "difference",
          pointerEvents: "none",
          zIndex: 9999,
          transform: "translate3d(0px, 0px, 0) scale(0)",
        }}
      />
    </div>
  );
}
