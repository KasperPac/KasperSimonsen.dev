import { describe, it, expect } from "vitest";
import { Group, Mesh } from "three";
import { work } from "@/content/work";
import {
  approach, DRAWER_AXIS, DRAWER_OPEN_M, DRAWER_PEEK_M, DRAWER_SECONDS, drawerTarget, easeOutCubic, easeToward, findMotionNodes,
  ObjectMotion, ornamentBob, ORNAMENT_BOB_M, RECORD_NUDGE_M, screenVisible, TEASE_SECONDS,
} from "./motion";

function scene() {
  const root = new Group();
  const named = <T extends Group | Mesh>(o: T, name: string, parent: Group) => {
    o.name = name;
    parent.add(o);
    return o;
  };
  const crate = named(new Group(), "hs_crate", root);
  for (let i = 0; i < 5; i++) named(new Group(), `hs_crate__record_0${i}`, crate).position.set(0, 0.1, i * 0.03);
  const drawerRoot = named(new Group(), "hs_drawer", root);
  const drawer = named(new Group(), "hs_drawer__drawer", drawerRoot);
  drawer.position.set(0.1, 0.4, 0);
  const shelf = named(new Group(), "hs_shelf", root);
  for (let i = 0; i < 3; i++) named(new Group(), `hs_shelf__ornament_0${i}`, shelf).position.set(i * 0.2, 0.05, 0);
  const monitor = named(new Group(), "hs_monitor", root);
  const screen = named(new Mesh(), "hs_monitor__screen", monitor);
  return { root, drawer, screen, crate, shelf };
}

const step = (m: ObjectMotion, nodes: ReturnType<typeof findMotionNodes>, input: Parameters<ObjectMotion["update"]>[1], seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 60) m.update(nodes, input, 1 / 60, t);
};

