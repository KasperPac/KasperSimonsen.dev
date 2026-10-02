import { describe, it, expect } from "vitest";
import { HOTSPOTS } from "../hotspots/registry";
import { GLINT_GAP_SECONDS, glintGap, nextGlint } from "./glint";

describe("nextGlint", () => {
  it("never lights the same object twice running", () => {
    for (const last of HOTSPOTS) for (const r of [0, 0.3, 0.6, 0.999]) expect(nextGlint(last, r)).not.toBe(last);
  });

  it("reaches every other object", () => {
    const seen = new Set([0, 0.26, 0.51, 0.76, 0.99].map((r) => nextGlint("hs_crate", r)));
    expect([...seen].sort()).toEqual(HOTSPOTS.filter((h) => h !== "hs_crate").sort());
  });

  it("starts anywhere", () => expect(HOTSPOTS).toContain(nextGlint(null, 0.5)));
});

describe("glintGap", () => {
  it("waits a few seconds, never on a beat", () => {
    const [min, max] = GLINT_GAP_SECONDS;
    expect(glintGap(0)).toBe(min);
    expect(glintGap(0.999)).toBeLessThan(max);
    expect(glintGap(0.5)).toBeGreaterThan(min);
  });
});
