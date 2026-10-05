import { Quaternion, Vector3 } from "three";
import { copyPose, type Pose } from "./pose";
import type { SignpostName } from "../hotspots/registry";

/**
 * Panning the office on a phone (Kasper: a tall screen leaves a lot of empty space). The standing view there is framed
 * tight on the desk, and a sideways drag slides the camera along the room and turns it a little outward, so the couch
 * is at one end and the telly at the other. -1 is the left end, 0 the authored view, 1 the right end.
 */

/** How far the camera slides sideways at either end, in metres. */
export const PAN_TRUCK_M = 1.0;
/** How far it turns outward at either end, in radians. */
export const PAN_YAW = 0.18;
/** Pan per screen width dragged: the whole room in a little over a screen's width. */
export const PAN_PER_SCREEN = 1.7;
/** A drag counts as panning once it has gone this far sideways, mostly sideways. */
const PAN_START_PX = 10;

const UP = new Vector3(0, 1, 0);
const right = new Vector3();
const turn = new Quaternion();

export function clampPan(pan: number): number {
  return Math.max(-1, Math.min(1, pan));
}

/** The pan after the finger has moved `dxPx` across a screen `widthPx` wide: the room moves with the finger. */
export function dragPan(pan: number, dxPx: number, widthPx: number): number {
  if (!(widthPx > 0)) return pan;
  return clampPan(pan - (dxPx / widthPx) * PAN_PER_SCREEN);
}

/** Is a drag so far a sideways pan, rather than a tap or a scroll along the walk-in? */
export function isPanGesture(dxPx: number, dyPx: number): boolean {
  return Math.abs(dxPx) >= PAN_START_PX && Math.abs(dxPx) > 1.2 * Math.abs(dyPx);
}

/** `out` = `pose` slid level along its right by `pan` x PAN_TRUCK_M and turned that way by `pan` x PAN_YAW. */
export function applyPan(pose: Pose, pan: number, out: Pose): Pose {
  const p = clampPan(pan);
  if (out !== pose) copyPose(pose, out);
  if (p === 0) return out;
  right.set(1, 0, 0).applyQuaternion(pose.quaternion).setY(0);
  if (right.lengthSq() > 1e-9) out.position.addScaledVector(right.normalize(), p * PAN_TRUCK_M);
  out.quaternion.premultiply(turn.setFromAxisAngle(UP, -p * PAN_YAW));
  return out;
}

/** Where each object sits along the pan (read off the phone framing): the arrival tour pans to it as it lights it. */
const PAN_AT: Record<SignpostName, number> = { hs_crate: -0.75, hs_drawer: 0.05, hs_monitor: -0.1, hs_shelf: 0.65 };
/** How far either side of the pan an object is still on screen. */
const IN_VIEW = 0.5;

export function panFor(hotspot: SignpostName): number {
  return PAN_AT[hotspot];
}

/** Is the object on screen at this pan? (Glints skip what can't be seen.) */
export function inView(hotspot: SignpostName, pan: number): boolean {
  return Math.abs(PAN_AT[hotspot] - pan) <= IN_VIEW;
}
