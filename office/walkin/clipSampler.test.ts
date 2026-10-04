import { describe, it, expect } from "vitest";
import { AnimationClip, Group, PerspectiveCamera, Quaternion, QuaternionKeyframeTrack, VectorKeyframeTrack } from "three";
import { findClipFor, makeClipSampler, progressToTime } from "./clipSampler";

const TURN = new Quaternion(0, Math.SQRT1_2, 0, Math.SQRT1_2); // 90° about Y

function setup() {
  const root = new Group();
  const cam = new PerspectiveCamera();
  cam.name = "cam_walkin";
  root.add(cam);
  const clip = new AnimationClip("cam_walkinAction", 10, [
    new VectorKeyframeTrack("cam_walkin.position", [0, 10], [0, 90, 180, 0, 1.6, 1.6]),
    new QuaternionKeyframeTrack("cam_walkin.quaternion", [0, 10], [0, 0, 0, 1, ...TURN.toArray()]),
  ]);
  return { root, cam, clip, sample: makeClipSampler(clip, root) };
}

describe("progressToTime", () => {
  it.each([
    [0.5, 5],
    [0, 0],
    [1, 10],
    [-0.2, 0], // iOS rubber-band above the top
    [1.3, 10], // flick past the bottom
    [Number.NaN, 0],
  ])("%d → %d s", (progress, seconds) => expect(progressToTime(progress, 10)).toBe(seconds));
});

describe("makeClipSampler", () => {
  it("evaluates position at an exact time", () => {
    const { cam, sample } = setup();
    sample(5);
    expect(cam.position.y).toBeCloseTo(45.8);
    expect(cam.position.z).toBeCloseTo(90.8);
  });

  it("slerps rotation", () => {
    const { cam, sample } = setup();
    sample(5);
    // Compare components: tracks store float32, and angleTo's acos amplifies that to ~5e-4 rad near identity.
    const expected = new Quaternion().slerp(TURN, 0.5);
    expect(cam.quaternion.x).toBeCloseTo(expected.x, 6);
    expect(cam.quaternion.y).toBeCloseTo(expected.y, 6);
    expect(cam.quaternion.z).toBeCloseTo(expected.z, 6);
    expect(cam.quaternion.w).toBeCloseTo(expected.w, 6);
  });

  it("scrubs backwards after reaching the end", () => {
    const { cam, sample } = setup();
    sample(10);
    expect(cam.position.z).toBeCloseTo(1.6);
    sample(2);
    expect(cam.position.z).toBeCloseTo(180 - (180 - 1.6) * 0.2);
  });

  it("clamps times outside the clip", () => {
    const { cam, sample } = setup();
    sample(-3);
    expect(cam.position.z).toBeCloseTo(180);
    sample(99);
    expect(cam.position.z).toBeCloseTo(1.6);
  });

  it("names a track whose node is missing", () => {
    const { clip } = setup();
    expect(() => makeClipSampler(clip, new Group())).toThrow(/cam_walkin\.position/);
  });
});

describe("findClipFor", () => {
  it("finds the clip that drives a node", () => {
    const { clip } = setup();
    const other = new AnimationClip("door", 1, [new VectorKeyframeTrack("door.position", [0, 1], [0, 0, 0, 1, 0, 0])]);
    expect(findClipFor([other, clip], "cam_walkin")).toBe(clip);
  });

  it("throws when nothing drives it", () => {
    expect(() => findClipFor([], "cam_walkin")).toThrow(/cam_walkin/);
  });
});
