import { BoxGeometry, Mesh, type Intersection, type Material, type Object3D, type Raycaster } from "three";
import { hitFor } from "../hotspots/registry";
import { NO_BOUNDS } from "../hotspots/proxies";

/** userData flag on the invisible shapes that take a click for the light (read by the office's pointer handlers). */
export const LIGHT_HIT = "lightHit";

/**
 * An invisible box that takes the pointer for the light, in the room's frame. It answers only while `enabled` says so
 * (the room is idle), so it never takes a click from an open object or from the walk-in.
 */
export function lightHitBox(size: readonly [number, number, number], at: readonly [number, number, number], material: Material, enabled: () => boolean): Mesh {
  const m = new Mesh(new BoxGeometry(1, 1, 1), material);
  m.scale.set(...size);
  m.position.set(...at);
  m.userData[LIGHT_HIT] = true;
  m.userData[NO_BOUNDS] = true;
  m.userData.cleanEdges = true; // never filled or outlined
  m.raycast = function (this: Mesh, raycaster: Raycaster, intersects: Intersection[]) {
    if (enabled()) Mesh.prototype.raycast.call(this, raycaster, intersects);
  };
  return m;
}

/**
 * Does the light take this pointer? `objects` is everything under it, nearest first. Hotspots always win: if any
 * hotspot's shape is under the pointer, wherever it is in the list, the pointer is theirs and the light never takes it.
 * Otherwise the light takes it when its switch or bulb is the nearest thing.
 */
export function lightTakesPointer(objects: Object3D[]): boolean {
  if (!objects[0]?.userData[LIGHT_HIT]) return false;
  return !objects.some((o) => hitFor(o, null));
}
