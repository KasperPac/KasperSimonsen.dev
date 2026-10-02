import { Document } from "@gltf-transform/core";
import { buildingHeight, makeProjector } from "./geo.mjs";
import {
  cleanRing,
  clipLineOutside,
  closestPointOnSegment,
  extrudeFootprint,
  insetRing,
  pointInRing,
  ribbon,
  ringCentroid,
  ringsWithin,
  stripWidth,
} from "./geometry.mjs";

export const COMMONS_WAY_IDS = [946747659, 946747654, 1290625051]; // 10–12, 14–18 and 20 Gwynne St
export const AAMI_PARK_WAY_ID = 60116158; // tagged leisure=stadium + height, no building tag
export const MCG_WAY_ID = 210337258; // tagged leisure=stadium, no building or height tag
export const NYLEX_SILOS_WAY_ID = 325324976; // Richmond Maltings silos under the Nylex Clock, building=silo, 36 m
export const COMMONS_GREYBOX_HEIGHT = 14; // OSM has no height for The Commons; phase 2 models it from photos
export const MCG_HEIGHT = 40; // OSM has no height for the MCG outline; its grandstands carry their own
export const LANDMARK_PULL = 0.5; // landmarks sit at half their real distance, on the same bearing
const LANDMARK_MARGIN = 5; // metres of clear ground kept around a moved landmark
const TUNNEL_INSET = 1; // metres inside a moved landmark's wall where the rails under it are cut, so the wall hides the cut
const PORTAL_GROUPING = 15; // metres: tracks crossing a wall this close together share one tunnel portal
const PORTAL_MARGIN = 2; // metres added to the span of the tracks through a portal
export const SIGHTLINE_HEIGHT = 4; // buildings opposite The Commons drop to one storey so the descent sees the door
export const SIGHTLINE_DEPTH = 60; // metres out from the facade that the cap reaches
const SIGHTLINE_MARGIN = 20; // metres either side of The Commons' frontage
const LANDMARKS = [
  { id: AAMI_PARK_WAY_ID, name: "aami_park", bucket: "osm_aami_park" },
  { id: MCG_WAY_ID, name: "mcg", bucket: "osm_mcg", height: MCG_HEIGHT },
];
// Landmarks that stay where they really are: their own bucket, but no pull, merged stands, clearing or tunnels.
const FIXED_LANDMARKS = [{ id: NYLEX_SILOS_WAY_ID, name: "nylex_silos", bucket: "osm_nylex_silos" }];
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

/**
 * Where The Commons meets Gwynne Street: the facade normal (towards the street), a door point on it, and
 * `span`, The Commons' extent along the facade (measured along [-normal.z, normal.x] from the origin).
 */
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
  const lateral = rings.flat().map(([x, z]) => z * normal[0] - x * normal[1]);
  return { streetPoint: nearest.point, door, normal, span: [Math.min(...lateral), Math.max(...lateral)] };
}

/** Whether a footprint centroid stands across the street from The Commons, where it would hide the door. */
function blocksSightline([x, z], { door, normal, span }) {
  const along = (x - door[0]) * normal[0] + (z - door[1]) * normal[1];
  const lateral = z * normal[0] - x * normal[1];
  return (
    along > 0 && along <= SIGHTLINE_DEPTH && lateral >= span[0] - SIGHTLINE_MARGIN && lateral <= span[1] + SIGHTLINE_MARGIN
  );
}

const translate = (ring, [dx, dz]) => ring.map(([x, z]) => [x + dx, z + dz]);

/**
 * Rail crossings into one landmark → tunnel portals. Crossings within PORTAL_GROUPING of each other that go in
 * the same way share a portal; its width spans the outer edges of all its tracks plus PORTAL_MARGIN.
 */
