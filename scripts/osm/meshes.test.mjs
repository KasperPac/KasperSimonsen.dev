import { describe, it, expect } from "vitest";
import {
  AAMI_PARK_WAY_ID,
  COMMONS_GREYBOX_HEIGHT,
  COMMONS_WAY_IDS,
  MCG_HEIGHT,
  MCG_WAY_ID,
  meshesToDocument,
  osmToMeshes,
} from "./meshes.mjs";

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
/** Whether a mesh has a vertex at local [x, z] (any height). */
const hasCorner = ({ positions }, [x, z]) =>
  positions.some((_, i) => i % 3 === 0 && Math.abs(positions[i] - x) < 0.01 && Math.abs(positions[i + 2] - z) < 0.01);

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

describe("landmark pull", () => {
  // Origin (The Commons' centroid) is at ll(-10, 5), so local x = east + 10 and z = 5 - north.
  // AAMI Park: real centre x -790, z -370 → moved to -395, -185 (east -505…-305, north 115…265).
  // MCG: real centre x 990, z -995 → moved to 495, -497.5 (east 435…535, north 452.5…552.5).
  const aami = way(AAMI_PARK_WAY_ID, { leisure: "stadium", height: "30 m" }, square(-900, 300, -700, 450));
  const mcg = way(MCG_WAY_ID, { leisure: "stadium", height: "40" }, square(930, 950, 1030, 1050));
  const extract = [
    ...fixture,
    aami,
    mcg,
    way(101, { building: "yes" }, square(-420, 180, -400, 200)), // under moved AAMI Park
    way(102, { building: "yes" }, square(-302, 180, -292, 190)), // 3 m east of it: inside the margin
    way(103, { building: "yes", height: "9" }, square(-295, 180, -285, 190)), // 10 m east of it: kept
    way(104, { building: "yes" }, square(480, 490, 490, 500)), // under moved MCG
    way(105, { building: "yes", height: "11" }, square(-850, 350, -840, 360)), // under AAMI Park's real site: moves with it
  ];
  const result = osmToMeshes(extract);
  const bounds = ({ positions }) => {
    const xs = positions.filter((_, i) => i % 3 === 0);
    const ys = positions.filter((_, i) => i % 3 === 1);
    const zs = positions.filter((_, i) => i % 3 === 2);
    return {
      centre: [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2],
      size: [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), Math.max(...zs) - Math.min(...zs)],
    };
  };

  it("buckets the MCG by id whatever its tags say", () => {
    expect(Object.keys(result.meshes)).toContain("osm_mcg");
    expect(maxY(result.meshes.osm_mcg)).toBeCloseTo(40);
  });

  it.each([
    ["aami_park", "osm_aami_park", [-790, -370]],
    ["mcg", "osm_mcg", [990, -995]],
  ])("moves %s to half its real distance on the same bearing", (name, bucketName, real) => {
    const landmark = result.landmarks[name];
    landmark.real.forEach((v, i) => expect(v).toBeCloseTo(real[i], 1));
    landmark.centre.forEach((v, i) => expect(v).toBeCloseTo(landmark.real[i] / 2, 2));
    bounds(result.meshes[bucketName]).centre.forEach((v, i) => expect(v).toBeCloseTo(landmark.centre[i], 2));
  });

  it("keeps each landmark's own dimensions", () => {
    [200, 30, 150].forEach((v, i) => expect(bounds(result.meshes.osm_aami_park).size[i]).toBeCloseTo(v, 2));
    [100, 40, 100].forEach((v, i) => expect(bounds(result.meshes.osm_mcg).size[i]).toBeCloseTo(v, 2));
    expect(result.landmarks.aami_park.height).toBe(30);
    expect(result.landmarks.mcg.height).toBe(40);
  });

  it("drops buildings under or within 5 m of a moved landmark and lists them as displaced", () => {
    expect(result.displaced.sort()).toEqual([101, 102, 104]);
    expect(hasCorner(result.meshes.osm_buildings, [-410, -175])).toBe(false);
  });

  it("keeps buildings elsewhere", () => {
    expect(hasCorner(result.meshes.osm_buildings, [-285, -175])).toBe(true);
  });

  it("leaves The Commons and the Nylex Clock where they are", () => {
    expect(result.origin).toEqual(osmToMeshes(fixture).origin);
    expect(result.nylex).toEqual(osmToMeshes(fixture).nylex);
    expect(result.meshes.osm_commons).toEqual(osmToMeshes(fixture).meshes.osm_commons);
  });
});

describe("buildings inside a landmark", () => {
  // Same sites as above. The MCG moves by [-495, 497.5], AAMI Park by [395, 185].
  const extract = [
    ...fixture,
    way(MCG_WAY_ID, { leisure: "stadium" }, square(930, 950, 1030, 1050)),
    way(201, { building: "grandstand", name: "Ponsford Stand", height: "50" }, square(1000, 960, 1025, 1040)),
    way(202, { building: "yes", height: "12" }, square(1025, 1000, 1045, 1010)), // straddles the MCG's edge, centroid outside
    way(AAMI_PARK_WAY_ID, { leisure: "stadium", height: "30 m" }, square(-900, 300, -700, 450)),
    way(203, { building: "yes", height: "11" }, square(-850, 350, -840, 360)),
  ];
  const result = osmToMeshes(extract);

  it("gives the MCG outline its fixed height, since OSM has none", () => {
    expect(MCG_HEIGHT).toBe(40);
    expect(result.landmarks.mcg.height).toBe(MCG_HEIGHT);
  });

  it("moves them with the landmark at their own heights and lists them as merged", () => {
    expect(result.merged.sort()).toEqual([201, 203]);
    expect(maxY(result.meshes.osm_mcg)).toBeCloseTo(50);
    expect(hasCorner(result.meshes.osm_mcg, [515, -457.5])).toBe(true);
    expect(hasCorner(result.meshes.osm_aami_park, [-445, -160])).toBe(true);
    expect(hasCorner(result.meshes.osm_buildings, [1010, -955])).toBe(false);
    expect(hasCorner(result.meshes.osm_buildings, [-840, -345])).toBe(false);
    expect(result.displaced).toEqual([]);
  });

  it("leaves a building whose centroid is outside the landmark where it is", () => {
    expect(result.merged).not.toContain(202);
    expect(hasCorner(result.meshes.osm_buildings, [1055, -1005])).toBe(true);
  });

  it("doesn't move the landmark's own centre", () => {
    [495, -497.5].forEach((v, i) => expect(result.landmarks.mcg.centre[i]).toBeCloseTo(v, 2));
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
