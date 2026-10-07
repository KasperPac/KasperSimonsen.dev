import { Euler, Matrix4, Quaternion, Vector3, type Box3 } from "three";

/** Lift off the face printed on, in metres, so the print never shares a plane with the object's outline. */
const LIFT = 0.0003;

/**
 * Where drei's `Html transform` goes to print `widthPx` of HTML across a card lying flat (y up, its long edge along
 * x): on the top face, facing up, the text's up pointing along -z (into the drawer, away from whoever opened it).
 */
export function faceFor(box: Box3, widthPx: number) {
  const width = box.max.x - box.min.x;
  const depth = box.max.z - box.min.z;
  return {
    position: [(box.min.x + box.max.x) / 2, box.max.y + LIFT, (box.min.z + box.max.z) / 2] as [number, number, number],
    rotation: [-Math.PI / 2, 0, 0] as [number, number, number],
    // drei maps 1 CSS px to distanceFactor / 400 world units in transform mode
    distanceFactor: (width * 400) / widthPx,
    heightPx: (widthPx * depth) / width,
  };
}

/**
 * Where drei's `Html transform` goes to print `widthPx` of HTML on the back of an upright sleeve (its front +z, up +y,
 * origin on its bottom edge): just behind the back face, facing out of it, upright, reading left to right from behind.
 */
export function backFaceFor(box: Box3, widthPx: number) {
  const width = box.max.x - box.min.x;
  const height = box.max.y - box.min.y;
  return {
    position: [(box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, box.min.z - LIFT] as [number, number, number],
    rotation: [0, Math.PI, 0] as [number, number, number],
    distanceFactor: (width * 400) / widthPx,
    heightPx: (widthPx * height) / width,
  };
}

/**
 * Where drei's `Html transform` goes to print `widthPx` of HTML across a flat screen, given its corners (any order, in
 * the mesh's own space): centred on it, just in front, facing out of the side `front` points to, its up as near `up`
 * as the screen's tilt allows. The monitor's screen leans back, so it isn't square to any axis.
 */
export function screenFaceFor(points: Vector3[], widthPx: number, front = new Vector3(0, 0, 1), up = new Vector3(0, 1, 0)) {
  const centre = points.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(points.length);
  // the normal from the widest triangle of corners, so near-duplicate points can't spoil it
  const a = points[0];
  const b = points.reduce((far, p) => (p.distanceToSquared(a) > far.distanceToSquared(a) ? p : far), a);
  let normal = new Vector3();
  for (const c of points) {
    const n = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
    if (n.lengthSq() > normal.lengthSq()) normal = n;
  }
  normal.normalize();
  if (normal.dot(front) < 0) normal.negate();
  const y = up.clone().addScaledVector(normal, -up.dot(normal)).normalize();
  const x = new Vector3().crossVectors(y, normal);
  const span = (axis: Vector3) => {
    const d = points.map((p) => p.dot(axis));
    return Math.max(...d) - Math.min(...d);
  };
  const width = span(x);
  const height = span(y);
  const rotation = new Euler().setFromRotationMatrix(new Matrix4().makeBasis(x, y, normal));
  return {
    position: centre.addScaledVector(normal, LIFT).toArray() as [number, number, number],
    rotation: [rotation.x, rotation.y, rotation.z] as [number, number, number],
    distanceFactor: (width * 400) / widthPx,
    heightPx: (widthPx * height) / width,
  };
}

export type Face = ReturnType<typeof screenFaceFor>;

/**
 * A print `heightPx` tall hung under another print's `face`, the same width (and px scale), in its plane and tilt, its top
 * `gapPx` below the face's bottom edge: the reel's words under the monitor on portrait screens (spec 3.5).
 */
export function belowFaceFor(face: Face, heightPx: number, gapPx: number): Face {
  const k = face.distanceFactor / 400;
  const up = new Vector3(0, 1, 0).applyQuaternion(new Quaternion().setFromEuler(new Euler(...face.rotation)));
  const at = new Vector3(...face.position).addScaledVector(up, -(face.heightPx / 2 + gapPx + heightPx / 2) * k);
  return { position: at.toArray() as [number, number, number], rotation: face.rotation, distanceFactor: face.distanceFactor, heightPx };
}
