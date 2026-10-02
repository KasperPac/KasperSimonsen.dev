// office/crate/zones.ts
import { BoxGeometry, Mesh, MeshBasicMaterial, Vector3, type Box3, type Intersection, type Object3D, type Raycaster } from "three";

const material = new MeshBasicMaterial({ visible: false });

/** Name of record `index`'s hover zone; the registry reads it as that record. */
export const zoneName = (index: number) => `hs_crate__zone_${String(index).padStart(2, "0")}`;

/**
 * An invisible box where each of the first `count` records rests, beside the records in the crate, so hovering where a
 * record stands means that record however the records flick and lift (no feedback between the pointer and the motion).
 * Answers only while `enabled` says so: browsing the crate.
 */
export function addCrateZones(records: Object3D[], count: number, enabled: () => boolean): Mesh[] {
  return records.slice(0, count).map((r, i) => {
    const source = r as Mesh;
    if (!source.geometry.boundingBox) source.geometry.computeBoundingBox();
    const box = source.geometry.boundingBox as Box3;
    const size = box.getSize(new Vector3());
    const centre = box.getCenter(new Vector3());
    const zone = new Mesh(new BoxGeometry(size.x, size.y, Math.max(size.z, 0.02)).translate(centre.x, centre.y, centre.z), material);
    zone.name = zoneName(i);
    zone.position.copy(r.position);
    zone.quaternion.copy(r.quaternion);
    zone.scale.copy(r.scale);
    zone.userData.cleanEdges = true; // never filled or outlined
    zone.userData.hitProxy = true; // not part of the crate's own hover box
    zone.raycast = function (this: Mesh, raycaster: Raycaster, intersects: Intersection[]) {
      if (enabled()) Mesh.prototype.raycast.call(this, raycaster, intersects);
    };
    r.parent?.add(zone);
    zone.updateMatrixWorld();
    return zone;
  });
}
