import { easeInOutCubic } from "@/office/camera/pose";

/** How long a slide holds on the monitor before the next is dragged across from the laptop (spec 3.5). */
export const REEL_HOLD_SECONDS = 5;
/** How long a drag between the screens takes. */
export const DRAG_SECONDS = 0.7;

export type ReelState = { index: number; wait: number; drag: { dir: 1 | -1; t: number } | null };

export function initialReel(): ReelState {
  return { index: 0, wait: 0, drag: null };
}

export function wrap(i: number, n: number): number {
  return ((i % n) + n) % n;
}

/**
 * The reel `dt` seconds on. A drag in progress runs to its end (a long frame finishes it and starts nothing more);
 * otherwise the slide holds, and after REEL_HOLD_SECONDS the next is dragged across. Paused, the hold starts again;
 * under reduced motion nothing moves by itself.
 */
export function tickReel(s: ReelState, dt: number, o: { count: number; paused: boolean; reduced: boolean }): ReelState {
  if (o.count < 2) return s;
  if (s.drag) {
    const t = Math.min(1, s.drag.t + dt / DRAG_SECONDS);
    return t < 1 ? { ...s, drag: { ...s.drag, t } } : { index: wrap(s.index + s.drag.dir, o.count), wait: 0, drag: null };
  }
  if (o.paused || o.reduced) return s.wait === 0 ? s : { ...s, wait: 0 };
  const wait = s.wait + dt;
  return wait >= REEL_HOLD_SECONDS ? { ...s, wait: 0, drag: { dir: 1, t: 0 } } : { ...s, wait };
}

/** A step by hand (‹ or ›): drags one slide that way, or under reduced motion switches at once. Ignored mid-drag. */
export function stepReel(s: ReelState, dir: 1 | -1, o: { count: number; reduced: boolean }): ReelState {
  if (o.count < 2 || s.drag) return s;
  if (o.reduced) return { index: wrap(s.index + dir, o.count), wait: 0, drag: null };
  return { ...s, wait: 0, drag: { dir, t: 0 } };
}

/** Straight to slide `i` (a dot), no drag. */
export function showSlide(_s: ReelState, i: number, count: number): ReelState {
  return { index: wrap(i, count), wait: 0, drag: null };
}

export type ReelView = {
  /** The slide on the monitor, under anything being dragged. */
  monitor: number;
  /** The slide on the laptop, under anything being dragged. */
  laptop: number;
  /** The window crossing between the screens, and where it is: 1 on the laptop, 0 on the monitor. */
  moving: { slide: number; at: number } | null;
};

/** What each screen shows. Forward, the next slide crosses from the laptop; back, the monitor's slide returns to it. */
export function viewOf(s: ReelState, count: number): ReelView {
  const next = wrap(s.index + 1, count);
  if (!s.drag) return { monitor: s.index, laptop: next, moving: null };
  const e = easeInOutCubic(s.drag.t);
  if (s.drag.dir === 1) return { monitor: s.index, laptop: wrap(s.index + 2, count), moving: { slide: next, at: 1 - e } };
  return { monitor: wrap(s.index - 1, count), laptop: next, moving: { slide: s.index, at: e } };
}
