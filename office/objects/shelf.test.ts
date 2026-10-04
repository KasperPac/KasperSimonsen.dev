import { describe, it, expect } from "vitest";
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from "three";
import { makePose } from "@/office/camera/pose";
import { findShelfNodes, presentDistance, presentedPlacement, PRESENT_AT, PRESENT_FILL, PRESENT_SECONDS, ShelfMotion } from "./shelf";

const half = Math.tan(Math.PI / 8); // a 45 degree fov
const placement = () => ({ position: new Vector3(), quaternion: new Quaternion() });
/** At the origin looking down -z, y up, 45 degree fov. */
const origin = () => Object.assign(makePose(), { fov: 45 });

/** A shelf somewhere in the room, turned a little, with four 0.1 x 0.16 x 0.08 ornaments standing on their bases. */
function shelf() {
  const parent = new Group();
  parent.position.set(1, 1.5, 4);
  parent.rotation.y = 0.4;
  const ornaments = [0, 1, 2, 3].map((i) => {
    const o = new Group();
    o.name = `hs_shelf__ornament_0${i}`;
    o.position.set(-0.3 + 0.2 * i, 0, -0.1);
    o.rotation.y = 0.12;
    o.add(new Mesh(new BoxGeometry(0.1, 0.16, 0.08).translate(0, 0.08, 0), new MeshBasicMaterial()));
    parent.add(o);
    return o;
  });
  parent.updateMatrixWorld(true);
  return { parent, ornaments, nodes: findShelfNodes(ornaments) };
}
/** The shelf's focus camera: 2.5 m out from it, looking at it. */
const shelfCam = () => {
  const p = makePose();
  p.position.set(1, 1.6, 6.5);
  p.fov = 45;
  return p;
};
const worldOf = (o: Group) => {
  o.parent?.updateMatrixWorld(true);
  return { position: o.getWorldPosition(new Vector3()), quaternion: o.getWorldQuaternion(new Quaternion()) };
};

describe("presentDistance", () => {
  it("fills PRESENT_FILL of the view's height on a landscape screen", () =>
    expect(presentDistance(0.2, 45, 1.6)).toBeCloseTo(0.2 / (PRESENT_FILL * 2 * half), 6));
  it("fills that share of the width on a portrait one", () =>
    expect(presentDistance(0.2, 45, 0.5)).toBeCloseTo(2 * presentDistance(0.2, 45, 1), 6));
});

describe("presentedPlacement", () => {
  it("puts it left of centre on a landscape screen, its front turned to the camera, upright", () => {
    const out = presentedPlacement(origin(), 1.6, 0.2, new Vector3(), placement());
    const d = presentDistance(0.2, 45, 1.6);
    expect(out.position.z).toBeCloseTo(-d, 6);
    expect(out.position.x / (d * half * 1.6)).toBeCloseTo(PRESENT_AT.land.x, 6);
    expect(out.position.y / (d * half)).toBeCloseTo(PRESENT_AT.land.y, 6);
    const front = new Vector3(0, 0, 1).applyQuaternion(out.quaternion);
    expect(front.dot(out.position.clone().negate().normalize())).toBeCloseTo(1, 6);
    expect(new Vector3(0, 1, 0).applyQuaternion(out.quaternion).y).toBeGreaterThan(0.9);
  });
  it("centres it above the docked plaque on a portrait screen", () => {
    const out = presentedPlacement(origin(), 0.46, 0.2, new Vector3(), placement());
    const d = presentDistance(0.2, 45, 0.46);
    expect(out.position.x / (d * half * 0.46)).toBeCloseTo(PRESENT_AT.portrait.x, 6);
    expect(out.position.y / (d * half)).toBeCloseTo(PRESENT_AT.portrait.y, 6);
  });
  it("puts its visual centre on the spot, not its base", () => {
    const spot = presentedPlacement(origin(), 1.6, 0.2, new Vector3(), placement()).position.clone();
    const centre = new Vector3(0, 0.1, 0);
    const out = presentedPlacement(origin(), 1.6, 0.2, centre, placement());
    const seen = out.position.clone().add(centre.clone().applyQuaternion(out.quaternion));
    expect(seen.distanceTo(spot)).toBeLessThan(1e-9);
  });
});

