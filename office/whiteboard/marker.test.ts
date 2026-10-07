import { describe, it, expect } from "vitest";
import { Euler, Group, Mesh, Quaternion, Vector3 } from "three";
import { boardPoint, findTools, handPlacement, LIFT_M, TOOL_SECONDS, ToolMotion } from "./marker";

// A surface 0.57 x 0.42 m facing +z, printed at 800 px wide (distanceFactor = width * 400 / px).
const face = { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], distanceFactor: (0.57 * 400) / 800, heightPx: (800 * 0.42) / 0.57 };
const place = () => ({ position: new Vector3(), quaternion: new Quaternion() });

describe("boardPoint", () => {
  it("maps the canvas's corners and centre onto the surface", () => {
    expect(boardPoint(face, 800, { x: 400, y: face.heightPx / 2 }, new Vector3()).length()).toBeLessThan(1e-9);
    const tl = boardPoint(face, 800, { x: 0, y: 0 }, new Vector3());
    expect(tl.x).toBeCloseTo(-0.285, 6);
    expect(tl.y).toBeCloseTo(0.21, 6);
    expect(tl.z).toBeCloseTo(0, 9);
  });
  it("follows a tilted surface", () => {
    const tilted = { ...face, rotation: [-0.1, 0, 0] as [number, number, number] };
    const p = boardPoint(tilted, 800, { x: 400, y: 0 }, new Vector3());
    expect(p.z).toBeLessThan(0); // the top leans back
  });
});

describe("handPlacement", () => {
  const surface = new Group();
  surface.position.set(1, 1.6, 4);
  surface.updateMatrixWorld(true);
  it("puts a pressing marker's tip on the board, lifted ones LIFT_M out", () => {
    const local = new Vector3(0.1, 0, 0);
    const pressed = handPlacement(surface, local, "marker", true, place());
    expect(pressed.position.distanceTo(new Vector3(1.1, 1.6, 4))).toBeLessThan(1e-9);
    const lifted = handPlacement(surface, local, "marker", false, place());
    expect(lifted.position.z - 4).toBeCloseTo(LIFT_M, 9);
  });
  it("holds a marker tilted out from the board like a pen, and the eraser flat to it", () => {
    const body = new Vector3(0, 0, 1).applyQuaternion(handPlacement(surface, new Vector3(), "marker", true, place()).quaternion);
    expect(body.z).toBeGreaterThan(0.5); // away from the board
    expect(body.z).toBeLessThan(0.99); // but tilted, not straight out
    const back = new Vector3(0, 0, 1).applyQuaternion(handPlacement(surface, new Vector3(), "eraser", true, place()).quaternion);
    expect(back.z).toBeCloseTo(1, 6);
  });
});

/** hs_whiteboard with five markers and an eraser lying in the tray. */
function rig() {
  const root = new Group();
  root.name = "hs_whiteboard";
  for (let i = 0; i < 5; i++) {
    const m = new Mesh();
    m.name = `hs_whiteboard__marker_0${i}`;
    m.position.set(-0.2 + 0.1 * i, -0.24, -0.03);
    m.quaternion.setFromEuler(new Euler(0, Math.PI / 2, 0));
    root.add(m);
  }
  const e = new Mesh();
  e.name = "hs_whiteboard__eraser";
  e.position.set(0.25, -0.24, -0.03);
  root.add(e);
  root.updateMatrixWorld(true);
  return { root, nodes: findTools(root) };
}

describe("ToolMotion", () => {
  const hand = { position: new Vector3(0.1, 0.05, 0.004), quaternion: new Quaternion() };
  it("lifts the held tool to the hand over TOOL_SECONDS and leaves the others in the tray", () => {
    const { nodes } = rig();
    const m = new ToolMotion();
    m.update(nodes, { held: 2, hand, reduced: false, pressing: false }, TOOL_SECONDS / 2);
    const two = nodes.tools.get(2)!;
    expect(two.position.distanceTo(nodes.rest.get(2)!.position)).toBeGreaterThan(0.01);
    for (let i = 0; i < 30; i++) m.update(nodes, { held: 2, hand, reduced: false, pressing: false }, 1 / 60);
    expect(two.getWorldPosition(new Vector3()).distanceTo(hand.position)).toBeLessThan(0.002);
    expect(nodes.tools.get(0)!.position.equals(nodes.rest.get(0)!.position)).toBe(true);
  });
  it("puts it back in the tray when nothing's held (leaving the board)", () => {
    const { nodes } = rig();
    const m = new ToolMotion();
    m.update(nodes, { held: "eraser", hand, reduced: false, pressing: false }, 1);
    m.update(nodes, { held: null, hand: null, reduced: false, pressing: false }, 1);
    expect(nodes.tools.get("eraser")!.position.equals(nodes.rest.get("eraser")!.position)).toBe(true);
  });
  it("jumps under reduced motion", () => {
    const { nodes } = rig();
    const m = new ToolMotion();
    m.update(nodes, { held: 0, hand, reduced: true, pressing: false }, 1 / 60);
    expect(nodes.tools.get(0)!.getWorldPosition(new Vector3()).distanceTo(hand.position)).toBeLessThan(1e-9);
  });
  it("swapping tools sends the old one home while the new one comes", () => {
    const { nodes } = rig();
    const m = new ToolMotion();
    m.update(nodes, { held: 0, hand, reduced: false, pressing: false }, 1);
    m.update(nodes, { held: 3, hand, reduced: false, pressing: false }, TOOL_SECONDS / 2);
    expect(nodes.tools.get(0)!.position.distanceTo(nodes.rest.get(0)!.position)).toBeGreaterThan(0.001);
    m.update(nodes, { held: 3, hand, reduced: false, pressing: false }, 1);
    expect(nodes.tools.get(0)!.position.equals(nodes.rest.get(0)!.position)).toBe(true);
  });
  it("keeps the tip exactly on the hand while pressing, and only follows it loosely when not", () => {
    const moved = { position: new Vector3(0.2, -0.05, 0), quaternion: new Quaternion() };
    const tipAfterMove = (pressing: boolean) => {
      const { nodes } = rig();
      const m = new ToolMotion();
      m.update(nodes, { held: 1, hand, reduced: false, pressing: false }, 1); // fully lifted (t = 1), settled on the hand
      m.update(nodes, { held: 1, hand: moved, reduced: false, pressing }, 1 / 120);
      return nodes.tools.get(1)!.getWorldPosition(new Vector3()).distanceTo(moved.position);
    };
    expect(tipAfterMove(true)).toBeLessThan(1e-9);
    expect(tipAfterMove(false)).toBeGreaterThan(0.005);
  });
});
