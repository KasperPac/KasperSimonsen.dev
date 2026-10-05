"use client";

import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { slides } from "@/content/screens";
import { COPY } from "@/office/copy";

const FOCUSABLE = "button:not([disabled])";

/**
 * The reel's full-screen view (spec 3.5 3a): the screenshot over the whole window, on black, uncropped at its own size,
 * with its label, ‹ › and close (on portrait screens ‹ › sit below the image). It is named for the slide and described by "Slide n of N". Esc and close call `onClose` (one history step back); ← → step; focus returns to the
 * monitor: to what opened it when that's a control on the monitor's print (the expand button), else to `returnTo`, the
 * print's heading (a click on the screenshot leaves focus on the page, not on the monitor).
 */
export default function ReelViewer({ index, titleId, returnTo, onStep, onClose }: {
  index: number; titleId: string; returnTo: string; onStep: (dir: 1 | -1) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!opener.current) opener.current = document.activeElement as HTMLElement | null;
  }, []);
  useEffect(() => {
    const from = opener.current;
    dialog.current?.focus({ preventScroll: true });
    return () => {
      const home = document.getElementById(returnTo);
      const back = from && from.isConnected && home?.parentElement?.contains(from) ? from : home;
      back?.focus({ preventScroll: true });
    };
  }, [returnTo]);
  const slide = slides[index];
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      onClose();
    } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !e.altKey && !e.ctrlKey && !e.metaKey) {
      // Alt+← is the browser's Back: left to it
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
    <div ref={dialog} className="reel-viewer" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={`${titleId}-position`} tabIndex={-1} onKeyDown={onKeyDown}>
      <p id={titleId} className="reel-viewer-label">{slide.label}</p>
      <span id={`${titleId}-position`} className="visually-hidden">{COPY.reel.position(index + 1, slides.length)}</span>
      <img className="reel-viewer-shot" src={slide.shot.src} alt={slide.shot.alt} draggable={false} />
      <button type="button" className="reel-viewer-step reel-viewer-step--prev" aria-label={COPY.reel.prev} onClick={() => onStep(-1)}>‹</button>
      <button type="button" className="reel-viewer-step reel-viewer-step--next" aria-label={COPY.reel.next} onClick={() => onStep(1)}>›</button>
      <button type="button" className="reel-viewer-close" onClick={onClose}>{COPY.close}</button>
    </div>
  );
}