function portalsFrom(crossings) {
  const groups = [];
  for (const c of crossings) {
    const joins = groups.filter((group) =>
      group.some(
        (o) =>
          Math.hypot(o.point[0] - c.point[0], o.point[1] - c.point[1]) <= PORTAL_GROUPING &&
          o.direction[0] * c.direction[0] + o.direction[1] * c.direction[1] > 0,
      ),
    );
    for (const group of joins) groups.splice(groups.indexOf(group), 1);
    groups.push([c, ...joins.flat()]);
  }
  return groups.map((group) => {
    const sum = group.reduce((s, c) => [s[0] + c.direction[0], s[1] + c.direction[1]], [0, 0]);
    const length = Math.hypot(sum[0], sum[1]);
    const direction = [sum[0] / length, sum[1] / length];
    const across = [-direction[1], direction[0]];
    const lateral = group.map((c) => c.point[0] * across[0] + c.point[1] * across[1]);
    const low = Math.min(...group.map((c, i) => lateral[i] - c.half));
    const high = Math.max(...group.map((c, i) => lateral[i] + c.half));
    const along = group.reduce((s, c) => s + c.point[0] * direction[0] + c.point[1] * direction[1], 0) / group.length;
    const mid = (low + high) / 2;
    return {
      centre: [across[0] * mid + direction[0] * along, across[1] * mid + direction[1] * along],
      direction,
      width: high - low + PORTAL_MARGIN,
    };
  });
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
    osm_nylex_silos: bucket(),
    osm_roads: bucket(),
    osm_rail: bucket(),
  };
  const skipped = [];
  const displaced = [];
  const merged = [];
  const lowered = [];
  const landmarks = {};
  const frontage = commonsFrontage(elements, project);
  const landmarkIds = LANDMARKS.map((l) => l.id);
  let nylex = null;

  const ways = [];
  for (const el of elements) {
    const tags = el.tags ?? {};
    if (el.type === "node") {
      if (tags.name === LANDMARK_NODE) nylex = project(el.lat, el.lon);
    } else if (el.type === "way" && Array.isArray(el.geometry)) {
      ways.push({ id: el.id, tags, points: el.geometry.filter(Boolean).map((p) => project(p.lat, p.lon)) });
    }
  }

  // Landmarks are pulled in first, so the buildings standing inside them can come along and
  // the ground they land on can be cleared.
  const placed = [];
  for (const { id, name, bucket: target, height } of LANDMARKS) {
    const way = ways.find((w) => w.id === id);
    if (!way) continue;
    const ring = cleanRing(way.points);
    if (!ring) {
      skipped.push(id);
      continue;
    }
    const real = ringCentroid(ring);
    const offset = [-real[0] * LANDMARK_PULL, -real[1] * LANDMARK_PULL];
    const moved = translate(ring, offset);
    const extruded = height ?? buildingHeight(way.tags);
    buckets[target].add(extrudeFootprint(moved, extruded));
    landmarks[name] = { centre: [real[0] + offset[0], real[1] + offset[1]], real, height: extruded };
    placed.push({ name, target, ring, offset, moved, cut: insetRing(moved, TUNNEL_INSET), crossings: [] });
  }

  const buildings = [];
  for (const { id, tags, points } of ways) {
    const fixed = FIXED_LANDMARKS.find((landmark) => landmark.id === id);
    if (!(tags.building || fixed) || landmarkIds.includes(id)) continue;
    const ring = cleanRing(points);
    if (!ring) {
      skipped.push(id);
      continue;
    }
    const centroid = ringCentroid(ring);
    const home =
      COMMONS_WAY_IDS.includes(id) || fixed ? undefined : placed.find((landmark) => pointInRing(centroid, landmark.ring));
    buildings.push({ id, tags, ring, centroid, home, fixed });
  }

  for (const { id, tags, ring, centroid, home, fixed } of buildings) {
    if (COMMONS_WAY_IDS.includes(id)) {
      buckets.osm_commons.add(extrudeFootprint(ring, COMMONS_GREYBOX_HEIGHT));
    } else if (fixed) {
      const height = buildingHeight(tags);
      buckets[fixed.bucket].add(extrudeFootprint(ring, height));
      landmarks[fixed.name] = { centre: centroid, height };
    } else if (home) {
      buckets[home.target].add(extrudeFootprint(translate(ring, home.offset), buildingHeight(tags)));
      merged.push(id);
    } else if (placed.some((landmark) => ringsWithin(ring, landmark.moved, LANDMARK_MARGIN))) {
      displaced.push(id);
    } else {
      let height = buildingHeight(tags);
      if (height > SIGHTLINE_HEIGHT && blocksSightline(centroid, frontage)) {
        height = SIGHTLINE_HEIGHT;
        lowered.push(id);
      }
      buckets.osm_buildings.add(extrudeFootprint(ring, height));
    }
  }

  for (const { id, tags, points } of ways) {
    if (tags.building || landmarkIds.includes(id) || !(tags.highway || tags.railway)) continue;
    const width = stripWidth(tags);
    const strip = ribbon(points, width);
    if (!strip) {
      skipped.push(id);
      continue;
    }
    if (!tags.railway) {
      buckets.osm_roads.add(strip);
      continue;
    }
    // Tracks run on under a moved landmark as if through a tunnel: cut them just inside its wall.
    let lines = [points];
    for (const landmark of placed) {
      lines = lines.flatMap((line) => {
        const { pieces, crossings } = clipLineOutside(line, landmark.cut);
        for (const crossing of crossings) landmark.crossings.push({ ...crossing, half: width / 2 });
        return pieces;
      });
    }
    for (const line of lines) {
      const piece = ribbon(line, width);
      if (piece) buckets.osm_rail.add(piece);
    }
  }
  for (const { name, crossings } of placed) landmarks[name].portals = portalsFrom(crossings);

  const meshes = {};
  for (const [name, b] of Object.entries(buckets)) {
    if (b.indices.length) meshes[name] = { positions: b.positions, indices: b.indices };
  }
  return { origin, meshes, skipped, displaced, merged, lowered, landmarks, frontage, nylex };
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
