import { describe, it, expect } from "vitest";
import { MAX_FRAME_SECONDS, onStreet, takesOver, walkAt, walkSeconds, walkStep } from "./autoWalk";

describe("onStreet", () => {
  it("holds at the very start of the walk-in", () => expect(onStreet(0)).toBe(true));
  it("ends as soon as the camera has started down", () => expect(onStreet(0.05)).toBe(false));
  it("is over in the office", () => expect(onStreet(1)).toBe(false));
});

describe("walkSeconds", () => {
  it("takes the full time for the whole walk", () => expect(walkSeconds(9000, 9000, 8)).toBe(8));
  it("takes its share for part of it", () => expect(walkSeconds(4500, 9000, 8)).toBe(4));
  it("takes no time when there is nowhere left to go", () => {
    expect(walkSeconds(0, 9000, 8)).toBe(0);
    expect(walkSeconds(-100, 9000, 8)).toBe(0);
    expect(walkSeconds(100, 0, 8)).toBe(0);
  });
});

describe("walkAt", () => {
  it("starts where the page is and ends at the bottom", () => {
    expect(walkAt(0, 200, 9200, 8)).toBe(200);
    expect(walkAt(8, 200, 9200, 8)).toBe(9200);
  });

  it("stays at the ends outside the walk", () => {
    expect(walkAt(-1, 200, 9200, 8)).toBe(200);
    expect(walkAt(20, 200, 9200, 8)).toBe(9200);
  });

  it("eases in and out: slow off the street, halfway at half time, slow into the office", () => {
    expect(walkAt(0.8, 0, 1000, 8)).toBeLessThan(100);
    expect(walkAt(4, 0, 1000, 8)).toBeCloseTo(500);
    expect(walkAt(7.2, 0, 1000, 8)).toBeGreaterThan(900);
  });

  it("only ever moves forward", () => {
    const at = Array.from({ length: 81 }, (_, i) => walkAt(i / 10, 0, 1000, 8));
    expect(at.every((y, i) => i === 0 || y >= at[i - 1])).toBe(true);
  });

  it("arrives at once with no time to walk", () => expect(walkAt(0, 200, 9200, 0)).toBe(9200));
});

describe("walkStep", () => {
  it("moves the walk on by an ordinary frame", () => expect(walkStep(1 / 60)).toBeCloseTo(1 / 60));
  it("pauses through a hitch instead of leaping ahead into the office", () => expect(walkStep(8.5)).toBe(MAX_FRAME_SECONDS));
  it("never runs backwards", () => expect(walkStep(-0.5)).toBe(0));
});

describe("takesOver", () => {
  it("hands control back to a wheel, a touch or a click", () => {
    expect(takesOver("wheel")).toBe(true);
    expect(takesOver("touchstart")).toBe(true);
    expect(takesOver("pointerdown")).toBe(true);
  });

  it("hands control back to keys that scroll, and to Escape", () => {
    for (const key of ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " ", "Escape"]) expect(takesOver("keydown", key)).toBe(true);
  });

  it("keeps walking through keys that don't scroll", () => {
    expect(takesOver("keydown", "Tab")).toBe(false);
    expect(takesOver("keydown", "Shift")).toBe(false);
  });

  it("ignores the scrolling the walk does itself", () => expect(takesOver("scroll")).toBe(false));
});
