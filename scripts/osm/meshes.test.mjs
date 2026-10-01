import { describe, it, expect } from "vitest";
import { AAMI_PARK_WAY_ID, COMMONS_GREYBOX_HEIGHT, COMMONS_WAY_IDS, meshesToDocument, osmToMeshes } from "./meshes.mjs";

const LAT0 = -37.8283;
const LON0 = 144.9932;
const M_PER_DEG = (6378137 * Math.PI) / 180;
/** Lat/lon `east` and `north` metres from (LAT0, LON0). */
const ll = (east, north) => ({
  lat: LAT0 + north / M_PER_DEG,
  lon: LON0 + east / (M_PER_DEG * Math.cos((LAT0 * Math.PI) / 180)),
});
const square = (e0, n0, e1, n1) => [ll(e0, n0), ll(e1, n0), ll(e1, n1), ll(e0, n1), ll(e0, n0)];
const way = (id, tags, geometry) => ({ type: "way", id, tags, geometry });

// Three Commons footprints west of a north–south Gwynne Street at 12 m east.
const fixture = [
  way(946747659, { building: "yes" }, square(-20, 10, 0, 20)),
  way(946747654, { building: "yes" }, square(-20, 0, 0, 10)),
  way(1290625051, { building: "yes" }, square(-20, -10, 0, 0)),
  way(1, { building: "yes", height: "20 m" }, square(40, 0, 50, 10)),
  way(2, { building: "yes" }, [ll(60, 0), ll(61, 0)]),
  way(3, { highway: "residential", name: "Gwynne Street" }, [ll(12, -50), ll(12, 50)]),
  way(4, { highway: "service" }, [ll(30, 0)]),
  way(5, { railway: "tram" }, [ll(-50, -40), ll(50, -40)]),
  { type: "node", id: 9, ...ll(-200, -100), tags: { name: "Nylex Clock" } },
];

const maxY = ({ positions }) => Math.max(...positions.filter((_, i) => i % 3 === 1));

describe("osmToMeshes", () => {
  const result = osmToMeshes(fixture);

  it("centres on The Commons", () => {
    expect(result.origin.lat).toBeCloseTo(ll(-10, 5).lat, 7);
    expect(result.origin.lon).toBeCloseTo(ll(-10, 5).lon, 7);
  });

  it("sorts geometry into named buckets and omits empty ones", () => {
    expect(Object.keys(result.meshes).sort()).toEqual(["osm_buildings", "osm_commons", "osm_rail", "osm_roads"]);
  });

  it("extrudes tagged heights, and The Commons at its grey-box height", () => {
    expect(maxY(result.meshes.osm_buildings)).toBeCloseTo(20);
    expect(maxY(result.meshes.osm_commons)).toBeCloseTo(COMMONS_GREYBOX_HEIGHT);
  });

  it("skips degenerate buildings and roads instead of crashing", () => {
    expect(result.skipped.sort()).toEqual([2, 4]);
    for (const mesh of Object.values(result.meshes)) expect(mesh.positions.every(Number.isFinite)).toBe(true);
  });

  it("finds the facade facing Gwynne Street and a door on it", () => {
    expect(result.frontage.normal[0]).toBeCloseTo(1, 3);
    expect(result.frontage.normal[1]).toBeCloseTo(0, 3);
    expect(result.frontage.door[0]).toBeCloseTo(10, 1);
    expect(result.frontage.door[1]).toBeCloseTo(0, 1);
  });

  it("locates the Nylex Clock", () => {
    expect(result.nylex[0]).toBeCloseTo(-190, 1);
    expect(result.nylex[1]).toBeCloseTo(105, 1);
  });

  it("extrudes AAMI Park into its own bucket though OSM tags it a stadium, not a building", () => {
    const aami = way(AAMI_PARK_WAY_ID, { leisure: "stadium", height: "30 m" }, square(-900, 300, -700, 450));
    const { meshes } = osmToMeshes([...fixture, aami]);
    expect(maxY(meshes.osm_aami_park)).toBeCloseTo(30);
    expect(maxY(meshes.osm_buildings)).toBeCloseTo(20);
  });

  it("refuses an extract without The Commons", () => {
    expect(() => osmToMeshes(fixture.filter((e) => !COMMONS_WAY_IDS.includes(e.id)))).toThrow(/Commons/);
  });

  it("refuses an extract without Gwynne Street", () => {
    expect(() => osmToMeshes(fixture.filter((e) => e.id !== 3))).toThrow(/Gwynne Street/);
  });
});

describe("meshesToDocument", () => {
  it("writes one named node and mesh per bucket", () => {
    const { meshes } = osmToMeshes(fixture);
    const doc = meshesToDocument(meshes);
    const nodes = doc.getRoot().listNodes();
    expect(nodes.map((n) => n.getName()).sort()).toEqual(Object.keys(meshes).sort());
    const commons = nodes.find((n) => n.getName() === "osm_commons").getMesh().listPrimitives()[0];
    expect(commons.getAttribute("POSITION").getCount()).toBe(meshes.osm_commons.positions.length / 3);
    expect(commons.getIndices().getCount()).toBe(meshes.osm_commons.indices.length);
  });
});
