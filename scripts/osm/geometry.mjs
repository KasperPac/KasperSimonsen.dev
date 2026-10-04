import { ShapeUtils, Vector2 } from "three";
import { parseMetres } from "./geo.mjs";

const EPS = 1e-6;
const COLLINEAR_SINE = 0.01; // bends under ~0.6° are noise in OSM ways, not corners

const ROAD_WIDTHS = {
  motorway: 20, trunk: 16, primary: 14, secondary: 12, tertiary: 10,
  residential: 8, unclassified: 8, living_street: 6, service: 4, pedestrian: 4,
};
const RAIL_WIDTHS = { rail: 3, tram: 2.5 };

const same = (a, b) => Math.abs(a[0] - b[0]) <= EPS && Math.abs(a[1] - b[1]) <= EPS;

function dedupe(points) {
  const out = [];
  for (const p of points) if (!out.length || !same(out[out.length - 1], p)) out.push(p);
  return out;
}

/** Signed shoelace area of a closed ring (no repeated closing point). */
export function ringArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, z1] = ring[i];
    const [x2, z2] = ring[(i + 1) % ring.length];
    sum += x1 * z2 - x2 * z1;
  }
  return sum / 2;
}

function dropCollinear(ring) {
  let points = ring;
  let changed = true;
  while (changed && points.length > 3) {
    changed = false;
    for (let i = 0; i < points.length; i++) {
      const a = points[(i - 1 + points.length) % points.length];
      const b = points[i];
      const c = points[(i + 1) % points.length];
      const ux = b[0] - a[0], uz = b[1] - a[1], vx = c[0] - b[0], vz = c[1] - b[1];
      const lengths = Math.hypot(ux, uz) * Math.hypot(vx, vz);
      if (lengths === 0 || Math.abs(ux * vz - uz * vx) / lengths < COLLINEAR_SINE) {
        points = points.filter((_, j) => j !== i);
        changed = true;
        break;
      }
    }
  }
  return points;
}

/** Normalise an OSM ring: no repeated, closing or collinear points. Null if degenerate. */
export function cleanRing(points) {
  let ring = dedupe(points);
  if (ring.length > 1 && same(ring[0], ring[ring.length - 1])) ring = ring.slice(0, -1);
  if (ring.length < 3) return null;
  ring = dropCollinear(ring);
  if (ring.length < 3 || Math.abs(ringArea(ring)) < 1) return null;
  return ring;
}

/**
 * Walls and a flat roof for a footprint in the x/z plane, y up. No floor: it's never seen, and leaving
 * it off makes the footprint outline an open edge, which the edge renderer always draws.
 * Roof triangles follow the ring's winding so every roof/wall edge pairs up exactly once.
 */
export function extrudeFootprint(ring, height) {
  const n = ring.length;
  const positions = [];
  for (const [x, z] of ring) positions.push(x, 0, z);
  for (const [x, z] of ring) positions.push(x, height, z);

  const indices = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    indices.push(i, j, n + j, i, n + j, n + i);
  }

  const winding = Math.sign(ringArea(ring));
  const roof = ShapeUtils.triangulateShape(ring.map(([x, z]) => new Vector2(x, z)), []);
  for (const triangle of roof) {
    let [a, b, c] = triangle;
    if (Math.sign(ringArea([ring[a], ring[b], ring[c]])) !== winding) [b, c] = [c, b];
    indices.push(n + a, n + b, n + c);
  }
  return { positions, indices };
}

/** Flat strip of `width` centred on a polyline (x/z), at height y. Null if under two distinct points. */
export function ribbon(polyline, width, y = 0) {
  const pts = dedupe(polyline);
  if (pts.length < 2) return null;
  const half = width / 2;
  const positions = [];
  const indices = [];

  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    let dx = next[0] - prev[0];
    let dz = next[1] - prev[1];
    let len = Math.hypot(dx, dz);
    if (len < EPS) {
      // hairpin: the central difference cancels out, fall back to the incoming segment
      dx = pts[i][0] - prev[0];
      dz = pts[i][1] - prev[1];
      len = Math.hypot(dx, dz);
    }
    dx /= len;
    dz /= len;
    const nx = -dz;
    const nz = dx;

    let scale = 1;
    if (i > 0 && i < pts.length - 1) {
      const sx = pts[i][0] - prev[0];
      const sz = pts[i][1] - prev[1];
      const sl = Math.hypot(sx, sz);
      const cos = (-sz / sl) * nx + (sx / sl) * nz;
      scale = Math.min(2, 1 / Math.max(cos, 0.5));
    }

    const [x, z] = pts[i];
    positions.push(x + nx * half * scale, y, z + nz * half * scale, x - nx * half * scale, y, z - nz * half * scale);
    if (i > 0) {
      const a = (i - 1) * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  return { positions, indices };
}

/** Strip width in metres: the OSM width tag, else a typical width for the road or rail class. */
export function stripWidth(tags) {
  const tagged = parseMetres(tags.width);
  if (tagged !== null) return tagged;
  if (tags.railway) return RAIL_WIDTHS[tags.railway] ?? 3;
  return ROAD_WIDTHS[tags.highway] ?? 6;
}

export function closestPointOnSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / len2));
  return [a[0] + t * dx, a[1] + t * dz];
}

