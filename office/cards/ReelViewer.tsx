"use client";

import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { slides } from "@/content/screens";
import { COPY } from "@/office/copy";

const FOCUSABLE = "button:not([disabled])";

/**
 * The reel's full-screen view (spec 3.5 3a): the screenshot over the whole window, on black, uncropped at its own size,
 * with its label, ‹ › and close. Esc and close call `onClose` (one history step back); ← → step; focus returns to the
 * monitor (whatever opened it).
 */
export default function ReelViewer({ index, titleId, onStep, onClose }: { index: number; titleId: string; onStep: (dir: 1 | -1) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!opener.current) opener.current = document.activeElement as HTMLElement | null;
  }, []);
  useEffect(() => {
    const back = opener.current;
    dialog.current?.focus({ preventScroll: true });
    return () => back?.focus?.({ preventScroll: true });
  }, []);
  const slide = slides[index];
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      onClose();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      onStep(e.key === "ArrowLeft" ? -1 : 1);
    } else if (e.key === "Tab" && dialog.current) {
      const items = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  return (
    <div ref={dialog} className="reel-viewer" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={onKeyDown}>
      <p id={titleId} className="reel-viewer-label">{slide.label}</p>
      <img className="reel-viewer-shot" src={slide.shot.src} alt={slide.shot.alt} draggable={false} />
      <button type="button" className="reel-viewer-step reel-viewer-step--prev" aria-label={COPY.reel.prev} onClick={() => onStep(-1)}>‹</button>
      <button type="button" className="reel-viewer-step reel-viewer-step--next" aria-label={COPY.reel.next} onClick={() => onStep(1)}>›</button>
      <button type="button" className="reel-viewer-close" onClick={onClose}>{COPY.close}</button>
    </div>
  );
}
