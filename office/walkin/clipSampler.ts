import { PropertyBinding, type AnimationClip, type Interpolant, type KeyframeTrack, type Object3D } from "three";

type Property = "position" | "quaternion" | "scale";
type Binding = { target: Object3D; property: Property; interpolant: Interpolant };

/** Scroll progress → time on a clip. Out-of-range progress (rubber-band, overshoot) clamps. */
export function progressToTime(progress: number, duration: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(1, Math.max(0, progress)) * duration;
}

/**
 * Evaluates `clip` at an exact time and writes the values straight onto the targets. Used instead of
 * AnimationMixer because scroll scrubs both ways: a LoopOnce action pauses at its end and ignores later
 * times, and LoopRepeat wraps the final frame back to the first.
 */
export function makeClipSampler(clip: AnimationClip, root: Object3D): (time: number) => void {
  const bindings: Binding[] = [];
  for (const track of clip.tracks) {
    const { nodeName, propertyName } = PropertyBinding.parseTrackName(track.name);
    const target = nodeName ? root.getObjectByName(nodeName) : undefined;
    if (!target) throw new Error(`Animation track "${track.name}" targets a node that isn't in the scene`);
    if (propertyName === "position" || propertyName === "quaternion" || propertyName === "scale") {
      // createInterpolant is assigned at runtime by KeyframeTrack's constructor but missing from @types/three
      const { createInterpolant } = track as KeyframeTrack & { createInterpolant(): Interpolant };
      bindings.push({ target, property: propertyName, interpolant: createInterpolant.call(track) });
    }
  }
  return (time) => {
    const t = Math.min(clip.duration, Math.max(0, time));
    for (const { target, property, interpolant } of bindings) {
      target[property].fromArray(interpolant.evaluate(t) as ArrayLike<number>);
    }
  };
}

/** The clip with tracks on `nodeName`. Blender names it "<object>Action", so match tracks, not names. */
export function findClipFor(clips: AnimationClip[], nodeName: string): AnimationClip {
  const clip = clips.find((c) => c.tracks.some((t) => t.name.startsWith(`${nodeName}.`)));
  if (!clip) throw new Error(`No animation drives "${nodeName}"`);
  return clip;
}
