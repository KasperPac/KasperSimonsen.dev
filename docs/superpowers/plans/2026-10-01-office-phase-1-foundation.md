# Office redesign, phase 1 (Foundation): implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A scrollable grey-box walk-in on Cremorne's real street footprints. It starts high over Gwynne St, descends to The Commons' door and ends at the standing spot in a grey-box office. It's rendered in the clean-edge style and backed by a tested OSM → Blender → glTF pipeline.

**Architecture:** OpenStreetMap data is fetched once and turned into an extruded street GLB by tested Node scripts. Blender imports it and adds the doorway, a grey-box office, camera poses and the walk-in camera animation (all by versioned Python scripts run through the Blender MCP). The export is optimised into `public/models/*.glb` and validated against `office/manifest.json`. The site renders those GLBs with React Three Fiber in a new `(office)` route group at `/`. Every mesh gets a black fill plus its feature edges, and GSAP ScrollTrigger maps scroll position onto the Blender camera clip.

**Tech Stack:** Next 16.2.4 (App Router, Turbopack), React 19.2.4, three 0.186, @react-three/fiber 9.8, @react-three/drei 10.7, GSAP 3.15 (ScrollTrigger), glTF-Transform 4.5 + meshoptimizer 1.3, Blender 5.2.1 LTS (via Blender MCP), Vitest 5, Playwright 1.63.

**Spec:** `docs/superpowers/specs/2026-10-01-office-redesign-design.md` (phase 1 = section 9, item 1).

## Global Constraints

- Branch `redesign/office`. Never push without asking Kasper. Stage files by explicit path, never `git add -A` (`.agents/` is untracked and must stay that way).
- No monday task code: the KasperSimonsen.dev board isn't reachable and Kasper OK'd working without it (2026-10-01). Commit messages are descriptive and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next code (AGENTS.md). `ssr: false` dynamic imports only work inside Client Components (`02-guides/lazy-loading.md`). Multiple root layouts cause a full page load when navigating between them (`03-file-conventions/route-groups.md`).
- Render style is **B · Clean edges** only: black fill that hides what's behind it, plus feature edges (angle threshold ~20°) as ~1.3 px screen-space lines. Nothing from the old design system (no `#FF5A1F`, no Inter/Fraunces/Instrument Sans/Geist) in new code.
- Coordinates: glTF/three axes **+X east, +Y up, −Z north**, 1 unit = 1 metre, origin = centroid of The Commons footprints (OSM ways 946747659, 946747654, 1290625051 = 10–12, 14–18, 20 Gwynne St). Blender is Z-up: Blender (x, y) = glTF (x, −z).
- Blender naming: `hs_<name>` interactive (children `hs_<name>__<part>`), `cam_<name>` camera poses, `cam_walkin` the walk-in camera, `anim_<name>` hand-authored actions, `prop_<name>` set dressing, `osm_<name>` generated from OpenStreetMap (never hand-edited), `helper_<name>` never exported, `office_root` the office frame.
- Budgets: `street.glb` ≤ 819200 bytes (800 KB), `office.glb` ≤ 2097152 bytes (2 MB), both compressed.
- OSM data is © OpenStreetMap contributors (ODbL 1.0). Keep the attribution in every file derived from it. (The on-screen credit is phase 2.)
- AAMI Park is shape only: no AAMI name, logos or signage modelled.
- Visitor-facing copy that explains Kasper is in his voice (conversational, dry, contractions, no marketing words, no em-dash connectors). Phase 1 has one such string: the 3D fallback message.

## Review Focus

1. **Malformed OSM data**: unclosed or duplicate-point ways, 2-point "buildings", single-point roads, hairpin roads, height tags like `"12 m"`, `"12;15"` or `"abc"`. The importer skips or parses them and never crashes or emits NaN geometry. *Tests: Tasks 1, 2, 3.*
2. **Scrubbing back after reaching the end.** Scrolling back up after the standing spot plays the walk-in in reverse. It must not freeze at the end, which is what a `LoopOnce` `AnimationMixer` does, or jump to the street, which is what `LoopRepeat` does. *Tests: Task 9 (unit), Task 10 (e2e).*
3. **Overshooting either end**: iOS rubber-band negative scroll, a flick past the bottom, or the End key. The camera clamps at the street start or the standing spot. *Tests: Task 9 (unit), Task 10 (e2e).*
4. **Resize and phone rotation.** The canvas keeps filling the viewport and lines keep their pixel width. *Tests: Task 8 (unit), Task 10 (e2e).*
5. **A model that's missing, broken or has a renamed node.** A visitor gets a fallback with links, never a blank screen. A renamed or missing Blender node fails the build before it reaches Vercel. *Tests: Task 4 (unit), Task 10 (e2e).*

---

## File structure

| Path | Responsibility |
|---|---|
| `vitest.config.mts` | Unit test runner (node environment, `@/` alias) |
| `scripts/osm/geo.mjs` | Lat/lon → local metres; OSM height tag parsing |
| `scripts/osm/geometry.mjs` | Footprint cleaning, extrusion, road ribbons, strip widths |
| `scripts/osm/meshes.mjs` | OSM elements → named mesh buckets, The Commons frontage, Nylex position; mesh buckets → glTF Document |
| `scripts/osm/fetch.mjs` | CLI: Overpass extract → `art/osm/cremorne.json` |
| `scripts/osm/build-glb.mjs` | CLI: `cremorne.json` → `art/osm/cremorne-osm.glb` + `cremorne-meta.json` |
| `scripts/models/io.mjs` | glTF-Transform NodeIO with meshopt encoder/decoder |
| `scripts/models/inspect.mjs` | Node / camera / animation-target summary of a Document |
| `scripts/models/check.mjs` | `checkModel` + CLI validating `public/models` against the manifest |
| `scripts/models/build.mjs` | `optimise` + CLI `art/export/*.glb` → `public/models/*.glb` |
| `scripts/models/test-fixtures.mjs` | Shared in-memory glTF Document for model tests |
| `office/manifest.json` | Required nodes, cameras, animated nodes and byte budget per model |
| `scripts/blender/common.py` | Shared Blender helpers (paths, axes, collections, primitives, save) |
| `scripts/blender/setup_street.py` | Street collection: OSM import, doorway boolean, Nylex sign grey-box |
| `scripts/blender/greybox_office.py` | Office collection, `cam_stand`, `cam_stand_portrait`, `cam_walkin` keys |
| `scripts/blender/export.py` | Saves the .blend and exports both collections to `art/export/` |
| `art/office.blend` | Blender source (Git LFS) |
| `art/osm/cremorne.json`, `art/osm/cremorne-meta.json` | Raw OSM extract and derived frontage/landmark metadata (committed) |
| `public/models/street.glb`, `public/models/office.glb` | Optimised runtime models (committed, not LFS, so Vercel gets them) |
| `office/theme.ts` | Scene colours, line width, fog, walk-in length (+ accent after Task 11) |
| `office/style/cleanEdges.ts` | Restyle a loaded scene in place: fill + edge lines |
| `office/walkin/clipSampler.ts` | Progress → clip time; exact clip evaluation; find the walk-in clip |
| `office/walkin/cameraPose.ts` | Find a glTF camera; copy its world pose and FOV onto the render camera |
| `office/walkin/useWalkInProgress.ts` | GSAP ScrollTrigger scrub → progress ref |
| `office/OfficeCanvas.tsx` | R3F canvas: loads both GLBs, applies clean edges, drives the camera |
| `office/OfficeErrorBoundary.tsx` | Fallback with links when the 3D fails |
| `office/OfficeExperience.tsx` | Fixed stage + scroll track; client-only dynamic import of the canvas |
| `app/(office)/layout.tsx`, `app/(office)/page.tsx`, `app/(office)/office.css` | New root layout and home route |
| `playwright.config.ts`, `e2e/office.spec.ts` | End-to-end tests against `npm run dev` |
| `lib/gsap.ts` | Trimmed to ScrollTrigger + useGSAP |

---

### Task 1: Test runner and OSM geodesy helpers

**Files:**
- Create: `vitest.config.mts`, `scripts/osm/geo.mjs`, `scripts/osm/geo.test.mjs`
- Modify: `package.json` (devDependency + `test` scripts)

**Interfaces:**
- Produces: `makeProjector({lat, lon}) → (lat, lon) => [x, z]` (metres, +x east, −z north); `parseMetres(value: unknown) → number | null`; `buildingHeight(tags: object) → number` (metres, clamped 3–400); constants `LEVEL_HEIGHT = 3.2`, `DEFAULT_HEIGHT = 7`.

- [ ] **Step 1: Commit the pending GSAP install on its own**

The GSAP install from before brainstorming is still uncommitted. It belongs to this branch but not to this task.

```bash
git add package.json package-lock.json lib/gsap.ts
git commit -m "Add GSAP and @gsap/react with a shared registration module

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Install Vitest and add scripts**

```bash
npm install -D vitest@^5.0.3
npm pkg set scripts.test="vitest run" scripts.test:watch="vitest"
```

- [ ] **Step 3: Create `vitest.config.mts`**

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url)).replace(/[\\/]$/, "");

export default defineConfig({
  resolve: { alias: [{ find: /^@\//, replacement: `${root}/` }] },
  test: {
    environment: "node",
    include: ["**/*.test.{ts,mjs}"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
  },
});
```

- [ ] **Step 4: Write the failing tests `scripts/osm/geo.test.mjs`**

```js
import { describe, it, expect } from "vitest";
import { makeProjector, parseMetres, buildingHeight, LEVEL_HEIGHT } from "./geo.mjs";

describe("makeProjector", () => {
  const project = makeProjector({ lat: -37.8283, lon: 144.9932 });

  it("maps the origin to 0,0", () => {
    const [x, z] = project(-37.8283, 144.9932);
    expect(x).toBeCloseTo(0, 9);
    expect(z).toBeCloseTo(0, 9);
  });

  it("puts east on +x and north on -z", () => {
    expect(project(-37.8283, 144.9942)[0]).toBeGreaterThan(0);
    expect(project(-37.8273, 144.9932)[1]).toBeLessThan(0);
  });

  it("uses metres: 0.001° of latitude ≈ 111.32 m, of longitude ≈ 87.93 m here", () => {
    expect(-project(-37.8273, 144.9932)[1]).toBeCloseTo(111.32, 1);
    expect(project(-37.8283, 144.9942)[0]).toBeCloseTo(87.93, 1);
  });
});

describe("parseMetres", () => {
  it.each([
    ["30", 30],
    ["30 m", 30],
    ["12.5m", 12.5],
    ["12;15", 12],
  ])("parses %j", (input, expected) => expect(parseMetres(input)).toBe(expected));

  it.each([["abc"], [""], ["-3"], ["0"], [undefined], [null], [42]])("rejects %j", (input) =>
    expect(parseMetres(input)).toBeNull(),
  );
});

describe("buildingHeight", () => {
  it("prefers the height tag", () => expect(buildingHeight({ height: "30", "building:levels": "2" })).toBe(30));
  it("falls back to levels × 3.2 m", () => expect(buildingHeight({ "building:levels": "4" })).toBeCloseTo(4 * LEVEL_HEIGHT));
  it("ignores a garbage height and uses levels", () =>
    expect(buildingHeight({ height: "tall", "building:levels": "4" })).toBeCloseTo(12.8));
  it("defaults to 7 m", () => expect(buildingHeight({})).toBe(7));
  it("defaults when called without tags", () => expect(buildingHeight()).toBe(7));
  it("clamps silly values", () => {
    expect(buildingHeight({ height: "1000" })).toBe(400);
    expect(buildingHeight({ height: "1" })).toBe(3);
  });
});
```

- [ ] **Step 5: Run to verify it fails**

