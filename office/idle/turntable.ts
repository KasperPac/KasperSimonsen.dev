import { Quaternion, Vector3, type Object3D } from "three";

const TAU = Math.PI * 2;
const SWAP_SECONDS = 0.8;
const SWAP_TRAVEL = 0.25;
/** Node names the turntable animation drives (office.glb; required by office/manifest.json). */
export const PLATTER_NODE = "prop_turntable__platter";
export const SLEEVE_NODE = /^prop_now_playing__sleeve_(\d\d)$/;
/** Where a played project's sleeve stands: the first cover's resting place on the now-playing stand. */
export const STAND_NODE = "prop_now_playing__sleeve_00";
/** The slot in the sideboard's open bay, under the record player, where the album goes while a project plays. */
export const AWAY_NODE = "prop_turntable__away";
/** How long the album takes to go into the bay, or come back out onto the stand. */
export const AWAY_SECONDS = 0.8;
/** It goes once the camera reaches the record player (the move takes ~1.6 s), so it's seen going, and is in the bay
 * before the project's sleeve heads for the stand (~2.3 s). */
export const AWAY_START = 1.4;
/** Once the project's done, the album waits this long for its sleeve to clear the stand before coming back. */
export const AWAY_RETURN_DELAY = 0.7;
/** How far out over the sideboard's front the album swings on its way, clear of its top and its doors. */
const OUT_M = 0.3;

/** Platter angle in radians, wrapped to [0, 2π). Defaults to 33 1/3 rpm. */
export function platterAngle(seconds: number, rpm = 100 / 3): number {
  if (!Number.isFinite(seconds)) return 0;
  const a = (((seconds * rpm * TAU) / 60) % TAU + TAU) % TAU;
  return a < TAU ? a : 0;
}

/** Which sleeve is on show, and 0→1 progress through the swap in the last 0.8 s of each period. */
export function nowPlaying(seconds: number, count: number, period = 12): { index: number; swap: number } {
  if (!Number.isFinite(seconds) || seconds < 0 || count <= 1 || !(period > SWAP_SECONDS)) return { index: 0, swap: 0 };
  const slot = Math.floor(seconds / period);
  const into = seconds - slot * period;
  return { index: slot % count, swap: Math.min(1, Math.max(0, (into - (period - SWAP_SECONDS)) / SWAP_SECONDS)) };
}

export type TurntableNodes = {
  platter: Object3D;
  sleeves: Object3D[];
  platterY: number;
  /** Each sleeve's rest pose on the stand, captured before anything moves them. */
  restPos: Vector3[];
  restQuat: Quaternion[];
  /** The bay's slot, and the way out over the sideboard's front, in the sleeves' parent's space; null if the model has none. */
  away: { position: Vector3; quaternion: Quaternion; out: Vector3 } | null;
};

let warned = false;

/** Finds the platter and sleeves by name. Returns null (and logs once) if the model lacks them. */
export function findTurntable(root: Object3D): TurntableNodes | null {
  const platter = root.getObjectByName(PLATTER_NODE);
  const found: { n: number; obj: Object3D }[] = [];
  root.traverse((o) => {
    const m = SLEEVE_NODE.exec(o.name);
    if (m) found.push({ n: Number(m[1]), obj: o });
  });
  if (!platter || found.length === 0) {
    if (!warned) {
      warned = true;
      console.warn("Turntable nodes not found in the office model; skipping the idle animation.");
    }
    return null;
  }
  const sleeves = found.sort((a, b) => a.n - b.n).map((f) => f.obj);
  return {
    platter,
    sleeves,
    platterY: platter.rotation.y,
    restPos: sleeves.map((s) => s.position.clone()),
    restQuat: sleeves.map((s) => s.quaternion.clone()),
    away: findAway(root, sleeves[0].parent),
  };
}

