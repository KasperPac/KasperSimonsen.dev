import { Box3, BoxGeometry, Matrix4, Mesh, MeshBasicMaterial, type Object3D, type Raycaster, type Intersection } from "three";
import { ALL_HOTSPOTS } from "./registry";

const material = new MeshBasicMaterial({ visible: false });

/**
 * userData flag for something laid over a hotspot at runtime that is no part of its outline (the whiteboard's ink): left
 * out of its hit proxy and of where its label goes, so it can never grow them.
 */
export const NO_BOUNDS = "noBounds";

/** A hotspot's world bounds as Box3.setFromObject finds them, leaving out anything flagged NO_BOUNDS (and what's under it). */
export function outlineBox(node: Object3D, out = new Box3()): Box3 {
  out.makeEmpty();
  node.updateWorldMatrix(true, true);
  const part = new Box3();
  const visit = (o: Object3D) => {
    if (o.userData[NO_BOUNDS]) return;
    const geometry = (o as Mesh).geometry;
    if (geometry) {
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      out.union(part.copy(geometry.boundingBox!).applyMatrix4(o.matrixWorld));
    }
    for (const c of o.children) visit(c);
  };
  visit(node);
  return out;
}

function isUnbounded(o: Object3D): boolean {
  for (let p: Object3D | null = o; p; p = p.parent) if (p.userData[NO_BOUNDS]) return true;
  return false;
}

/**
 * An invisible box over each hotspot, in its own frame, so the whole object takes the pointer: thin parts seen edge
 * on (the shelf board) and the gaps between parts (ornaments, crate slats) included. It answers only while `enabled`
 * says so; focused on an object, its own records and ornaments have to answer instead.
 */
export function addHitProxies(root: Object3D, enabled: () => boolean): Mesh[] {
  root.updateWorldMatrix(true, true);
  const proxies: Mesh[] = [];
  for (const name of ALL_HOTSPOTS) {
    const node = root.getObjectByName(name);
    if (!node) continue;
    const toLocal = new Matrix4().copy(node.matrixWorld).invert();
    const box = new Box3();
    const part = new Box3();
    node.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh || mesh.userData.hitProxy || isUnbounded(mesh)) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      box.union(part.copy(mesh.geometry.boundingBox!).applyMatrix4(new Matrix4().multiplyMatrices(toLocal, mesh.matrixWorld)));
    });
    if (box.isEmpty()) continue;
    const size = box.getSize(part.max.clone());
    const proxy = new Mesh(new BoxGeometry(size.x, size.y, size.z), material);
    proxy.name = `${name}__hit`;
    box.getCenter(proxy.position);
    proxy.userData.hitProxy = true;
    proxy.userData.cleanEdges = true; // never filled or outlined
    proxy.raycast = function (this: Mesh, raycaster: Raycaster, intersects: Intersection[]) {
      if (enabled()) Mesh.prototype.raycast.call(this, raycaster, intersects);
    };
    node.add(proxy);
    proxy.updateMatrixWorld();
    proxies.push(proxy);
  }
  return proxies;
}
