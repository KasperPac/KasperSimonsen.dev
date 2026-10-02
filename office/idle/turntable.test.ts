import { describe, it, expect, vi } from "vitest";
import { Group, Object3D, Vector3 } from "three";
import { applyTurntable, findTurntable, nowPlaying, platterAngle } from "./turntable";

describe("platterAngle", () => {
  it("starts at zero", () => expect(platterAngle(0)).toBe(0));
  it("turns 33 1/3 rpm: 1.8 s is one revolution", () => {
    expect(platterAngle(0.9)).toBeCloseTo(Math.PI);
    expect(platterAngle(1.8)).toBeCloseTo(0, 6);
  });
  it("wraps into [0, 2π)", () => {
    for (const t of [1.79, 5, 123.456, 1e6]) {
      const a = platterAngle(t);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(Math.PI * 2);
    }
  });
  it("takes an rpm", () => expect(platterAngle(0.5, 60)).toBeCloseTo(Math.PI));
  it("survives negative and NaN time", () => {
    expect(platterAngle(Number.NaN)).toBe(0);
    const a = platterAngle(-0.9);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(Math.PI * 2);
  });
});

describe("nowPlaying", () => {
  it("shows sleeve 0 first with no swap", () => expect(nowPlaying(0, 4)).toEqual({ index: 0, swap: 0 }));
  it("holds a sleeve until the last 0.8 s of the period", () => {
    expect(nowPlaying(11.1, 4)).toEqual({ index: 0, swap: 0 });
    expect(nowPlaying(11.2, 4).swap).toBeCloseTo(0, 6);
    expect(nowPlaying(11.6, 4).swap).toBeCloseTo(0.5);
    expect(nowPlaying(11.99, 4).swap).toBeLessThan(1);
  });
  it("advances each period and cycles", () => {
    expect(nowPlaying(12, 4)).toEqual({ index: 1, swap: 0 });
    expect(nowPlaying(36, 4).index).toBe(3);
    expect(nowPlaying(48, 4).index).toBe(0);
  });
  it("takes a period", () => expect(nowPlaying(5, 3, 5).index).toBe(1));
  it("handles count <= 1, negative and NaN time", () => {
    expect(nowPlaying(11.6, 1)).toEqual({ index: 0, swap: 0 });
    expect(nowPlaying(11.6, 0)).toEqual({ index: 0, swap: 0 });
    expect(nowPlaying(-5, 4)).toEqual({ index: 0, swap: 0 });
    expect(nowPlaying(Number.NaN, 4)).toEqual({ index: 0, swap: 0 });
  });
});

function rig(sleeves = 4) {
  const root = new Group();
  const platter = new Object3D();
  platter.name = "prop_turntable__platter";
  root.add(platter);
  const list: Object3D[] = [];
  for (let i = sleeves - 1; i >= 0; i--) {
    const s = new Object3D();
    s.name = `prop_now_playing__sleeve_0${i}`;
    s.position.y = 1; // glTF is Y-up: a Blender local-up axis arrives as +Y
    root.add(s);
    list[i] = s;
  }
  return { root, platter, sleeves: list };
}

describe("applyTurntable", () => {
  it("spins the platter about local Y, clockwise from above, and shows only the current sleeve", () => {
    const { root, platter, sleeves } = rig();
    const nodes = findTurntable(root)!;
    applyTurntable(nodes, 0.9, false);
    expect(platter.rotation.y).toBeCloseTo(-Math.PI);
    expect(platter.rotation.x).toBe(0);
    expect(platter.rotation.z).toBe(0);
    const up = new Vector3(0, 1, 0).applyQuaternion(platter.quaternion);
    expect(up.distanceTo(new Vector3(0, 1, 0))).toBeLessThan(1e-9);
    expect(sleeves.map((s) => s.visible)).toEqual([true, false, false, false]);
    applyTurntable(nodes, 13, false);
    expect(sleeves.map((s) => s.visible)).toEqual([false, true, false, false]);
  });

  it("keeps the platter's base rotation.y", () => {
    const { root, platter } = rig();
    platter.rotation.y = 0.5;
    const nodes = findTurntable(root)!;
    applyTurntable(nodes, 0.9, false);
    expect(platter.rotation.y).toBeCloseTo(0.5 - Math.PI);
    applyTurntable(nodes, 0, true);
    expect(platter.rotation.y).toBe(0.5);
  });

  it("swaps along Y only: outgoing drops, incoming rises in", () => {
    const { root, sleeves } = rig();
    const nodes = findTurntable(root)!;
    applyTurntable(nodes, 11.6, false);
    expect(sleeves[0].visible && sleeves[1].visible).toBe(true);
    expect(sleeves[2].visible || sleeves[3].visible).toBe(false);
    expect(sleeves[0].position.y).toBeLessThan(1);
    expect(sleeves[1].position.y).toBeLessThan(1);
    expect(sleeves[1].position.y).toBeGreaterThan(1 - 0.25 - 1e-9);
    for (const s of sleeves) {
      expect(s.position.x).toBe(0);
      expect(s.position.z).toBe(0);
    }
    applyTurntable(nodes, 11.9, false);
    expect(sleeves[0].position.y).toBeLessThan(sleeves[1].position.y); // outgoing is further down late in the swap
    applyTurntable(nodes, 12.5, false);
    expect(sleeves[0].position.y).toBe(1); // back at rest once hidden
    expect(sleeves[1].position.y).toBe(1);
  });

  it("holds still under reduced motion, sleeve 0 only", () => {
    const { root, platter, sleeves } = rig();
    const nodes = findTurntable(root)!;
    applyTurntable(nodes, 11.6, true);
    expect(platter.rotation.y).toBe(0);
    expect(sleeves.map((s) => s.visible)).toEqual([true, false, false, false]);
    expect(sleeves.every((s) => s.position.y === 1)).toBe(true);
  });

  it("hides every now-playing sleeve while a project's sleeve is on the stand", () => {
    const { root, sleeves } = rig();
    applyTurntable(findTurntable(root)!, 0.9, false, true);
    expect(sleeves.every((s) => !s.visible)).toBe(true);
  });
});

describe("findTurntable", () => {
  it("is a no-op that logs once when nodes are missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(findTurntable(new Group())).toBeNull();
    expect(findTurntable(new Group())).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("sorts sleeves by number", () => {
    const { root, sleeves } = rig();
    expect(findTurntable(root)!.sleeves).toEqual(sleeves);
  });
});
