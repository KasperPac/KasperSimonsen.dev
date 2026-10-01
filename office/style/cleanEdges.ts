import { DoubleSide, EdgesGeometry, MeshBasicMaterial, type BufferGeometry, type Mesh, type Object3D } from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";

export type CleanEdgesOptions = {
  /** Fill colour. Matches the background so fills read as "hidden lines removed". */
  background: string;
  line: string;
  /** CSS pixels */
  lineWidth: number;
  thresholdDeg: number;
};

export type CleanEdgesHandle = { fill: MeshBasicMaterial; line: LineMaterial };

/**
 * Restyles every mesh under `root` in place: a fill that hides what's behind it, plus the mesh's
 * real edges as screen-space lines. Names, hierarchy and transforms are untouched, so hotspots and
 * Blender animations keep working. Calling it again on the same tree is a no-op for styled meshes.
 * A mesh (or its nearest ancestor) with `userData.edge_threshold_deg` in (0, 180) overrides `opts.thresholdDeg`.
 */
export function applyCleanEdges(root: Object3D, opts: CleanEdgesOptions): CleanEdgesHandle {
  const fill = new MeshBasicMaterial({
    color: opts.background,
    side: DoubleSide,
    polygonOffset: true, // pushes fills back so coplanar edges always win the depth test
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const line = new LineMaterial({ color: opts.line, linewidth: opts.lineWidth, fog: true });
  const edgeCache = new Map<BufferGeometry, Map<number, LineSegmentsGeometry>>();

  const meshes: Mesh[] = [];
  root.traverse((obj) => {
    if ((obj as Mesh).isMesh && !obj.userData.cleanEdges && !obj.userData.cleanEdgesApplied) meshes.push(obj as Mesh);
  });

  for (const mesh of meshes) {
    mesh.material = fill;
    const threshold = thresholdFor(mesh, opts.thresholdDeg);
    let byThreshold = edgeCache.get(mesh.geometry);
    if (!byThreshold) edgeCache.set(mesh.geometry, (byThreshold = new Map()));
    let edges = byThreshold.get(threshold);
    if (!edges) {
      edges = new LineSegmentsGeometry().fromEdgesGeometry(new EdgesGeometry(mesh.geometry, threshold));
      byThreshold.set(threshold, edges);
    }
    const lines = new LineSegments2(edges, line);
    lines.name = `${mesh.name}__edges`;
    lines.userData.cleanEdges = true;
    lines.raycast = () => {}; // hotspots raycast the fill; LineSegments2 would also need raycaster.camera
    mesh.add(lines);
    mesh.userData.cleanEdgesApplied = true;
  }
  return { fill, line };
}

/** Nearest valid `edge_threshold_deg` (a Blender custom property, exported as glTF extras) up the tree. */
function thresholdFor(mesh: Object3D, fallback: number): number {
  for (let o: Object3D | null = mesh; o; o = o.parent) {
    const v: unknown = o.userData.edge_threshold_deg;
    if (typeof v === "number" && Number.isFinite(v) && v > 0 && v < 180) return v;
  }
  return fallback;
}

/** Line widths are in CSS pixels relative to this; call on every canvas resize. */
export function setLineResolution(handle: CleanEdgesHandle, width: number, height: number): void {
  handle.line.resolution.set(width, height);
}
