import { Box3, Mesh, MeshBasicMaterial, PlaneGeometry, type Intersection, type Object3D, type Raycaster } from "three";

/** The invisible plane across the crate's opening that the pointer flicks through the records on. */
export const DIG_PLANE = "hs_crate__dig";
/** How far past the edge of a record's band the pointer goes before the next one comes up, as a share of a band. */
export const DIG_MARGIN = 0.25;
/** The crate's walls, inset from its outside to the opening the records stand in. */
const WALL_M = 0.015;
/** Flicked records lean out over the crate's low front, their tops reaching this far past it (Blender): the plane reaches over them, so the pointer can go back to them. */
const FLICK_REACH_M = 0.135;

const material = new MeshBasicMaterial({ visible: false });

/**
 * Which project is at the front for a pointer `z` deep into the crate (its own frame, +z its front). The crate's depth
 * is shared between the `count` projects, front to back, so moving the pointer back flicks forward through them and
 * moving it forward flicks back. It only moves on once the pointer is DIG_MARGIN past the current band, so a pointer
 * resting on an edge can't make it flicker.
 */
export function digFromDepth(z: number, front: number, back: number, count: number, current: number): number {
  if (count <= 1) return 0;
  const raw = ((front - z) / (front - back)) * count;
  const keep = raw >= current - DIG_MARGIN && raw <= current + 1 + DIG_MARGIN;
  return Math.max(0, Math.min(count - 1, keep ? current : Math.floor(raw)));
}

/**
 * A flat, invisible plane across the crate's opening at the height of the records' tops, in the crate's frame, so where
 * the pointer crosses it says how deep into the crate it is. It never moves with the records, so nothing the pointer
 * does changes what is under it. Answers only while `enabled` says so: browsing the crate.
 */
export function addDigPlane(crate: Object3D, records: Object3D[], enabled: () => boolean): Mesh | null {
  const body = crate.getObjectByName(`${crate.name}__body`) as Mesh | undefined;
  if (!body?.geometry) return null;
  if (!body.geometry.boundingBox) body.geometry.computeBoundingBox();
  const box = (body.geometry.boundingBox as Box3).clone().applyMatrix4(body.matrix);
  const top = Math.max(
    ...records.map((r) => {
      const geometry = (r as Mesh).geometry;
      if (!geometry) return r.position.y;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      return r.position.y + geometry.boundingBox!.max.y;
    }),
  );
  const front = box.max.z - WALL_M + FLICK_REACH_M;
  const back = box.min.z + WALL_M;
  const width = box.max.x - box.min.x - 2 * WALL_M;
  const plane = new Mesh(new PlaneGeometry(width, front - back).rotateX(-Math.PI / 2), material);
  plane.name = DIG_PLANE;
  plane.position.set((box.min.x + box.max.x) / 2, top, (front + back) / 2);
  plane.userData.cleanEdges = true; // never filled or outlined
  plane.userData.hitProxy = true; // not part of the crate's own hover box
  plane.userData.front = front;
  plane.userData.back = back;
  plane.raycast = function (this: Mesh, raycaster: Raycaster, intersects: Intersection[]) {
    if (enabled()) Mesh.prototype.raycast.call(this, raycaster, intersects);
  };
  crate.add(plane);
  plane.updateMatrixWorld();
  return plane;
}
