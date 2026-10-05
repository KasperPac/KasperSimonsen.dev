import { blendPose, copyPose, makePose, smoothstep, widenForAspect, type Pose } from "./pose";
import { applyPan } from "./pan";

/** On portrait screens the walk-in hands over to the portrait standing pose over the last stretch. */
export const PORTRAIT_FROM = 0.9;
/** The phone shape the portrait standing pose is authored for (Blender): the whole room fits across it with a margin. */
export const PORTRAIT_ASPECT = 0.64;
/** Narrower phones widen the portrait standing pose to keep the room across them (Kasper: "not cropped"), up to this. */
export const PORTRAIT_MAX_FOV = 105;

const panned = makePose();

/**
 * The walk-in's camera for this frame: widened for narrow screens, ending at the portrait standing pose on portrait
 * screens, panned there by `pan` (see pan.ts).
 */
export function basePose(walkIn: Pose, standPortrait: Pose | null, progress: number, aspect: number, out: Pose, pan = 0): Pose {
  copyPose(walkIn, out);
  out.fov = widenForAspect(out.fov, aspect);
  if (aspect < 1 && standPortrait) {
    const k = smoothstep(PORTRAIT_FROM, 1, progress);
    if (k > 0) {
      const from = out.fov;
      blendPose(out, applyPan(standPortrait, pan, panned), k, out);
      out.fov = from + (widenForAspect(standPortrait.fov, aspect, PORTRAIT_ASPECT, PORTRAIT_MAX_FOV) - from) * k;
    }
  }
  return out;
}

/** The phone shape the portrait close-ups are authored for (Blender, 390 x 844). */
export const FOCUS_PORTRAIT_ASPECT = 390 / 844;

/**
 * How much of the monitor's portrait close-up must stay in view, top to bottom, as a fraction of its authored height
 * (390 x 844) measured out from the centre. The strip under the monitor ends ~0.72 of the way to the frame's bottom edge
 * (measured at 390 x 844: its bottom edge at y 726), so 0.78 keeps it, and its ‹ ›, on screen with a margin. A phone
 * (aspect under ~0.59) already sees that much, so this only widens squarer portrait screens: tablets, near-square windows.
 */
export const MONITOR_MIN_HEIGHT = 0.78;

/**
 * A hotspot's focus camera: its portrait variant on portrait screens when there is one, keeping its width across phones
 * (a shorter one, a browser's toolbars showing, would otherwise see more around it and print the card or sleeve too
 * small to read without pinching: Kasper's card "appears blank"), else the landscape one, widened. Keeping the width
 * sees less of the authored height as the screen gets squarer (0.462 / aspect of it); `minHeight` (a fraction of that
 * height, from the centre) widens the view when it would see less, for a close-up that needs its whole frame: the
 * monitor's strip.
 */
export function focusPose(land: Pose, portrait: Pose | null, aspect: number, out: Pose, minHeight = 0): Pose {
  if (aspect < 1 && portrait) {
    copyPose(portrait, out);
    const tall = Math.tan((portrait.fov * Math.PI) / 360);
    out.fov = (Math.atan(Math.max((tall * FOCUS_PORTRAIT_ASPECT) / aspect, tall * minHeight)) * 360) / Math.PI;
    return out;
  }
  copyPose(land, out);
  out.fov = widenForAspect(out.fov, aspect);
  return out;
}

/**
 * The record player's camera. On a phone the close-up (the sleeve's back filling the width) leaves the platter out of
 * shot, so while the record goes on it uses the landscape framing, widened, with the platter and the stand both in
 * view, and comes in close once the sleeve has turned round to be read (Kasper: on mobile you couldn't see either).
 */
export function playerPose(land: Pose, portrait: Pose | null, aspect: number, sleeveOut: boolean, out: Pose): Pose {
  return focusPose(land, sleeveOut ? portrait : null, aspect, out);
}
