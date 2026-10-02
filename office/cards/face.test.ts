import { describe, it, expect } from "vitest";
import { Box3, Euler, Vector3 } from "three";
import { backFaceFor, faceFor } from "./face";

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
