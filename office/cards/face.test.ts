import { describe, it, expect } from "vitest";
import { Box3, Euler, Quaternion, Vector3 } from "three";
import { backFaceFor, belowFaceFor, faceFor, screenFaceFor } from "./face";

// The business card in its own glTF frame: 90 mm left to right, 3 mm thick (y up), 55 mm front to back.
const card = new Box3(new Vector3(-0.045, -0.0015, -0.0275), new Vector3(0.045, 0.0015, 0.0275));

describe("faceFor", () => {
  const face = faceFor(card, 600);
  it("spans the card's long edge with widthPx of HTML (drei Html: 1 CSS px is distanceFactor / 400 units)", () => {
    expect((600 * face.distanceFactor) / 400).toBeCloseTo(0.09, 6);
  });
  it("keeps the card's proportions", () => expect(face.heightPx).toBeCloseTo((600 * 55) / 90, 6));
  it("sits on the card's top face, centred", () => {
    const [x, y, z] = face.position;
    expect(x).toBeCloseTo(0, 6);
    expect(z).toBeCloseTo(0, 6);
    expect(y).toBeGreaterThan(0.0015);
    expect(y).toBeLessThan(0.002);
  });
  it("faces up, its text running away from the drawer front (glTF -z is Blender +y, into the pedestal)", () => {
    const turn = new Euler(...face.rotation);
    const normal = new Vector3(0, 0, 1).applyEuler(turn);
    const textUp = new Vector3(0, 1, 0).applyEuler(turn);
    expect(normal.y).toBeCloseTo(1, 6);
    expect(textUp.z).toBeCloseTo(-1, 6);
  });
});

describe("backFaceFor", () => {
  // a sleeve in its glTF frame: 315 mm square standing on its bottom edge (origin), 5 mm thick, front +z
  const sleeve = new Box3(new Vector3(-0.1575, 0, -0.0025), new Vector3(0.1575, 0.315, 0.0025));
  const face = backFaceFor(sleeve, 600);
  it("spans the sleeve's width with widthPx of HTML", () => expect((600 * face.distanceFactor) / 400).toBeCloseTo(0.315, 6));
  it("is square like the sleeve", () => expect(face.heightPx).toBeCloseTo(600, 6));
  it("sits just behind the back face, centred", () => {
    const [x, y, z] = face.position;
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(0.1575, 6);
    expect(z).toBeLessThan(-0.0025);
  });
  it("faces out of the back, upright, reading left to right from behind", () => {
    const turn = new Euler(...face.rotation);
    expect(new Vector3(0, 0, 1).applyEuler(turn).z).toBeCloseTo(-1, 6);
    expect(new Vector3(0, 1, 0).applyEuler(turn).y).toBeCloseTo(1, 6);
    expect(new Vector3(1, 0, 0).applyEuler(turn).x).toBeCloseTo(-1, 6);
  });
});

describe("screenFaceFor", () => {
  // A 0.6 x 0.33 screen centred at (0, 1, 0.1), tilted back 5 degrees (its top away from the viewer at +z), corners in any order.
  const tilt = new Quaternion().setFromEuler(new Euler(-5 * (Math.PI / 180), 0, 0));
  const corners = [[0.3, 0.165], [-0.3, -0.165], [-0.3, 0.165], [0.3, -0.165]].map(([x, y]) =>
    new Vector3(x, y, 0).applyQuaternion(tilt).add(new Vector3(0, 1, 0.1)),
  );

  it("prints the given width across the screen, as tall as the screen is", () => {
    const f = screenFaceFor(corners, 640);
    expect(f.distanceFactor).toBeCloseTo((0.6 * 400) / 640, 6);
    expect(f.heightPx).toBeCloseTo((640 * 0.33) / 0.6, 4);
  });
  it("sits on the screen's centre, just in front of it, facing out of it and upright", () => {
    const f = screenFaceFor(corners, 640);
    const q = new Quaternion().setFromEuler(new Euler(...f.rotation));
    const normal = new Vector3(0, 0, 1).applyQuaternion(tilt);
    expect(new Vector3(0, 0, 1).applyQuaternion(q).dot(normal)).toBeCloseTo(1, 6);
    expect(new Vector3(1, 0, 0).applyQuaternion(q).x).toBeCloseTo(1, 6); // reads left to right
    const lift = new Vector3(...f.position).sub(new Vector3(0, 1, 0.1));
    expect(lift.length()).toBeGreaterThan(0);
    expect(lift.length()).toBeLessThan(0.001);
    expect(lift.normalize().dot(normal)).toBeCloseTo(1, 6);
  });
  it("faces the side `front` points to, whichever way the corners wind", () => {
    const f = screenFaceFor([...corners].reverse(), 640);
    const q = new Quaternion().setFromEuler(new Euler(...f.rotation));
    expect(new Vector3(0, 0, 1).applyQuaternion(q).z).toBeGreaterThan(0.99);
  });
});

describe("belowFaceFor", () => {
  // the monitor's 16:10 screen, upright, facing +z, printed 640 px wide
  const corners = [new Vector3(-0.302, -0.18875, 0), new Vector3(0.302, -0.18875, 0), new Vector3(0.302, 0.18875, 0), new Vector3(-0.302, 0.18875, 0)];
  const screen = screenFaceFor(corners, 640);
  it("hangs a print of the same width under the screen, gapPx below its bottom edge, in its plane", () => {
    const k = screen.distanceFactor / 400;
    const f = belowFaceFor(screen, 300, 12);
    expect(f.distanceFactor).toBe(screen.distanceFactor);
    expect(f.rotation).toEqual(screen.rotation);
    expect(f.heightPx).toBe(300);
    expect(f.position[0]).toBeCloseTo(screen.position[0], 9);
    expect(f.position[1]).toBeCloseTo(-0.18875 - (12 + 150) * k, 9);
    expect(f.position[2]).toBeCloseTo(screen.position[2], 9);
  });
  it("follows the screen's lean", () => {
    // leaning back 5 degrees (about x by -0.0873): the screen's up is (0, cos, -sin), so going down it comes forward (+z)
    const leaning = { ...screen, rotation: [-0.0873, 0, 0] as [number, number, number] };
    const f = belowFaceFor(leaning, 300, 12);
    const down = (screen.heightPx / 2 + 12 + 150) * (screen.distanceFactor / 400);
    expect(f.position[1]).toBeCloseTo(screen.position[1] - down * Math.cos(0.0873), 9);
    expect(f.position[2]).toBeCloseTo(screen.position[2] + down * Math.sin(0.0873), 9);
  });
});
