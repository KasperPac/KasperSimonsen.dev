import { describe, it, expect } from "vitest";
import { BoxGeometry, Group, Mesh, Raycaster, Vector3 } from "three";
import { addDigPlane, DIG_PLANE, digFromDepth } from "./scrub";

// a crate 0.3 deep (z +0.15 at its front, -0.15 at its back) holding three projects: a band of 0.1 each
const FRONT = 0.15;
const BACK = -0.15;

describe("digFromDepth", () => {
  it("maps the crate's front to the first project and its back to the last", () => {
    expect(digFromDepth(0.14, FRONT, BACK, 3, 1)).toBe(0);
    expect(digFromDepth(-0.14, FRONT, BACK, 3, 1)).toBe(2);
  });
  it("moves on only well past a band's edge, so the pointer can't make it flicker", () => {
    expect(digFromDepth(0.045, FRONT, BACK, 3, 0)).toBe(0); // just past the 0 | 1 edge at 0.05
    expect(digFromDepth(0.02, FRONT, BACK, 3, 0)).toBe(1);
    expect(digFromDepth(0.055, FRONT, BACK, 3, 1)).toBe(1); // and back the other way
    expect(digFromDepth(0.08, FRONT, BACK, 3, 1)).toBe(0);
  });
  it("keeps to the projects outside the crate's depth", () => {
    expect(digFromDepth(0.5, FRONT, BACK, 3, 2)).toBe(0);
    expect(digFromDepth(-0.5, FRONT, BACK, 3, 0)).toBe(2);
  });
  it("has nothing to choose with one project", () => expect(digFromDepth(-0.1, FRONT, BACK, 1, 0)).toBe(0));
});

describe("addDigPlane", () => {
  function crate() {
    const root = new Group();
    root.name = "hs_crate";
    const body = new Mesh(new BoxGeometry(0.36, 0.26, 0.36).translate(0, 0.13, 0));
    body.name = "hs_crate__body";
    const record = new Mesh(new BoxGeometry(0.315, 0.315, 0.005).translate(0, 0.1575, 0));
    record.name = "hs_crate__record_00";
    record.position.y = 0.012;
    root.add(body, record);
    root.position.set(2, 0, 0);
    root.updateMatrixWorld(true);
    return { root, record };
  }
  const down = (x: number, z: number) => new Raycaster(new Vector3(x, 5, z), new Vector3(0, -1, 0));

  it("lies across the crate's opening at the records' tops, and reads back depth in the crate's frame", () => {
    const { root, record } = crate();
    const plane = addDigPlane(root, [record], () => true)!;
    expect(plane.name).toBe(DIG_PLANE);
    const hit = down(2, 0.1).intersectObject(root, true).find((h) => h.object === plane)!;
    expect(hit.point.y).toBeCloseTo(0.327, 3);
    expect(root.worldToLocal(hit.point.clone()).z).toBeCloseTo(0.1, 6);
  });
  it("covers the inside of the crate only", () => {
    const { root, record } = crate();
    const plane = addDigPlane(root, [record], () => true)!;
    expect(down(2, 0.4).intersectObject(root, true).some((h) => h.object === plane)).toBe(false);
  });
  it("takes no pointer while disabled", () => {
    const { root, record } = crate();
    const plane = addDigPlane(root, [record], () => false)!;
    expect(down(2, 0).intersectObject(root, true).some((h) => h.object === plane)).toBe(false);
  });
});
