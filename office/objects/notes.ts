import { Quaternion, Vector3, type Object3D } from "three";
import { easeInOutCubic } from "@/office/camera/pose";
import type { Placement } from "./shelf";

/** How long one note takes to fall off the monitor onto the desk, and how far apart they go (spec 3.5). */
export const NOTE_FALL_SECONDS = 0.6;
export const NOTE_STAGGER_SECONDS = 0.1;
/** How far a falling note drifts sideways at most, metres. */
export const NOTE_FLUTTER_M = 0.03;

const NOTE = /^hs_monitor__notes__note_(\d\d)$/;
const restName = (note: string) => note.replace("__note_", "__rest_");

/** How long the whole fall takes for `count` notes. */
export function notesSeconds(count: number): number {
  return NOTE_FALL_SECONDS + NOTE_STAGGER_SECONDS * Math.max(0, count - 1);
}

/** How far note `i` is through its fall, `elapsed` seconds into the notes' fall (0 on the bezel, 1 on the desk). */
export function noteProgress(i: number, elapsed: number): number {
  return Math.min(1, Math.max(0, (elapsed - i * NOTE_STAGGER_SECONDS) / NOTE_FALL_SECONDS));
}

const tilt = new Quaternion();
const Z = new Vector3(0, 0, 1);

/**
 * Where a note is `t` through its fall from `stuck` (on the bezel) to `rest` (on the desk), both in its parent's space:
 * it drifts across, drops slowly then faster, flutters sideways, and turns to lie down. Exactly `stuck` at 0 and
 * `rest` at 1.
 */
export function fallPlacement(stuck: Placement, rest: Placement, t: number, out: Placement): Placement {
  const across = easeInOutCubic(t);
  out.position.lerpVectors(stuck.position, rest.position, across);
  out.position.y = stuck.position.y + (rest.position.y - stuck.position.y) * t * t;
  out.position.x += NOTE_FLUTTER_M * Math.sin(2 * Math.PI * t) * (1 - t);
  out.quaternion.slerpQuaternions(stuck.quaternion, rest.quaternion, across);
  out.quaternion.multiply(tilt.setFromAxisAngle(Z, 0.35 * Math.sin(Math.PI * t)));
  return out;
}

export type NotesNodes = { notes: Object3D[]; stuck: Placement[]; rest: Placement[] };

/** The monitor's notes in order, where each sits on the bezel, and its rest_ spot on the desk (a note without one stays put). */
export function findNotesNodes(root: Object3D): NotesNodes {
  const found: { i: number; note: Object3D; rest: Object3D }[] = [];
  root.traverse((o) => {
    const m = NOTE.exec(o.name);
    const rest = m && o.parent?.getObjectByName(restName(o.name));
    if (m && rest) found.push({ i: Number(m[1]), note: o, rest });
  });
  found.sort((a, b) => a.i - b.i);
  return {
    notes: found.map((f) => f.note),
    stuck: found.map((f) => ({ position: f.note.position.clone(), quaternion: f.note.quaternion.clone() })),
    rest: found.map((f) => ({ position: f.rest.position.clone(), quaternion: f.rest.quaternion.clone() })),
  };
}

const at: Placement = { position: new Vector3(), quaternion: new Quaternion() };

/** Per-frame: the notes fall off while the monitor is open and go back on after, each reversing its own fall. Pure state. */
export class NotesMotion {
  private elapsed = 0;
  private total = 0;

  /** True once every note is on the desk. */
  get down(): boolean {
    return this.total > 0 && this.elapsed === this.total;
  }

  update(nodes: NotesNodes, input: { open: boolean; reduced: boolean }, dt: number): void {
    this.total = notesSeconds(nodes.notes.length);
    const goal = input.open ? this.total : 0;
    this.elapsed = input.reduced ? goal : input.open ? Math.min(goal, this.elapsed + dt) : Math.max(goal, this.elapsed - dt);
    nodes.notes.forEach((n, i) => {
      fallPlacement(nodes.stuck[i], nodes.rest[i], noteProgress(i, this.elapsed), at);
      n.position.copy(at.position);
      n.quaternion.copy(at.quaternion);
    });
  }
}
