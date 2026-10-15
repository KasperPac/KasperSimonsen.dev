"use client";

import { useEffect, useRef, type RefObject } from "react";
import { swipeStep } from "../crate/dig";
import { backWheelDelta, isBackSwipe, isZoomOut } from "./gestures";

const CONTROLS = 'a, button, input, textarea, select, [contenteditable], [role="slider"], dialog, .whiteboard-ink';
type Finger = { x: number; y: number; startX: number; startY: number; at: number };

/** Scene gestures never consume form controls, drawing, panel scrolling or panel/browser zoom. */
export function useOfficeGestures(
  host: RefObject<HTMLDivElement | null>,
  { enabled, browsing, reading, onBack, onFlick }: {
    enabled: boolean; browsing: boolean; reading: boolean; onBack: () => void; onFlick: (step: number) => void;
  },
) {
  const wheel = useRef({ at: 0, amount: 0, fired: false });
  const suppressUntil = useRef(0);
  useEffect(() => {
    const el = host.current;
    if (!el || !enabled) return;
    const fingers = new Map<number, Finger>();
    let pinchStart = 0;
    let multiple = false;
    let handled = false;
    const distance = () => {
      const [a, b] = [...fingers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    const blocked = (target: EventTarget | null) => !(target instanceof Element) || !!target.closest(CONTROLS);
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || blocked(e.target)) return;
      if (!fingers.size) { handled = false; multiple = false; }
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, at: e.timeStamp });
      if (fingers.size === 2) { multiple = true; pinchStart = distance(); }
    };
    const onMove = (e: PointerEvent) => {
      const finger = fingers.get(e.pointerId);
      if (!finger) return;
      finger.x = e.clientX;
      finger.y = e.clientY;
      if (Math.hypot(finger.x - finger.startX, finger.y - finger.startY) > 12) suppressUntil.current = performance.now() + 400;
      if (!reading && fingers.size === 2 && !handled && isZoomOut(pinchStart, distance())) {
        handled = true;
        suppressUntil.current = performance.now() + 400;
        onBack();
      }
    };
    const onUp = (e: PointerEvent) => {
      const finger = fingers.get(e.pointerId);
      fingers.delete(e.pointerId);
      if (!finger || handled || multiple) return;
      const dx = e.clientX - finger.startX;
      const dy = e.clientY - finger.startY;
      if (Math.hypot(dx, dy) > 12) suppressUntil.current = performance.now() + 400;
      if (isBackSwipe(dx, dy, e.timeStamp - finger.at)) {
        handled = true;
        onBack();
      } else if (browsing && Math.abs(dy) > Math.abs(dx) * 1.5) {
        const step = swipeStep(dy);
        if (step) onFlick(step);
      }
    };
    const onCancel = () => { fingers.clear(); multiple = true; };
    const onClick = (e: MouseEvent) => {
      if (performance.now() >= suppressUntil.current || e.detail === 0 || blocked(e.target)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    const onWheel = (e: WheelEvent) => {
      const now = performance.now();
      const burst = wheel.current;
      if (now - burst.at > 250) { burst.amount = 0; burst.fired = false; }
      burst.at = now;
      if (reading || blocked(e.target) || !(e.target as Element).closest(".office-stage")) return;
      const amount = backWheelDelta(e.deltaX, e.deltaY, e.deltaMode, e.ctrlKey);
      if (!amount) { burst.amount = 0; return; }
      e.preventDefault();
      burst.amount += amount;
      if (!burst.fired && burst.amount >= (e.ctrlKey ? 40 : 100)) {
        burst.fired = true;
        onBack();
      }
    };
    el.addEventListener("pointerdown", onDown, true);
    el.addEventListener("pointermove", onMove, true);
    el.addEventListener("pointerup", onUp, true);
    el.addEventListener("pointercancel", onCancel, true);
    el.addEventListener("click", onClick, true);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onDown, true);
      el.removeEventListener("pointermove", onMove, true);
      el.removeEventListener("pointerup", onUp, true);
      el.removeEventListener("pointercancel", onCancel, true);
      el.removeEventListener("click", onClick, true);
      el.removeEventListener("wheel", onWheel);
    };
  }, [host, enabled, browsing, reading, onBack, onFlick]);
}