Run: `npx vitest run scripts/osm/geo.test.mjs`
Expected: FAIL, `Failed to load url ./geo.mjs` (module doesn't exist).

- [ ] **Step 6: Implement `scripts/osm/geo.mjs`**

```js
const EARTH_RADIUS = 6378137;
const DEG = Math.PI / 180;

export const LEVEL_HEIGHT = 3.2;
export const DEFAULT_HEIGHT = 7;

/** Local tangent-plane projection in metres from `origin`: +x east, -z north (glTF/three axes). */
export function makeProjector(origin) {
  const k = EARTH_RADIUS * DEG;
  const cosLat = Math.cos(origin.lat * DEG);
  return (lat, lon) => [(lon - origin.lon) * k * cosLat, -(lat - origin.lat) * k];
}

/** OSM length tag → metres. Takes the first of `;`-separated values. Null for anything unusable. */
export function parseMetres(value) {
  if (typeof value !== "string") return null;
  const n = parseFloat(value.split(";")[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Extrusion height for a building: height tag, else levels × 3.2 m, else 7 m. Clamped to 3–400 m. */
export function buildingHeight(tags = {}) {
  let height = parseMetres(tags.height);
  if (height === null) {
    const levels = parseMetres(tags["building:levels"]);
    height = levels === null ? DEFAULT_HEIGHT : levels * LEVEL_HEIGHT;
  }
  return Math.min(400, Math.max(3, height));
}
```

- [ ] **Step 7: Run to verify it passes**

Run: `npm test`
Expected: PASS, all `geo.test.mjs` tests green.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.mts scripts/osm/geo.mjs scripts/osm/geo.test.mjs
git commit -m "Add Vitest and OSM projection and height helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Footprint and road geometry

**Files:**
- Create: `scripts/osm/geometry.mjs`, `scripts/osm/geometry.test.mjs`
- Modify: `package.json` (adds `three`)

**Interfaces:**
- Consumes: `parseMetres` from `./geo.mjs`.
- Produces (all 2D points are `[x, z]` arrays in metres):
  - `cleanRing(points) → [x, z][] | null`: drops repeated, closing and collinear points; null when fewer than 3 points or under 1 m²
  - `ringArea(ring) → number`: signed shoelace area
  - `extrudeFootprint(ring, height) → { positions: number[], indices: number[] }`: walls and flat roof, no floor
  - `ribbon(polyline, width, y = 0) → { positions, indices } | null`: flat strip centred on the line
  - `stripWidth(tags) → number`
  - `closestPointOnSegment(p, a, b) → [x, z]`

- [ ] **Step 1: Install three (scripts and app share it)**

```bash
npm install three@^0.186.1
```

- [ ] **Step 2: Write the failing tests `scripts/osm/geometry.test.mjs`**

```js
import { describe, it, expect } from "vitest";
import { BufferGeometry, EdgesGeometry, Float32BufferAttribute } from "three";
import { cleanRing, closestPointOnSegment, extrudeFootprint, ribbon, ringArea, stripWidth } from "./geometry.mjs";

/** How many line segments the clean-edge renderer would draw for this mesh. */
function edgeSegments({ positions, indices }, thresholdDeg = 20) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return new EdgesGeometry(geometry, thresholdDeg).attributes.position.count / 2;
}

describe("cleanRing", () => {
  it("drops the closing duplicate and repeated points", () => {
    expect(cleanRing([[0, 0], [10, 0], [10, 0], [10, 10], [0, 10], [0, 0]])).toEqual([[0, 0], [10, 0], [10, 10], [0, 10]]);
  });
  it("drops collinear points", () => {
    expect(cleanRing([[0, 0], [5, 0], [10, 0], [10, 10], [0, 10]])).toEqual([[0, 0], [10, 0], [10, 10], [0, 10]]);
  });
  it("rejects fewer than 3 points", () => expect(cleanRing([[0, 0], [1, 0]])).toBeNull());
  it("rejects zero area", () => expect(cleanRing([[0, 0], [5, 0], [10, 0]])).toBeNull());
  it("rejects slivers under 1 m²", () => expect(cleanRing([[0, 0], [10, 0], [10, 0.05], [0, 0.05]])).toBeNull());
});

describe("ringArea", () => {
  it("is signed by winding", () => {
    expect(ringArea([[0, 0], [10, 0], [10, 10], [0, 10]])).toBe(100);
    expect(ringArea([[0, 0], [0, 10], [10, 10], [10, 0]])).toBe(-100);
  });
});

describe("extrudeFootprint", () => {
  it("builds walls and a roof at the given height", () => {
    const mesh = extrudeFootprint([[0, 0], [10, 0], [10, 10], [0, 10]], 5);
    const ys = mesh.positions.filter((_, i) => i % 3 === 1);
    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...ys)).toBe(5);
    expect(mesh.indices.length).toBe(4 * 6 + 2 * 3);
  });

  it("draws a box as exactly 12 edges", () => {
    expect(edgeSegments(extrudeFootprint([[0, 0], [10, 0], [10, 10], [0, 10]], 5))).toBe(12);
  });

  it("draws a concave L footprint as 18 edges", () => {
    const ring = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]];
    expect(edgeSegments(extrudeFootprint(ring, 6))).toBe(18);
  });

  it("hides the vertical line where a wall bends by less than the threshold", () => {
    const ring = [[0, 0], [5, 0.2], [10, 0], [10, 10], [0, 10]];   // ~4.6° bend at [5, 0.2]
    expect(edgeSegments(extrudeFootprint(ring, 5))).toBe(5 + 5 + 4);
  });

  it("works for either winding", () => {
    expect(edgeSegments(extrudeFootprint([[0, 0], [0, 10], [10, 10], [10, 0]], 5))).toBe(12);
  });
});

describe("ribbon", () => {
  it("is a rectangle for a straight two-point line", () => {
    const strip = ribbon([[0, 0], [10, 0]], 2);
    expect(strip.positions).toEqual([0, 0, 1, 0, 0, -1, 10, 0, 1, 10, 0, -1]);
    expect(edgeSegments(strip)).toBe(4);
  });

  it("mitres corners so the strip keeps its width", () => {
    const strip = ribbon([[0, 0], [10, 0], [10, 10]], 2);
    const corner = strip.positions.slice(6, 12);
    [9, 0, 1, 11, 0, -1].forEach((v, i) => expect(corner[i]).toBeCloseTo(v, 6));
  });

  it("survives a hairpin without NaN", () => {
    const strip = ribbon([[0, 0], [10, 0], [0, 0]], 2);
    expect(strip.positions.every(Number.isFinite)).toBe(true);
  });

  it("returns null for fewer than two distinct points", () => {
    expect(ribbon([[3, 3]], 4)).toBeNull();
    expect(ribbon([[3, 3], [3, 3]], 4)).toBeNull();
  });
});

describe("stripWidth", () => {
  it.each([
    [{ highway: "primary" }, 14],
    [{ highway: "residential" }, 8],
    [{ highway: "service", width: "3.5" }, 3.5],
    [{ railway: "tram" }, 2.5],
    [{ railway: "rail" }, 3],
    [{ highway: "bogus" }, 6],
  ])("%j → %d m", (tags, expected) => expect(stripWidth(tags)).toBe(expected));
});

describe("closestPointOnSegment", () => {
  it("projects onto the segment", () => expect(closestPointOnSegment([5, 3], [0, 0], [10, 0])).toEqual([5, 0]));
  it("clamps to the ends", () => expect(closestPointOnSegment([-4, 2], [0, 0], [10, 0])).toEqual([0, 0]));
  it("handles a zero-length segment", () => expect(closestPointOnSegment([1, 1], [2, 2], [2, 2])).toEqual([2, 2]));
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run scripts/osm/geometry.test.mjs`
Expected: FAIL, `Failed to load url ./geometry.mjs`.

- [ ] **Step 4: Implement `scripts/osm/geometry.mjs`**

```js
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
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test`
Expected: PASS, `geo.test.mjs` and `geometry.test.mjs` all green.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json scripts/osm/geometry.mjs scripts/osm/geometry.test.mjs
git commit -m "Add OSM footprint extrusion and road ribbon geometry

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Fetch Cremorne from OpenStreetMap and build the street GLB

**Files:**
- Create: `scripts/osm/meshes.mjs`, `scripts/osm/meshes.test.mjs`, `scripts/osm/fetch.mjs`, `scripts/osm/build-glb.mjs`
- Create (generated, committed): `art/osm/cremorne.json`, `art/osm/cremorne-meta.json`
- Modify: `package.json` (glTF-Transform deps, `osm:*` scripts), `.gitignore`

**Interfaces:**
- Consumes: `makeProjector`, `buildingHeight` (Task 1); `cleanRing`, `extrudeFootprint`, `ribbon`, `stripWidth`, `closestPointOnSegment` (Task 2).
- Produces:
  - `COMMONS_WAY_IDS = [946747659, 946747654, 1290625051]`, `AAMI_PARK_WAY_ID = 60116158`, `COMMONS_GREYBOX_HEIGHT = 14`
  - `commonsOrigin(elements) → { lat, lon }` (throws if The Commons is missing)
  - `osmToMeshes(elements) → { origin, meshes: Record<"osm_buildings"|"osm_commons"|"osm_aami_park"|"osm_roads"|"osm_rail", {positions, indices}>, skipped: number[], frontage: { streetPoint, door, normal }, nylex: [x, z] | null }` (empty buckets are omitted)
  - `meshesToDocument(meshes) → Document` (one node + mesh per bucket, named after the bucket)
  - `art/osm/cremorne-meta.json` with keys `origin, axes, attribution, fetchedAt, door, normal, streetPoint, nylex, skipped, triangles`. Blender scripts (Tasks 6–7) read `door`, `normal` and `nylex`.

- [ ] **Step 1: Install glTF-Transform and meshoptimizer, ignore generated GLBs**

```bash
npm install -D @gltf-transform/core@^4.5.1 @gltf-transform/extensions@^4.5.1 @gltf-transform/functions@^4.5.1 meshoptimizer@^1.3.0
npm pkg set scripts.osm:fetch="node scripts/osm/fetch.mjs" scripts.osm:build="node scripts/osm/build-glb.mjs"
printf "\n# generated 3D intermediates (sources are art/osm/*.json and art/office.blend)\nart/osm/*.glb\n" >> .gitignore
```

- [ ] **Step 2: Write the failing tests `scripts/osm/meshes.test.mjs`**

```js
import { describe, it, expect } from "vitest";
import { COMMONS_GREYBOX_HEIGHT, COMMONS_WAY_IDS, meshesToDocument, osmToMeshes } from "./meshes.mjs";

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
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run scripts/osm/meshes.test.mjs`
Expected: FAIL, `Failed to load url ./meshes.mjs`.

- [ ] **Step 4: Implement `scripts/osm/meshes.mjs`**

```js
import { Document } from "@gltf-transform/core";
import { buildingHeight, makeProjector } from "./geo.mjs";
import { cleanRing, closestPointOnSegment, extrudeFootprint, ribbon, stripWidth } from "./geometry.mjs";

export const COMMONS_WAY_IDS = [946747659, 946747654, 1290625051]; // 10–12, 14–18 and 20 Gwynne St
export const AAMI_PARK_WAY_ID = 60116158;
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

    if (tags.building) {
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
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test`
Expected: PASS, all suites green.

- [ ] **Step 6: Create the fetch CLI `scripts/osm/fetch.mjs`**

```js
// Fetches the Cremorne extract from Overpass into art/osm/cremorne.json. Run rarely: the JSON is the source.
import { mkdir, writeFile } from "node:fs/promises";

const LAT = -37.8283; // Gwynne Street, Cremorne
const LON = 144.9932;
const QUERY = `[out:json][timeout:180];
(
  way["building"](around:600,${LAT},${LON});
  way["building"]["height"](around:1300,${LAT},${LON});
  way["building"]["building:levels"](around:1300,${LAT},${LON});
  way["building"]["height"](around:4500,${LAT},${LON})(if: number(t["height"]) >= 60);
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street|service|pedestrian)$"](around:700,${LAT},${LON});
  way["railway"~"^(rail|tram)$"](around:700,${LAT},${LON});
  node["name"="Nylex Clock"](around:800,${LAT},${LON});
);
out geom;`;
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

for (const url of ENDPOINTS) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "User-Agent": "kaspersimonsen.dev-osm-import", "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(QUERY)}`,
      signal: AbortSignal.timeout(200_000),
    });
    const text = await res.text();
    if (!res.ok || !text.startsWith("{")) throw new Error(`${res.status} ${text.slice(0, 160)}`);
    const { elements } = JSON.parse(text);
    await mkdir("art/osm", { recursive: true });
    await writeFile(
      "art/osm/cremorne.json",
      JSON.stringify({ attribution: "© OpenStreetMap contributors, ODbL 1.0", fetchedAt: new Date().toISOString(), endpoint: url, query: QUERY, elements }),
    );
    console.log(`Saved ${elements.length} elements from ${url}`);
    process.exit(0);
  } catch (err) {
    console.warn(`${url} failed: ${err.message}`);
  }
}
console.error("Every Overpass endpoint failed. Try again in a few minutes.");
process.exit(1);
```

- [ ] **Step 7: Create the build CLI `scripts/osm/build-glb.mjs`**

```js
// art/osm/cremorne.json → art/osm/cremorne-osm.glb (imported into Blender) + cremorne-meta.json.
import { readFile, writeFile } from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { meshesToDocument, osmToMeshes } from "./meshes.mjs";

