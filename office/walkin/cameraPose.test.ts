import { describe, it, expect } from "vitest";
import { Group, Object3D, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { copyCameraPose, findCamera } from "./cameraPose";

describe("copyCameraPose", () => {
  it("puts the target exactly at the source's world pose, through a transformed parent", () => {
    const parent = new Group();
    parent.position.set(10, 0, 0);
    parent.rotation.y = Math.PI / 2;
    const source = new PerspectiveCamera(35);
    source.position.set(0, 2, 5);
    source.rotation.x = -0.3;
    parent.add(source);
    const target = new PerspectiveCamera(50);

    copyCameraPose(source, target);

    expect(target.position.distanceTo(source.getWorldPosition(new Vector3()))).toBeLessThan(1e-9);
    expect(target.quaternion.angleTo(source.getWorldQuaternion(new Quaternion()))).toBeLessThan(1e-6);
  });

  it("matches the vertical field of view and refreshes the projection", () => {
    const source = new PerspectiveCamera(35);
    const target = new PerspectiveCamera(50, 1.5, 0.1, 10000);
    copyCameraPose(source, target);
    expect(target.fov).toBe(35);
    expect(target.projectionMatrix.equals(new PerspectiveCamera(35, 1.5, 0.1, 10000).projectionMatrix)).toBe(true);
  });
});

describe("findCamera", () => {
  it("finds a perspective camera by name", () => {
    const root = new Group();
    const cam = new PerspectiveCamera();
    cam.name = "cam_stand";
    root.add(cam);
    expect(findCamera(root, "cam_stand")).toBe(cam);
  });

  it("throws for a missing node or one that isn't a camera", () => {
    const root = new Group();
    const notCam = new Object3D();
    notCam.name = "cam_stand";
    root.add(notCam);
    expect(() => findCamera(root, "cam_stand")).toThrow(/cam_stand/);
    expect(() => findCamera(root, "cam_walkin")).toThrow(/cam_walkin/);
  });
});
