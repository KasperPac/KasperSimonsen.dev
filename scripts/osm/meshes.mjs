import { Document } from "@gltf-transform/core";
import { buildingHeight, makeProjector } from "./geo.mjs";
import {
  cleanRing,
  closestPointOnSegment,
  extrudeFootprint,
  pointInRing,
  ribbon,
  ringCentroid,
  ringsWithin,
  stripWidth,
} from "./geometry.mjs";

export const COMMONS_WAY_IDS = [946747659, 946747654, 1290625051]; // 10–12, 14–18 and 20 Gwynne St
export const AAMI_PARK_WAY_ID = 60116158; // tagged leisure=stadium + height, no building tag
export const MCG_WAY_ID = 210337258; // tagged leisure=stadium, no building or height tag
export const COMMONS_GREYBOX_HEIGHT = 14; // OSM has no height for The Commons; phase 2 models it from photos
export const MCG_HEIGHT = 40; // OSM has no height for the MCG outline; its grandstands carry their own
export const LANDMARK_PULL = 0.5; // landmarks sit at half their real distance, on the same bearing
const LANDMARK_MARGIN = 5; // metres of clear ground kept around a moved landmark
const LANDMARKS = [
  { id: AAMI_PARK_WAY_ID, name: "aami_park", bucket: "osm_aami_park" },
  { id: MCG_WAY_ID, name: "mcg", bucket: "osm_mcg", height: MCG_HEIGHT },
];
const STREET_NAME = "Gwynne Street";
const LANDMARK_NODE = "Nylex Clock";

/** Mean lat/lon of The Commons' footprint corners (closing points excluded). */
export function commonsOrigin(elements) {
  const corners = [];
  for (const el of elements) {
    if (el.type !== "way" || !COMMONS_WAY_IDS.includes(el.id)) continue;
    const g = el.geometry;
    const closed = g.length > 1 && g[0].lat === g[g.length - 1].lat && g[0].lon === g[g.length - 1].lon;
    corners.push(...(closed ? g.slice(0, -1) : g));
  }
  if (!corners.length) throw new Error(`The Commons footprints (OSM ways ${COMMONS_WAY_IDS.join(", ")}) are missing from the extract`);
  return {
    lat: corners.reduce((s, p) => s + p.lat, 0) / corners.length,
    lon: corners.reduce((s, p) => s + p.lon, 0) / corners.length,
  };
}

function bucket() {
  const positions = [];
  const indices = [];
  return {
    positions,
    indices,
    add(part) {
      const base = positions.length / 3;
      for (const v of part.positions) positions.push(v);
      for (const i of part.indices) indices.push(base + i);
    },
  };
}

function nearestOnLines(p, lines) {
  let best = null;
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const q = closestPointOnSegment(p, line[i], line[i + 1]);
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (!best || d < best.distance) best = { point: q, distance: d };
    }
  }
  return best;
}

/** Where The Commons meets Gwynne Street: the facade normal (towards the street) and a door point on it. */
export function commonsFrontage(elements, project) {
  const street = elements
    .filter((e) => e.type === "way" && e.tags?.highway && e.tags?.name === STREET_NAME)
    .map((e) => e.geometry.map((p) => project(p.lat, p.lon)));
  if (!street.length) throw new Error(`${STREET_NAME} is missing from the extract`);
  const nearest = nearestOnLines([0, 0], street);
  const normal = [nearest.point[0] / nearest.distance, nearest.point[1] / nearest.distance];
  const rings = elements
    .filter((e) => e.type === "way" && COMMONS_WAY_IDS.includes(e.id))
    .map((e) => cleanRing(e.geometry.map((p) => project(p.lat, p.lon))))
    .filter(Boolean)
    .map((ring) => [...ring, ring[0]]);
  const door = nearestOnLines(nearest.point, rings).point;
  return { streetPoint: nearest.point, door, normal };
}