function findAway(root: Object3D, space: Object3D | null): TurntableNodes["away"] {
  const slot = root.getObjectByName(AWAY_NODE);
  if (!slot || !space) return null;
  root.updateWorldMatrix(true, true);
  const inv = space.matrixWorld.clone().invert();
  const position = new Vector3();
  const quaternion = new Quaternion();
  inv.clone().multiply(slot.matrixWorld).decompose(position, quaternion, new Vector3());
  // the sideboard's front faces the turntable's +z (Blender's -y)
  const frame = slot.parent?.matrixWorld ?? slot.matrixWorld;
  const out = new Vector3(0, 0, 1).transformDirection(frame).transformDirection(inv).setY(0).normalize();
  return { position, quaternion, out };
}

const ease = (t: number) => t * t * (3 - 2 * t);

const UP = new Vector3(0, 1, 0);
const p1 = new Vector3();
const p2 = new Vector3();

/**
 * Per-frame update. Pure with respect to its inputs, so it can be tested without React. `seconds` runs the album
 * cycle, `platterSeconds` the spin. `away` 0 -> 1 takes the album on show off the stand, out over the sideboard's front
 * and into its bay while a project's record plays (Kasper: it just disappeared); the cycle should hold meanwhile.
 */
export function applyTurntable(nodes: TurntableNodes, seconds: number, reducedMotion: boolean, away = 0, platterSeconds = seconds): void {
  const { platter, sleeves, platterY, restPos, restQuat } = nodes;
  // glTF is Y-up, so a Blender object's local up axis is +Y. Negative = clockwise seen from above.
  platter.rotation.y = platterY - (reducedMotion ? 0 : platterAngle(platterSeconds));
  const cycle = reducedMotion ? { index: 0, swap: 0 } : nowPlaying(seconds, sleeves.length);
  const { index } = cycle;
  const swap = away > 0 ? 0 : cycle.swap;
  const incoming = (index + 1) % sleeves.length;
  const e = ease(swap);
  sleeves.forEach((s, i) => {
    const swapping = swap > 0 && sleeves.length > 1;
    s.visible = i === index || (swapping && i === incoming);
    s.position.copy(restPos[i]);
    s.quaternion.copy(restQuat[i]);
    if (swapping && i === index) s.position.y -= SWAP_TRAVEL * e;
    else if (swapping && i === incoming) s.position.y -= SWAP_TRAVEL * (1 - e);
  });
  if (away <= 0) return;
  if (!nodes.away) {
    sleeves.forEach((s) => (s.visible = false));
    return;
  }
  // a cubic from the stand, out over the front and up a touch, down in front of the bay, into its slot
  const { position: slot, quaternion: slotQuat, out } = nodes.away;
  const t = ease(Math.min(1, away));
  const p0 = restPos[index];
  p1.copy(p0).addScaledVector(out, OUT_M).addScaledVector(UP, 0.06);
  p2.copy(slot).addScaledVector(out, OUT_M * 1.2);
  const u = 1 - t;
  const s = sleeves[index];
  s.position
    .copy(p0)
    .multiplyScalar(u * u * u)
    .addScaledVector(p1, 3 * u * u * t)
    .addScaledVector(p2, 3 * u * t * t)
    .addScaledVector(slot, t * t * t);
  s.quaternion.copy(restQuat[index]).slerp(slotQuat, t);
}

/** The album's put-away state: `away` 0 (on the stand) -> 1 (in the bay); `held` and `released`, seconds since a
 * project's record started playing, and since it was done. */
export type AwayState = { away: number; released: number; held: number };

/** One frame of the album going away while `hold` (a project plays, or its sleeve is on the stand), back once it's done. */
export function stepAway(state: AwayState, hold: boolean, dt: number, reducedMotion: boolean): AwayState {
  const held = hold ? state.held + dt : 0;
  const released = hold ? 0 : state.released + dt;
  const going = state.away > 0;
  const target = hold ? (held >= AWAY_START || going || reducedMotion ? 1 : 0) : going && released < AWAY_RETURN_DELAY ? 1 : 0;
  if (reducedMotion) return { away: target, released, held };
  const step = dt / AWAY_SECONDS;
  const away = target > state.away ? Math.min(target, state.away + step) : Math.max(target, state.away - step);
  return { away, released, held };
}
