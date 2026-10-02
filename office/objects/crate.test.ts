import { describe, it, expect } from "vitest";
import { BoxGeometry, Group, Mesh, Quaternion, Vector3 } from "three";
import { clampDig, CrateMotion, findCrateNodes, FLIP_ANGLE, FLIP_SECONDS, PULL_FILL, PULL_SECONDS, pullDistance, pulledPose, SLEEVE_M } from "./crate";

const camera = { position: new Vector3(0, 1, 2), quaternion: new Quaternion(), fov: 45 };

function crate() {
  const root = new Group();
  root.position.set(1, 0, 0);
  const records = [0, 1, 2].map((i) => {
    const r = new Mesh(new BoxGeometry(SLEEVE_M, SLEEVE_M, 0.005));
    r.position.set(0, 0.012, -0.03 * i);
    r.rotation.x = -0.14;
    root.add(r);
    return r;
  });
  root.updateMatrixWorld(true);
  return { root, nodes: findCrateNodes(records) };
}

describe("clampDig", () => {
  it("stops at the last project", () => expect(clampDig(5, 3)).toBe(2));
  it("stops at the front", () => expect(clampDig(-1, 3)).toBe(0));
});

describe("pullDistance", () => {
  const frac = (d: number, fov: number, aspect: number) => {
    const span = 2 * d * Math.tan((fov * Math.PI) / 360);
    return { h: SLEEVE_M / span, w: SLEEVE_M / (span * aspect) };
  };
  it("fills the height on a wide screen", () => {
    const f = frac(pullDistance(45, 1.6), 45, 1.6);
    expect(f.h).toBeCloseTo(PULL_FILL.height);
    expect(f.w).toBeLessThanOrEqual(PULL_FILL.width);
  });
  it("fills the width on a phone", () => {
    const f = frac(pullDistance(70, 390 / 844), 70, 390 / 844);
    expect(f.w).toBeCloseTo(PULL_FILL.width);
    expect(f.h).toBeLessThanOrEqual(PULL_FILL.height);
  });
});

describe("pulledPose", () => {
  it("hangs the sleeve straight ahead, centred, its back to the camera and upright", () => {
    const out = pulledPose(new Vector3(), new Quaternion(), 0.6, { position: new Vector3(), quaternion: new Quaternion() });
    expect(out.position.toArray().map((v) => +v.toFixed(6))).toEqual([0, -SLEEVE_M / 2, -0.6]);
    const front = new Vector3(0, 0, 1).applyQuaternion(out.quaternion);
    const up = new Vector3(0, 1, 0).applyQuaternion(out.quaternion);
    expect(front.z).toBeCloseTo(-1); // the front faces away; the back faces the camera
    expect(up.y).toBeCloseTo(1);
  });
});

describe("CrateMotion", () => {
  it("flicks the records in front of the dig forward over FLIP_SECONDS, leaving the rest", () => {
    const { nodes } = crate();
    const m = new CrateMotion();
    m.update(nodes, { dig: 1, pulled: null, camera, aspect: 1.6, reduced: false }, FLIP_SECONDS);
    expect(nodes.records[0].rotation.x).toBeCloseTo(-0.14 + FLIP_ANGLE);
    expect(nodes.records[1].rotation.x).toBeCloseTo(-0.14);
  });
  it("is part way through a flick half way through it", () => {
    const { nodes } = crate();
    const m = new CrateMotion();
    m.update(nodes, { dig: 1, pulled: null, camera, aspect: 1.6, reduced: false }, FLIP_SECONDS / 2);
    expect(nodes.records[0].rotation.x).toBeGreaterThan(-0.14);
    expect(nodes.records[0].rotation.x).toBeLessThan(-0.14 + FLIP_ANGLE);
  });
  it("switches at once under reduced motion", () => {
    const { nodes } = crate();
    const m = new CrateMotion();
    m.update(nodes, { dig: 2, pulled: null, camera, aspect: 1.6, reduced: true }, 0.001);
    expect(nodes.records[1].rotation.x).toBeCloseTo(-0.14 + FLIP_ANGLE);
  });
  it("brings the pulled record to the camera, says so, and puts it back", () => {
    const { nodes } = crate();
    const m = new CrateMotion();
    m.update(nodes, { dig: 0, pulled: 0, camera, aspect: 1.6, reduced: false }, PULL_SECONDS);
    expect(m.pulledDone).toBe(true);
    const want = pulledPose(camera.position, camera.quaternion, pullDistance(45, 1.6), { position: new Vector3(), quaternion: new Quaternion() });
    const got = nodes.records[0].getWorldPosition(new Vector3());
    expect(got.distanceTo(want.position)).toBeLessThan(1e-6);
    m.update(nodes, { dig: 0, pulled: null, camera, aspect: 1.6, reduced: false }, PULL_SECONDS);
    expect(m.pulledDone).toBe(false);
    expect(nodes.records[0].position.toArray()).toEqual(nodes.restPosition[0].toArray());
    expect(nodes.records[0].rotation.x).toBeCloseTo(-0.14);
  });
  it("keeps whatever height the tease gave a record that isn't pulled", () => {
    const { nodes } = crate();
    const m = new CrateMotion();
    nodes.records[1].position.y = 0.05; // ObjectMotion's nudge, written earlier in the frame
    m.update(nodes, { dig: 0, pulled: null, camera, aspect: 1.6, reduced: false }, 0.016);
    expect(nodes.records[1].position.y).toBe(0.05);
  });
});
