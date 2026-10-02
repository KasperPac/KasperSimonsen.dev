import { describe, it, expect } from "vitest";
import { BoxGeometry, Group, Mesh, PerspectiveCamera } from "three";
import { screenRect } from "./screenRect";

const size = { width: 100, height: 100 };

function camera() {
  const cam = new PerspectiveCamera(50, 1, 0.1, 100);
  cam.position.set(0, 0, 5);
  cam.updateMatrixWorld();
  return cam;
}

describe("screenRect", () => {
  it("frames an object centred in view symmetrically about the middle of the screen", () => {
    const r = screenRect(new Mesh(new BoxGeometry(1, 1, 1)), camera(), size)!;
    expect(r.left).toBeLessThan(50);
    expect(r.right).toBeGreaterThan(50);
    expect(r.left + r.right).toBeCloseTo(100);
    expect(r.top + r.bottom).toBeCloseTo(100);
  });
  it("moves right with the object", () => {
    const box = new Mesh(new BoxGeometry(1, 1, 1));
    box.position.x = 1;
    box.updateMatrixWorld();
    expect(screenRect(box, camera(), size)!.left).toBeGreaterThan(50);
  });
  it("is null behind the camera", () => {
    const box = new Mesh(new BoxGeometry(1, 1, 1));
    box.position.z = 10;
    box.updateMatrixWorld();
    expect(screenRect(box, camera(), size)).toBeNull();
  });
  it("is null for an empty object", () => expect(screenRect(new Group(), camera(), size)).toBeNull());
});
