import { describe, it, expect } from "vitest";
import { BoxGeometry, Group, Mesh, Raycaster, Vector3 } from "three";
import { addDigPlane, DIG_PLANE, digFromPointer, recordUnder } from "./scrub";

// the projects' top edges, front to back, in the crate's frame (+z its front)
const TOPS = [0.08, 0.05, 0.02, -0.01, -0.04];

describe("digFromPointer", () => {
  it("brings up the record the pointer is on, in front of the current one or behind it", () => {
    expect(digFromPointer(3, 0, TOPS, 5, 2)).toBe(3); // the next one's top, peeking over the front one's
    expect(digFromPointer(1, 0.2, TOPS, 5, 2)).toBe(1); // one flicked forward, leaning over the crate's front
  });
  it("keeps the front record while the pointer is anywhere on it, however far its cover reaches", () => {
    expect(digFromPointer(2, 0.15, TOPS, 5, 2)).toBe(2);
    expect(digFromPointer(2, null, TOPS, 5, 2)).toBe(2);
  });
  it("takes the records with no project, behind them all, as the last project", () => {
    expect(digFromPointer(7, -0.12, TOPS, 5, 1)).toBe(4);
  });
  it("off the records, keeps to the front in front of the first top edge and the back behind the last", () => {
    expect(digFromPointer(null, 0.25, TOPS, 5, 3)).toBe(0);
    expect(digFromPointer(null, -0.15, TOPS, 5, 1)).toBe(4);
    expect(digFromPointer(null, 0.03, TOPS, 5, 2)).toBe(2); // between them: as it was
    expect(digFromPointer(null, null, TOPS, 5, 2)).toBe(2); // not over the opening
  });
  it("reaches every project when there are as many as nine, the last behind the last top edge", () => {
    const tops = [0.16, 0.13, 0.1, 0.07, 0.04, 0.01, -0.02, -0.05, -0.08];
    expect(digFromPointer(null, -0.1, tops, tops.length, 0)).toBe(8);
    expect(digFromPointer(null, 0.2, tops, tops.length, 5)).toBe(0);
    expect(digFromPointer(8, 0, tops, tops.length, 0)).toBe(8);
    expect(digFromPointer(12, 0, tops, tops.length, 0)).toBe(8); // blank sleeves behind the ninth
  });
  it("takes a blank sleeve behind three projects as the last of them", () => {
    const tops = [0.08, 0.05, 0.02];
    expect(digFromPointer(6, -0.05, tops, 3, 0)).toBe(2);
    expect(digFromPointer(3, 0, tops, 3, 1)).toBe(2);
  });
  it("has nothing to choose with one project", () => expect(digFromPointer(3, -0.1, TOPS, 1, 0)).toBe(0));
});

describe("recordUnder", () => {
  const records = [0, 1, 2].map((i) => {
    const r = new Group();
    r.name = `record_0${i}`;
    return r;
  });
  const vinyl = new Mesh();
  records[1].add(vinyl);
  const plane = new Mesh();
  plane.name = DIG_PLANE;
  const body = new Mesh();
  it("is the record nearest the pointer, its vinyl or art counting as it, the dig plane not counting", () => {
    expect(recordUnder([{ object: plane }, { object: vinyl }, { object: records[2] }], records)).toBe(1);
    expect(recordUnder([{ object: records[2] }, { object: records[0] }], records)).toBe(2);
  });
  it("is none when the nearest thing is no record, even with one behind it", () => {
    expect(recordUnder([{ object: plane }, { object: body }, { object: records[0] }], records)).toBeNull();
    expect(recordUnder([{ object: plane }], records)).toBeNull();
  });
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
  it("knows how deep each record's top edge is in the crate, leaning or not", () => {
    const { root, record } = crate();
    const leaning = new Mesh(new BoxGeometry(0.315, 0.315, 0.005).translate(0, 0.1575, 0));
    leaning.position.set(0, 0.012, -0.05);
    leaning.rotation.x = -0.2; // its top leans back
    root.add(leaning);
    root.updateMatrixWorld(true);
    const plane = addDigPlane(root, [record, leaning], () => true)!;
    expect(plane.userData.tops[0]).toBeCloseTo(0, 6);
    expect(plane.userData.tops[1]).toBeCloseTo(-0.05 - 0.315 * Math.sin(0.2), 3);
  });
  it("covers the crate's opening and the flicked records leaning out over its front, nothing further", () => {
    const { root, record } = crate();
    const plane = addDigPlane(root, [record], () => true)!;
    expect(down(2, 0.25).intersectObject(root, true).some((h) => h.object === plane)).toBe(true); // over the low front
    expect(down(2, 0.4).intersectObject(root, true).some((h) => h.object === plane)).toBe(false);
    expect(down(2, -0.2).intersectObject(root, true).some((h) => h.object === plane)).toBe(false);
  });
  it("takes no pointer while disabled", () => {
    const { root, record } = crate();
    const plane = addDigPlane(root, [record], () => false)!;
    expect(down(2, 0).intersectObject(root, true).some((h) => h.object === plane)).toBe(false);
  });
});
