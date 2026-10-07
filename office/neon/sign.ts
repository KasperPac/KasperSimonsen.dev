import { AdditiveBlending, Group } from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { theme } from "../theme";
import { BOX, HOP, STEPS, TUBES, ropeSide, tubeLines, type Polyline, type TubeId } from "./mark";
import type { NeonFrame } from "./sequence";

/**
 * The neon sign as fat lines (neon sign spec 4, 6): each tube a dark unlit line, under a warm-white core and a wide
 * faint glow whose opacity is the tube's brightness. A unit square facing +z; the anchor in the office scales it.
 */
const LIT = "#FFF4E2";
const UNLIT = "#3A3A3A";
const WIDTH = { core: 2, glow: 8, unlit: 1.5, gap: 8 }; // CSS px
const GLOW = 0.35; // the glow's opacity at full brightness
// Layers in front of the wall, in the sign's units (~3 mm apart at 0.85 m): back ropes, letters, the gap a front rope
// cuts in them, front ropes, the head.
const Z = { back: 0, letters: 0.004, gap: 0.008, front: 0.012, head: 0.016 };
const UNIT = BOX.max - BOX.min;
const CENTRE = (BOX.max + BOX.min) / 2;

export function toLocal(line: Polyline, z: number): number[] {
  return line.flatMap(([u, v]) => [(u - CENTRE) / UNIT, (CENTRE - v) / UNIT, z]);
}

/** A frame's time step, held to 0.1 s: a stalled frame (software WebGL, a background tab) can't skip the power-up. */
export function clampDt(dt: number): number {
  return Math.min(0.1, Math.max(0, dt));
}

export type Sign = {
  root: Group;
  body: Group;
  /** The one unlit material every tube shares: its lines always draw. */
  unlit: LineMaterial;
  materials: LineMaterial[];
  core: Record<TubeId, LineMaterial>;
  glow: Record<TubeId, LineMaterial>;
  tubes: Record<TubeId, Line2[]>;
  gaps: (Line2 | null)[];
};

function line(points: number[], material: LineMaterial, order: number): Line2 {
  const l = new Line2(new LineGeometry().setPositions(points), material);
  l.computeLineDistances();
  l.raycast = () => {}; // decoration (spec 2), and Line2's own raycast needs raycaster.camera
  l.renderOrder = order;
  return l;
}

export function buildSign(): Sign {
  const materials: LineMaterial[] = [];
  const material = (color: string, linewidth: number, extra: Partial<{ additive: boolean; transparent: boolean }> = {}) => {
    const m = new LineMaterial({ color, linewidth, fog: false, transparent: extra.transparent ?? false, depthWrite: !extra.additive });
    if (extra.additive) m.blending = AdditiveBlending;
    materials.push(m);
    return m;
  };
  const unlit = material(UNLIT, WIDTH.unlit);
  const root = new Group();
  root.name = "neon_sign";
  const body = new Group(); // the letters and the head: they hop
  const ropes = new Group();
  root.add(ropes, body);
  const core = {} as Record<TubeId, LineMaterial>;
  const glow = {} as Record<TubeId, LineMaterial>;
  const tubes = {} as Record<TubeId, Line2[]>;
  for (const tube of TUBES) {
    core[tube] = material(LIT, WIDTH.core, { transparent: true });
    glow[tube] = material(LIT, WIDTH.glow, { transparent: true, additive: true });
    const isRope = tube.startsWith("rope");
    const z = tube === "head" ? Z.head : !isRope ? Z.letters : ropeSide(Number(tube.slice(4))) === "front" ? Z.front : Z.back;
    const group = new Group();
    (isRope ? ropes : body).add(group);
    tubes[tube] = tubeLines(tube).flatMap((pl) => {
      const pts = toLocal(pl, z);
      const parts = [line(pts, unlit, 0), line(pts, glow[tube], 1), line(pts, core[tube], 2)];
      group.add(...parts);
      return parts;
    });
  }
  const gapMaterial = material(theme.background, WIDTH.gap);
  const gaps = Array.from({ length: STEPS }, (_, step) => {
    if (ropeSide(step) !== "front") return null;
    const g = line(toLocal(tubeLines(`rope${step}` as TubeId)[0], Z.gap), gapMaterial, 1);
    g.visible = false;
    ropes.add(g);
    return g;
  });
  return { root, body, unlit, materials, core, glow, tubes, gaps };
}

export function applyFrame(sign: Sign, frame: NeonFrame): void {
  for (const tube of TUBES) {
    const b = frame.brightness[tube];
    sign.core[tube].opacity = b;
    sign.glow[tube].opacity = b * GLOW;
    // the core and glow lines only draw while lit; the unlit line under them always does
    for (const l of sign.tubes[tube]) if (l.material !== sign.unlit) l.visible = b > 0;
  }
  sign.gaps.forEach((g, step) => {
    if (g) g.visible = frame.step === step && frame.brightness[`rope${step}` as TubeId] > 0;
  });
  sign.body.position.y = (frame.hop * HOP) / UNIT;
}

export function setSignResolution(sign: Sign, width: number, height: number): void {
  for (const m of sign.materials) m.resolution.set(width, height);
}

export function disposeSign(sign: Sign): void {
  sign.root.traverse((o) => {
    if (o instanceof Line2) o.geometry.dispose();
  });
  for (const m of sign.materials) m.dispose();
  sign.root.removeFromParent();
}