const source = JSON.parse(await readFile("art/osm/cremorne.json", "utf8"));
const { origin, meshes, skipped, frontage, nylex } = osmToMeshes(source.elements);
await new NodeIO().write("art/osm/cremorne-osm.glb", meshesToDocument(meshes));

const meta = {
  source: "art/osm/cremorne.json",
  attribution: source.attribution,
  fetchedAt: source.fetchedAt,
  origin,
  axes: "+x east, +y up, -z north, metres; Blender (x, y) = (x, -z)",
  door: frontage.door,
  normal: frontage.normal,
  streetPoint: frontage.streetPoint,
  nylex,
  skipped: skipped.length,
  triangles: Object.fromEntries(Object.entries(meshes).map(([name, m]) => [name, m.indices.length / 3])),
};
await writeFile("art/osm/cremorne-meta.json", `${JSON.stringify(meta, null, 2)}\n`);
console.log(meta);
```

- [ ] **Step 8: Fetch and build for real**

Run: `npm run osm:fetch && npm run osm:build`
Expected:
- `Saved N elements` with N in the low thousands.
- The meta printout shows all of: `osm_buildings`, `osm_commons`, `osm_aami_park`, `osm_roads`, `osm_rail`.
- `normal[0] > 0.9`. The Commons sits on the west side of Gwynne St, so its facade faces east.
- `nylex` is not null, about 400 m from the origin.
- `skipped` is a small number.

If `osm_aami_park` is missing, check that way 60116158 still has its `height` tag on openstreetmap.org. If `nylex` is null, check the node's `name` tag. Fix the query, not the data.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json .gitignore scripts/osm/meshes.mjs scripts/osm/meshes.test.mjs scripts/osm/fetch.mjs scripts/osm/build-glb.mjs art/osm/cremorne.json art/osm/cremorne-meta.json
git commit -m "Import Cremorne from OpenStreetMap into an extruded street model

Data © OpenStreetMap contributors, ODbL 1.0.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Model manifest and checks

**Files:**
- Create: `office/manifest.json`, `scripts/models/io.mjs`, `scripts/models/inspect.mjs`, `scripts/models/check.mjs`, `scripts/models/test-fixtures.mjs`, `scripts/models/check.test.mjs`
- Modify: `package.json` (`check:models` script)

**Interfaces:**
- Produces:
  - `office/manifest.json`: `{ [model]: { url, maxBytes, nodes[], cameras[], animated[] } }` for `street` and `office`. The runtime reads `url`; the check reads everything.
  - `createIO() → Promise<NodeIO>` (meshopt encoder and decoder registered)
  - `inspectDocument(doc) → { nodes: string[], cameras: string[], animated: string[] }`
  - `checkModel(name, entry, report, bytes) → string[]` (problems; empty means OK)
  - `sampleDocument({ withAnimation = true }) → Document`, a test fixture with `office_root` › `hs_drawer`, `hs_shelf` (shared mesh), `hs_monitor_pivot` (empty leaf), and an animated `cam_walkin`

- [ ] **Step 1: Create `office/manifest.json`**

```json
{
  "street": {
    "url": "/models/street.glb",
    "maxBytes": 819200,
    "nodes": ["osm_buildings", "osm_commons", "osm_aami_park", "osm_roads"],
    "cameras": ["cam_walkin"],
    "animated": ["cam_walkin"]
  },
  "office": {
    "url": "/models/office.glb",
    "maxBytes": 2097152,
    "nodes": ["office_root", "hs_crate", "hs_drawer", "hs_monitor", "hs_shelf"],
    "cameras": ["cam_stand", "cam_stand_portrait"],
    "animated": []
  }
}
```

- [ ] **Step 2: Create the shared fixture `scripts/models/test-fixtures.mjs`**

```js
import { Document } from "@gltf-transform/core";

/** A small office-like glTF: hotspots under office_root, a shared mesh, an empty pivot, an animated camera. */
export function sampleDocument({ withAnimation = true } = {}) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const accessor = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);

  const cube = doc.createMesh("cube").addPrimitive(
    doc
      .createPrimitive()
      .setAttribute("POSITION", accessor("VEC3", new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1])))
      .setIndices(accessor("SCALAR", new Uint16Array([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0]))),
  );
  const drawer = doc.createNode("hs_drawer").setMesh(cube).setTranslation([0.5, 0.3, 6.5]);
  const shelf = doc.createNode("hs_shelf").setMesh(cube).setTranslation([2.2, 1.55, 7.15]);
  const pivot = doc.createNode("hs_monitor_pivot").setTranslation([0, 1.1, 6.7]);
  const root = doc.createNode("office_root").setTranslation([10, 0, 5]).addChild(drawer).addChild(shelf).addChild(pivot);
  const camera = doc.createCamera("lens").setType("perspective").setYFov(0.87).setZNear(0.1).setZFar(10000);
  const walkin = doc.createNode("cam_walkin").setCamera(camera).setTranslation([0, 90, 180]);
  doc.createScene("scene").addChild(root).addChild(walkin);

  if (withAnimation) {
    const sampler = doc
      .createAnimationSampler()
      .setInput(accessor("SCALAR", new Float32Array([0, 10])))
      .setOutput(accessor("VEC3", new Float32Array([0, 90, 180, 0, 1.6, 1.6])))
      .setInterpolation("LINEAR");
    const channel = doc.createAnimationChannel().setTargetNode(walkin).setTargetPath("translation").setSampler(sampler);
    doc.createAnimation("cam_walkinAction").addSampler(sampler).addChannel(channel);
  }
  return doc;
}
```

- [ ] **Step 3: Write the failing tests `scripts/models/check.test.mjs`**

```js
import { describe, it, expect } from "vitest";
import { inspectDocument } from "./inspect.mjs";
import { checkModel } from "./check.mjs";
import { sampleDocument } from "./test-fixtures.mjs";

const entry = {
  url: "/models/office.glb",
  maxBytes: 1000,
  nodes: ["office_root", "hs_drawer"],
  cameras: ["cam_walkin"],
  animated: ["cam_walkin"],
};

describe("inspectDocument", () => {
  it("lists nodes, camera nodes and animation targets", () => {
    expect(inspectDocument(sampleDocument())).toEqual({
      nodes: ["hs_drawer", "hs_shelf", "hs_monitor_pivot", "office_root", "cam_walkin"],
      cameras: ["cam_walkin"],
      animated: ["cam_walkin"],
    });
  });
});

