import { describe, expect, it } from "vitest";
import { bursts, FLICKER_S, lightBrightness, STEADY_S } from "./sequence";

const times = Array.from({ length: 200 }, (_, i) => (i / 199) * FLICKER_S);

describe("the bulb's flicker", () => {
  it("is steady dark when off and steady light when on, whatever the time", () => {
    for (const t of [0, 0.3, FLICKER_S, 99]) {
      expect(lightBrightness("off", t, 1, false)).toBe(0);
      expect(lightBrightness("on", t, 1, false)).toBe(1);
    }
  });

  it("stutters while flickering: dark gaps and bursts, all within 0 to 1", () => {
    for (const seed of [0, 1, 42, 2 ** 32 - 1]) {
      const values = times.map((t) => lightBrightness("flickering", t, seed, false));
      expect(values.every((v) => v >= 0 && v <= 1)).toBe(true);
      expect(Math.min(...values)).toBeLessThan(0.1);
      expect(values.some((v) => v >= 0.5 && v < 1)).toBe(true);
    }
  });

  it("starts dim, and is steady on for its last stretch before the office changes", () => {
    expect(lightBrightness("flickering", 0, 7, false)).toBeLessThan(0.1);
    expect(lightBrightness("flickering", FLICKER_S - STEADY_S, 7, false)).toBe(1);
    expect(lightBrightness("flickering", FLICKER_S, 7, false)).toBe(1);
  });

  it("gives the same stutter for the same seed", () => {
    expect(times.map((t) => lightBrightness("flickering", t, 5, false))).toEqual(times.map((t) => lightBrightness("flickering", t, 5, false)));
  });

  it("keeps its bursts in order, apart, and done before the steady stretch", () => {
    for (const seed of [0, 3, 99, 123456]) {
      const list = bursts(seed);
      expect(list.length).toBeGreaterThanOrEqual(2);
      list.forEach((b, i) => {
        expect(b.length).toBeGreaterThan(0);
        expect(b.at + b.length).toBeLessThanOrEqual(FLICKER_S - STEADY_S + 1e-9);
        if (i > 0) expect(b.at).toBeGreaterThan(list[i - 1].at + list[i - 1].length);
      });
    }
  });

  it("does not flicker with reduced motion: on is full from the first moment", () => {
    for (const t of times) expect(lightBrightness("flickering", t, 5, true)).toBe(1);
    expect(lightBrightness("off", 0, 5, true)).toBe(0);
  });

  it("treats a time before the switch as dim, not a crash", () => {
    expect(lightBrightness("flickering", -1, 5, false)).toBeLessThan(0.1);
  });
});
