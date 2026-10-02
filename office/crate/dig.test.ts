// office/crate/dig.test.ts
import { describe, it, expect } from "vitest";
import { work } from "@/content/work";
import { canPull, digFor, swipeStep, wheelStep, WHEEL_COOLDOWN_MS, WHEEL_STEP, type Wheel } from "./dig";

describe("digFor", () => {
  it("brings a pulled record to the front, wherever the dig was", () => expect(digFor(0, work[work.length - 1].slug)).toBe(work.length - 1));
  it("keeps the dig while nothing is pulled", () => expect(digFor(1, null)).toBe(1));
  it("ignores an unknown slug", () => expect(digFor(1, "nope")).toBe(1));
});

describe("canPull", () => {
  it("pulls while browsing the crate", () => expect(canPull("hs_crate", null)).toBe(true));
  it("doesn't pull a second record while one is out", () => expect(canPull("hs_crate", work[0].slug)).toBe(false));
  it("doesn't pull from anywhere else", () => expect(canPull("hs_shelf", null)).toBe(false));
});

describe("wheelStep (one flick per gesture)", () => {
  const start: Wheel = { acc: 0, quietUntil: 0 };
  it("waits for a full step of scrolling", () => expect(wheelStep(start, WHEEL_STEP - 1, 0).step).toBe(0));
  it("flicks forward on scrolling down, back on scrolling up", () => {
    expect(wheelStep(start, WHEEL_STEP, 0).step).toBe(1);
    expect(wheelStep(start, -WHEEL_STEP, 0).step).toBe(-1);
  });
  it("lets a trackpad's long swipe flick only once, then needs a pause", () => {
    let w = start;
    let flicks = 0;
    for (let t = 0; t < 300; t += 10) {
      const r = wheelStep(w, 30, t); // 30 events of 30 px, 10 ms apart: one gesture
      w = r.w;
      flicks += Math.abs(r.step);
    }
    expect(flicks).toBe(1);
    expect(wheelStep(w, WHEEL_STEP, 300 + WHEEL_COOLDOWN_MS).step).toBe(1);
  });
});

describe("swipeStep", () => {
  it("flicks forward on a swipe up", () => expect(swipeStep(-80)).toBe(1));
  it("flicks back on a swipe down", () => expect(swipeStep(80)).toBe(-1));
  it("ignores a tap", () => expect(swipeStep(5)).toBe(0));
});