/** OSM `out geom` elements → named mesh buckets in local metres around The Commons. */
export function osmToMeshes(elements) {
  const origin = commonsOrigin(elements);
  const project = makeProjector(origin);
  const buckets = {
    osm_buildings: bucket(),
    osm_commons: bucket(),
    osm_aami_park: bucket(),
    osm_mcg: bucket(),
    osm_roads: bucket(),
    osm_rail: bucket(),
  };
  const skipped = [];
  const displaced = [];
  const merged = [];
  const landmarks = {};
  const placed = [];
  let nylex = null;

  // Landmarks first, so the main pass can carry their own buildings along and clear the ground they land on.
  for (const { id, name, bucket: target, height: fixedHeight } of LANDMARKS) {
    const el = elements.find((e) => e.type === "way" && e.id === id && Array.isArray(e.geometry));
    if (!el) continue;
    const ring = cleanRing(el.geometry.filter(Boolean).map((p) => project(p.lat, p.lon)));
    if (!ring) {
      skipped.push(id);
      continue;
    }
    const real = ringCentroid(ring);
    const offset = [-real[0] * LANDMARK_PULL, -real[1] * LANDMARK_PULL];
    const moved = ring.map(([x, z]) => [x + offset[0], z + offset[1]]);
    const height = fixedHeight ?? buildingHeight(el.tags);
    buckets[target].add(extrudeFootprint(moved, height));
    landmarks[name] = { centre: [real[0] + offset[0], real[1] + offset[1]], real, height };
    placed.push({ ring, moved, offset, target });
  }
  const landmarkIds = LANDMARKS.map((l) => l.id);

  for (const el of elements) {
    const tags = el.tags ?? {};
    if (el.type === "node") {
      if (tags.name === LANDMARK_NODE) nylex = project(el.lat, el.lon);
      continue;
    }
    if (el.type !== "way" || !Array.isArray(el.geometry) || landmarkIds.includes(el.id)) continue;
    const points = el.geometry.filter(Boolean).map((p) => project(p.lat, p.lon));

    if (tags.building) {
      const ring = cleanRing(points);
      if (!ring) {
        skipped.push(el.id);
        continue;
      }
      if (COMMONS_WAY_IDS.includes(el.id)) {
        buckets.osm_commons.add(extrudeFootprint(ring, COMMONS_GREYBOX_HEIGHT));
        continue;
      }
      const centroid = ringCentroid(ring);
      const home = placed.find((landmark) => pointInRing(centroid, landmark.ring));
      if (home) {
        const [dx, dz] = home.offset;
        buckets[home.target].add(extrudeFootprint(ring.map(([x, z]) => [x + dx, z + dz]), buildingHeight(tags)));
        merged.push(el.id);
      } else if (placed.some((landmark) => ringsWithin(ring, landmark.moved, LANDMARK_MARGIN))) {
        displaced.push(el.id);
      } else {
        buckets.osm_buildings.add(extrudeFootprint(ring, buildingHeight(tags)));
      }
    } else if (tags.highway || tags.railway) {
      const strip = ribbon(points, stripWidth(tags));
      if (!strip) {
        skipped.push(el.id);
        continue;
      }
      (tags.railway ? buckets.osm_rail : buckets.osm_roads).add(strip);
    }
  }

  const meshes = {};
  for (const [name, b] of Object.entries(buckets)) {
    if (b.indices.length) meshes[name] = { positions: b.positions, indices: b.indices };
  }
  return { origin, meshes, skipped, displaced, merged, landmarks, frontage: commonsFrontage(elements, project), nylex };
}

/** Mesh buckets → a glTF Document with one node + mesh per bucket, named after it. No normals, no materials. */
export function meshesToDocument(meshes) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene("osm");
  for (const [name, { positions, indices }] of Object.entries(meshes)) {
    const primitive = doc
      .createPrimitive()
      .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(positions)).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(indices)).setBuffer(buffer));
    scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(primitive)));
  }
  return doc;
}
