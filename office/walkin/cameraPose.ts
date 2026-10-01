import { Vector3, type Camera, type Object3D, type PerspectiveCamera } from "three";

const scale = new Vector3();

/** A perspective camera exported from Blender, by node name. */
export function findCamera(root: Object3D, name: string): PerspectiveCamera {
  const obj = root.getObjectByName(name) as PerspectiveCamera | undefined;
  if (!obj?.isPerspectiveCamera) throw new Error(`"${name}" is missing from the model or isn't a perspective camera`);
  return obj;
}

/** Puts `target` exactly where `source` is in world space and matches its vertical FOV. */
export function copyCameraPose(source: Camera, target: PerspectiveCamera): void {
  source.updateWorldMatrix(true, false);
  source.matrixWorld.decompose(target.position, target.quaternion, scale);
  const fov = (source as PerspectiveCamera).isPerspectiveCamera ? (source as PerspectiveCamera).fov : target.fov;
  if (target.fov !== fov) {
    target.fov = fov;
    target.updateProjectionMatrix();
  }
}
