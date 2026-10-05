"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from "react";
import { atToWrite, initialReel, showSlide, stepReel, tickReel, viewOf, type ReelView } from "./reel";

export type HoldProps = {
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onFocus: (e: FocusEvent<HTMLElement>) => void;
  onBlur: (e: FocusEvent<HTMLElement>) => void;
};

/**
 * Whether focus on `target` holds the reel: a control the visitor moved to by keyboard. Not the title the screen focuses
 * on arrival, and not a control a click or tap focused (browsers focus a clicked button), which would hold the reel for good.
 */
export function holdFor(target: Element | null): boolean {
  return !!target && target.matches("button, a") && target.matches(":focus-visible");
}

const viewKey = (v: ReelView) => `${v.monitor}:${v.moving?.slide ?? ""}:${v.words}`;

/**
 * Runs the monitor's reel while `active` (spec 3.5). React re-renders only when a slide changes; a sliding screenshot's
 * position goes to `--at` on every `[data-reel]` print each frame. Frames longer than 0.1 s count as 0.1 s, so a stall or
 * a background tab never skips a slide (and a frame stamped before `last` counts as 0). The slide is kept between visits.
 * `held`: the full-screen view is open (spec 3.5 3a); the reel holds still, as it does under the pointer.
 */
export function useReel(active: boolean, count: number, reduced: boolean, held = false) {
  const state = useRef(initialReel());
  const pointer = useRef(false);
  const focus = useRef(false);
  const [view, setView] = useState<ReelView>(() => viewOf(state.current, count));
  const shown = useRef(viewKey(view));
  const written = useRef<number | null>(null);

  const publish = useCallback(() => {
    const v = viewOf(state.current, count);
    // `--at` is written only mid-slide: the DOM keeps the old view for a frame after a slide lands, so the last mid-slide
    // value must stay until React removes the sliding screenshot (zeroing it would flash that screenshot over the monitor).
    const at = atToWrite(v, written.current);
    if (at !== null) {
      written.current = at;
      document.querySelectorAll<HTMLElement>("[data-reel]").forEach((el) => el.style.setProperty("--at", String(at)));
    } else if (!v.moving) written.current = null; // the next slide writes its first value whatever was written before
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
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
      last = now;
      state.current = tickReel(state.current, dt, { count, paused: pointer.current || focus.current || held, reduced });
      publish();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [active, count, reduced, held, publish]);
  // A hold only lasts while the reel runs; a change of count or reduced motion mid-run keeps it.
  useEffect(() => {
    if (!active) pointer.current = focus.current = false;
  }, [active]);

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
  /** The slide whose words show, read now: the one the action button plays. */
  const current = useCallback(() => state.current.index, []);
  return { view, step, show, hold, current };
}
