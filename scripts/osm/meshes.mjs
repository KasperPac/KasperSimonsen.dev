import { Document } from "@gltf-transform/core";
import { buildingHeight, makeProjector } from "./geo.mjs";
import { cleanRing, closestPointOnSegment, extrudeFootprint, ribbon, stripWidth } from "./geometry.mjs";

export const COMMONS_WAY_IDS = [946747659, 946747654, 1290625051]; // 10–12, 14–18 and 20 Gwynne St
export const AAMI_PARK_WAY_ID = 60116158; // tagged leisure=stadium + height, no building tag
export const COMMONS_GREYBOX_HEIGHT = 14; // OSM has no height for The Commons; phase 2 models it from photos
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
    osm_roads: bucket(),
    osm_rail: bucket(),
  };
  const skipped = [];
  let nylex = null;

  for (const el of elements) {
    const tags = el.tags ?? {};
    if (el.type === "node") {
      if (tags.name === LANDMARK_NODE) nylex = project(el.lat, el.lon);
      continue;
    }
    if (el.type !== "way" || !Array.isArray(el.geometry)) continue;
    const points = el.geometry.filter(Boolean).map((p) => project(p.lat, p.lon));

    if (tags.building || el.id === AAMI_PARK_WAY_ID) {
      const ring = cleanRing(points);
      if (!ring) {
        skipped.push(el.id);
        continue;
      }
      const isCommons = COMMONS_WAY_IDS.includes(el.id);
      const target = isCommons ? buckets.osm_commons : el.id === AAMI_PARK_WAY_ID ? buckets.osm_aami_park : buckets.osm_buildings;
      target.add(extrudeFootprint(ring, isCommons ? COMMONS_GREYBOX_HEIGHT : buildingHeight(tags)));
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
  return { origin, meshes, skipped, frontage: commonsFrontage(elements, project), nylex };
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
