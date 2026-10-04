import { describe, it, expect, vi } from "vitest";
import { Group, Object3D } from "three";
import { applySkippingGirl, findSkippingGirl, skipPose } from "./skippingGirl";

describe("skipPose", () => {
  it("starts on pose 0", () => expect(skipPose(0, 5)).toBe(0));

  it("steps through every pose once per cycle", () => {
    const count = 5;
    const seen = Array.from({ length: count }, (_, i) => skipPose((i + 0.5) / count / 24, count));
    expect(seen).toEqual([0, 1, 2, 3, 4]);
    // the next cycle starts over
    expect(skipPose(1 / 24, count)).toBe(0);
  });

  it("takes a cycle count", () => expect(skipPose(0.5, 4, 2)).toBe(0));

  it("stays in range at and beyond both ends", () => {
    for (const p of [0, 1, 0.999999, -0.5, 1.7]) {
      const i = skipPose(p, 5);
      expect(Number.isInteger(i)).toBe(true);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(5);
    }
    expect(skipPose(-0.5, 5)).toBe(skipPose(0, 5));
    expect(skipPose(1.7, 5)).toBe(skipPose(1, 5));
  });

  it("handles NaN and count <= 1 without throwing", () => {
    expect(skipPose(Number.NaN, 5)).toBe(0);
    expect(skipPose(0.5, 1)).toBe(0);
    expect(skipPose(0.5, 0)).toBe(0);
  });
});

function rig(count = 4) {
  const root = new Group();
  const poses: Object3D[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const o = new Object3D();
    o.name = `prop_skipping_girl__pose_0${i}`;
    root.add(o);
    poses[i] = o;
  }
  const text = new Object3D();
  text.name = "prop_skipping_girl__text";
  root.add(text);
  return { root, poses, text };
}

describe("applySkippingGirl", () => {
  it("shows only the current pose and never touches the text", () => {
    const { root, poses, text } = rig();
    const found = findSkippingGirl(root)!;
    applySkippingGirl(found, 1.5 / 4 / 24, false);
    expect(poses.map((p) => p.visible)).toEqual([false, true, false, false]);
    expect(text.visible).toBe(true);
  });

  it("shows pose 0 only under reduced motion", () => {
    const { root, poses } = rig();
    applySkippingGirl(findSkippingGirl(root)!, 1.5 / 4 / 24, true);
    expect(poses.map((p) => p.visible)).toEqual([true, false, false, false]);
  });
});

describe("findSkippingGirl", () => {
  it("sorts poses by number", () => {
    const { root, poses } = rig(5);
    expect(findSkippingGirl(root)).toEqual(poses);
  });

  it("is a no-op that logs once when poses are missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(findSkippingGirl(new Group())).toBeNull();
    expect(findSkippingGirl(new Group())).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
