import { blendPose, copyPose, smoothstep, widenForAspect, type Pose } from "./pose";

/** On portrait screens the walk-in hands over to the portrait standing pose over the last stretch. */
export const PORTRAIT_FROM = 0.9;
/** The phone shape the portrait standing pose is authored for (Blender): the whole room fits across it with a margin. */
export const PORTRAIT_ASPECT = 0.64;
/** Narrower phones widen the portrait standing pose to keep the room across them (Kasper: "not cropped"), up to this. */
export const PORTRAIT_MAX_FOV = 105;

/** The walk-in's camera for this frame: widened for narrow screens, ending at the portrait standing pose on portrait screens. */
export function basePose(walkIn: Pose, standPortrait: Pose | null, progress: number, aspect: number, out: Pose): Pose {
  copyPose(walkIn, out);
  out.fov = widenForAspect(out.fov, aspect);
  if (aspect < 1 && standPortrait) {
    const k = smoothstep(PORTRAIT_FROM, 1, progress);
    if (k > 0) {
      const from = out.fov;
      blendPose(out, standPortrait, k, out);
      out.fov = from + (widenForAspect(standPortrait.fov, aspect, PORTRAIT_ASPECT, PORTRAIT_MAX_FOV) - from) * k;
    }
  }
  return out;
}

/** A hotspot's focus camera: its portrait variant on portrait screens when there is one, else the landscape one, widened. */
export function focusPose(land: Pose, portrait: Pose | null, aspect: number, out: Pose): Pose {
  if (aspect < 1 && portrait) return copyPose(portrait, out);
  copyPose(land, out);
  out.fov = widenForAspect(out.fov, aspect);
  return out;
}
