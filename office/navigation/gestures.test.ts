import { describe, expect, it } from "vitest";
import { backWheelDelta, isBackSwipe, isZoomOut } from "./gestures";

describe("back gestures", () => {
  it("accepts a deliberate right swipe, excluding record flicks, left swipes and slow drags", () => {
    expect(isBackSwipe(110, 12, 350)).toBe(true);
    expect(isBackSwipe(-110, 12, 350)).toBe(false);
    expect(isBackSwipe(18, 110, 350)).toBe(false);
    expect(isBackSwipe(80, 70, 350)).toBe(false);
    expect(isBackSwipe(30, 0, 350)).toBe(false);
    expect(isBackSwipe(110, 0, 1400)).toBe(false);
  });
  it("requires a meaningful pinch inward, excluding jitter and zooming in", () => {
    expect(isZoomOut(200, 140)).toBe(true);
    expect(isZoomOut(200, 180)).toBe(false);
    expect(isZoomOut(80, 60)).toBe(false);
    expect(isZoomOut(200, 250)).toBe(false);
  });
  it("distinguishes scroll up from trackpad zoom out and normalizes wheel units", () => {
    expect(backWheelDelta(0, -120, 0, false)).toBe(120);
    expect(backWheelDelta(0, 120, 0, false)).toBe(0);
    expect(backWheelDelta(0, 50, 0, true)).toBe(50);
    expect(backWheelDelta(0, -50, 0, true)).toBe(0);
    expect(backWheelDelta(100, -20, 0, false)).toBe(0);
    expect(backWheelDelta(0, -3, 1, false)).toBe(48);
    expect(backWheelDelta(0, -1, 2, false)).toBe(800);
  });
});