/** Area centroid of a ring from `cleanRing` (so never zero area). */
export function ringCentroid(ring) {
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, z1] = ring[i];
    const [x2, z2] = ring[(i + 1) % ring.length];
    const cross = x1 * z2 - x2 * z1;
    cx += (x1 + x2) * cross;
    cz += (z1 + z2) * cross;
  }
  const area6 = 6 * ringArea(ring);
  return [cx / area6, cz / area6];
}

function bounds(ring) {
  const xs = ring.map((p) => p[0]);
  const zs = ring.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
}

export function pointInRing([x, z], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

const cross = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
const distance = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

function segmentGap(a, b, c, d) {
  if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return 0;
  return Math.min(
    distance(a, closestPointOnSegment(a, c, d)),
    distance(b, closestPointOnSegment(b, c, d)),
    distance(c, closestPointOnSegment(c, a, b)),
    distance(d, closestPointOnSegment(d, a, b)),
  );
}

/** The ring moved `distance` inward along every edge's normal, with mitred corners. Either winding. */
export function insetRing(ring, distance) {
  const n = ring.length;
  const inward = Math.sign(ringArea(ring));
  const normals = ring.map((p, i) => {
    const q = ring[(i + 1) % n];
    const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
    return [(-(q[1] - p[1]) / length) * inward, ((q[0] - p[0]) / length) * inward];
  });
  return ring.map(([x, z], i) => {
    const a = normals[(i - 1 + n) % n];
    const b = normals[i];
    const scale = distance / Math.max(1 + a[0] * b[0] + a[1] * b[1], 0.25); // mitre, capped at sharp corners
    return [x + (a[0] + b[0]) * scale, z + (a[1] + b[1]) * scale];
  });
}

/** Where along a→b (0 < t < 1) it crosses the segment c→d, or null. */
function crossingAlong(a, b, c, d) {
  const rx = b[0] - a[0];
  const rz = b[1] - a[1];
  const sx = d[0] - c[0];
  const sz = d[1] - c[1];
  const denom = rx * sz - rz * sx;
  if (denom === 0) return null;
  const qx = c[0] - a[0];
  const qz = c[1] - a[1];
  const t = (qx * sz - qz * sx) / denom;
  const u = (qx * rz - qz * rx) / denom;
  return t > 0 && t < 1 && u >= 0 && u <= 1 ? t : null;
}

/**
 * The parts of a polyline outside a ring, cut exactly on its boundary, and every crossing of that boundary:
 * the point, and the unit direction along the line that leads into the ring.
 */
export function clipLineOutside(line, ring) {
  const pieces = [];
  const crossings = [];
  let current = null;
  let wasInside = null;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    const length = distance(a, b);
    if (length === 0) continue;
    const along = [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
    const at = (t) => (t === 0 ? a : t === 1 ? b : [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    const cuts = [0, 1];
    for (let j = 0; j < ring.length; j++) {
      const t = crossingAlong(a, b, ring[j], ring[(j + 1) % ring.length]);
      if (t !== null) cuts.push(t);
    }
    cuts.sort((p, q) => p - q);
    for (let k = 0; k < cuts.length - 1; k++) {
      if (cuts[k + 1] - cuts[k] < 1e-9) continue;
      const start = at(cuts[k]);
      const inside = pointInRing(at((cuts[k] + cuts[k + 1]) / 2), ring);
      if (wasInside !== null && inside !== wasInside) {
        crossings.push({ point: start, direction: inside ? along : [-along[0], -along[1]] });
      }
      if (inside) {
        if (current) pieces.push(current);
        current = null;
      } else {
        current ??= [start];
        current.push(at(cuts[k + 1]));
      }
      wasInside = inside;
    }
  }
  if (current) pieces.push(current);
  return { pieces, crossings };
}

/** True when two rings overlap, one contains the other, or they come within `margin` metres. */
export function ringsWithin(a, b, margin) {
  const [ax0, az0, ax1, az1] = bounds(a);
  const [bx0, bz0, bx1, bz1] = bounds(b);
  if (ax0 > bx1 + margin || bx0 > ax1 + margin || az0 > bz1 + margin || bz0 > az1 + margin) return false;
  // a ring nested well inside the other has no edge near it, so containment is checked by one vertex
  if (pointInRing(a[0], b) || pointInRing(b[0], a)) return true;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (segmentGap(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length]) <= margin) return true;
    }
  }
  return false;
}
