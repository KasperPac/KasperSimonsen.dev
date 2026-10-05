import { easeInOutCubic } from "@/office/camera/pose";

/** How long a slide holds on the monitor before the next slides in over the monitor (spec 3.5). */
export const REEL_HOLD_SECONDS = 5;
/** How long a slide takes to slide in over the monitor. */
export const DRAG_SECONDS = 0.7;

export type ReelState = { index: number; wait: number; drag: { dir: 1 | -1; t: number } | null };

export function initialReel(): ReelState {
  return { index: 0, wait: 0, drag: null };
}

export function wrap(i: number, n: number): number {
  return ((i % n) + n) % n;
}

/**
 * The reel `dt` seconds on. A slide in progress runs to its end (a long frame finishes it and starts nothing more);
 * otherwise the slide holds, and after REEL_HOLD_SECONDS the next slides in over the monitor. Paused, the hold starts again;
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

/** A step by hand (‹ or ›): slides one slide that way over the monitor, or under reduced motion switches at once. Ignored mid-slide. */
export function stepReel(s: ReelState, dir: 1 | -1, o: { count: number; reduced: boolean }): ReelState {
  if (o.count < 2 || s.drag) return s;
  if (o.reduced) return { index: wrap(s.index + dir, o.count), wait: 0, drag: null };
  return { ...s, wait: 0, drag: { dir, t: 0 } };
}

/** Straight to slide `i` (a dot), no sliding. */
export function showSlide(_s: ReelState, i: number, count: number): ReelState {
  return { index: wrap(i, count), wait: 0, drag: null };
}

export type ReelView = {
  /** The slide on the monitor, under anything sliding. */
  monitor: number;
  /** The screenshot sliding over the monitor, and where it is: 1 off the right edge (the laptop's side), 0 covering it. */
  moving: { slide: number; at: number } | null;
  /** The slide whose words and controls show (spec 3.5): the reel's own slide, which changes as a slide lands. */
  words: number;
};

/** What the monitor shows. Forward, the next screenshot slides in from the right; back, the current one slides out to the right. */
export function viewOf(s: ReelState, count: number): ReelView {
  if (!s.drag) return { monitor: s.index, moving: null, words: s.index };
  const e = easeInOutCubic(s.drag.t);
  if (s.drag.dir === 1) return { monitor: s.index, moving: { slide: wrap(s.index + 1, count), at: 1 - e }, words: s.index };
  return { monitor: wrap(s.index - 1, count), moving: { slide: s.index, at: e }, words: s.index };
}

/**
 * The slide the visitor is looking at: the one covering most of the monitor. Mid-slide that is the sliding screenshot once it
 * covers more than half (`at` under 0.5, going either way), else the one under it; at rest, the reel's slide. Opening the
 * full-screen view settles the reel on it, so the view opens on what was on screen and nothing switches under it.
 */
export function visibleSlide(v: ReelView): number {
  return v.moving && v.moving.at < 0.5 ? v.moving.slide : v.monitor;
}

/**
 * What to write to `--at` this frame, or null to leave it. Only a sliding screenshot writes: when it lands, the DOM still shows the old
 * view for a painted frame or two, and zeroing `--at` then would throw the moving screenshot over the monitor.
 */
export function atToWrite(v: ReelView, last: number | null): number | null {
  return v.moving && v.moving.at !== last ? v.moving.at : null;
}
