import { Color, Group, SRGBColorSpace } from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { theme } from "../theme";
import { BOX, HOP, STEPS, TUBES, ropeSide, tubeLines, type Polyline, type TubeId } from "./mark";
import type { NeonFrame } from "./sequence";

/**
 * The neon sign as fat lines (neon sign spec 4, 6): each tube a dark unlit line, under a wide dim glow and a warm-white
 * core, all opaque, the brightness carried by their colour. A fat line's segments overlap at their round caps, so any
 * transparency doubles up there and beads the tube; opaque lines draw the same where they overlap. A unit square
 * facing +z; the anchor in the office scales it.
 */
const LIT = [0xff, 0xf4, 0xe2].map((v) => v / 255); // #FFF4E2, sRGB
const UNLIT = "#3A3A3A";
const WIDTH = { core: 2, glow: 8, unlit: 1.5, gap: 12 }; // CSS px: the gap shows 2 px of dark either side of a glow
export const GLOW = 0.35; // the glow's colour at full brightness, as a share of the core's
/**
 * The sign's layers, back to front, drawn in this order after the room (0): every unlit line, the back ropes, the
 * letters, the gap a front rope cuts in them, the front ropes, the head. A layer's glow draws at its order and its core
 * one after. None of the sign's lines writes depth; they only test it, against the room. Its layers are millimetres
 * apart, and a fat line's round caps carry their end's depth, which on a wall seen this steeply is out by centimetres:
 * depth can't order them, so this does.
 */
export const ORDER = { unlit: 1, back: 2, letters: 4, gap: 6, front: 7, head: 9 } as const;
export type Layer = "back" | "letters" | "front" | "head";
export function layerOf(tube: TubeId): Layer {
  if (tube === "head") return "head";
  if (!tube.startsWith("rope")) return "letters";
  return ropeSide(Number(tube.slice(4)));
}
// The same layers in front of the wall, in the sign's units (~3 mm apart at 0.85 m).
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
  l.raycast = () => {}; // decoration (spec 2), and Line2's own raycast needs raycaster.camera
  l.renderOrder = order;
  return l;
}

export function buildSign(): Sign {
  const materials: LineMaterial[] = [];
  // Opaque, depth-tested less-or-equal against the room, and layered by ORDER.
  const material = (color: string, linewidth: number) => {
    const m = new LineMaterial({ color, linewidth, fog: false, depthWrite: false });
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
    core[tube] = material("#000000", WIDTH.core);
    glow[tube] = material("#000000", WIDTH.glow);
    const layer = layerOf(tube);
    const group = new Group();
    (tube.startsWith("rope") ? ropes : body).add(group);
    tubes[tube] = tubeLines(tube).flatMap((pl) => {
      const pts = toLocal(pl, Z[layer]);
      const parts = [line(pts, unlit, ORDER.unlit), line(pts, glow[tube], ORDER[layer]), line(pts, core[tube], ORDER[layer] + 1)];
      group.add(...parts);
      return parts;
    });
  }
  const gapMaterial = material(theme.background, WIDTH.gap);
  const gaps = Array.from({ length: STEPS }, (_, step) => {
    if (ropeSide(step) !== "front") return null;
    const g = line(toLocal(tubeLines(`rope${step}` as TubeId)[0], Z.gap), gapMaterial, ORDER.gap);
    g.visible = false;
    ropes.add(g);
    return g;
  });
  return { root, body, unlit, materials, core, glow, tubes, gaps };
}

/** `out` = the lit colour at brightness `k`, scaled in sRGB, as the eye sees it: 0.35 reads as a third as bright. */
export function litColor(k: number, out = new Color()): Color {
  return out.setRGB(LIT[0] * k, LIT[1] * k, LIT[2] * k, SRGBColorSpace);
}

export function applyFrame(sign: Sign, frame: NeonFrame): void {
  for (const tube of TUBES) {
    const b = frame.brightness[tube];
    litColor(b, sign.core[tube].color);
    litColor(b * GLOW, sign.glow[tube].color);
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
