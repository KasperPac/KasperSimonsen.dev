import { describe, it, expect } from "vitest";
import { BoxGeometry, Color, DoubleSide, Group, IcosahedronGeometry, Mesh, Object3D, Raycaster, Vector3 } from "three";
import type { LineMaterial } from "three/addons/lines/LineMaterial.js";
import type { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { applyCleanEdges, fadeOpacity, setHighlight, setLineResolution, updateEdgeFades } from "./cleanEdges";

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

  it("returns the live handle when applied again (a remount must still control the lines)", () => {
    const { root, crate } = scene();
    const first = applyCleanEdges(root, opts);
    const second = applyCleanEdges(root, opts);
    expect(second).toBe(first);
    expect(edgesOf(crate).material).toBe(second.line);
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

describe("fadeOpacity", () => {
  it("is 1 at and inside near, min at and beyond far", () => {
    expect(fadeOpacity(10, 50, 250, 0.15)).toBe(1);
    expect(fadeOpacity(50, 50, 250, 0.15)).toBe(1);
    expect(fadeOpacity(250, 50, 250, 0.15)).toBeCloseTo(0.15);
    expect(fadeOpacity(9999, 50, 250, 0.15)).toBeCloseTo(0.15);
  });

  it("falls monotonically in between", () => {
    const v = [60, 100, 150, 200, 240].map((d) => fadeOpacity(d, 50, 250, 0.15));
    for (let i = 1; i < v.length; i++) expect(v[i]).toBeLessThan(v[i - 1]);
    expect(fadeOpacity(150, 50, 250, 0.15)).toBeCloseTo(0.575); // smoothstep midpoint
  });

  it.each([
    [Number.NaN, 50, 250, 0.15],
    [100, Number.NaN, 250, 0.15],
    [100, 50, Number.POSITIVE_INFINITY, 0.15],
    [100, 250, 50, 0.15],
    [100, 50, 50, 0.15],
    [100, 50, 250, Number.NaN],
  ])("does not fade for invalid input %s %s %s %s", (d, n, f, m) => expect(fadeOpacity(d, n, f, m)).toBe(1));
});

describe("distance fade groups", () => {
  const withFade = (mesh: Mesh, fade: Record<string, unknown>) => Object.assign(mesh.userData, fade);

  it("gives fade meshes their own material and leaves the shared one alone", () => {
    const { root, crate, twin } = scene();
    withFade(crate, { edge_fade_near: 50, edge_fade_far: 250 });
    const handle = applyCleanEdges(root, opts);
    const faded = edgesOf(crate).material;
    expect(faded).not.toBe(handle.line);
    expect(faded.transparent).toBe(true);
    expect(faded.linewidth).toBe(1.5);
    expect(faded.depthWrite).toBe(handle.line.depthWrite);
    expect(handle.line.transparent).toBe(false);
    expect(edgesOf(twin).material).toBe(handle.line);
    expect(handle.fades).toHaveLength(1);
    expect(handle.fades[0]).toMatchObject({ material: faded, near: 50, far: 250, min: 0.15 });
    expect(handle.fades[0].objects).toEqual([crate]);
  });

  it("shares one material per distinct fade setting", () => {
    const { root, crate, twin } = scene();
    withFade(crate, { edge_fade_near: 50, edge_fade_far: 250 });
    withFade(twin, { edge_fade_near: 50, edge_fade_far: 250 });
    const handle = applyCleanEdges(root, opts);
    expect(handle.fades).toHaveLength(1);
    expect(handle.fades[0].objects).toHaveLength(2);
  });

  it("nearest ancestor's fade wins, and invalid fade is ignored", () => {
    const { root, crate } = scene();
    root.userData.edge_fade_near = 10;
    root.userData.edge_fade_far = 20;
    const inner = new Group();
    inner.userData = { edge_fade_near: 50, edge_fade_far: 250, edge_fade_min: 0.4 };
    root.add(inner);
    inner.add(crate);
    const bad = new Mesh(new BoxGeometry());
    bad.name = "bad";
    bad.userData = { edge_fade_near: 300, edge_fade_far: 100 };
    const plain = new Group();
    plain.add(bad);
    const handle = applyCleanEdges(new Group().add(root, plain), opts);
    expect(handle.fades.find((g) => g.objects.includes(crate))).toMatchObject({ near: 50, far: 250, min: 0.4 });
    expect(handle.fades.find((g) => g.near === 10)?.objects).toHaveLength(1); // twin keeps the root's
    expect(edgesOf(bad).material).toBe(handle.line);
  });

  it("falls back to the default minimum when edge_fade_min is out of range", () => {
    const { root, crate } = scene();
    withFade(crate, { edge_fade_near: 50, edge_fade_far: 250, edge_fade_min: 3 });
    expect(applyCleanEdges(root, opts).fades[0].min).toBe(0.15);
  });

  it("sets opacity from the camera's distance to the group's centre", () => {
    const { root, crate } = scene(); // crate sits at x = 2
    withFade(crate, { edge_fade_near: 50, edge_fade_far: 250 });
    const handle = applyCleanEdges(root, opts);
    const m = handle.fades[0].material;
    updateEdgeFades(handle, new Vector3(2, 0, 10));
    expect(m.opacity).toBe(1);
    updateEdgeFades(handle, new Vector3(2, 0, 150));
    expect(m.opacity).toBeCloseTo(0.575, 3);
    updateEdgeFades(handle, new Vector3(2, 0, 1000));
    expect(m.opacity).toBeCloseTo(0.15);
  });

  it("setLineResolution reaches the fade materials", () => {
    const { root, crate } = scene();
    withFade(crate, { edge_fade_near: 50, edge_fade_far: 250 });
    const handle = applyCleanEdges(root, opts);
    setLineResolution(handle, 390, 844);
    expect(handle.fades[0].material.resolution.toArray()).toEqual([390, 844]);
  });

  it("stays idempotent", () => {
    const { root, crate } = scene();
    withFade(crate, { edge_fade_near: 50, edge_fade_far: 250 });
    applyCleanEdges(root, opts);
    applyCleanEdges(root, opts);
    expect(crate.children.filter((c) => c.userData.cleanEdges)).toHaveLength(1);
  });
});

describe("highlight groups", () => {
  const build = () => {
    const root = new Group();
    const named = (name: string, child?: Mesh) => {
      const g = new Group();
      g.name = name;
      if (child) g.add(child);
      root.add(g);
      return g;
    };
    const drawer = new Mesh(new BoxGeometry());
    const record = new Mesh(new BoxGeometry());
    const plain = new Mesh(new BoxGeometry());
    named("hs_drawer", drawer);
    named("hs_crate").add(Object.assign(new Group(), { name: "hs_crate__record_00" }).add(record));
    root.add(plain);
    const key = (o: Object3D) => {
      for (let n: Object3D | null = o; n; n = n.parent) if (n.name.startsWith("hs_")) return n.name;
      return null;
    };
    const handle = applyCleanEdges(root, { ...opts, highlightKey: key });
    const lineOf = (m: Mesh) => (m.children.find((c) => c.userData.cleanEdges) as LineSegments2).material as LineMaterial;
    return { handle, drawer, record, plain, lineOf };
  };

  it("gives each highlight key its own line material and leaves the rest shared", () => {
    const { handle, drawer, record, plain, lineOf } = build();
    expect(lineOf(plain)).toBe(handle.line);
    expect(lineOf(drawer)).not.toBe(handle.line);
    expect(lineOf(record)).not.toBe(lineOf(drawer));
    expect([...handle.highlights.keys()].sort()).toEqual(["hs_crate__record_00", "hs_drawer"]);
  });

  it("colours a hotspot and its items, then resets", () => {
    const { handle, drawer, record, lineOf } = build();
    setHighlight(handle, "hs_crate", "#ff0000");
    expect(lineOf(record).color.getHexString()).toBe("ff0000");
    expect(lineOf(drawer).color.getHexString()).toBe(new Color(opts.line).getHexString());
    setHighlight(handle, null, "#ff0000");
    expect(lineOf(record).color.getHexString()).toBe(new Color(opts.line).getHexString());
  });

  it("colours one item without its siblings", () => {
    const { handle, record, lineOf } = build();
    setHighlight(handle, "hs_crate__record_00", "#00ff00");
    expect(lineOf(record).color.getHexString()).toBe("00ff00");
  });

  it("does not match a prefix that is only the start of another name", () => {
    const { handle, drawer, lineOf } = build();
    setHighlight(handle, "hs_draw", "#00ff00");
    expect(lineOf(drawer).color.getHexString()).toBe(new Color(opts.line).getHexString());
  });

  it("keeps highlight lines the right width on resize", () => {
    const { handle, drawer, lineOf } = build();
    setLineResolution(handle, 800, 600);
    expect(lineOf(drawer).resolution.toArray()).toEqual([800, 600]);
  });

  it("works without a highlightKey", () => {
    const root = new Group();
    root.add(new Mesh(new BoxGeometry()));
    expect(applyCleanEdges(root, opts).highlights.size).toBe(0);
  });
});
