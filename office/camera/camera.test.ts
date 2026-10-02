import { describe, it, expect } from "vitest";
import { Object3D, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { applyPose, blendPose, copyPose, DESIGN_ASPECT, easeInOutCubic, makePose, MAX_FOV, readPose, smoothstep, widenForAspect, type Pose } from "./pose";
import { basePose, focusPose, PORTRAIT_FROM } from "./basePose";
import { CameraRig, FOCUS_MOVES, FOCUS_SECONDS } from "./rig";

const pose = (x: number, fov = 50, yaw = 0): Pose => ({
  position: new Vector3(x, 0, 0),
  quaternion: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw),
  fov,
});

describe("pose", () => {
  it("reads a node's world pose and a camera's fov", () => {
    const parent = new Object3D();
    parent.position.set(10, 0, 0);
    const cam = new PerspectiveCamera(42);
    cam.position.set(1, 2, 3);
    parent.add(cam);
    const p = readPose(cam, makePose());
    expect(p.position.toArray()).toEqual([11, 2, 3]);
    expect(p.fov).toBe(42);
  });
  it("blends position, rotation and fov", () => {
    const out = blendPose(pose(0, 40, 0), pose(10, 60, Math.PI / 2), 0.5, makePose());
    expect(out.position.x).toBeCloseTo(5);
    expect(out.fov).toBeCloseTo(50);
    expect(out.quaternion.angleTo(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 4))).toBeLessThan(1e-6);
  });
  it("blends in place", () => {
    const a = pose(0);
    blendPose(a, pose(10), 0.25, a);
    expect(a.position.x).toBeCloseTo(2.5);
  });
  it("applies to a camera and updates its projection only when the fov changes", () => {
    const cam = new PerspectiveCamera(50);
    let updates = 0;
    cam.updateProjectionMatrix = () => void updates++;
    applyPose(pose(3, 50), cam);
    expect(cam.position.x).toBe(3);
    expect(updates).toBe(0);
    applyPose(pose(3, 70), cam);
    expect(cam.fov).toBe(70);
    expect(updates).toBe(1);
  });
  it("copies without sharing vectors", () => {
    const a = pose(1);
    const b = copyPose(a, makePose());
    a.position.x = 9;
    expect(b.position.x).toBe(1);
  });
});

describe("widenForAspect", () => {
  it("leaves 16:10 and wider alone", () => {
    expect(widenForAspect(50, DESIGN_ASPECT)).toBe(50);
    expect(widenForAspect(50, 16 / 9)).toBe(50);
  });
  it("keeps the 16:10 horizontal view on a 4:3 screen", () => {
    const fov = widenForAspect(50, 4 / 3);
    const h = (v: number, a: number) => 2 * Math.atan(Math.tan(((v * Math.PI) / 180) / 2) * a);
    expect(h(fov, 4 / 3)).toBeCloseTo(h(50, DESIGN_ASPECT), 6);
  });
  it("caps very narrow screens", () => expect(widenForAspect(50, 0.2)).toBe(MAX_FOV));
  it("ignores a broken aspect", () => expect(widenForAspect(50, 0)).toBe(50));
});

describe("easing", () => {
  it("eases in and out between 0 and 1", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(0.25)).toBeLessThan(0.25);
  });
  it("smoothsteps with clamping", () => {
    expect(smoothstep(0.9, 1, 0.5)).toBe(0);
    expect(smoothstep(0.9, 1, 1.2)).toBe(1);
    expect(smoothstep(0.9, 1, 0.95)).toBeCloseTo(0.5);
  });
});

describe("basePose", () => {
  const walk = pose(0, 50);
  const portrait = pose(10, 85);
  it("is the walk-in pose on a landscape screen", () => {
    const out = basePose(walk, portrait, 1, 16 / 10, makePose());
    expect(out.position.x).toBe(0);
    expect(out.fov).toBe(50);
  });
  it("widens the walk-in on a 4:3 screen", () =>
    expect(basePose(walk, portrait, 0.5, 4 / 3, makePose()).fov).toBeCloseTo(widenForAspect(50, 4 / 3)));
  it("eases into the portrait standing pose at the end on portrait screens", () => {
    expect(basePose(walk, portrait, PORTRAIT_FROM, 0.46, makePose()).position.x).toBe(0);
    expect(basePose(walk, portrait, 1, 0.46, makePose()).position.x).toBeCloseTo(10);
    expect(basePose(walk, portrait, 1, 0.46, makePose()).fov).toBeCloseTo(85);
  });
  it("falls back to widening when there is no portrait pose", () =>
    expect(basePose(walk, null, 1, 0.46, makePose()).fov).toBeCloseTo(widenForAspect(50, 0.46)));
});

