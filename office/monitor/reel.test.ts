import { describe, it, expect } from "vitest";
import { atToWrite, DRAG_SECONDS, initialReel, REEL_HOLD_SECONDS, showSlide, slideInView, stepReel, tickReel, viewOf, wrap, type ReelState } from "./reel";

const go = { count: 3, paused: false, reduced: false };
const run = (s: ReelState, seconds: number, o = go) => {
  for (let t = 0; t < seconds - 1e-9; t += 1 / 60) s = tickReel(s, 1 / 60, o);
  return s;
};

describe("wrap", () => {
  it("wraps both ways", () => {
    expect(wrap(3, 3)).toBe(0);
    expect(wrap(-1, 3)).toBe(2);
  });
});

describe("tickReel", () => {
  it("holds a slide for REEL_HOLD_SECONDS, then drags the next one across", () => {
    let s = run(initialReel(), REEL_HOLD_SECONDS - 0.1);
    expect(s.drag).toBeNull();
    s = run(s, 0.2);
    expect(s.drag?.dir).toBe(1);
    s = run(s, DRAG_SECONDS + 0.05);
    expect(s).toMatchObject({ index: 1, drag: null });
  });
  it("never moves while paused, and starts the hold again after", () => {
    let s = run(initialReel(), REEL_HOLD_SECONDS - 1);
    s = run(s, 20, { ...go, paused: true });
    expect(s).toMatchObject({ index: 0, wait: 0, drag: null });
    s = run(s, REEL_HOLD_SECONDS - 0.1);
    expect(s.drag).toBeNull();
  });
  it("never auto-advances under reduced motion", () => expect(run(initialReel(), 30, { ...go, reduced: true }).index).toBe(0));
  it("a huge frame finishes the one drag in progress and no more", () => {
    let s = run(initialReel(), REEL_HOLD_SECONDS + 0.1);
    s = tickReel(s, 10, go);
    expect(s).toMatchObject({ index: 1, drag: null });
  });
  it("a long frame mid-hold starts a drag, it doesn't skip it", () => {
    const s = tickReel(initialReel(), 10, go);
    expect(s.drag).toEqual({ dir: 1, t: 0 });
    expect(s.index).toBe(0);
  });
  it("does nothing with fewer than two projects", () => expect(run(initialReel(), 20, { ...go, count: 1 })).toEqual(initialReel()));
});

describe("stepReel", () => {
  it("drags one slide either way by hand", () => {
    expect(stepReel(initialReel(), 1, go).drag).toEqual({ dir: 1, t: 0 });
    expect(stepReel(initialReel(), -1, go).drag).toEqual({ dir: -1, t: 0 });
  });
  it("switches at once under reduced motion", () =>
    expect(stepReel(initialReel(), -1, { ...go, reduced: true })).toEqual({ index: 2, wait: 0, drag: null }));
  it("ignores a step mid-drag", () => {
    const s = stepReel(initialReel(), 1, go);
    expect(stepReel(s, -1, go)).toBe(s);
  });
});

describe("showSlide", () => {
  it("jumps straight to a slide (a dot), no drag", () => expect(showSlide(stepReel(initialReel(), 1, go), 2, 3)).toEqual({ index: 2, wait: 0, drag: null }));
});

describe("viewOf", () => {
  it("at rest: the monitor shows the slide, the laptop the next", () =>
    expect(viewOf(initialReel(), 3)).toEqual({ monitor: 0, laptop: 1, moving: null }));
  it("dragging forward: the next slide crosses from the laptop (1) to the monitor (0), the one after waits under it", () => {
    const start = viewOf({ index: 0, wait: 0, drag: { dir: 1, t: 0 } }, 3);
    expect(start).toEqual({ monitor: 0, laptop: 2, moving: { slide: 1, at: 1 } });
    expect(viewOf({ index: 0, wait: 0, drag: { dir: 1, t: 1 } }, 3).moving?.at).toBe(0);
    const mid = viewOf({ index: 0, wait: 0, drag: { dir: 1, t: 0.5 } }, 3).moving!.at;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
  it("dragging back: the monitor's slide goes back onto the laptop, the previous one under it", () => {
    expect(viewOf({ index: 0, wait: 0, drag: { dir: -1, t: 0 } }, 3)).toEqual({ monitor: 2, laptop: 1, moving: { slide: 0, at: 0 } });
    expect(viewOf({ index: 0, wait: 0, drag: { dir: -1, t: 1 } }, 3).moving?.at).toBe(1);
  });
  it("lands where the next view starts, so nothing jumps when a drag ends", () => {
    const end = viewOf({ index: 0, wait: 0, drag: { dir: 1, t: 1 } }, 3);
    const after = viewOf({ index: 1, wait: 0, drag: null }, 3);
    expect(end.moving!.slide).toBe(after.monitor);
    expect(end.laptop).toBe(after.laptop);
  });
});

describe("slideInView", () => {
  const view = (at: number | null) => ({ monitor: 0, laptop: 2, moving: at === null ? null : { slide: 1, at } });
  it("is the monitor's slide at rest and while the dragged window is mostly off the monitor", () => {
    expect(slideInView(view(null))).toBe(0);
    expect(slideInView(view(0.5))).toBe(0);
    expect(slideInView(view(0.9))).toBe(0);
  });
  it("is the dragged window's slide once it covers more than half", () => {
    expect(slideInView(view(0.49))).toBe(1);
    expect(slideInView(view(0))).toBe(1);
  });
});

describe("atToWrite", () => {
  const view = (at: number | null) => ({ monitor: 0, laptop: 2, moving: at === null ? null : { slide: 1, at } });
  it("writes the position while a window moves, and not again when it hasn't changed", () => {
    expect(atToWrite(view(0.3), null)).toBe(0.3);
    expect(atToWrite(view(0.3), 0.2)).toBe(0.3);
    expect(atToWrite(view(0.3), 0.3)).toBeNull();
  });
  it("writes nothing when nothing moves, so the last in-drag value stays until the DOM catches up", () => {
    expect(atToWrite(view(null), 0.97)).toBeNull();
    expect(atToWrite(view(null), null)).toBeNull();
  });
});
