import { describe, expect, it } from "vitest";
import { Color, LessEqualDepth, NormalBlending, Raycaster, SRGBColorSpace, Vector3 } from "three";
import { HOP, TUBES } from "./mark";
import { GLOW, ORDER, applyFrame, buildSign, clampDt, layerOf, setSignResolution, toLocal } from "./sign";
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

  it("draws every line opaque, the glow under the core at the same depth, so overlapping caps can't bead", () => {
    const sign = buildSign();
    for (const m of sign.materials) {
      expect(m.transparent).toBe(false);
      expect(m.blending).toBe(NormalBlending);
      expect(m.opacity).toBe(1);
      expect(m.depthFunc).toBe(LessEqualDepth);
    }
    // none writes depth: the layers are drawn in order, after the room, each glow then its core
    for (const m of sign.materials) expect(m.depthWrite).toBe(false);
    for (const t of TUBES)
      for (const l of sign.tubes[t]) {
        const kind = l.material === sign.unlit ? "unlit" : l.material === sign.glow[t] ? "glow" : "core";
        expect(l.renderOrder).toBe({ unlit: ORDER.unlit, glow: ORDER[layerOf(t)], core: ORDER[layerOf(t)] + 1 }[kind]);
      }
    for (const g of sign.gaps) if (g) expect(g.renderOrder).toBe(ORDER.gap);
    // back to front: the unlit glass, the back ropes, the letters, the gap cut in them, the front ropes, the head
    const ladder = [ORDER.unlit, ORDER.back, ORDER.back + 1, ORDER.letters, ORDER.letters + 1, ORDER.gap, ORDER.front, ORDER.front + 1, ORDER.head, ORDER.head + 1];
    expect(ladder[0]).toBeGreaterThan(0);
    expect([...ladder].sort((a, b) => a - b)).toEqual(ladder);
    expect(new Set(ladder).size).toBe(ladder.length);
    expect(TUBES.map(layerOf)).toEqual(["letters", "letters", "head", "back", "front", "front", "back", "back", "back"]);
  });

  it("shows unlit glass when off, and lights what the frame lights, by colour", () => {
    const sign = buildSign();
    const lit = new Color("#FFF4E2");
    const glow = new Color().setRGB((0xff / 255) * GLOW, (0xf4 / 255) * GLOW, (0xe2 / 255) * GLOW, SRGBColorSpace);
    const lines = (t: (typeof TUBES)[number], which: "unlit" | "lit") =>
      sign.tubes[t].filter((l) => (l.material === sign.unlit) === (which === "unlit"));
    applyFrame(sign, neonFrame("off", 0, 1, false));
    for (const t of TUBES) {
      expect(sign.core[t].color.getHex()).toBe(0);
      expect(sign.glow[t].color.getHex()).toBe(0);
      expect(lines(t, "unlit").length).toBeGreaterThan(0);
      for (const l of lines(t, "unlit")) expect(l.visible).toBe(true);
      for (const l of lines(t, "lit")) expect(l.visible).toBe(false);
    }
    applyFrame(sign, neonFrame("on", 0.45, 1, false)); // step 2: a front rope
    expect(sign.core.rope2.color.equals(lit)).toBe(true);
    expect(sign.core.rope2.color.getHex()).toBe(0xfff4e2);
    expect(sign.glow.rope2.color.equals(glow)).toBe(true);
    expect(sign.glow.rope2.color.getHex()).toBe(0x59554f); // a third as bright, as seen
    for (const l of lines("rope2", "lit")) expect(l.visible).toBe(true);
    expect(sign.core.rope0.color.getHex()).toBe(0);
    for (const l of lines("rope0", "lit")) expect(l.visible).toBe(false);
    for (const t of TUBES) for (const l of lines(t, "unlit")) expect(l.visible).toBe(true);
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
