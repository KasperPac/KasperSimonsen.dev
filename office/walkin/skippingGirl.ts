import type { Object3D } from "three";

/** The Skipping Girl's pose nodes (street.glb; required by office/manifest.json). */
export const POSE_NODE = /^prop_skipping_girl__pose_(\d\d)$/;

/** Seconds per full rope cycle, independent of the walk-in's scroll position. */
export const SKIP_SECONDS = 1.2;

/** Loop the sign's stepped poses using elapsed animation time. */
export function skipPose(seconds: number, count: number, cycleSeconds = SKIP_SECONDS): number {
  if (!Number.isFinite(seconds) || count <= 1 || !Number.isFinite(cycleSeconds) || cycleSeconds <= 0) return 0;
  const x = Math.max(0, seconds) / cycleSeconds;
  const frac = Math.max(0, x - Math.floor(x + 1e-9)); // the epsilon absorbs float error at cycle boundaries
  return Math.min(count - 1, Math.floor(frac * count));
}

let warned = false;

/** The Skipping Girl poses, sorted by number. Returns null (and logs once) if the model lacks them. */
export function findSkippingGirl(root: Object3D): Object3D[] | null {
  const found: { n: number; obj: Object3D }[] = [];
  root.traverse((o) => {
    const m = POSE_NODE.exec(o.name);
    if (m) found.push({ n: Number(m[1]), obj: o });
  });
  if (found.length === 0) {
    if (!warned) {
      warned = true;
      console.warn("Skipping Girl poses not found in the street model; skipping her animation.");
    }
    return null;
  }
  return found.sort((a, b) => a.n - b.n).map((f) => f.obj);
}

/** Shows only the pose for this elapsed time; pose 0 alone under reduced motion. */
export function applySkippingGirl(poses: Object3D[], seconds: number, reducedMotion: boolean): number {
  const current = reducedMotion ? 0 : skipPose(seconds, poses.length);
  poses.forEach((p, i) => (p.visible = i === current));
  return current;
}
