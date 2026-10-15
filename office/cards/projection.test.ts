import { describe, expect, it } from "vitest";
import { Matrix4, PerspectiveCamera } from "three";
import { projectFace } from "./projection";

// Apply the CSS matrix to points on the print's z=0 plane, including its perspective divide.
function point(css: string | null, x: number, y: number) {
  expect(css).not.toBeNull();
  const m = css!.slice(9, -1).split(",").map(Number);
  const w = m[3] * x + m[7] * y + m[15];
  return [(m[0] * x + m[4] * y + m[12]) / w, (m[1] * x + m[5] * y + m[13]) / w];
}

describe("projectFace", () => {
  const camera = new PerspectiveCamera(90, 1, 0.1, 100);
  const clip = camera.projectionMatrix.clone().multiply(new Matrix4().makeTranslation(0, 0, -2));
  const face = { widthPx: 200, heightPx: 100, unitsPerPx: 0.01 };
  it("maps the print onto the physical face instead of placing its top left at the face centre", () => {
    const css = projectFace(clip, face, { width: 400, height: 400 });
    expect(point(css, 0, 0)[0]).toBeCloseTo(100);
    expect(point(css, 0, 0)[1]).toBeCloseTo(150);
    expect(point(css, 200, 100)[0]).toBeCloseTo(300);
    expect(point(css, 200, 100)[1]).toBeCloseTo(250);
  });
  it("keeps the perspective of a tilted face, with a normalized CSS homogeneous coordinate", () => {
    const tilted = new Matrix4().set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0.5, 0, 0, 2);
    const css = projectFace(tilted, { widthPx: 2, heightPx: 2, unitsPerPx: 1 }, { width: 400, height: 400 });
    for (const [x, y, wantX, wantY] of [[0, 0, 200 / 3, 200 / 3], [2, 0, 280, 120], [2, 2, 280, 280], [0, 2, 200 / 3, 1000 / 3]]) {
      const got = point(css, x, y);
      expect(got[0]).toBeCloseTo(wantX);
      expect(got[1]).toBeCloseTo(wantY);
    }
    expect(css!.slice(9, -1).split(",").map(Number)[15]).toBe(1);
  });
  it("follows a moving parent and viewport resize", () => {
    const moved = camera.projectionMatrix.clone().multiply(new Matrix4().makeTranslation(0.5, 0, -2));
    const css = projectFace(moved, face, { width: 800, height: 400 });
    expect(point(css, 100, 50)[0]).toBeCloseTo(500);
    expect(point(css, 100, 50)[1]).toBeCloseTo(200);
  });
  it("hides faces behind the camera or crossing its plane instead of generating invalid CSS", () => {
    const behind = camera.projectionMatrix.clone().multiply(new Matrix4().makeTranslation(0, 0, 2));
    expect(projectFace(behind, face, { width: 400, height: 400 })).toBeNull();
    const crossing = new Matrix4().set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0.5);
    expect(projectFace(crossing, { widthPx: 2, heightPx: 2, unitsPerPx: 1 }, { width: 400, height: 400 })).toBeNull();
  });
});
