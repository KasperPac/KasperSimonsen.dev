import {
  Box3,
  DoubleSide,
  EdgesGeometry,
  MeshBasicMaterial,
  Sphere,
  Vector3,
  type BufferGeometry,
  type Mesh,
  type Object3D,
} from "three";
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
  /** Groups meshes whose lines can be recoloured together (hover). Null keeps the shared line. */
  highlightKey?: (mesh: Object3D) => string | null;
};

/** Meshes sharing one distance-fade setting. `centre` is their world-space bounding-sphere centre at apply time. */
export type EdgeFadeGroup = {
  material: LineMaterial;
  near: number;
  far: number;
  min: number;
  objects: Object3D[];
  centre: Vector3;
};

export type CleanEdgesHandle = {
  fill: MeshBasicMaterial;
  line: LineMaterial;
  fades: EdgeFadeGroup[];
  /** One line material per highlight key. */
  highlights: Map<string, LineMaterial>;
  baseColor: string;
};

const DEFAULT_FADE_MIN = 0.15;

// drei caches loaded scenes, so a remount restyles the same root: hand back the handle that owns its lines.
const handles = new WeakMap<Object3D, CleanEdgesHandle>();

/** Line opacity at `distance`: 1 up to `near`, easing (smoothstep) down to `min` at `far`. Invalid params mean no fade. */
export function fadeOpacity(distance: number, near: number, far: number, min: number): number {
  if (![distance, near, far, min].every(Number.isFinite) || near >= far) return 1;
  const t = Math.min(1, Math.max(0, (distance - near) / (far - near)));
  return 1 - (1 - min) * t * t * (3 - 2 * t);
}

/**
 * Restyles every mesh under `root` in place: a fill that hides what's behind it, plus the mesh's
 * real edges as screen-space lines. Names, hierarchy and transforms are untouched, so hotspots and
 * Blender animations keep working. Calling it again on the same tree is a no-op for styled meshes.
 * A mesh (or its nearest ancestor) with `userData.edge_threshold_deg` in (0, 180) overrides `opts.thresholdDeg`.
 * `opts.highlightKey` groups meshes into recolourable line materials, driven by `setHighlight`.
 * `edge_fade_near`/`edge_fade_far`/`edge_fade_min` give it a distance fade, driven by `updateEdgeFades`.
 */
export function applyCleanEdges(root: Object3D, opts: CleanEdgesOptions): CleanEdgesHandle {
  const existing = handles.get(root);
  if (existing) return existing;
  const fill = new MeshBasicMaterial({
    color: opts.background,
    side: DoubleSide,
    polygonOffset: true, // pushes fills back so coplanar edges always win the depth test
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const line = new LineMaterial({ color: opts.line, linewidth: opts.lineWidth, fog: true });
  const fades = new Map<string, EdgeFadeGroup>();
  const highlights = new Map<string, LineMaterial>();
  const edgeCache = new Map<BufferGeometry, Map<number, LineSegmentsGeometry>>();

  root.updateWorldMatrix(true, true);
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
    const fade = fadeFor(mesh);
    const highlight = fade ? null : (opts.highlightKey?.(mesh) ?? null);
    let material = line;
    if (highlight) {
      let m = highlights.get(highlight);
      if (!m) {
        m = new LineMaterial({ color: opts.line, linewidth: opts.lineWidth, fog: true });
        highlights.set(highlight, m);
      }
      material = m;
    }
    if (fade) {
      const key = `${fade.near}|${fade.far}|${fade.min}`;
      let group = fades.get(key);
      if (!group) {
        const faded = new LineMaterial({
          color: opts.line,
          linewidth: opts.lineWidth,
          fog: true,
          transparent: true,
          depthWrite: line.depthWrite,
        });
        group = { ...fade, material: faded, objects: [], centre: new Vector3() };
        fades.set(key, group);
      }
      group.objects.push(mesh);
      material = group.material;
    }
    const lines = new LineSegments2(edges, material);
    lines.name = `${mesh.name}__edges`;
    lines.userData.cleanEdges = true;
    lines.raycast = () => {}; // hotspots raycast the fill; LineSegments2 would also need raycaster.camera
    mesh.add(lines);
    mesh.userData.cleanEdgesApplied = true;
  }
  for (const group of fades.values()) {
    const box = new Box3();
    for (const o of group.objects) box.union(new Box3().setFromObject(o));
    box.getBoundingSphere(new Sphere()).center.clone().toArray().forEach((v, i) => group.centre.setComponent(i, v));
  }
  const handle = { fill, line, fades: [...fades.values()], highlights, baseColor: opts.line };
  handles.set(root, handle);
  return handle;
}

/** Nearest valid `edge_threshold_deg` (a Blender custom property, exported as glTF extras) up the tree. */
function thresholdFor(mesh: Object3D, fallback: number): number {
  for (let o: Object3D | null = mesh; o; o = o.parent) {
    const v: unknown = o.userData.edge_threshold_deg;
    if (typeof v === "number" && Number.isFinite(v) && v > 0 && v < 180) return v;
  }
  return fallback;
}

/** Nearest ancestor-or-self with a valid `edge_fade_near` < `edge_fade_far`; its `edge_fade_min` (0-1) or the default. */
function fadeFor(mesh: Object3D): { near: number; far: number; min: number } | null {
  for (let o: Object3D | null = mesh; o; o = o.parent) {
    const { edge_fade_near: near, edge_fade_far: far, edge_fade_min: min } = o.userData;
    if (typeof near === "number" && typeof far === "number" && Number.isFinite(near) && Number.isFinite(far) && near < far) {
      const ok = typeof min === "number" && Number.isFinite(min) && min >= 0 && min <= 1;
      return { near, far, min: ok ? min : DEFAULT_FADE_MIN };
    }
  }
  return null;
}

/** Sets each fade group's opacity from the camera's distance to its centre. Call every frame. */
export function updateEdgeFades(handle: CleanEdgesHandle, cameraPosition: Vector3): void {
  for (const g of handle.fades) g.material.opacity = fadeOpacity(cameraPosition.distanceTo(g.centre), g.near, g.far, g.min);
}

/** Recolours the lines of `prefix` and everything under it (`prefix__…`); every other highlight group goes back to the base colour. */
export function setHighlight(handle: CleanEdgesHandle, prefix: string | null, color: string): void {
  for (const [key, material] of handle.highlights) {
    const on = prefix !== null && (key === prefix || key.startsWith(`${prefix}__`));
    material.color.set(on ? color : handle.baseColor);
  }
}

/** Line widths are in CSS pixels relative to this; call on every canvas resize. */
export function setLineResolution(handle: CleanEdgesHandle, width: number, height: number): void {
  handle.line.resolution.set(width, height);
  for (const g of handle.fades) g.material.resolution.set(width, height);
  for (const m of handle.highlights.values()) m.resolution.set(width, height);
}
