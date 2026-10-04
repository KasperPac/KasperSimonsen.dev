import { MathUtils, Quaternion, Vector3, type Object3D, type PerspectiveCamera } from "three";

/** Where a camera is, where it looks, and its vertical field of view (degrees). */
export type Pose = { position: Vector3; quaternion: Quaternion; fov: number };

/** Frames are composed for 16:10; narrower screens keep that horizontal view. */
export const DESIGN_ASPECT = 16 / 10;
export const MAX_FOV = 95;

const scale = new Vector3();

export function makePose(): Pose {
  return { position: new Vector3(), quaternion: new Quaternion(), fov: 50 };
}

/** World pose of a node (a Blender camera); its fov when it is a perspective camera. */
export function readPose(source: Object3D, out: Pose): Pose {
  source.updateWorldMatrix(true, false);
  source.matrixWorld.decompose(out.position, out.quaternion, scale);
  if ((source as PerspectiveCamera).isPerspectiveCamera) out.fov = (source as PerspectiveCamera).fov;
  return out;
}

export function copyPose(from: Pose, out: Pose): Pose {
  out.position.copy(from.position);
  out.quaternion.copy(from.quaternion);
  out.fov = from.fov;
  return out;
}

/** `out` = a → b at t (position lerp, rotation slerp, fov lerp). `out` may be `a`. */
export function blendPose(a: Pose, b: Pose, t: number, out: Pose): Pose {
  out.position.lerpVectors(a.position, b.position, t);
  out.quaternion.slerpQuaternions(a.quaternion, b.quaternion, t);
  out.fov = a.fov + (b.fov - a.fov) * t;
  return out;
}

export function applyPose(pose: Pose, camera: PerspectiveCamera): void {
  camera.position.copy(pose.position);
  camera.quaternion.copy(pose.quaternion);
  if (camera.fov !== pose.fov) {
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
  }
}

/** Vertical fov that keeps a 16:10 frame's horizontal view on narrower screens (4:3, portrait). */
export function widenForAspect(fovDeg: number, aspect: number, design = DESIGN_ASPECT, max = MAX_FOV): number {
  if (!(aspect > 0) || aspect >= design) return fovDeg;
  const half = MathUtils.degToRad(fovDeg) / 2;
  return Math.min(max, MathUtils.radToDeg(2 * Math.atan(Math.tan(half) * (design / aspect))));
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
