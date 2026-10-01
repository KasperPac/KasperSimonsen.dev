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
