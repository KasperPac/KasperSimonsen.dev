import { Box3, Vector3, type Camera, type Object3D } from "three";

const box = new Box3();
const corner = new Vector3();

/** On-screen rectangle (CSS px) of an object's world bounding box; null when it's empty or behind the camera. */
export function screenRect(
  object: Object3D,
  camera: Camera,
  size: { width: number; height: number },
): { left: number; right: number; top: number; bottom: number } | null {
  box.setFromObject(object);
  if (box.isEmpty()) return null;
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (let i = 0; i < 8; i++) {
    corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
    if (corner.z > 1) return null;
    const x = ((corner.x + 1) / 2) * size.width;
    const y = ((1 - corner.y) / 2) * size.height;
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  return { left, right, top, bottom };
}