describe("findShelfNodes", () => {
  it("finds each ornament's size and visual centre, in its own axes", () => {
    const { nodes } = shelf();
    expect(nodes.size[0]).toBeCloseTo(0.16, 3);
    expect(nodes.centre[0].x).toBeCloseTo(0, 6);
    expect(nodes.centre[0].y).toBeCloseTo(0.08, 6);
    expect(nodes.centre[0].z).toBeCloseTo(0, 6);
  });
});

describe("ShelfMotion", () => {
  const input = (presented: number | null, extra: Partial<{ reduced: boolean; aspect: number; camera: ReturnType<typeof makePose> | null }> = {}) => ({
    presented,
    camera: shelfCam(),
    aspect: 1.6,
    reduced: false,
    ...extra,
  });

  it("floats the picked one out over PRESENT_SECONDS and turns it to face the camera", () => {
    const { ornaments, nodes } = shelf();
    const m = new ShelfMotion();
    m.update(nodes, input(1), PRESENT_SECONDS / 2);
    expect(m.presented).toBe(false);
    expect(ornaments[1].position.distanceTo(nodes.restPosition[1])).toBeGreaterThan(0.01);
    m.update(nodes, input(1), PRESENT_SECONDS);
    expect(m.presented).toBe(true);
    const want = presentedPlacement(shelfCam(), 1.6, nodes.size[1], nodes.centre[1], placement());
    const got = worldOf(ornaments[1]);
    expect(got.position.distanceTo(want.position)).toBeLessThan(1e-6);
    expect(got.quaternion.angleTo(want.quaternion)).toBeLessThan(1e-6);
  });

  it("leaves the others on the shelf, their height to the bob", () => {
    const { ornaments, nodes } = shelf();
    ornaments[0].position.y = 0.0123;
    new ShelfMotion().update(nodes, input(1), PRESENT_SECONDS);
    expect(ornaments[0].position.y).toBe(0.0123);
    expect(ornaments[0].position.x).toBe(nodes.restPosition[0].x);
    expect(ornaments[0].quaternion.equals(nodes.restQuaternion[0])).toBe(true);
  });

  it("goes back the way it came, from wherever it is", () => {
    const { ornaments, nodes } = shelf();
    const m = new ShelfMotion();
    m.update(nodes, input(2), PRESENT_SECONDS / 2);
    m.update(nodes, input(null), PRESENT_SECONDS / 4);
    expect(ornaments[2].position.distanceTo(nodes.restPosition[2])).toBeGreaterThan(0.01); // turned round, not snapped home
    expect(m.presented).toBe(false);
    m.update(nodes, input(null), PRESENT_SECONDS);
    expect(ornaments[2].position.equals(nodes.restPosition[2])).toBe(true);
    expect(ornaments[2].quaternion.equals(nodes.restQuaternion[2])).toBe(true);
  });

  it("a swap sends the old one home while the new one comes out", () => {
    const { ornaments, nodes } = shelf();
    const m = new ShelfMotion();
    m.update(nodes, input(0), PRESENT_SECONDS);
    m.update(nodes, input(3), PRESENT_SECONDS / 2);
    expect(m.presented).toBe(false);
    expect(ornaments[0].position.distanceTo(nodes.restPosition[0])).toBeGreaterThan(0.01);
    expect(ornaments[3].position.distanceTo(nodes.restPosition[3])).toBeGreaterThan(0.01);
    m.update(nodes, input(3), PRESENT_SECONDS);
    expect(m.presented).toBe(true);
    expect(ornaments[0].position.equals(nodes.restPosition[0])).toBe(true);
  });

  it("switches at once under reduced motion", () => {
    const { nodes } = shelf();
    const m = new ShelfMotion();
    m.update(nodes, input(1, { reduced: true }), 1 / 60);
    expect(m.presented).toBe(true);
  });

  it("waits on the shelf until the camera is known", () => {
    const { ornaments, nodes } = shelf();
    const m = new ShelfMotion();
    m.update(nodes, input(1, { camera: null }), PRESENT_SECONDS);
    expect(ornaments[1].position.x).toBe(nodes.restPosition[1].x);
    expect(m.presented).toBe(false);
  });
});
