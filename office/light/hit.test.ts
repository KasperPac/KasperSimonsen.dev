import { describe, expect, it } from "vitest";
import { Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Raycaster, Vector2, type Intersection, type Object3D } from "three";
import { LIGHT_HIT, lightHitBox, lightTakesPointer } from "./hit";

const material = new MeshBasicMaterial({ visible: false });

/** A mesh standing in for part of the office: its ancestors carry the names the hotspots are found by. */
function part(...names: string[]): Object3D {
  let parent: Object3D | null = null;
  let mesh: Object3D = new Mesh();
  for (const name of [...names].reverse()) {
    const node: Object3D = name === names[names.length - 1] ? mesh : new Group();
    node.name = name;
    if (parent) node.add(parent);
    parent = node;
  }
  return mesh;
}
const shelf = () => {
  const root = new Group();
  root.name = "hs_shelf";
  const board = new Mesh();
  root.add(board);
  return board;
};
const wall = () => part("prop_wall_back");
const bulb = () => lightHitBox([0.15, 0.2, 0.15], [0, 0, 0], material, () => true);

describe("lightTakesPointer (the nearest-hit check and the hotspot-wins rule)", () => {
  it("takes the pointer when its box is the nearest thing and only wall is behind it", () => {
    expect(lightTakesPointer([bulb(), wall()])).toBe(true);
    expect(lightTakesPointer([bulb()])).toBe(true);
  });
  it("leaves the pointer to a hotspot in front of it", () => {
    expect(lightTakesPointer([shelf(), bulb()])).toBe(false);
  });
  it("leaves the pointer to a hotspot behind it: the bulb box is nearer on a phone (QA's overlap case)", () => {
    // the bulb is 2.1 m from the camera and the shelf 3.3 m: the bulb box is intersections[0]
    expect(lightTakesPointer([bulb(), shelf()])).toBe(false);
    expect(lightTakesPointer([bulb(), wall(), shelf()])).toBe(false);
  });
  it("does not take a pointer when something that isn't a hotspot is nearer than its box", () => {
    expect(lightTakesPointer([wall(), bulb()])).toBe(false);
  });
  it("does not take a pointer it isn't under", () => {
    expect(lightTakesPointer([])).toBe(false);
    expect(lightTakesPointer([wall()])).toBe(false);
    expect(lightTakesPointer([shelf()])).toBe(false);
  });
  it("marks its boxes so the pointer handlers can tell them", () => {
    expect(bulb().userData[LIGHT_HIT]).toBe(true);
  });
});

describe("lightHitBox (answers only while the room is idle)", () => {
  const hits = (box: Mesh): Intersection[] => {
    const camera = new PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 3);
    camera.updateMatrixWorld();
    const raycaster = new Raycaster();
    raycaster.setFromCamera(new Vector2(0, 0), camera);
    box.updateMatrixWorld();
    const out: Intersection[] = [];
    box.raycast(raycaster, out);
    return out;
  };
  it("is hit while enabled", () => {
    expect(hits(lightHitBox([0.15, 0.2, 0.15], [0, 0, 0], material, () => true)).length).toBeGreaterThan(0);
  });
  it("is not hit while disabled, so a focused object or the walk-in keeps the pointer", () => {
    expect(hits(lightHitBox([0.15, 0.2, 0.15], [0, 0, 0], material, () => false))).toHaveLength(0);
  });
  it("asks again on every pointer event", () => {
    let idle = false;
    const box = lightHitBox([0.15, 0.2, 0.15], [0, 0, 0], material, () => idle);
    expect(hits(box)).toHaveLength(0);
    idle = true;
    expect(hits(box).length).toBeGreaterThan(0);
  });
  it("misses a ray outside its size", () => {
    const box = lightHitBox([0.15, 0.2, 0.15], [0.5, 0, 0], material, () => true);
    expect(hits(box)).toHaveLength(0);
  });
});
