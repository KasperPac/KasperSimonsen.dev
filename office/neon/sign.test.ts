import { describe, expect, it } from "vitest";
import { Raycaster, Vector3 } from "three";
import { HOP, TUBES } from "./mark";
import { applyFrame, buildSign, clampDt, setSignResolution, toLocal } from "./sign";
import { neonFrame } from "./sequence";

describe("the sign's lines (neon sign spec 4, 6)", () => {
  it("maps the mark's 160-unit box onto a unit square, y up", () => {
    expect(toLocal([[44, 44], [204, 204]], 0.01)).toEqual([-0.5, 0.5, 0.01, 0.5, -0.5, 0.01]);
  });

  it("builds every tube, with the letters and the head in the hopping body", () => {
    const sign = buildSign();
    for (const t of TUBES) expect(sign.tubes[t].length).toBeGreaterThan(0);
    for (const t of ["k", "s", "head"] as const) for (const l of sign.tubes[t]) expect(l.parent?.parent).toBe(sign.body);
    expect(sign.gaps.map((g) => g !== null)).toEqual([false, true, true, false, false, false]);
  });

  it("is never under the pointer", () => {
    const sign = buildSign();
    const ray = new Raycaster(new Vector3(0, 0, 5), new Vector3(0, 0, -1));
    expect(ray.intersectObject(sign.root, true)).toEqual([]);
  });

  it("shows unlit glass when off, and lights what the frame lights", () => {
    const sign = buildSign();
    applyFrame(sign, neonFrame("off", 0, 1, false));
    for (const t of TUBES) expect(sign.core[t].opacity).toBe(0);
    applyFrame(sign, neonFrame("on", 0.45, 1, false)); // step 2: a front rope
    expect(sign.core.rope2.opacity).toBe(1);
    expect(sign.core.rope0.opacity).toBe(0);
    expect(sign.gaps[2]!.visible).toBe(true);
    expect(sign.gaps[1]!.visible).toBe(false);
  });

  it("hops the body while the rope is under the feet", () => {
    const sign = buildSign();
    applyFrame(sign, neonFrame("on", 0.65, 1, false)); // step 3
    expect(sign.body.position.y).toBeCloseTo(HOP / 160);
    applyFrame(sign, neonFrame("on", 0.85, 1, false)); // step 4
    expect(sign.body.position.y).toBe(0);
  });

  it("keeps line widths in CSS pixels", () => {
    const sign = buildSign();
    setSignResolution(sign, 1440, 900);
    for (const m of sign.materials) expect(m.resolution.toArray()).toEqual([1440, 900]);
  });

  it("never lets one long frame jump the clock", () => {
    expect(clampDt(0.016)).toBe(0.016);
    expect(clampDt(9.87)).toBe(0.1);
    expect(clampDt(-1)).toBe(0);
  });
});