describe("helpers", () => {
  it("approaches a target at a fixed rate and never overshoots", () => {
    expect(approach(0, 1, 0.25, 0.5)).toBeCloseTo(0.5);
    expect(approach(0.9, 1, 1, 0.5)).toBe(1);
    expect(approach(1, 0, 0.25, 0.5)).toBeCloseTo(0.5);
    expect(approach(0, 1, 1, 0)).toBe(1);
  });
  it("eases out", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
  it("eases toward a target exponentially and arrives exactly", () => {
    const half = easeToward(0, 0.3, 0.05, 12);
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(0.3);
    let x = 0;
    for (let i = 0; i < 60; i++) x = easeToward(x, 0.03, 1 / 60, 12);
    expect(x).toBe(0.03);
    expect(easeToward(0, 0.3, 0.016, Infinity)).toBe(0.3);
  });
  it("opens the drawer when it's open, peeks on hover, else shut", () => {
    expect(drawerTarget(true, false)).toBe(DRAWER_OPEN_M);
    expect(drawerTarget(true, true)).toBe(DRAWER_OPEN_M);
    expect(drawerTarget(false, true)).toBe(DRAWER_PEEK_M);
    expect(drawerTarget(false, false)).toBe(0);
  });
  it("flickers the screen twice early on and then stays on", () => {
    expect(screenVisible(0)).toBe(true);
    expect(screenVisible(0.06)).toBe(false);
    expect(screenVisible(0.1)).toBe(true);
    expect(screenVisible(0.16)).toBe(false);
    expect(screenVisible(TEASE_SECONDS + 0.1)).toBe(true);
  });
  it("bobs within the amplitude and out of phase between ornaments", () => {
    for (let t = 0; t < 3; t += 0.1) expect(Math.abs(ornamentBob(0, t, 1))).toBeLessThanOrEqual(ORNAMENT_BOB_M + 1e-9);
    expect(ornamentBob(0, 1, 1)).not.toBeCloseTo(ornamentBob(1, 1, 1));
    expect(ornamentBob(2, 1, 0)).toBe(0);
  });
  it("slides the drawer along glTF local +Z (Blender's local -Y, out of the pedestal)", () =>
    expect(DRAWER_AXIS.toArray()).toEqual([0, 0, 1]));
});

describe("ObjectMotion", () => {
  it("opens the drawer over DRAWER_SECONDS along its axis and closes it again", () => {
    const s = scene();
    const nodes = findMotionNodes(s.root);
    const m = new ObjectMotion();
    step(m, nodes, { open: "hs_drawer", hovered: null, reduced: false }, DRAWER_SECONDS * 0.5);
    expect(s.drawer.position.z).toBeGreaterThan(0);
    expect(s.drawer.position.z).toBeLessThan(DRAWER_OPEN_M);
    expect(m.drawerOpen).toBe(false);
    step(m, nodes, { open: "hs_drawer", hovered: null, reduced: false }, DRAWER_SECONDS);
    expect(s.drawer.position.z).toBeCloseTo(DRAWER_OPEN_M);
    expect(s.drawer.position.x).toBeCloseTo(0.1);
    expect(s.drawer.position.y).toBeCloseTo(0.4);
    expect(m.drawerOpen).toBe(true);
    step(m, nodes, { open: null, hovered: null, reduced: false }, DRAWER_SECONDS + 0.1);
    expect(s.drawer.position.z).toBeCloseTo(0);
  });
  it("snaps instead of sliding under reduced motion, with no teases", () => {
    const s = scene();
    const nodes = findMotionNodes(s.root);
    const m = new ObjectMotion();
    m.update(nodes, { open: "hs_drawer", hovered: null, reduced: true }, 1 / 60, 0);
    expect(s.drawer.position.z).toBeCloseTo(DRAWER_OPEN_M);
    m.update(nodes, { open: null, hovered: "hs_crate", reduced: true }, 1 / 60, 0.1);
    expect(nodes.records[0].position.y).toBeCloseTo(0.1);
  });
  it("nudges only the records that carry a case study", () => {
    const s = scene();
    const nodes = findMotionNodes(s.root);
    const m = new ObjectMotion();
    step(m, nodes, { open: null, hovered: "hs_crate", reduced: false }, TEASE_SECONDS + 0.1);
    nodes.records.forEach((r, i) => expect(r.position.y).toBeCloseTo(i < work.length ? 0.1 + RECORD_NUDGE_M : 0.1));
    step(m, nodes, { open: null, hovered: null, reduced: false }, TEASE_SECONDS + 0.1);
    nodes.records.forEach((r) => expect(r.position.y).toBeCloseTo(0.1));
  });
  it("peeks the drawer on hover", () => {
    const s = scene();
    const nodes = findMotionNodes(s.root);
    const m = new ObjectMotion();
    step(m, nodes, { open: null, hovered: "hs_drawer", reduced: false }, DRAWER_SECONDS);
    expect(s.drawer.position.z).toBeCloseTo(DRAWER_PEEK_M);
  });
  it("flickers the monitor screen when hover begins", () => {
    const s = scene();
    const nodes = findMotionNodes(s.root);
    const m = new ObjectMotion();
    m.update(nodes, { open: null, hovered: "hs_monitor", reduced: false }, 1 / 60, 10);
    m.update(nodes, { open: null, hovered: "hs_monitor", reduced: false }, 1 / 60, 10.06);
    expect(s.screen.visible).toBe(false);
    m.update(nodes, { open: null, hovered: "hs_monitor", reduced: false }, 1 / 60, 10.5);
    expect(s.screen.visible).toBe(true);
  });
  it("holds the ornaments still while the shelf is open: the picked one floats, the rest wait", () => {
    const s = scene();
    const nodes = findMotionNodes(s.root);
    step(new ObjectMotion(), nodes, { open: "hs_shelf", hovered: "hs_shelf", reduced: false }, 0.5);
    nodes.ornaments.forEach((o, i) => expect(o.position.y).toBe(nodes.ornamentRest[i]));
  });
  it("is a no-op on a model without the nodes", () => {
    const nodes = findMotionNodes(new Group());
    expect(() => new ObjectMotion().update(nodes, { open: "hs_drawer", hovered: "hs_shelf", reduced: false }, 1 / 60, 0)).not.toThrow();
  });
});
