import { describe, it, expect } from "vitest";
import { BoxGeometry, DoubleSide, Group, IcosahedronGeometry, Mesh, Raycaster, Vector3 } from "three";
import type { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { applyCleanEdges, setLineResolution } from "./cleanEdges";

const opts = { background: "#000000", line: "#ffffff", lineWidth: 1.5, thresholdDeg: 20 };

function scene() {
  const root = new Group();
  const geometry = new BoxGeometry(1, 1, 1);
  const crate = new Mesh(geometry);
  crate.name = "hs_crate";
  crate.position.set(2, 0, 0);
  const twin = new Mesh(geometry);
  twin.name = "prop_twin";
  root.add(crate, twin);
  return { root, crate, twin };
}

const edgesOf = (mesh: Mesh) => mesh.getObjectByName(`${mesh.name}__edges`) as LineSegments2;

describe("applyCleanEdges", () => {
  it("gives each mesh the shared fill and a child carrying only its real edges", () => {
    const { root, crate } = scene();
    const handle = applyCleanEdges(root, opts);
    expect(crate.material).toBe(handle.fill);
    const lines = edgesOf(crate);
    expect(lines.material).toBe(handle.line);
    expect(lines.geometry.attributes.instanceStart.count).toBe(12);
  });

  it("keeps names, hierarchy and transforms, so hotspots and Blender animations still work", () => {
    const { root, crate } = scene();
    applyCleanEdges(root, opts);
    expect(root.getObjectByName("hs_crate")).toBe(crate);
    expect(crate.parent).toBe(root);
    expect(crate.position.x).toBe(2);
  });

  it("fills hide what's behind them without fighting the lines", () => {
    const { root } = scene();
    const { fill, line } = applyCleanEdges(root, opts);
    expect(fill.side).toBe(DoubleSide);
    expect(fill.polygonOffset).toBe(true);
    expect(fill.polygonOffsetFactor).toBeGreaterThan(0);
    expect(line.fog).toBe(true);
    expect(line.linewidth).toBe(1.5);
  });

  it("computes edges once per shared geometry", () => {
    const { root, crate, twin } = scene();
    applyCleanEdges(root, opts);
    expect(edgesOf(crate).geometry).toBe(edgesOf(twin).geometry);
  });

  it("is idempotent", () => {
    const { root, crate } = scene();
    applyCleanEdges(root, opts);
    applyCleanEdges(root, opts);
    expect(crate.children.filter((c) => c.userData.cleanEdges)).toHaveLength(1);
  });

  it("never offers the lines as raycast targets, so clicks hit the object", () => {
    const { root, crate } = scene();
    applyCleanEdges(root, opts);
    root.updateMatrixWorld(true); // Raycaster doesn't; the renderer normally does
    const hits = new Raycaster(new Vector3(2, 0, 5), new Vector3(0, 0, -1)).intersectObject(root, true);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => !h.object.userData.cleanEdges)).toBe(true);
    expect(hits[0].object).toBe(crate);
  });
});

describe("setLineResolution", () => {
  it("updates the shared line material after a resize or rotation", () => {
    const { root } = scene();
    const handle = applyCleanEdges(root, opts);
    setLineResolution(handle, 390, 844);
    expect(handle.line.resolution.toArray()).toEqual([390, 844]);
  });
});

describe("per-object edge threshold", () => {
  const segments = (mesh: Mesh) => edgesOf(mesh).geometry.attributes.instanceStart.count;
  const dome = () => {
    const mesh = new Mesh(new IcosahedronGeometry(1, 1));
    mesh.name = "dome";
    return mesh;
  };
  const baseline = () => {
    const mesh = dome();
    applyCleanEdges(new Group().add(mesh), opts);
    return segments(mesh);
  };

  it("draws more edges when the mesh asks for a lower threshold", () => {
    const mesh = dome();
    mesh.userData.edge_threshold_deg = 1;
    applyCleanEdges(new Group().add(mesh), opts);
    expect(segments(mesh)).toBeGreaterThan(baseline());
  });

  it("inherits from an ancestor", () => {
    const mesh = dome();
    const root = new Group().add(new Group().add(mesh));
    root.userData.edge_threshold_deg = 1;
    applyCleanEdges(root, opts);
    expect(segments(mesh)).toBeGreaterThan(baseline());
  });

  it("nearest ancestor wins", () => {
    const mesh = dome();
    const inner = new Group().add(mesh);
    inner.userData.edge_threshold_deg = 170;
    const root = new Group().add(inner);
    root.userData.edge_threshold_deg = 1;
    applyCleanEdges(root, opts);
    expect(segments(mesh)).toBeLessThan(baseline());
  });

  it.each([0, -5, 200, "abc", Number.NaN])("falls back to the default for %s", (bad) => {
    const mesh = dome();
    mesh.userData.edge_threshold_deg = bad;
    applyCleanEdges(new Group().add(mesh), opts);
    expect(segments(mesh)).toBe(baseline());
  });
});
