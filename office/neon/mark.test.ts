import { describe, expect, it } from "vitest";
import { BOX, HANDS, HEAD, HOP, K, S, STEPS, TUBES, TubeId, clipOutside, headRing, inside, rope, ropeSide, tubeLines } from "./mark";

const ys = (l: { 1: number }[]) => l.map((p) => p[1]);

describe("the mark (neon sign spec 6)", () => {
  it("draws the K, the S and the head as closed outlines inside the sign's box", () => {
    for (const shape of [K, S, headRing()]) {
      expect(shape[0]).toEqual(shape[shape.length - 1]);
      for (const [x, y] of shape) for (const v of [x, y]) expect(v).toBeGreaterThanOrEqual(BOX.min), expect(v).toBeLessThanOrEqual(BOX.max);
    }
  });

  it("swings every rope from hand to hand", () => {
    for (let step = 0; step < STEPS; step++) {
      const r = rope(step);
      expect(r[0][0]).toBeCloseTo(HANDS.left[0]), expect(r[0][1]).toBeCloseTo(HANDS.left[1]);
      expect(r.at(-1)![0]).toBeCloseTo(HANDS.right[0]), expect(r.at(-1)![1]).toBeCloseTo(HANDS.right[1]);
    }
  });

  it("clears the head overhead and the letters' feet underneath, hop and all", () => {
    expect(Math.min(...ys(rope(0)))).toBeLessThan(HEAD.cy - HEAD.r - 4);
    const bottom = Math.max(...ys(K), ...ys(S));
    expect(Math.max(...ys(rope(3)))).toBeGreaterThan(bottom + 2);
    expect(HOP).toBeGreaterThan(0);
  });

  it("passes in front on the way down and behind on the way up", () => {
    expect([0, 1, 2, 3, 4, 5].map(ropeSide)).toEqual(["back", "front", "front", "back", "back", "back"]);
  });

  it("hides a rope behind the letters and the head, and leaves a front rope whole", () => {
    const shapes = [K, S, headRing()];
    const lifted = shapes.map((s) => s.map(([x, y]) => [x, y - HOP] as const));
    for (const step of [0, 3, 4, 5]) {
      const against = step === 3 ? lifted : shapes;
      const parts = tubeLines((`rope${step}` as const) as TubeId);
      for (const part of parts) {
        expect(part.length).toBeGreaterThanOrEqual(2);
        for (const p of part) for (const s of against) expect(inside(p, s)).toBe(false);
      }
    }
    for (const step of [1, 2]) expect(tubeLines((`rope${step}` as const) as TubeId)).toEqual([rope(step)]);
  });

  it("has one entry per tube: the letters, the head, six ropes", () => {
    expect(TUBES).toEqual(["k", "s", "head", "rope0", "rope1", "rope2", "rope3", "rope4", "rope5"]);
    expect(tubeLines("k")).toEqual([K]);
    expect(tubeLines("s")).toEqual([S]);
  });

  it("clips a line into the runs outside the shapes", () => {
    const square = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]] as const;
    const line = Array.from({ length: 21 }, (_, i) => [i - 5, 5] as const); // x -5..15 through the square
    const runs = clipOutside(line, [square.map((p) => [...p] as const)]);
    expect(runs.length).toBe(2);
    expect(runs[0].at(-1)![0]).toBeLessThan(0);
    expect(runs[1][0][0]).toBeGreaterThanOrEqual(10);
  });
});
