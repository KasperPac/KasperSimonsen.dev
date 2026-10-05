import { describe, it, expect } from "vitest";
import { atToWrite, DRAG_SECONDS, initialReel, REEL_HOLD_SECONDS, showSlide, stepReel, tickReel, viewOf, wrap, type ReelState } from "./reel";

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
  it("shows the slide on the monitor and its words, nothing moving, at rest", () =>
    expect(viewOf(initialReel(), 3)).toEqual({ monitor: 0, moving: null, words: 0 }));
  it("forward: the next screenshot slides in from the right over the current one, whose words stay until it lands", () => {
    const s: ReelState = { index: 0, wait: 0, drag: { dir: 1, t: 0 } };
    expect(viewOf(s, 3)).toEqual({ monitor: 0, moving: { slide: 1, at: 1 }, words: 0 });
    const mid = viewOf({ ...s, drag: { dir: 1, t: 0.5 } }, 3);
    expect(mid.moving!.slide).toBe(1);
    expect(mid.moving!.at).toBeCloseTo(0.5, 9);
    expect(mid.words).toBe(0);
  });
  it("back: the current screenshot slides out to the right over the previous one", () => {
    const s: ReelState = { index: 0, wait: 0, drag: { dir: -1, t: 0 } };
    expect(viewOf(s, 3)).toEqual({ monitor: 2, moving: { slide: 0, at: 0 }, words: 0 });
    expect(viewOf({ ...s, drag: { dir: -1, t: 1 } }, 3).moving!.at).toBeCloseTo(1, 9);
  });
  it("the words change as the slide lands", () => {
    let s = stepReel(initialReel(), 1, go);
    s = run(s, DRAG_SECONDS / 2);
    expect(viewOf(s, 3).words).toBe(0);
    s = run(s, DRAG_SECONDS);
    expect(viewOf(s, 3)).toEqual({ monitor: 1, moving: null, words: 1 });
  });
});

describe("atToWrite", () => {
  const view = (at: number | null) => ({ monitor: 0, words: 0, moving: at === null ? null : { slide: 1, at } });
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