describe("focusPose", () => {
  it("uses the landscape camera on landscape screens", () => expect(focusPose(pose(1, 40), pose(2, 70), 1.6, makePose()).position.x).toBe(1));
  it("uses the portrait camera on portrait screens", () => expect(focusPose(pose(1, 40), pose(2, 70), 0.5, makePose()).position.x).toBe(2));
  it("widens the landscape camera when there is no portrait one", () =>
    expect(focusPose(pose(1, 40), null, 0.5, makePose()).fov).toBeCloseTo(widenForAspect(40, 0.5)));
});

describe("CameraRig", () => {
  const base = pose(0);
  it("follows the base pose when idle", () => {
    const rig = new CameraRig();
    expect(rig.pose(base, makePose()).position.x).toBe(0);
    expect(rig.moving).toBe(false);
  });
  it("eases from the current pose to a goal over the duration", () => {
    const rig = new CameraRig();
    rig.moveTo(pose(0), { kind: "pose", pose: pose(10) }, FOCUS_SECONDS);
    expect(rig.advance(FOCUS_SECONDS / 2)).toBe(false);
    expect(rig.moving).toBe(true);
    expect(rig.pose(base, makePose()).position.x).toBeCloseTo(5);
    expect(rig.advance(FOCUS_SECONDS)).toBe(true);
    expect(rig.pose(base, makePose()).position.x).toBe(10);
    expect(rig.goalKind).toBe("pose");
  });
  it("reports completion once", () => {
    const rig = new CameraRig();
    rig.moveTo(pose(0), { kind: "pose", pose: pose(10) }, 1);
    expect(rig.advance(2)).toBe(true);
    expect(rig.advance(2)).toBe(false);
  });
  it("cuts on a zero-length move but still reports completion on the next advance", () => {
    const rig = new CameraRig();
    rig.moveTo(pose(-5), { kind: "pose", pose: pose(10) }, 0);
    expect(rig.advance(0.016)).toBe(true);
    expect(rig.pose(base, makePose()).position.x).toBe(10);
  });
  it("retargets from wherever the camera is", () => {
    const rig = new CameraRig();
    rig.moveTo(pose(0), { kind: "pose", pose: pose(10) }, 1);
    rig.advance(0.5);
    const now = rig.pose(base, makePose());
    rig.moveTo(now, { kind: "base" }, 1);
    expect(rig.pose(base, makePose()).position.x).toBeCloseTo(now.position.x);
    rig.advance(1);
    expect(rig.pose(base, makePose()).position.x).toBe(0);
  });
  it("tracks a moving base pose on the way back", () => {
    const rig = new CameraRig();
    rig.moveTo(pose(10), { kind: "base" }, 1);
    rig.advance(1);
    expect(rig.pose(pose(3), makePose()).position.x).toBe(3);
  });
  it("keeps a plain move on the straight line", () => {
    const rig = new CameraRig();
    rig.moveTo(pose(0), { kind: "pose", pose: pose(10) }, 2);
    rig.advance(1);
    expect(rig.pose(base, makePose()).position.y).toBeCloseTo(0);
  });
  it("lifts an arcing move over the straight line mid-way and lands exactly on the goal", () => {
    const rig = new CameraRig();
    rig.moveTo(pose(0), { kind: "pose", pose: pose(10) }, 2, { lift: 0.5, swing: 0 });
    rig.advance(1);
    const mid = rig.pose(base, makePose());
    expect(mid.position.x).toBeCloseTo(5);
    expect(mid.position.y).toBeCloseTo(0.5);
    rig.advance(1);
    expect(rig.pose(base, makePose()).position.toArray()).toEqual([10, 0, 0]);
  });
  it("bows a swinging move sideways, level", () => {
    const rig = new CameraRig();
    rig.moveTo(pose(0), { kind: "pose", pose: pose(10) }, 2, { lift: 0, swing: 0.3 });
    rig.advance(1);
    const mid = rig.pose(base, makePose());
    expect(Math.abs(mid.position.z)).toBeCloseTo(0.3);
    expect(mid.position.y).toBeCloseTo(0);
  });
});

describe("focus moves", () => {
  it("takes the drawer slower than the default, on an arc", () => {
    expect(FOCUS_MOVES.hs_drawer.seconds).toBeGreaterThan(FOCUS_SECONDS);
    expect(FOCUS_MOVES.hs_drawer.arc?.lift).toBeGreaterThan(0);
  });
  it("leaves the other objects on the default move", () => {
    for (const h of ["hs_crate", "hs_monitor", "hs_shelf"] as const) expect(FOCUS_MOVES[h]).toEqual({ seconds: FOCUS_SECONDS, arc: null });
  });
});
