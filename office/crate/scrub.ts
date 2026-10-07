import { Box3, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3, type Intersection, type Object3D, type Raycaster } from "three";

/** The invisible plane across the crate's opening that the pointer flicks through the records on. */
export const DIG_PLANE = "hs_crate__dig";
/** The crate's walls, inset from its outside to the opening the records stand in. */
const WALL_M = 0.015;
/** Flicked records lean out over the crate's low front, their tops reaching this far past it (Blender): the plane reaches over them, so the pointer can go back to them. */
const FLICK_REACH_M = 0.135;

const material = new MeshBasicMaterial({ visible: false });

/** How deep a record's top edge is in the crate's frame, as it stands now: the middle of its geometry's top face. */
function topEdgeDepth(crate: Object3D, record: Mesh): number {
  const geometry = record.geometry;
  if (!geometry) return crate.worldToLocal(record.getWorldPosition(new Vector3())).z;
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox!;
  record.updateWorldMatrix(true, false);
  const top = new Vector3((min.x + max.x) / 2, max.y, (min.z + max.z) / 2);
  return crate.worldToLocal(record.localToWorld(top)).z;
}

/**
 * Which project is at the front for the pointer, browsing the crate. `on` is the record the pointer is on (its place
 * in the crate, front to back; see recordUnder), `z` how deep into the crate it crosses the opening (+z its front;
 * null off it) and `tops` how deep each project's top edge is. On a record, that record comes up: the next one's top
 * peeking over the front one's as the pointer goes back, a flicked one leaning over the front as it comes forward, and
 * the front one itself, anywhere on its cover, stays. So the records come up one after another in the crate's own
 * order however many there are, and each change moves the pointer onto the record it brought up, so nothing flickers.
 * Off the records, the crate's front is the first project and its back the last.
 */
export function digFromPointer(on: number | null, z: number | null, tops: readonly number[], count: number, current: number): number {
  if (count <= 1) return 0;
  if (on !== null) return Math.min(on, count - 1);
  if (z !== null && z > tops[0]) return 0;
  if (z !== null && z < tops[count - 1]) return count - 1;
  return Math.max(0, Math.min(count - 1, current));
}

/** The record nearest the pointer (a sleeve, or its vinyl or art), as its place in `records`; null if the nearest thing is no record. */
export function recordUnder(intersections: readonly { object: Object3D }[], records: readonly Object3D[]): number | null {
  const nearest = intersections.find((i) => i.object.name !== DIG_PLANE);
  for (let o: Object3D | null = nearest?.object ?? null; o; o = o.parent) {
    const i = records.indexOf(o);
    if (i >= 0) return i;
  }
  return null;
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
  plane.userData.tops = records.map((r) => topEdgeDepth(crate, r as Mesh));
  plane.raycast = function (this: Mesh, raycaster: Raycaster, intersects: Intersection[]) {
    if (enabled()) Mesh.prototype.raycast.call(this, raycaster, intersects);
  };
  crate.add(plane);
  plane.updateMatrixWorld();
  return plane;
}