describe("checkModel", () => {
  it("passes a model that matches its manifest entry", () => {
    expect(checkModel("office", entry, inspectDocument(sampleDocument()), 900)).toEqual([]);
  });

  it("names a node that was renamed in Blender", () => {
    const report = inspectDocument(sampleDocument());
    report.nodes = report.nodes.map((n) => (n === "hs_drawer" ? "hs_drawer.001" : n));
    expect(checkModel("office", entry, report, 900)).toEqual(['office: missing node "hs_drawer"']);
  });

  it("names a missing camera", () => {
    const report = { ...inspectDocument(sampleDocument()), cameras: [] };
    expect(checkModel("office", entry, report, 900)).toEqual(['office: missing camera "cam_walkin"']);
  });

  it("names a camera that lost its animation", () => {
    const report = inspectDocument(sampleDocument({ withAnimation: false }));
    expect(checkModel("office", entry, report, 900)).toEqual(['office: "cam_walkin" has no animation']);
  });

  it("names a model over budget", () => {
    expect(checkModel("office", entry, inspectDocument(sampleDocument()), 2048)).toEqual([
      "office: 2.0 KB is over the 1.0 KB budget",
    ]);
  });
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `npx vitest run scripts/models/check.test.mjs`
Expected: FAIL, `Failed to load url ./inspect.mjs`.

- [ ] **Step 5: Implement `scripts/models/io.mjs`**

```js
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

/** NodeIO that can read and write EXT_meshopt_compression. */
export async function createIO() {
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
  return new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
}
```

- [ ] **Step 6: Implement `scripts/models/inspect.mjs`**

```js
/** What the runtime cares about in a glTF Document: node names, camera nodes, animated nodes. */
export function inspectDocument(doc) {
  const root = doc.getRoot();
  const nodes = root.listNodes();
  const animated = new Set();
  for (const animation of root.listAnimations()) {
    for (const channel of animation.listChannels()) {
      const name = channel.getTargetNode()?.getName();
      if (name) animated.add(name);
    }
  }
  return {
    nodes: nodes.map((n) => n.getName()),
    cameras: nodes.filter((n) => n.getCamera()).map((n) => n.getName()),
    animated: [...animated],
  };
}
```

- [ ] **Step 7: Implement `scripts/models/check.mjs`**

```js
// Validates public/models/*.glb against office/manifest.json. Fails the build on any problem.
import { readFile, stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createIO } from "./io.mjs";
import { inspectDocument } from "./inspect.mjs";

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

/** Problems with one model against its manifest entry. Empty means it's fine. */
export function checkModel(name, entry, report, bytes) {
  const problems = [];
  for (const node of entry.nodes) if (!report.nodes.includes(node)) problems.push(`${name}: missing node "${node}"`);
  for (const camera of entry.cameras) if (!report.cameras.includes(camera)) problems.push(`${name}: missing camera "${camera}"`);
  for (const node of entry.animated) if (!report.animated.includes(node)) problems.push(`${name}: "${node}" has no animation`);
  if (bytes > entry.maxBytes) problems.push(`${name}: ${kb(bytes)} is over the ${kb(entry.maxBytes)} budget`);
  return problems;
}

async function main() {
  const manifest = JSON.parse(await readFile("office/manifest.json", "utf8"));
  const io = await createIO();
  const problems = [];
  for (const [name, entry] of Object.entries(manifest)) {
    const file = `public${entry.url}`;
    try {
      const { size } = await stat(file);
      problems.push(...checkModel(name, entry, inspectDocument(await io.read(file)), size));
      console.log(`${name}: ${kb(size)} of ${kb(entry.maxBytes)}`);
    } catch (err) {
      problems.push(`${name}: can't read ${file} (${err.message})`);
    }
  }
  if (problems.length) {
    console.error(`Model check failed:\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  console.log("Models OK");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
```

- [ ] **Step 8: Run to verify it passes**

Run: `npm test`
Expected: PASS, all suites green.

- [ ] **Step 9: Add the script and confirm it fails without models**

```bash
npm pkg set scripts.check:models="node scripts/models/check.mjs"
npm run check:models
```
Expected: exit 1 with `street: can't read public/models/street.glb` and the same for office. The models arrive in Task 7.

- [ ] **Step 10: Commit**

```bash
git add package.json office/manifest.json scripts/models/io.mjs scripts/models/inspect.mjs scripts/models/check.mjs scripts/models/test-fixtures.mjs scripts/models/check.test.mjs
git commit -m "Add model manifest and check:models validation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Model optimisation that keeps names and transforms

**Files:**
- Create: `scripts/models/build.mjs`, `scripts/models/build.test.mjs`
- Modify: `package.json` (`build:models`), `.gitignore`

**Interfaces:**
- Consumes: `createIO`, `inspectDocument`, `sampleDocument` (Task 4).
- Produces: `optimise(doc) → Promise<Document>`; CLI `npm run build:models` reads `art/export/{street,office}.glb` and writes `public/models/{street,office}.glb`.

- [ ] **Step 1: Write the failing tests `scripts/models/build.test.mjs`**

```js
import { describe, it, expect } from "vitest";
import { createIO } from "./io.mjs";
import { inspectDocument } from "./inspect.mjs";
import { optimise } from "./build.mjs";
import { sampleDocument } from "./test-fixtures.mjs";

async function roundTrip(doc) {
  const io = await createIO();
  return io.readBinary(await io.writeBinary(await optimise(doc)));
}

describe("optimise", () => {
  it("keeps every node, camera and animation target the runtime looks up by name", async () => {
    const before = inspectDocument(sampleDocument());
    const after = inspectDocument(await roundTrip(sampleDocument()));
    expect(after.nodes.sort()).toEqual(before.nodes.sort());
    expect(after.cameras).toEqual(before.cameras);
    expect(after.animated).toEqual(before.animated);
  });

  it("keeps empty pivot nodes (prune would drop leaves by default)", async () => {
    const after = await roundTrip(sampleDocument());
    expect(after.getRoot().listNodes().some((n) => n.getName() === "hs_monitor_pivot")).toBe(true);
  });

  it("never rewrites node transforms, so Blender animations and pivots stay put", async () => {
    const after = await roundTrip(sampleDocument());
    const drawer = after.getRoot().listNodes().find((n) => n.getName() === "hs_drawer");
    expect(drawer.getTranslation()).toEqual([0.5, 0.3, 6.5]);
    expect(drawer.getScale()).toEqual([1, 1, 1]);
  });

  it("compresses with meshopt", async () => {
    const after = await roundTrip(sampleDocument());
    expect(after.getRoot().listExtensionsUsed().map((e) => e.extensionName)).toContain("EXT_meshopt_compression");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run scripts/models/build.test.mjs`
Expected: FAIL, `Failed to load url ./build.mjs`.

- [ ] **Step 3: Implement `scripts/models/build.mjs`**

```js
// art/export/*.glb (Blender exports) → public/models/*.glb (what the site loads).
import { mkdir, stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { EXTMeshoptCompression } from "@gltf-transform/extensions";
import { dedup, prune, reorder, weld } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import { createIO } from "./io.mjs";

const MODELS = ["street", "office"];

/**
 * Size optimisation that never touches names, hierarchy or node transforms. Deliberately absent:
 * join/flatten/instance (they merge or rename the nodes hotspots are looked up by), simplify (it eats
 * the edges we draw) and quantize (it rewrites node transforms, which fights Blender animations).
 */
export async function optimise(doc) {
  await MeshoptEncoder.ready;
  await doc.transform(prune({ keepLeaves: true }), dedup(), weld(), reorder({ encoder: MeshoptEncoder }));
  doc
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  return doc;
}

async function main() {
  const io = await createIO();
  await mkdir("public/models", { recursive: true });
  for (const name of MODELS) {
    const from = `art/export/${name}.glb`;
    const to = `public/models/${name}.glb`;
    await io.write(to, await optimise(await io.read(from)));
    const [a, b] = await Promise.all([stat(from), stat(to)]);
    console.log(`${name}: ${(a.size / 1024).toFixed(0)} KB → ${(b.size / 1024).toFixed(0)} KB`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: PASS, all suites green.

- [ ] **Step 5: Add the script, ignore raw exports, commit**

```bash
npm pkg set scripts.build:models="node scripts/models/build.mjs"
printf "art/export/\n*.blend1\n" >> .gitignore
git add package.json .gitignore scripts/models/build.mjs scripts/models/build.test.mjs
git commit -m "Add build:models optimisation that preserves names and transforms

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Blender street file (OSM import, doorway, Nylex sign)

Runs inside Blender 5.2 through the Blender MCP (`mcp__blender__execute_blender_code`). Kasper can also run the same scripts from Blender's Scripting tab.

**Files:**
- Create: `scripts/blender/common.py`, `scripts/blender/setup_street.py`, `.gitattributes`
- Create (binary, LFS): `art/office.blend`

**Interfaces:**
- Consumes: `art/osm/cremorne-osm.glb`, `art/osm/cremorne-meta.json` (`door`, `normal`, `nylex`) from Task 3.
- Produces in `art/office.blend`: collection `street` (`osm_*` objects, `prop_nylex_sign`), collection `helpers` (`helper_door_cutter`, never exported). `osm_commons` carries a `doorway` boolean modifier. `common.py` provides `REPO, BLEND, meta(), gl_to_bl(xz), collection(name), clear(col), box(...), cylinder(...), empty(...), save()`.

- [ ] **Step 1: Set up Git LFS for Blender files**

```bash
git lfs install --local
printf "*.blend filter=lfs diff=lfs merge=lfs -text\n" > .gitattributes
git add .gitattributes
```

- [ ] **Step 2: Create `scripts/blender/common.py`**

```python
"""Shared helpers for the Blender scripts (setup_street.py, greybox_office.py, export.py)."""
import json
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

REPO = Path(__file__).resolve().parents[2]
BLEND = REPO / "art" / "office.blend"


def meta():
    return json.loads((REPO / "art" / "osm" / "cremorne-meta.json").read_text())


def gl_to_bl(xz):
    """glTF ground coords [x, z] (+x east, -z north) -> Blender Vector (+x east, +y north, z = 0)."""
    return Vector((xz[0], -xz[1], 0.0))


def collection(name):
    col = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if col.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(col)
    return col


def clear(col):
    for obj in list(col.all_objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def _place(obj, location, parent, col):
    obj.location = location
    obj.parent = parent  # matrix_parent_inverse stays identity: location is in the parent's space
    col.objects.link(obj)
    return obj


def box(name, size, location, parent, col):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bm.to_mesh(mesh)
    bm.free()
    return _place(bpy.data.objects.new(name, mesh), location, parent, col)


def cylinder(name, radius, depth, location, parent, col, segments=12):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=radius, radius2=radius, depth=depth)
    bm.to_mesh(mesh)
    bm.free()
    return _place(bpy.data.objects.new(name, mesh), location, parent, col)


def empty(name, location, parent, col):
    return _place(bpy.data.objects.new(name, None), location, parent, col)


def save():
    BLEND.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
```

- [ ] **Step 3: Create `scripts/blender/setup_street.py`**

```python
"""Street collection of art/office.blend: OSM import, The Commons' doorway, Nylex sign grey-box.

Re-runnable: rebuilds the street and helpers collections from art/osm/. This also removes cam_walkin,
so run greybox_office.py afterwards.
"""
import importlib
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).parent))
import common  # noqa: E402

importlib.reload(common)

OSM_GLB = common.REPO / "art" / "osm" / "cremorne-osm.glb"
DOOR_WIDTH, DOOR_HEIGHT, DOOR_DEPTH = 1.8, 2.6, 3.0
NYLEX_SIGN = (14.0, 0.3, 6.0)  # width, depth, height in metres (grey-box)


def import_osm(street):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(OSM_GLB))
    for obj in set(bpy.data.objects) - before:
        for col in list(obj.users_collection):
            col.objects.unlink(obj)
        street.objects.link(obj)


def cut_doorway(m, helpers):
    commons = bpy.data.objects["osm_commons"]
    door = common.gl_to_bl(m["door"])
    normal = common.gl_to_bl(m["normal"]).normalized()
    cutter = common.box("helper_door_cutter", (DOOR_DEPTH, DOOR_WIDTH, DOOR_HEIGHT), door + Vector((0, 0, DOOR_HEIGHT / 2)), None, helpers)
    cutter.rotation_euler.z = math.atan2(normal.y, normal.x)  # local x through the wall
    cutter.display_type = "WIRE"
    cutter.hide_render = True
    mod = commons.modifiers.new("doorway", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = cutter
    mod.solver = "EXACT"
    mod.use_self = True  # the three Commons footprints share walls
    mod.use_hole_tolerant = True


def nylex_sign(m, street):
    if not m.get("nylex"):
        return None
    spot = common.gl_to_bl(m["nylex"])
    depsgraph = bpy.context.evaluated_depsgraph_get()
    hit, location, *_ = bpy.context.scene.ray_cast(depsgraph, Vector((spot.x, spot.y, 500)), Vector((0, 0, -1)))
    roof = location.z if hit else 30.0
    width, depth, height = NYLEX_SIGN
    sign = common.box("prop_nylex_sign", (width, depth, height), Vector((spot.x, spot.y, roof + 2 + height / 2)), None, street)
    sign.rotation_euler.z = math.atan2(-spot.y, -spot.x) - math.pi / 2  # face The Commons
    return round(roof, 1)


def main():
    m = common.meta()
    street = common.collection("street")
    helpers = common.collection("helpers")
    common.clear(street)
    common.clear(helpers)
    import_osm(street)
    cut_doorway(m, helpers)
    roof = nylex_sign(m, street)
    common.save()
    return {"street": sorted(o.name for o in street.all_objects), "nylex_roof": roof, "blend": str(common.BLEND)}


if __name__ == "__main__":
    SUMMARY = main()
```

- [ ] **Step 4: Start Blender from an empty scene**

Run through `mcp__blender__execute_blender_code`:

```python
import bpy
result = {"file": bpy.data.filepath or "(unsaved)", "dirty": bpy.data.is_dirty, "objects": sorted(o.name for o in bpy.data.objects)}
```

Expected: `(unsaved)` with only `Camera`, `Cube`, `Light`. If there's anything else, or a saved file is open, **stop and ask Kasper** before touching it. Otherwise clear the defaults:

```python
import bpy
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
result = {"objects": len(bpy.data.objects)}
```

Expected: `{"objects": 0}`.

- [ ] **Step 5: Run the street setup**

```python
import runpy
result = runpy.run_path(r"C:\dev\KasperSimonsen.dev\scripts\blender\setup_street.py", run_name="__main__")["SUMMARY"]
```

Expected: `street` lists `osm_aami_park`, `osm_buildings`, `osm_commons`, `osm_rail`, `osm_roads`, `prop_nylex_sign`. `nylex_roof` is a number above 10, and `art/office.blend` exists.

- [ ] **Step 6: Verify the doorway cut cleanly**

```python
import bpy
obj = bpy.data.objects["osm_commons"]
ev = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
mesh = ev.to_mesh()
result = {"faces_before": len(obj.data.polygons), "faces_after": len(mesh.polygons), "verts_after": len(mesh.vertices)}
ev.to_mesh_clear()
```

Expected: `faces_after` > `faces_before` (the cut adds faces) and is under `faces_before` + 60. Then look at it: `mcp__blender__get_screenshot_of_window_as_image` after framing `helper_door_cutter` (`mcp__blender__jump_to_view3d_object_by_name`). If the facade has a clean 1.8 × 2.6 m hole, carry on. If the EXACT solver left shards, set `mod.solver = "FLOAT"` in `cut_doorway`, re-run Step 5, and check again.

- [ ] **Step 7: Commit**

```bash
git add .gitattributes scripts/blender/common.py scripts/blender/setup_street.py art/office.blend
git commit -m "Add Blender street file: OSM import, Commons doorway, Nylex sign grey-box

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git lfs ls-files
```
Expected: `git lfs ls-files` lists `art/office.blend`.

---

### Task 7: Grey-box office, camera poses, walk-in animation, export

**Files:**
- Create: `scripts/blender/greybox_office.py`, `scripts/blender/export.py`
- Create (generated, committed): `public/models/street.glb`, `public/models/office.glb`
- Modify: `art/office.blend`, `package.json` (`prebuild`)

**Interfaces:**
- Consumes: `common.py` and the street collection from Task 6; `art/osm/cremorne-meta.json`.
- Produces:
  - `office` collection: `office_root` (empty at the door), with these children:
    - `prop_*` room shell and furniture;
    - `hs_crate` (empty) › `hs_crate__*`, including `hs_crate__record_00` to `hs_crate__record_08`;
    - `hs_drawer`, `hs_monitor`;
    - `hs_shelf` (empty) › `hs_shelf__board`, `hs_shelf__ornament_00`, `hs_shelf__ornament_01`;
    - `cam_stand`, `cam_stand_portrait`.
  - `street` collection gains `cam_walkin`, animated over frames 0–240 at 24 fps (a 10 s clip). Its last key equals `cam_stand`.
  - `WALKIN_KEYS` at the top of `greybox_office.py` is the single place pacing and framing get tuned (Task 12).
  - `public/models/*.glb` pass `npm run check:models`.

- [ ] **Step 1: Create `scripts/blender/greybox_office.py`**

```python
"""Grey-box office, camera poses and the walk-in camera for art/office.blend.

Run after setup_street.py. Re-runnable: rebuilds the office collection and cam_walkin.
Tune the walk-in by editing WALKIN_KEYS, re-running this, then export.py.
"""
import importlib
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, str(Path(__file__).parent))
import common  # noqa: E402

importlib.reload(common)

FPS = 24
WALKIN_FRAMES = 240  # clip length only; scroll maps onto it
CAMERA_FOV_DEG = 50.0  # vertical; shared by the walk-in and the standing spot so there's no jump
PORTRAIT_FOV_DEG = 75.0

# (scroll fraction, eye, look-at) in the office frame: metres, origin at the door on the facade,
# +x along the facade (right when facing in), +y into the building, +z up.
WALKIN_KEYS = [
    (0.00, (0.0, -180.0, 90.0), (20.0, 400.0, 0.0)),  # high over Gwynne St; Nylex and AAMI Park beyond
    (0.45, (0.0, -45.0, 22.0), (0.0, 30.0, 2.0)),  # descending towards the facade
    (0.70, (0.0, -4.0, 1.65), (0.0, 10.0, 1.6)),  # at the door, eye height
    (0.85, (0.0, 1.0, 1.65), (0.0, 10.0, 1.4)),  # through the doorway
    (1.00, (0.0, 1.6, 1.6), (0.0, 6.6, 1.0)),  # standing spot
]
STAND = WALKIN_KEYS[-1][1:]
PORTRAIT = ((0.0, 0.6, 1.7), (0.3, 6.6, 1.1))


def office_frame(m):
    door = common.gl_to_bl(m["door"])
    forward = -common.gl_to_bl(m["normal"]).normalized()  # into the building
    return Matrix.Translation(door) @ Matrix.Rotation(math.atan2(forward.y, forward.x) - math.pi / 2, 4, "Z")


def look(eye, target):
    return (Vector(target) - Vector(eye)).to_track_quat("-Z", "Y")


def camera(name, fov_deg, col, parent=None):
    data = bpy.data.cameras.new(name)
    data.sensor_fit = "VERTICAL"
    data.angle_y = math.radians(fov_deg)
    data.clip_start = 0.1
    data.clip_end = 10000
    obj = bpy.data.objects.new(name, data)
    obj.rotation_mode = "QUATERNION"
    obj.parent = parent
    col.objects.link(obj)
    return obj


def build_office(frame, col):
    box, cyl = common.box, common.cylinder
    root = common.empty("office_root", (0, 0, 0), None, col)
    root.matrix_world = frame

    # room shell, 8 x 7 x 3.2 m behind the facade, with a doorway in the front wall
    box("prop_floor", (8, 7, 0.05), (0, 3.8, -0.025), root, col)
    box("prop_ceiling", (8, 7, 0.05), (0, 3.8, 3.225), root, col)
    box("prop_wall_back", (8, 0.1, 3.2), (0, 7.35, 1.6), root, col)
    box("prop_wall_left", (0.1, 7, 3.2), (-4.05, 3.8, 1.6), root, col)
    box("prop_wall_right", (0.1, 7, 3.2), (4.05, 3.8, 1.6), root, col)
    box("prop_wall_front_left", (3.1, 0.1, 3.2), (-2.45, 0.25, 1.6), root, col)
    box("prop_wall_front_right", (3.1, 0.1, 3.2), (2.45, 0.25, 1.6), root, col)
    box("prop_wall_front_lintel", (1.8, 0.1, 0.6), (0, 0.25, 2.9), root, col)

    # desk against the back wall, drawer pedestal under its right side
    box("prop_desk_top", (1.6, 0.8, 0.04), (0, 6.5, 0.74), root, col)
    box("prop_desk_leg_l0", (0.04, 0.04, 0.72), (-0.76, 6.14, 0.36), root, col)
    box("prop_desk_leg_l1", (0.04, 0.04, 0.72), (-0.76, 6.86, 0.36), root, col)
    box("prop_pedestal", (0.45, 0.7, 0.72), (0.55, 6.5, 0.36), root, col)
    box("hs_drawer", (0.41, 0.03, 0.2), (0.55, 6.135, 0.6), root, col)

    # on the desk
    box("hs_monitor", (0.64, 0.04, 0.38), (0, 6.75, 1.12), root, col)
    box("prop_monitor_stand", (0.05, 0.04, 0.18), (0, 6.78, 0.85), root, col)
    box("prop_monitor_base", (0.24, 0.17, 0.015), (0, 6.78, 0.768), root, col)
    box("prop_keyboard", (0.44, 0.15, 0.022), (0, 6.3, 0.771), root, col)
    cyl("prop_mug", 0.04, 0.1, (-0.5, 6.3, 0.81), root, col)
    packet = box("prop_chip_packet", (0.17, 0.24, 0.05), (-0.35, 6.55, 0.785), root, col)
    packet.rotation_euler.z = 0.5
    box("prop_chair_seat", (0.45, 0.45, 0.05), (0.6, 5.6, 0.45), root, col)
    box("prop_chair_back", (0.45, 0.05, 0.5), (0.6, 5.38, 0.72), root, col)

    # record crate on the floor, left of the desk
    crate = common.empty("hs_crate", (-1.4, 6.3, 0), root, col)
    box("hs_crate__side_l", (0.02, 0.4, 0.32), (-0.19, 0, 0.16), crate, col)
    box("hs_crate__side_r", (0.02, 0.4, 0.32), (0.19, 0, 0.16), crate, col)
    box("hs_crate__front", (0.4, 0.02, 0.32), (0, -0.19, 0.16), crate, col)
    box("hs_crate__back", (0.4, 0.02, 0.32), (0, 0.19, 0.16), crate, col)
    box("hs_crate__bottom", (0.4, 0.4, 0.02), (0, 0, 0.01), crate, col)
    for i in range(9):
        record = box(f"hs_crate__record_{i:02d}", (0.31, 0.006, 0.31), (0, -0.13 + i * 0.032, 0.17), crate, col)
        record.rotation_euler.x = -0.18 + i * 0.012

    # ornament shelf on the back wall, right of the desk
    shelf = common.empty("hs_shelf", (2.0, 7.15, 1.55), root, col)
    box("hs_shelf__board", (1.4, 0.25, 0.03), (0, 0, 0), shelf, col)
    box("hs_shelf__ornament_00", (0.14, 0.14, 0.14), (-0.35, 0, 0.085), shelf, col)
    cyl("hs_shelf__ornament_01", 0.07, 0.16, (0.35, 0, 0.095), shelf, col)
    return root


def place(cam, eye, target):
    cam.location = eye
    cam.rotation_quaternion = look(eye, target)


def build_walkin(frame, street):
    old = bpy.data.objects.get("cam_walkin")
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    for action in [a for a in bpy.data.actions if a.name.startswith("cam_walkin")]:
        bpy.data.actions.remove(action)

    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.frame_start = 0
    scene.frame_end = WALKIN_FRAMES

    cam = camera("cam_walkin", CAMERA_FOV_DEG, street)
    previous = None
    for fraction, eye, target in WALKIN_KEYS:
        eye_w, target_w = frame @ Vector(eye), frame @ Vector(target)
        q = look(eye_w, target_w)
        if previous is not None and previous.dot(q) < 0:
            q.negate()  # stay in one hemisphere so Blender doesn't spin the long way round
        cam.location = eye_w
        cam.rotation_quaternion = q
        f = round(fraction * WALKIN_FRAMES)
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_quaternion", frame=f)
        previous = q
    return cam


def main():
    m = common.meta()
    frame = office_frame(m)
    office = common.collection("office")
    common.clear(office)
    root = build_office(frame, office)
    place(camera("cam_stand", CAMERA_FOV_DEG, office, root), *STAND)
    place(camera("cam_stand_portrait", PORTRAIT_FOV_DEG, office, root), *PORTRAIT)
    build_walkin(frame, common.collection("street"))
    common.save()
    return {"office_objects": len(office.all_objects), "door": [round(v, 2) for v in frame.translation], "frames": WALKIN_FRAMES}


if __name__ == "__main__":
    SUMMARY = main()
```

- [ ] **Step 2: Create `scripts/blender/export.py`**

```python
"""Saves art/office.blend and exports the street and office collections to art/export/*.glb."""
import importlib
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).parent))
import common  # noqa: E402

importlib.reload(common)

EXPORTS = {"street": "street.glb", "office": "office.glb"}


def export(collection_name, filename):
    objects = set(bpy.data.collections[collection_name].all_objects)
    for obj in bpy.context.view_layer.objects:
        obj.select_set(obj in objects)
    out = common.REPO / "art" / "export" / filename
    out.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(out),
        export_format="GLB",
        use_selection=True,
        export_cameras=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_anim_slide_to_zero=True,
        export_apply=True,  # applies the doorway boolean
        export_yup=True,
        export_normals=False,  # the clean-edge renderer doesn't light anything
        export_texcoords=False,
        export_materials="NONE",
        export_extras=True,
    )
    return {"objects": len(objects), "kb": round(out.stat().st_size / 1024)}


def main():
    common.save()
    return {name: export(name, filename) for name, filename in EXPORTS.items()}


if __name__ == "__main__":
    SUMMARY = main()
```

- [ ] **Step 3: Build the office and walk-in in Blender**

```python
import runpy
result = runpy.run_path(r"C:\dev\KasperSimonsen.dev\scripts\blender\greybox_office.py", run_name="__main__")["SUMMARY"]
```

Expected: `office_objects` ≥ 35, `door` close to the meta `door` (Blender y = −glTF z), `frames` 240.

- [ ] **Step 4: Export, optimise, check**

```python
import runpy
result = runpy.run_path(r"C:\dev\KasperSimonsen.dev\scripts\blender\export.py", run_name="__main__")["SUMMARY"]
```

Then:

```bash
npm run build:models && npm run check:models
```

Expected: `Models OK`, both models under budget. If `street` is over 800 KB, the 1300 m height-tagged radius in `scripts/osm/fetch.mjs` is the lever. Drop it to 1000, re-run `npm run osm:fetch && npm run osm:build`, Task 6 Step 5, then Steps 3–4 here. Don't raise the budget.

- [ ] **Step 5: Make every build validate the models**

```bash
npm pkg set scripts.prebuild="npm run check:models"
```

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/blender/greybox_office.py scripts/blender/export.py art/office.blend public/models/street.glb public/models/office.glb
git commit -m "Grey-box office, camera poses and walk-in camera; export and validate models

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Clean-edge renderer

**Files:**
- Create: `office/theme.ts`, `office/style/cleanEdges.ts`, `office/style/cleanEdges.test.ts`
- Modify: `package.json` (`@types/three`)

**Interfaces:**
- Produces:
  - `theme` (`background`, `line`, `lineWidth`, `edgeThresholdDeg`, `fogNear`, `fogFar`, `walkInScreens`)
  - `type CleanEdgesOptions = { background: string; line: string; lineWidth: number; thresholdDeg: number }`
  - `type CleanEdgesHandle = { fill: MeshBasicMaterial; line: LineMaterial }`
  - `applyCleanEdges(root: Object3D, opts: CleanEdgesOptions): CleanEdgesHandle`. It mutates in place: each mesh gets the shared fill and a child `LineSegments2` named `<mesh>__edges` with `userData.cleanEdges = true`. It's idempotent.
  - `setLineResolution(handle, width, height): void`

- [ ] **Step 1: Install three's types**

```bash
npm install -D @types/three@^0.186.0
```

- [ ] **Step 2: Create `office/theme.ts`**

```ts
/** Office scene look. Accent and UI typefaces are added by the phase 1 look-dev task. */
export const theme = {
  background: "#0b0b0b",
  line: "#e8e8e8",
  /** CSS pixels */
  lineWidth: 1.3,
  /** Only edges between faces meeting at more than this angle are drawn. */
  edgeThresholdDeg: 20,
  /** Linear fog to the background colour, in metres: fades the far city instead of cluttering it. */
  fogNear: 250,
  fogFar: 4000,
  /** Scroll track height in viewport heights; the walk-in spans it. */
  walkInScreens: 6,
} as const;
```

- [ ] **Step 3: Write the failing tests `office/style/cleanEdges.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { BoxGeometry, DoubleSide, Group, Mesh, Raycaster, Vector3 } from "three";
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
```

- [ ] **Step 4: Run to verify it fails**

Run: `npx vitest run office/style/cleanEdges.test.ts`
Expected: FAIL, `Failed to load url ./cleanEdges`.

- [ ] **Step 5: Implement `office/style/cleanEdges.ts`**

```ts
import { DoubleSide, EdgesGeometry, MeshBasicMaterial, type BufferGeometry, type Mesh, type Object3D } from "three";
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
};

export type CleanEdgesHandle = { fill: MeshBasicMaterial; line: LineMaterial };

/**
 * Restyles every mesh under `root` in place: a fill that hides what's behind it, plus the mesh's
 * real edges as screen-space lines. Names, hierarchy and transforms are untouched, so hotspots and
 * Blender animations keep working. Calling it again on the same tree is a no-op for styled meshes.
 */
export function applyCleanEdges(root: Object3D, opts: CleanEdgesOptions): CleanEdgesHandle {
  const fill = new MeshBasicMaterial({
    color: opts.background,
    side: DoubleSide,
    polygonOffset: true, // pushes fills back so coplanar edges always win the depth test
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const line = new LineMaterial({ color: opts.line, linewidth: opts.lineWidth, fog: true });
  const edgeCache = new Map<BufferGeometry, LineSegmentsGeometry>();

  const meshes: Mesh[] = [];
  root.traverse((obj) => {
    if ((obj as Mesh).isMesh && !obj.userData.cleanEdges && !obj.userData.cleanEdgesApplied) meshes.push(obj as Mesh);
  });

  for (const mesh of meshes) {
    mesh.material = fill;
    let edges = edgeCache.get(mesh.geometry);
    if (!edges) {
      edges = new LineSegmentsGeometry().fromEdgesGeometry(new EdgesGeometry(mesh.geometry, opts.thresholdDeg));
      edgeCache.set(mesh.geometry, edges);
    }
    const lines = new LineSegments2(edges, line);
    lines.name = `${mesh.name}__edges`;
    lines.userData.cleanEdges = true;
    lines.raycast = () => {}; // hotspots raycast the fill; LineSegments2 would also need raycaster.camera
    mesh.add(lines);
    mesh.userData.cleanEdgesApplied = true;
  }
  return { fill, line };
}

/** Line widths are in CSS pixels relative to this; call on every canvas resize. */
export function setLineResolution(handle: CleanEdgesHandle, width: number, height: number): void {
  handle.line.resolution.set(width, height);
}
```

The second `applyCleanEdges` call creates new materials that no mesh uses, and that's harmless. The test pins that no second set of lines is added.

- [ ] **Step 6: Run to verify it passes**

Run: `npm test`
Expected: PASS, all suites green.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json office/theme.ts office/style/cleanEdges.ts office/style/cleanEdges.test.ts
git commit -m "Add clean-edge renderer: fill plus feature edges, in place

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Walk-in clip sampling and camera pose

**Files:**
- Create: `office/walkin/clipSampler.ts`, `office/walkin/clipSampler.test.ts`, `office/walkin/cameraPose.ts`, `office/walkin/cameraPose.test.ts`

**Interfaces:**
- Produces:
  - `progressToTime(progress: number, duration: number): number`, clamped to 0–1 (NaN → 0)
  - `makeClipSampler(clip: AnimationClip, root: Object3D): (time: number) => void`, which writes position/quaternion/scale straight onto targets and clamps time to the clip
  - `findClipFor(clips: AnimationClip[], nodeName: string): AnimationClip`, which throws if none drives the node
  - `findCamera(root: Object3D, name: string): PerspectiveCamera`, which throws if missing or not perspective
  - `copyCameraPose(source: Camera, target: PerspectiveCamera): void`, which copies the world pose and vertical FOV

- [ ] **Step 1: Write the failing tests `office/walkin/clipSampler.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { AnimationClip, Group, PerspectiveCamera, Quaternion, QuaternionKeyframeTrack, VectorKeyframeTrack } from "three";
import { findClipFor, makeClipSampler, progressToTime } from "./clipSampler";

const TURN = new Quaternion(0, Math.SQRT1_2, 0, Math.SQRT1_2); // 90° about Y

function setup() {
  const root = new Group();
  const cam = new PerspectiveCamera();
  cam.name = "cam_walkin";
  root.add(cam);
  const clip = new AnimationClip("cam_walkinAction", 10, [
    new VectorKeyframeTrack("cam_walkin.position", [0, 10], [0, 90, 180, 0, 1.6, 1.6]),
    new QuaternionKeyframeTrack("cam_walkin.quaternion", [0, 10], [0, 0, 0, 1, ...TURN.toArray()]),
  ]);
  return { root, cam, clip, sample: makeClipSampler(clip, root) };
}

describe("progressToTime", () => {
  it.each([
    [0.5, 5],
    [0, 0],
    [1, 10],
    [-0.2, 0], // iOS rubber-band above the top
    [1.3, 10], // flick past the bottom
    [Number.NaN, 0],
  ])("%d → %d s", (progress, seconds) => expect(progressToTime(progress, 10)).toBe(seconds));
});

describe("makeClipSampler", () => {
  it("evaluates position at an exact time", () => {
    const { cam, sample } = setup();
    sample(5);
    expect(cam.position.y).toBeCloseTo(45.8);
    expect(cam.position.z).toBeCloseTo(90.8);
  });

  it("slerps rotation", () => {
    const { cam, sample } = setup();
    sample(5);
    expect(cam.quaternion.angleTo(new Quaternion().slerp(TURN, 0.5))).toBeLessThan(1e-4);
  });

  it("scrubs backwards after reaching the end", () => {
    const { cam, sample } = setup();
    sample(10);
    expect(cam.position.z).toBeCloseTo(1.6);
    sample(2);
    expect(cam.position.z).toBeCloseTo(180 - (180 - 1.6) * 0.2);
  });

  it("clamps times outside the clip", () => {
    const { cam, sample } = setup();
    sample(-3);
    expect(cam.position.z).toBeCloseTo(180);
    sample(99);
    expect(cam.position.z).toBeCloseTo(1.6);
  });

  it("names a track whose node is missing", () => {
    const { clip } = setup();
    expect(() => makeClipSampler(clip, new Group())).toThrow(/cam_walkin\.position/);
  });
});

describe("findClipFor", () => {
  it("finds the clip that drives a node", () => {
    const { clip } = setup();
    const other = new AnimationClip("door", 1, [new VectorKeyframeTrack("door.position", [0, 1], [0, 0, 0, 1, 0, 0])]);
    expect(findClipFor([other, clip], "cam_walkin")).toBe(clip);
  });

  it("throws when nothing drives it", () => {
    expect(() => findClipFor([], "cam_walkin")).toThrow(/cam_walkin/);
  });
});
```

- [ ] **Step 2: Write the failing tests `office/walkin/cameraPose.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { Group, Object3D, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { copyCameraPose, findCamera } from "./cameraPose";

describe("copyCameraPose", () => {
  it("puts the target exactly at the source's world pose, through a transformed parent", () => {
    const parent = new Group();
    parent.position.set(10, 0, 0);
    parent.rotation.y = Math.PI / 2;
    const source = new PerspectiveCamera(35);
    source.position.set(0, 2, 5);
    source.rotation.x = -0.3;
    parent.add(source);
    const target = new PerspectiveCamera(50);

    copyCameraPose(source, target);

    expect(target.position.distanceTo(source.getWorldPosition(new Vector3()))).toBeLessThan(1e-9);
    expect(target.quaternion.angleTo(source.getWorldQuaternion(new Quaternion()))).toBeLessThan(1e-6);
  });

  it("matches the vertical field of view and refreshes the projection", () => {
    const source = new PerspectiveCamera(35);
    const target = new PerspectiveCamera(50, 1.5, 0.1, 10000);
    copyCameraPose(source, target);
    expect(target.fov).toBe(35);
    expect(target.projectionMatrix.equals(new PerspectiveCamera(35, 1.5, 0.1, 10000).projectionMatrix)).toBe(true);
  });
});

describe("findCamera", () => {
  it("finds a perspective camera by name", () => {
    const root = new Group();
    const cam = new PerspectiveCamera();
    cam.name = "cam_stand";
    root.add(cam);
    expect(findCamera(root, "cam_stand")).toBe(cam);
  });

  it("throws for a missing node or one that isn't a camera", () => {
    const root = new Group();
    const notCam = new Object3D();
    notCam.name = "cam_stand";
    root.add(notCam);
    expect(() => findCamera(root, "cam_stand")).toThrow(/cam_stand/);
    expect(() => findCamera(root, "cam_walkin")).toThrow(/cam_walkin/);
  });
});
```

- [ ] **Step 3: Run to verify both fail**

Run: `npx vitest run office/walkin`
Expected: FAIL, `Failed to load url ./clipSampler` and `./cameraPose`.

- [ ] **Step 4: Implement `office/walkin/clipSampler.ts`**

```ts
import { PropertyBinding, type AnimationClip, type Interpolant, type Object3D } from "three";

type Property = "position" | "quaternion" | "scale";
type Binding = { target: Object3D; property: Property; interpolant: Interpolant };

/** Scroll progress → time on a clip. Out-of-range progress (rubber-band, overshoot) clamps. */
export function progressToTime(progress: number, duration: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(1, Math.max(0, progress)) * duration;
}

/**
 * Evaluates `clip` at an exact time and writes the values straight onto the targets. Used instead of
 * AnimationMixer because scroll scrubs both ways: a LoopOnce action pauses at its end and ignores later
 * times, and LoopRepeat wraps the final frame back to the first.
 */
export function makeClipSampler(clip: AnimationClip, root: Object3D): (time: number) => void {
  const bindings: Binding[] = [];
  for (const track of clip.tracks) {
    const { nodeName, propertyName } = PropertyBinding.parseTrackName(track.name);
    const target = nodeName ? root.getObjectByName(nodeName) : undefined;
    if (!target) throw new Error(`Animation track "${track.name}" targets a node that isn't in the scene`);
    if (propertyName === "position" || propertyName === "quaternion" || propertyName === "scale") {
      bindings.push({ target, property: propertyName, interpolant: track.createInterpolant() });
    }
  }
  return (time) => {
    const t = Math.min(clip.duration, Math.max(0, time));
    for (const { target, property, interpolant } of bindings) {
      target[property].fromArray(interpolant.evaluate(t) as number[]);
    }
  };
}

/** The clip with tracks on `nodeName`. Blender names it "<object>Action", so match tracks, not names. */
export function findClipFor(clips: AnimationClip[], nodeName: string): AnimationClip {
  const clip = clips.find((c) => c.tracks.some((t) => t.name.startsWith(`${nodeName}.`)));
  if (!clip) throw new Error(`No animation drives "${nodeName}"`);
  return clip;
}
```

- [ ] **Step 5: Implement `office/walkin/cameraPose.ts`**

```ts
import { Vector3, type Camera, type Object3D, type PerspectiveCamera } from "three";

const scale = new Vector3();

/** A perspective camera exported from Blender, by node name. */
export function findCamera(root: Object3D, name: string): PerspectiveCamera {
  const obj = root.getObjectByName(name) as PerspectiveCamera | undefined;
  if (!obj?.isPerspectiveCamera) throw new Error(`"${name}" is missing from the model or isn't a perspective camera`);
  return obj;
}

/** Puts `target` exactly where `source` is in world space and matches its vertical FOV. */
export function copyCameraPose(source: Camera, target: PerspectiveCamera): void {
  source.updateWorldMatrix(true, false);
  source.matrixWorld.decompose(target.position, target.quaternion, scale);
  const fov = (source as PerspectiveCamera).isPerspectiveCamera ? (source as PerspectiveCamera).fov : target.fov;
  if (target.fov !== fov) {
    target.fov = fov;
    target.updateProjectionMatrix();
  }
}
```

The projection test builds `target` with fov 50 and expects 35 after the copy, so `updateProjectionMatrix` runs.

- [ ] **Step 6: Run to verify it passes**

Run: `npm test`
Expected: PASS, all suites green.

- [ ] **Step 7: Commit**

```bash
git add office/walkin/clipSampler.ts office/walkin/clipSampler.test.ts office/walkin/cameraPose.ts office/walkin/cameraPose.test.ts
git commit -m "Add walk-in clip sampler and camera pose copy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Office route with the scroll-driven canvas

**Files:**
- Create: `office/walkin/useWalkInProgress.ts`, `office/OfficeCanvas.tsx`, `office/OfficeErrorBoundary.tsx`, `office/OfficeExperience.tsx`, `app/(office)/layout.tsx`, `app/(office)/page.tsx`, `app/(office)/office.css`, `playwright.config.ts`, `e2e/office.spec.ts`
- Modify: `lib/gsap.ts` (trim), `package.json` (R3F, drei, Playwright, `test:e2e`), `.gitignore`
- Delete: `app/(main)/page.tsx` (the old home; `/` now belongs to `(office)`)

**Interfaces:**
- Consumes: `theme` and `applyCleanEdges`/`setLineResolution` (Task 8); `progressToTime`, `makeClipSampler`, `findClipFor`, `findCamera`, `copyCameraPose` (Task 9); `office/manifest.json` (Task 4); `public/models/*.glb` (Task 7).
- Produces:
  - `useWalkInProgress(track: RefObject<HTMLElement | null>, smoothing?: number): RefObject<number>`
  - the `.office` host element with `data-walkin-progress` (4 decimals) and `data-scene-ready="true"` after the first frame. Tests and later phases read these.
  - `.office-fallback` on failure
  - `lib/gsap.ts` exports `gsap, useGSAP, ScrollTrigger` only

- [ ] **Step 1: Install the 3D and e2e dependencies**

```bash
npm install @react-three/fiber@^9.8.1 @react-three/drei@^10.7.9
npm install -D @playwright/test@^1.63.0
npx playwright install chromium
npm pkg set scripts.test:e2e="playwright test"
printf "\n# playwright\n/test-results/\n/playwright-report/\n" >> .gitignore
```

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3010",
    // Headless Chromium has no GPU; SwiftShader gives it software WebGL.
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
  },
  webServer: { command: "npm run dev", url: "http://localhost:3010", reuseExistingServer: true, timeout: 180_000 },
});
```

- [ ] **Step 3: Write the failing e2e tests `e2e/office.spec.ts`**

```ts
import { test, expect, type Page } from "@playwright/test";

const office = (page: Page) => page.locator(".office");
const progress = async (page: Page) => Number(await office(page).getAttribute("data-walkin-progress"));

async function openOffice(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  return errors;
}

test("the walk-in starts on the street and ends at the standing spot", async ({ page }) => {
  const errors = await openOffice(page);
  expect(await progress(page)).toBeLessThan(0.01);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => progress(page), { timeout: 15_000 }).toBeGreaterThan(0.999);
  expect(errors).toEqual([]);
});

test("scrolling back up after the end plays the walk-in in reverse", async ({ page }) => {
  await openOffice(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => progress(page), { timeout: 15_000 }).toBeGreaterThan(0.999);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.4));
  await expect.poll(() => progress(page), { timeout: 15_000 }).toBeLessThan(0.6);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => progress(page), { timeout: 15_000 }).toBeLessThan(0.001);
});

test("overshooting either end clamps, including the End key", async ({ page }) => {
  await openOffice(page);
  await page.evaluate(() => window.scrollTo(0, 10_000_000));
  await expect.poll(() => progress(page), { timeout: 15_000 }).toBeGreaterThan(0.999);
  expect(await progress(page)).toBeLessThanOrEqual(1);
  await page.keyboard.press("Home");
  await expect.poll(() => progress(page), { timeout: 15_000 }).toBeLessThan(0.001);
  await page.keyboard.press("End");
  await expect.poll(() => progress(page), { timeout: 15_000 }).toBeGreaterThan(0.999);
});

test("rotating to a phone viewport keeps the canvas filling the screen", async ({ page }) => {
  const errors = await openOffice(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const canvas = page.locator(".office-stage canvas");
  await expect.poll(() => canvas.evaluate((c) => `${c.clientWidth}x${c.clientHeight}`)).toBe("390x844");
  expect(errors).toEqual([]);
});

test("a missing model shows the fallback with links, not a blank screen", async ({ page }) => {
  await page.route("**/models/street.glb", (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto("/");
  await expect(page.locator(".office-fallback")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("link", { name: "See the work" })).toHaveAttribute("href", "/work");
  await expect(page.getByRole("link", { name: "Get in touch" })).toHaveAttribute("href", "/contact");
});

test("the old pages still work while the office takes over /", async ({ page }) => {
  const response = await page.goto("/work");
  expect(response?.status()).toBe(200);
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `npm run test:e2e`
Expected: FAIL. `/` still serves the old home, so `.office` is never found and the waits time out. `/work` passes.

- [ ] **Step 5: Trim `lib/gsap.ts` to what the build uses**

Replace the whole file:

```ts
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Single registration point for GSAP. Import `gsap`, `useGSAP` and plugins from here (never straight
 * from "gsap/*") so registration runs once, and only in bundles that animate with GSAP. Add a plugin
 * here when a feature starts using it.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger);

export { gsap, useGSAP, ScrollTrigger };
```

- [ ] **Step 6: Create `office/walkin/useWalkInProgress.ts`**

```ts
"use client";

import { useRef, type RefObject } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Walk-in progress through `track`: 0 when its top meets the viewport top, 1 when its bottom meets the
 * viewport bottom, smoothed by GSAP scrub. Read `.current` inside useFrame; it never causes a render.
 */
export function useWalkInProgress(track: RefObject<HTMLElement | null>, smoothing = 0.8): RefObject<number> {
  const progress = useRef(0);
  useGSAP(
    () => {
      if (!track.current) return;
      const proxy = { p: 0 };
      const tween = gsap.to(proxy, {
        p: 1,
        ease: "none",
        onUpdate: () => {
          progress.current = proxy.p;
        },
        scrollTrigger: { trigger: track.current, start: "top top", end: "bottom bottom", scrub: smoothing },
      });
      // Start where the page already is (e.g. a restored scroll position), not back on the street.
      const trigger = tween.scrollTrigger;
      if (trigger) {
        tween.progress(trigger.progress);
        progress.current = proxy.p;
      }
    },
    { dependencies: [smoothing] },
  );
  return progress;
}
```

- [ ] **Step 7: Create `office/OfficeCanvas.tsx`**

```tsx
"use client";

import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { PerspectiveCamera } from "three";
import manifest from "./manifest.json";
import { theme } from "./theme";
import { applyCleanEdges, setLineResolution } from "./style/cleanEdges";
import { findClipFor, makeClipSampler, progressToTime } from "./walkin/clipSampler";
import { copyCameraPose, findCamera } from "./walkin/cameraPose";

const WALKIN_CAMERA = "cam_walkin";

export type OfficeCanvasProps = {
  /** Walk-in progress 0 → 1. Read every frame; never causes a render. */
  progress: RefObject<number>;
  /** Carries data-scene-ready and data-walkin-progress for the page and for tests. */
  host: RefObject<HTMLElement | null>;
};

/** Loads a model and restyles it as clean edges, keeping line widths right on resize. */
function useCleanEdges(url: string) {
  const gltf = useGLTF(url);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const handle = useMemo(
    () =>
      applyCleanEdges(gltf.scene, {
        background: theme.background,
        line: theme.line,
        lineWidth: theme.lineWidth,
        thresholdDeg: theme.edgeThresholdDeg,
      }),
    [gltf.scene],
  );
  useEffect(() => setLineResolution(handle, width, height), [handle, width, height]);
  return gltf;
}

function Street({ progress, host }: OfficeCanvasProps) {
  const street = useCleanEdges(manifest.street.url);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const walkIn = useMemo(() => {
    const clip = findClipFor(street.animations, WALKIN_CAMERA);
    return { duration: clip.duration, sample: makeClipSampler(clip, street.scene), source: findCamera(street.scene, WALKIN_CAMERA) };
  }, [street]);
  const written = useRef(-1);

  useFrame(() => {
    const p = progress.current;
    walkIn.sample(progressToTime(p, walkIn.duration));
    copyCameraPose(walkIn.source, camera);
    const el = host.current;
    if (el && Math.abs(p - written.current) > 0.00005) {
      el.dataset.walkinProgress = p.toFixed(4);
      el.dataset.sceneReady = "true";
      written.current = p;
    }
  });

  return <primitive object={street.scene} />;
}

function Office() {
  const office = useCleanEdges(manifest.office.url);
  return <primitive object={office.scene} />;
}

export default function OfficeCanvas({ progress, host }: OfficeCanvasProps) {
  return (
    <Canvas dpr={[1, 2]} camera={{ fov: 50, near: 0.1, far: 10000 }} gl={{ antialias: true }}>
      <color attach="background" args={[theme.background]} />
      <fog attach="fog" args={[theme.background, theme.fogNear, theme.fogFar]} />
      <Suspense fallback={null}>
        <Street progress={progress} host={host} />
        {/* The office streams in separately so the street can show first. */}
        <Suspense fallback={null}>
          <Office />
        </Suspense>
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(manifest.street.url);
```

- [ ] **Step 8: Create `office/OfficeErrorBoundary.tsx`**

```tsx
"use client";

import { Component, type ReactNode, type RefObject } from "react";

type Props = { host: RefObject<HTMLElement | null>; children: ReactNode };

/** If the 3D can't load or crashes, show the way to the content instead of a black screen. */
export default class OfficeErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[office] 3D scene failed, showing the fallback", error);
    this.props.host.current?.setAttribute("data-office-fallback", "true");
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="office-fallback" role="status">
        <p>The office didn&apos;t load. The work&apos;s still here though.</p>
        <p>
          <a href="/work">See the work</a> · <a href="/contact">Get in touch</a>
        </p>
      </div>
    );
  }
}
```

- [ ] **Step 9: Create `office/OfficeExperience.tsx`**

```tsx
"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import OfficeErrorBoundary from "./OfficeErrorBoundary";
import { theme } from "./theme";
import { useWalkInProgress } from "./walkin/useWalkInProgress";

// three.js never runs on the server and never ships to pages that don't render the office.
const OfficeCanvas = dynamic(() => import("./OfficeCanvas"), { ssr: false });

/** Fixed full-screen office over a scroll track exactly as long as the walk-in. */
export default function OfficeExperience() {
  const host = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const progress = useWalkInProgress(track);

  return (
    <div ref={host} className="office" data-walkin-progress="0">
      <div className="office-stage">
        <OfficeErrorBoundary host={host}>
          <OfficeCanvas progress={progress} host={host} />
        </OfficeErrorBoundary>
      </div>
      <div ref={track} className="office-track" style={{ height: `${theme.walkInScreens * 100}vh` }} aria-hidden="true" />
    </div>
  );
}
```

- [ ] **Step 10: Create the route group**

`app/(office)/office.css`:

```css
:root {
  color-scheme: dark;
  --office-bg: #0b0b0b;
  --office-fg: #e8e8e8;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  background: var(--office-bg);
  color: var(--office-fg);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}

.office-stage {
  position: fixed;
  inset: 0;
}

.office-fallback {
  position: fixed;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 4px;
  padding: 16px;
  text-align: center;
}

.office-fallback a {
  color: inherit;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
```

`app/(office)/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./office.css";

// Carried over from the old site; phase 5 rewrites the description in Kasper's voice.
const SITE_TITLE = "Kasper Simonsen — Independent Software Engineering";
const SITE_DESCRIPTION =
  "Independent software engineer in Melbourne. Custom web, mobile & AI systems when off-the-shelf won't do — Shopify, industrial automation, multi-tenant SaaS.";

export const metadata: Metadata = {
  metadataBase: new URL("https://kaspersimonsen.dev"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
};

export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

`app/(office)/page.tsx`:

```tsx
import OfficeExperience from "@/office/OfficeExperience";

export default function Home() {
  return (
    <main>
      <h1 className="visually-hidden">Kasper Simonsen, independent software engineer in Cremorne, Melbourne</h1>
      <OfficeExperience />
    </main>
  );
}
```

Then remove the old home so `/` resolves only to `(office)`:

```bash
git rm "app/(main)/page.tsx"
```

- [ ] **Step 11: Run unit and e2e tests**

Run: `npm test && npm run test:e2e`
Expected: PASS, all unit suites and all 6 e2e tests green. If the first e2e run times out on `data-scene-ready`, run it once more: the first dev compile of the three.js chunk can exceed the timeout. If it still fails, read the console via `npx playwright test --headed --debug` and don't raise timeouts.

- [ ] **Step 12: Type-check and build**

Run: `npm run build`
Expected: `prebuild` prints `Models OK`, and the build succeeds with `/` listed as a route.

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json .gitignore lib/gsap.ts playwright.config.ts e2e/office.spec.ts office/walkin/useWalkInProgress.ts office/OfficeCanvas.tsx office/OfficeErrorBoundary.tsx office/OfficeExperience.tsx "app/(office)/layout.tsx" "app/(office)/page.tsx" "app/(office)/office.css"
git commit -m "Office route at / with the scroll-driven grey-box walk-in

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`git rm` in Step 10 already staged the old home's deletion, and it's included in this commit.)

---

### Task 11: Look-dev: accent colour and UI typefaces (with Kasper)

**Files:**
- Create (throwaway, not committed): `.superpowers/brainstorm/<session>/content/lookdev.html`, plus copies of both GLBs next to it
- Modify: `office/theme.ts` (adds `accent`), `app/(office)/layout.tsx` (fonts), `app/(office)/office.css` (font variables)

**Interfaces:**
- Consumes: `public/models/office.glb` (Task 7).
- Produces: `theme.accent` (hex string), CSS variables `--font-ui` and `--font-mono` on `<html>`. Phase 3 uses `theme.accent` for hover; the panels use the fonts.

- [ ] **Step 1: Make sure the visual companion is running**

Check that `.superpowers/brainstorm/*/state/server-info` exists and `server-stopped` doesn't. If it stopped, restart it with the same project dir (it reuses the port, so Kasper's tab reconnects). Run this in Bash with `run_in_background: true`:

```bash
bash "/c/Users/Work/.claude/plugins/cache/claude-plugins-official/superpowers/6.4.1/skills/brainstorming/scripts/start-server.sh" --project-dir /c/dev/KasperSimonsen.dev --open
```

Read `screen_dir` and `url` from `state/server-info`.

- [ ] **Step 2: Copy the model into the screen dir**

```bash
cp public/models/office.glb "<screen_dir>/office.glb"
```

- [ ] **Step 3: Write `<screen_dir>/lookdev.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Office accent and type</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600&family=JetBrains+Mono&family=Inter+Tight:wght@400;600&family=IBM+Plex+Mono&family=Archivo:wght@400;600&family=DM+Mono&display=swap" rel="stylesheet">
<style>
  :root { --accent: #2EF2FF; --ui: "Space Grotesk"; --mono: "JetBrains Mono"; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #0b0b0b; color: #e8e8e8; font: 15px/1.5 system-ui, sans-serif; }
  main { max-width: 1280px; margin: 0 auto; padding: 28px 16px 64px; }
  h2 { margin: 0 0 6px; font-size: 24px; }
  .subtitle { color: #8a8a8a; margin: 0 0 22px; max-width: 820px; }
  .layout { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 16px; }
  @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } }
  .view { aspect-ratio: 16 / 10; border: 1px solid #262626; border-radius: 8px; overflow: hidden; }
  .view canvas { display: block; width: 100% !important; height: 100% !important; }
  .panel { border-left: 1px solid rgba(255,255,255,.18); padding: 8px 0 8px 20px; font-family: var(--ui), sans-serif; }
  .eyebrow { font-family: var(--mono), monospace; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--accent); }
  .panel h3 { font-size: 30px; margin: 6px 0 10px; font-weight: 600; letter-spacing: -.01em; }
  .panel p { color: #bdbdbd; }
  .cta { display: inline-block; margin-top: 8px; color: #0b0b0b; background: var(--accent); padding: 8px 14px; border-radius: 4px; text-decoration: none; font-weight: 600; }
  h4 { margin: 26px 0 10px; font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: #8a8a8a; }
  .choices { display: flex; flex-wrap: wrap; gap: 10px; }
  .choices button { background: #141414; color: #e8e8e8; border: 1px solid #2a2a2a; border-radius: 6px; padding: 10px 14px; cursor: pointer; font: inherit; display: flex; align-items: center; gap: 10px; }
  .choices button.selected { border-color: #fff; box-shadow: 0 0 0 1px #fff; }
  .chip { width: 18px; height: 18px; border-radius: 3px; }
</style>
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/"
} }
</script>
</head>
<body>
<main>
  <h2>Accent colour and typefaces</h2>
  <p class="subtitle">The grey-box office from the standing spot. The accent lights the four clickable objects (crate, drawer, monitor, shelf) the way hover will, and colours the label and button in the sample panel. Pick one accent and one type pairing, then tell me in the terminal.</p>
  <div class="layout">
    <div class="view" id="view"></div>
    <aside class="panel">
      <div class="eyebrow">Work · Manuva</div>
      <h3>Manufacturing operations under the storefront</h3>
      <p>Sample paragraph so you can judge the body face at reading size. The real copy comes from the case study when the panels are built.</p>
      <a class="cta" href="#" onclick="return false">Read the case study</a>
    </aside>
  </div>

  <h4>Accent</h4>
  <div class="choices" data-group="accent">
    <button data-value="#2EF2FF"><span class="chip" style="background:#2EF2FF"></span>Cyan</button>
    <button data-value="#C6FF3D"><span class="chip" style="background:#C6FF3D"></span>Lime</button>
    <button data-value="#FF3B30"><span class="chip" style="background:#FF3B30"></span>Signal red</button>
    <button data-value="#FFB224"><span class="chip" style="background:#FFB224"></span>Amber</button>
  </div>

  <h4>Type pairing</h4>
  <div class="choices" data-group="type">
    <button data-value="A" data-ui="Space Grotesk" data-mono="JetBrains Mono" style="font-family:'Space Grotesk'">A · Space Grotesk + JetBrains Mono</button>
    <button data-value="B" data-ui="Inter Tight" data-mono="IBM Plex Mono" style="font-family:'Inter Tight'">B · Inter Tight + IBM Plex Mono</button>
    <button data-value="C" data-ui="Archivo" data-mono="DM Mono" style="font-family:'Archivo'">C · Archivo + DM Mono</button>
  </div>
</main>

<script>
  document.querySelectorAll(".choices").forEach((group) => {
    group.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      group.querySelectorAll("button").forEach((b) => b.classList.remove("selected"));
      button.classList.add("selected");
      if (group.dataset.group === "accent") {
        document.documentElement.style.setProperty("--accent", button.dataset.value);
        window.setAccent?.(button.dataset.value);
      } else {
        document.documentElement.style.setProperty("--ui", `"${button.dataset.ui}"`);
        document.documentElement.style.setProperty("--mono", `"${button.dataset.mono}"`);
      }
      window.brainstorm?.choice(`${group.dataset.group}:${button.dataset.value}`, { text: button.textContent.trim() });
    });
  });
</script>

<script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

const host = document.getElementById("view");
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
host.append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#0b0b0b");

const fill = new THREE.MeshBasicMaterial({ color: "#0b0b0b", side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
const plain = new LineMaterial({ color: "#e8e8e8", linewidth: 1.3 });
const accent = new LineMaterial({ color: "#2EF2FF", linewidth: 1.6 });
window.setAccent = (hex) => accent.color.set(hex);

const isHotspot = (obj) => { for (let o = obj; o; o = o.parent) if (o.name.startsWith("hs_")) return true; return false; };

const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync("/files/office.glb");
const meshes = [];
gltf.scene.traverse((o) => o.isMesh && meshes.push(o));
for (const mesh of meshes) {
  mesh.material = fill;
  const lines = new LineSegments2(new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(mesh.geometry, 20)), isHotspot(mesh) ? accent : plain);
  mesh.add(lines);
}
scene.add(gltf.scene);
const camera = gltf.scene.getObjectByName("cam_stand");

function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  plain.resolution.set(w, h);
  accent.resolution.set(w, h);
}
new ResizeObserver(resize).observe(host);
resize();
renderer.setAnimationLoop(() => renderer.render(scene, camera));
</script>
</body>
</html>
```

- [ ] **Step 4: Verify the screen renders, then hand it to Kasper**

Open the companion URL in a Chrome MCP tab. Check the office renders with the four hotspots in cyan and no console errors (`read_console_messages`, `onlyErrors: true`). Close the tab. Tell Kasper the URL and what's on screen, ask him to pick one accent and one pairing, and **end the turn**. On the next turn read `state/events` and his reply.

- [ ] **Step 5: Record the accent**

Add `accent` to `office/theme.ts`, after `line`, using the hex for Kasper's pick:

| Pick | Line to add |
|---|---|
| Cyan | `accent: "#2EF2FF",` |
| Lime | `accent: "#C6FF3D",` |
| Signal red | `accent: "#FF3B30",` |
| Amber | `accent: "#FFB224",` |

Also change the file's doc comment from "Accent and UI typefaces are added by the phase 1 look-dev task." to "Accent picked by Kasper in phase 1 look-dev."

- [ ] **Step 6: Load the fonts in `app/(office)/layout.tsx`**

Add the import and constants for Kasper's pick under the existing imports. Then set `className={`${ui.variable} ${mono.variable}`}` on `<html>`.

| Pick | Code |
|---|---|
| A | `import { JetBrains_Mono, Space_Grotesk } from "next/font/google";`<br>`const ui = Space_Grotesk({ variable: "--font-ui", subsets: ["latin"], display: "swap" });`<br>`const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });` |
| B | `import { IBM_Plex_Mono, Inter_Tight } from "next/font/google";`<br>`const ui = Inter_Tight({ variable: "--font-ui", subsets: ["latin"], display: "swap" });`<br>`const mono = IBM_Plex_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400"], display: "swap" });` |
| C | `import { Archivo, DM_Mono } from "next/font/google";`<br>`const ui = Archivo({ variable: "--font-ui", subsets: ["latin"], display: "swap" });`<br>`const mono = DM_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400"], display: "swap" });` |

In `app/(office)/office.css`, change the `html, body` font-family line to:

```css
  font-family: var(--font-ui), system-ui, -apple-system, "Segoe UI", sans-serif;
```

- [ ] **Step 7: Verify nothing broke**

Run: `npm test && npm run test:e2e && npm run build`
Expected: all green. The build shows no font errors.

- [ ] **Step 8: Clear the companion screen and commit**

Write `<screen_dir>/waiting-lookdev.html` containing `<div style="display:flex;align-items:center;justify-content:center;min-height:60vh"><p class="subtitle">Look-dev recorded. Continuing in the terminal...</p></div>`. Then:

```bash
git add office/theme.ts "app/(office)/layout.tsx" "app/(office)/office.css"
git commit -m "Set office accent colour and UI typefaces from look-dev

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Grey-box walk-in review with Kasper

This is the phase 1 deliverable. Pacing and framing get tuned here, before any detailed modelling.

**Files:**
- Modify (as feedback requires): `scripts/blender/greybox_office.py` (`WALKIN_KEYS`, `PORTRAIT`, `CAMERA_FOV_DEG`), `office/theme.ts` (`walkInScreens`, `fogNear`, `fogFar`, `lineWidth`), `art/office.blend`, `public/models/*.glb`

- [ ] **Step 1: Full green run**

Run: `npm test && npm run test:e2e && npm run build`
Expected: all green. Fix anything that isn't before involving Kasper.

- [ ] **Step 2: Capture the walk-in for review**

Start `npm run dev` (background). In a Chrome MCP tab at 1440×900, open `http://localhost:3010`. Wait for `data-scene-ready`, then scroll to 0%, 45%, 70%, 85% and 100% of the page height. Screenshot each (`save_to_disk: true`). Repeat at 390×844 for 0% and 100%.

Check yourself first:
- **0%:** The Commons, the Nylex sign and AAMI Park are all in frame.
- **70%:** the doorway is centred.
- **100%:** the crate, desk, monitor and shelf are all visible.
- **Portrait 100%:** note what's cut off. Portrait framing is finished in phase 3, but flag it now.

Close the tab.

- [ ] **Step 3: Kasper scrolls it himself**

Tell Kasper to open http://localhost:3010 and scroll. Summarise what the screenshots showed and ask about pacing (too fast or slow overall, where it drags), the opening framing, and the descent path. **End the turn** and wait.

- [ ] **Step 4: Apply feedback**

Map each piece of feedback to its knob:

| Feedback | Knob |
|---|---|
| Whole walk-in too fast or slow | `theme.walkInScreens` (more screens = slower) |
| One stretch drags or rushes | the scroll fractions in `WALKIN_KEYS` |
| Opening shot framing | `WALKIN_KEYS[0]` eye / look-at |
| Descent path | `WALKIN_KEYS[1]` (add keys if needed; keep fractions ascending) |
| Too much or too little city | `theme.fogNear` / `theme.fogFar` |
| Lines too thin or heavy | `theme.lineWidth` |

After any `WALKIN_KEYS` change, re-run in Blender:

```python
import runpy
runpy.run_path(r"C:\dev\KasperSimonsen.dev\scripts\blender\greybox_office.py", run_name="__main__")
result = runpy.run_path(r"C:\dev\KasperSimonsen.dev\scripts\blender\export.py", run_name="__main__")["SUMMARY"]
```

then `npm run build:models && npm run check:models`. Repeat Steps 2–4 until Kasper says the pacing and framing are right.

- [ ] **Step 5: Commit the approved walk-in**

```bash
git add scripts/blender/greybox_office.py office/theme.ts art/office.blend public/models/street.glb public/models/office.glb
git commit -m "Tune grey-box walk-in pacing and framing with Kasper

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Skip the commit if nothing changed.)

- [ ] **Step 6: Offer the preview deploy**

Ask Kasper whether to push `redesign/office` to GitHub for a Vercel preview. Don't push without a yes. It's the first push of this branch and uploads `art/office.blend` to Git LFS storage. If he says yes:

```bash
git push -u origin redesign/office
```

Then report the preview URL once Vercel builds it. Use the Vercel MCP `list_deployments` for the project, filtered to the branch.
