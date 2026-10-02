import type { Object3D } from "three";

const TAU = Math.PI * 2;
const SWAP_SECONDS = 0.8;
const SWAP_TRAVEL = 0.25;
/** Node names the turntable animation drives (office.glb; required by office/manifest.json). */
export const PLATTER_NODE = "prop_turntable__platter";
export const SLEEVE_NODE = /^prop_now_playing__sleeve_(\d\d)$/;
/** Where a played project's sleeve stands: the first cover's resting place on the now-playing stand. */
export const STAND_NODE = "prop_now_playing__sleeve_00";

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
  /** Rest y of each sleeve, captured before anything moves them. */
  restY: number[];
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
  return { platter, sleeves, platterY: platter.rotation.y, restY: sleeves.map((s) => s.position.y) };
}

const ease = (t: number) => t * t * (3 - 2 * t);

/** Per-frame update. Pure with respect to `seconds`, so it can be tested without React. `hideSleeves` while a project's sleeve is on the stand. */
export function applyTurntable(nodes: TurntableNodes, seconds: number, reducedMotion: boolean, hideSleeves = false): void {
  const { platter, sleeves, platterY, restY } = nodes;
  // glTF is Y-up, so a Blender object's local up axis is +Y. Negative = clockwise seen from above.
  platter.rotation.y = platterY - (reducedMotion ? 0 : platterAngle(seconds));
  const { index, swap } = reducedMotion ? { index: 0, swap: 0 } : nowPlaying(seconds, sleeves.length);
  const incoming = (index + 1) % sleeves.length;
  const e = ease(swap);
  sleeves.forEach((s, i) => {
    const swapping = swap > 0 && sleeves.length > 1;
    s.visible = i === index || (swapping && i === incoming);
    s.position.y = restY[i];
    if (swapping && i === index) s.position.y -= SWAP_TRAVEL * e;
    else if (swapping && i === incoming) s.position.y -= SWAP_TRAVEL * (1 - e);
  });
  if (hideSleeves) sleeves.forEach((s) => (s.visible = false));
}
