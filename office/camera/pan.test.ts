import { describe, it, expect } from "vitest";
import { Matrix4, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { makePose } from "./pose";
import { basePose } from "./basePose";
import { applyPan, clampPan, dragPan, inView, isPanGesture, PAN_TRUCK_M, panFor } from "./pan";

const forward = (q: Quaternion) => new Vector3(0, 0, -1).applyQuaternion(q);

describe("clampPan", () => {
  it("stops at the room's sides", () => {
    expect(clampPan(3)).toBe(1);
    expect(clampPan(-3)).toBe(-1);
    expect(clampPan(0.4)).toBe(0.4);
  });
});

describe("dragPan", () => {
  it("drags the room with the finger: a drag to the left looks to the right", () => {
    expect(dragPan(0, -100, 400)).toBeGreaterThan(0);
    expect(dragPan(0, 100, 400)).toBeLessThan(0);
  });
  it("crosses the whole room in a little over a screen's width", () => {
    expect(dragPan(-1, -400, 400)).toBeGreaterThan(0.5);
    expect(dragPan(-1, -600, 400)).toBe(1);
  });
  it("ignores a screen with no width", () => expect(dragPan(0.3, -100, 0)).toBe(0.3));
});

describe("isPanGesture", () => {
  it("is a sideways drag", () => expect(isPanGesture(-30, 6)).toBe(true));
  it("isn't a tap", () => expect(isPanGesture(4, 2)).toBe(false));
  it("isn't a scroll up or down the walk-in", () => expect(isPanGesture(20, 40)).toBe(false));
});

describe("applyPan", () => {
  it("keeps the centred wall sign fully in a phone's leftward view", () => {
    // Authored room-space camera and the full 0.85 m sign box, independent of the pan implementation.
    const stand = makePose();
    stand.position.set(0.1, 1.95, -1.5);
    stand.quaternion.setFromRotationMatrix(new Matrix4().lookAt(stand.position, new Vector3(0.1, 1.05, -4.6), new Vector3(0, 1, 0)));
    stand.fov = 54;
    for (const aspect of [390 / 844, 360 / 800]) {
      const view = basePose(stand, stand, 1, aspect, makePose(), -1);
      const camera = new PerspectiveCamera(view.fov, aspect, 0.01, 100);
      camera.position.copy(view.position);
      camera.quaternion.copy(view.quaternion);
      camera.updateMatrixWorld();
      for (const y of [1.355, 2.205]) for (const z of [-4.625, -3.775]) {
        const point = new Vector3(-2.23, y, z).project(camera);
        expect(point.x).toBeGreaterThan(-0.9); // at least 5% of the viewport inside the edge
        expect(point.x).toBeLessThan(0.9);
        expect(Math.abs(point.y)).toBeLessThan(0.9);
      }
    }
  });

  const base = makePose(); // at the origin, looking down -z
  it("leaves the pose alone in the middle", () => {
    const out = applyPan(base, 0, makePose());
    expect(out.position.length()).toBeCloseTo(0);
    expect(forward(out.quaternion).z).toBeCloseTo(-1);
  });
  it("slides the camera to its right and turns it a little that way when panned right", () => {
    const out = applyPan(base, 1, makePose());
    expect(out.position.x).toBeCloseTo(PAN_TRUCK_M);
    expect(out.position.y).toBeCloseTo(0);
    expect(forward(out.quaternion).x).toBeGreaterThan(0.05);
  });
  it("mirrors to the left", () => {
    const out = applyPan(base, -1, makePose());
    expect(out.position.x).toBeCloseTo(-PAN_TRUCK_M);
    expect(forward(out.quaternion).x).toBeLessThan(-0.05);
  });
  it("slides level even when the camera looks down", () => {
    const tilted = makePose();
    tilted.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), -0.5);
    expect(applyPan(tilted, 1, makePose()).position.y).toBeCloseTo(0);
  });
  it("keeps the field of view", () => {
    const wide = { ...makePose(), fov: 70 };
    expect(applyPan(wide, 0.5, makePose()).fov).toBe(70);
  });
});

describe("panFor", () => {
  it("looks left for the crate and right for the shelf, and stays central for the desk", () => {
    expect(panFor("hs_crate")).toBeLessThan(-0.4);
    expect(panFor("hs_shelf")).toBeGreaterThan(0.4);
    expect(Math.abs(panFor("hs_drawer"))).toBeLessThan(0.2);
    expect(Math.abs(panFor("hs_monitor"))).toBeLessThan(0.2);
  });
});

describe("inView", () => {
  it("is what's near enough the current pan to be on screen", () => {
    expect(inView("hs_drawer", 0)).toBe(true);
    expect(inView("hs_crate", 0)).toBe(false);
    expect(inView("hs_crate", -1)).toBe(true);
    expect(inView("hs_shelf", 1)).toBe(true);
  });
});
