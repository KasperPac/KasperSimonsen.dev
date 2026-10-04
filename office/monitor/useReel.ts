"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from "react";
import { initialReel, showSlide, stepReel, tickReel, viewOf, type ReelView } from "./reel";

export type HoldProps = {
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onFocus: (e: FocusEvent<HTMLElement>) => void;
  onBlur: (e: FocusEvent<HTMLElement>) => void;
};

/** Whether focus on `target` holds the reel: a control the visitor moved to, not the title the screen focuses on arrival. */
export function holdFor(target: Element | null): boolean {
  return !!target && target.matches("button, a");
}

const viewKey = (v: ReelView) => `${v.monitor}:${v.laptop}:${v.moving?.slide ?? ""}`;

/**
 * Runs the monitor's reel while `active` (spec 3.5). React re-renders only when a slide changes; a dragged window's
 * position goes to `--at` on every `[data-reel]` print each frame. Frames longer than 0.1 s count as 0.1 s, so a stall or
 * a background tab never skips a drag. The slide is kept between visits.
 */
export function useReel(active: boolean, count: number, reduced: boolean) {
  const state = useRef(initialReel());
  const pointer = useRef(false);
  const focus = useRef(false);
  const [view, setView] = useState<ReelView>(() => viewOf(state.current, count));
  const shown = useRef(viewKey(view));

  const publish = useCallback(() => {
    const v = viewOf(state.current, count);
    document.querySelectorAll<HTMLElement>("[data-reel]").forEach((el) => el.style.setProperty("--at", String(v.moving?.at ?? 0)));
    const key = viewKey(v);
    if (key !== shown.current) {
      shown.current = key;
      setView(v);
    }
  }, [count]);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      state.current = tickReel(state.current, dt, { count, paused: pointer.current || focus.current, reduced });
      publish();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      pointer.current = focus.current = false;
    };
  }, [active, count, reduced, publish]);

  const step = useCallback(
    (dir: 1 | -1) => {
      state.current = stepReel(state.current, dir, { count, reduced });
      publish();
    },
    [count, reduced, publish],
  );
  const show = useCallback(
    (i: number) => {
      state.current = showSlide(state.current, i, count);
      publish();
    },
    [count, publish],
  );
  const hold = useMemo<HoldProps>(
    () => ({
      onPointerEnter: () => (pointer.current = true),
      onPointerLeave: () => (pointer.current = false),
      onFocus: (e) => (focus.current = holdFor(e.target)),
      onBlur: (e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) focus.current = false;
      },
    }),
    [],
  );
  return { view, step, show, hold };
}
