# Neon Sign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hang the KS mark over the couch as a white neon sign that powers up when the visitor arrives, steps its rope round like the Skipping Girl sign, hops, and stutters now and then.

**Architecture:**
- **Pure modules:** `mark.ts` holds the mark's geometry in its 240-unit design grid, and `sequence.ts` turns a power state and a clock into tube brightness and a hop.
- **`sign.ts`:** builds the sign as three.js fat lines (`Line2`) and applies a frame to them.
- **`NeonSign.tsx`:** mounts the sign on an empty that Blender places on the left wall, runs the power state off the director, and writes `data-neon`.

**Tech Stack:** Next 16, React 19, @react-three/fiber 9, three.js `Line2`/`LineMaterial`/`LineGeometry` (`three/addons/lines/`), Vitest, Playwright (SwiftShader), Blender 5.2, @gltf-transform via `scripts/models/io.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-07-office-neon-sign-design.md` (read it first). It builds on `docs/superpowers/specs/2026-10-02-office-interactions-design.md`.

## Global Constraints

- **Branch** `redesign/office`.
- **Staging:** stage explicit paths only, never `git add -A`. `public/screenshots/` holds unblurred client shots and is never committed.
- **Commits:** end every commit message with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Jjx85kn9FwW2aWf7yaVbPn
  ```
- **Push:** never push.
- **One headless browser at a time** (Kasper's PC chokes):
  - Playwright always runs with `--workers=1`, one spec file per command;
  - no screenshot script runs while a test does.
- **Dev server:** never start one. `http://localhost:3010` is the shared one; Playwright reuses it.
- **Blender:** one agent drives it at a time. Run it in the background from the command line: `"/c/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b art/office.blend --python <script>`.
- **Next.js:** this version differs from training data. Before touching Next APIs, read `node_modules/next/dist/docs/`. This plan touches none.
- **Colours:** lit tube `#FFF4E2`; unlit tube `#3A3A3A`; the gap line is `theme.background` (`#0b0b0b`). No section colour anywhere on the sign.
- **Timing:**
  - rope step 0.2 s;
  - power-up 0.6 s;
  - a bad tube every 8–20 s, each lasting ~0.3 s, with at most two dips;
  - hop ~3 cm.
- **Size and place:** ~0.85 m square, on the left wall's face over the couch, at room frame (−2.25 + 0.02, 4.2, 1.78).
- **Not interactive:** no hover, label, dot, tour stop, glint or hidden-nav entry. Never raycast, never in the edge pipeline, never fogged or distance-faded.
- **Reduced motion:** straight to `on`, holding step 0 at full brightness. No stutter, stepping, hop or flicker.
- **Copy:** none.

## Review Focus

1. **A visitor who opens an object straight from the walk-in** (the hidden nav from the top of the page, where the director goes from `walkIn` to `focusing`): the sign must count that as in the room and power up. It must not wait for `idle`. Covered in Task 3 (`nextPower` takes `inRoom`) and Task 5 (`inRoom = director.kind !== "walkIn"`). Task 6 adds the e2e check.
2. **A long frame stall under software WebGL or a background tab:** the power-up must not be skipped in one frame, and the step must not jump wildly. The clock advances by at most 0.1 s a frame, as `useReel` does. Covered by the `clampDt` test in Task 4.
3. **Scrolling out mid power-up:** `off` must win at once. A visitor who bounces at the threshold gets a fresh power-up each time and never a half-lit sign left on. Covered by the `nextPower` test in Task 3.
4. **The sign under the pointer:** pointing at it must neither hover nor pick anything, and must not throw. `Line2.raycast` needs `raycaster.camera`, so every line's raycast is a no-op. Covered by a Task 4 test.
5. **A model without the anchor** (an older GLB, or a rename in Blender): the office must still load. The sign warns once and renders nothing, and the manifest test makes the rename fail the build. Covered in Task 1 and Task 5.

**Ruling recorded here:** the spec (3.1) says the sign powers up when "progress reaches 1 and the director is idle", and that it goes off below `LEAVE_AT`. The director already encodes both thresholds:
- `walkIn` becomes `idle` at `IDLE_AT`, which is 0.995;
- it goes back to `walkIn` below `LEAVE_AT`.

So "in the room" is `director.kind !== "walkIn"`, and nothing reads progress directly. That also covers a direct visit that opens an object.

---

## File structure

| File | Responsibility |
|---|---|
| `scripts/blender/greybox_office.py` | Places `prop_neon_sign` (an empty) on the left wall |
| `art/office.blend`, `public/models/office.glb`, `office/manifest.json` | The rebuilt model, and the anchor as a required node |
| `office/nodes.test.ts` | The anchor exists, faces into the room and is ~0.85 m |
| `office/neon/mark.ts` (+ `.test.ts`) | The mark's geometry: K, S, head, the six ropes, clipping, the tubes' polylines |
| `office/neon/sequence.ts` (+ `.test.ts`) | Power state machine and the timeline: brightness per tube, step, hop |
| `office/neon/sign.ts` (+ `.test.ts`) | three.js: builds the lines, applies a frame, sets line resolution, disposes |
| `office/neon/NeonSign.tsx` | R3F: mounts the sign on the anchor, drives it each frame, writes `data-neon` |
| `office/OfficeCanvas.tsx` | Renders `<NeonSign>` inside `Office` |
| `office/OfficeExperience.tsx` | `data-neon="off"` on `.office` initially |
| `e2e/office-neon.spec.ts` | Off in the walk-in, on after arriving, off after leaving, on again; reduced motion; drawer |

Tasks run in this order: 1 (Blender), 2 (`mark`), 3 (`sequence`), 4 (`sign`), 5 (`NeonSign` and wiring), 6 (e2e and look). Task 1 is independent of 2–4, but it goes first so Blender is done before any browser work.

---

### Task 1: The anchor on the wall

**Files:**
- Modify: `scripts/blender/greybox_office.py` (a `NEON_SIGN` constant near `WHITEBOARD`; the empty in `build_office`, after the Hang In There poster)
- Modify: `art/office.blend`, `public/models/office.glb`, `office/manifest.json`
- Test: `office/nodes.test.ts`

**Interfaces:**
- Produces: a node named `prop_neon_sign` in `office.glb`. In three.js world space:
  - local +Y is up;
  - local +Z points out of the wall into the room;
  - local +X runs along the wall towards the back wall, which is the sign's right as seen from the room;
  - its uniform scale is 0.85.

  Later tasks hang the sign's lines on it in a unit square, facing +Z.

- [ ] **Step 1: Write the failing test.** Add these to `office/nodes.test.ts`, inside the existing `describe` that reads the GLB. Add `NEON_NODE`'s import later, in Task 5; here use the literal.

```ts
  it("the neon sign's anchor hangs on the left wall over the couch, facing into the room (neon sign spec 6)", async () => {
    expect(manifest.office.nodes).toContain("prop_neon_sign");
    const doc = await (await createIO()).read("public/models/office.glb");
    const nodes = doc.getRoot().listNodes();
    const sign = nodes.find((n) => n.getName() === "prop_neon_sign")!;
    const stand = nodes.find((n) => n.getName() === "cam_stand")!;
    const couch = nodes.find((n) => n.getName() === "prop_couch")!;
    const m = sign.getWorldMatrix(); // column-major 4x4
    const axis = (c: number) => [m[c * 4], m[c * 4 + 1], m[c * 4 + 2]];
    const len = (v: number[]) => Math.hypot(...v);
    const unit = (v: number[]) => v.map((x) => x / len(v));
    const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
    const at = sign.getWorldTranslation();
    const toStand = unit(stand.getWorldTranslation().map((x, i) => x - at[i]));
    // ~0.85 m, uniform
    for (const c of [0, 1, 2]) expect(len(axis(c))).toBeCloseTo(0.85, 2);
    // up is up, and it faces the room: the standing spot is in front of it, not behind or edge-on
    expect(dot(unit(axis(1)), [0, 1, 0])).toBeGreaterThan(0.999);
    expect(dot(unit(axis(2)), toStand)).toBeGreaterThan(0.3);
    // over the couch: within the couch's footprint along the wall, ~1.78 m up
    const c = couch.getWorldTranslation();
    expect(Math.hypot(at[0] - c[0], at[2] - c[2])).toBeLessThan(1.0);
    expect(at[1]).toBeCloseTo(1.78, 1);
  });
```

If `prop_couch` is not a node name in the GLB (check with `node scripts/models/inspect.mjs public/models/office.glb` or the manifest), use the couch's actual root node. Report the name you used.

- [ ] **Step 2: Run it to see it fail.**
  Run: `npx vitest run office/nodes.test.ts`. It should fail on `prop_neon_sign`.

- [ ] **Step 3: Snapshot the office before rebuilding.** `art/office.blend` is Kasper's saved file (commit `60b6b91`), and `greybox_office.py` rebuilds the whole office collection and parts of the street one. Prove the rebuild changes nothing except the new empty. In the scratchpad, write `neon-snapshot.py`:

```python
import bpy, json, sys
out = sys.argv[sys.argv.index("--") + 1]
snap = {}
for o in [*bpy.data.collections["office"].all_objects, *bpy.data.collections["street"].all_objects]:
    snap[o.name] = {"type": o.type, "parent": o.parent.name if o.parent else None,
                    "matrix": [round(v, 5) for row in o.matrix_world for v in row],
                    "verts": len(o.data.vertices) if o.type == "MESH" else 0}
json.dump(snap, open(out, "w"), indent=0, sort_keys=True)
```

Run: `"/c/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b art/office.blend --python <scratch>/neon-snapshot.py -- <scratch>/office-before.json`

- [ ] **Step 4: Place the anchor.** In `greybox_office.py`, next to `WHITEBOARD`:

```python
# room frame: the neon sign's centre on the left wall's face (2 cm off it) over the couch, and its size (neon sign spec)
NEON_SIGN = (-ROOM[0] / 2 + 0.02, 4.2, 1.78, 0.85)
```

In `build_office`, after the `prop_poster_hang` line:

```python
    # the neon sign over the couch (neon sign spec 6): only its anchor, as the site draws the tubes. Turned like every
    # prop here so its -y faces into the room (glTF: +z out of the wall, +y up, +x along the wall towards the back).
    sign = common.empty("prop_neon_sign", NEON_SIGN[:3], room, col)
    sign.rotation_euler.z = math.pi / 2
    sign.scale = (NEON_SIGN[3],) * 3
```

- [ ] **Step 5: Rebuild, export, compare.**
  - Run `greybox_office.py`, then `export.py`, in one background Blender:
    `"/c/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b art/office.blend --python scripts/blender/greybox_office.py --python scripts/blender/export.py`
  - Snapshot again to `office-after.json`, then diff the two in a few lines of Node or Python.
  - **Expected:** the only difference is the added `prop_neon_sign`. If `public/models/street.glb` shows as changed after Step 6 while the street's snapshot is identical, restore it with `git checkout -- public/models/street.glb`: it's the same scene re-encoded.
  - **If any other object was added, removed or moved:** stop. Restore `art/office.blend`, `art/export/` and `public/models/office.glb` with `git checkout -- <paths>`, and report the differences to the controller. They're Kasper's hand edits, and the rebuild would lose them.

- [ ] **Step 6: Manifest and build.** Add `"prop_neon_sign"` to `office.nodes` in `office/manifest.json`.
  Run: `npm run build:models && npm run check:models && npx vitest run office/nodes.test.ts`
  **Expected:** models OK, the office under 2 MB, and the tests pass. If the facing assertion fails, the turn is wrong: check the sign's +Z in the GLB against the room centre, fix the `rotation_euler.z` sign and rebuild. Report the axes you found.

- [ ] **Step 7: Commit.**

```bash
git add scripts/blender/greybox_office.py art/office.blend art/export/office.glb public/models/office.glb office/manifest.json office/nodes.test.ts
git commit -m "Hang an anchor for the neon sign on the wall over the couch"
```

Check `git status` first: if `art/export/office.glb` isn't tracked (it may be git-ignored), leave it out.

---

### Task 2: The mark's geometry

**Files:**
- Create: `office/neon/mark.ts`
- Test: `office/neon/mark.test.ts`

**Interfaces:**
- Produces:
  - `type Pt = readonly [number, number]`, `type Polyline = Pt[]`;
  - `K: Polyline`, `S: Polyline` (closed: the last point equals the first), `HEAD: { cx; cy; r }`, `headRing(segments?: number): Polyline`;
  - `HANDS: { left: Pt; right: Pt }`, `ROPE_OFFSET = 72`, `STEPS = 6`, `BOX = { min: 44, max: 204 }`, `HOP = 6` (mark units);
  - `rope(step: number, samples?: number): Polyline`;
  - `ropeSide(step: number): "front" | "back"`;
  - `inside(p: Pt, poly: Polyline): boolean`;
  - `clipOutside(line: Polyline, shapes: Polyline[]): Polyline[]`;
  - `type TubeId = "k" | "s" | "head" | "rope0" | "rope1" | "rope2" | "rope3" | "rope4" | "rope5"`, `TUBES: readonly TubeId[]`;
  - `tubeLines(tube: TubeId): Polyline[]`.

  The coordinates are the 240-unit design grid, with y down (SVG).

- [ ] **Step 1: Write the failing test.** `office/neon/mark.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BOX, HANDS, HEAD, HOP, K, S, STEPS, TUBES, clipOutside, headRing, inside, rope, ropeSide, tubeLines } from "./mark";

const ys = (l: { 1: number }[]) => l.map((p) => p[1]);

describe("the mark (neon sign spec 6)", () => {
  it("draws the K, the S and the head as closed outlines inside the sign's box", () => {
    for (const shape of [K, S, headRing()]) {
      expect(shape[0]).toEqual(shape[shape.length - 1]);
      for (const [x, y] of shape) for (const v of [x, y]) expect(v).toBeGreaterThanOrEqual(BOX.min), expect(v).toBeLessThanOrEqual(BOX.max);
    }
  });

  it("swings every rope from hand to hand", () => {
    for (let step = 0; step < STEPS; step++) {
      const r = rope(step);
      expect(r[0][0]).toBeCloseTo(HANDS.left[0]), expect(r[0][1]).toBeCloseTo(HANDS.left[1]);
      expect(r.at(-1)![0]).toBeCloseTo(HANDS.right[0]), expect(r.at(-1)![1]).toBeCloseTo(HANDS.right[1]);
    }
  });

  it("clears the head overhead and the letters' feet underneath, hop and all", () => {
    expect(Math.min(...ys(rope(0)))).toBeLessThan(HEAD.cy - HEAD.r - 4);
    const bottom = Math.max(...ys(K), ...ys(S));
    expect(Math.max(...ys(rope(3)))).toBeGreaterThan(bottom + 2);
    expect(HOP).toBeGreaterThan(0);
  });

  it("passes in front on the way down and behind on the way up", () => {
    expect([0, 1, 2, 3, 4, 5].map(ropeSide)).toEqual(["back", "front", "front", "back", "back", "back"]);
  });

  it("hides a rope behind the letters and the head, and leaves a front rope whole", () => {
    const shapes = [K, S, headRing()];
    for (const step of [0, 3, 4, 5]) {
      const parts = tubeLines(`rope${step}` as const);
      for (const part of parts) {
        expect(part.length).toBeGreaterThanOrEqual(2);
        for (const p of part) for (const s of shapes) expect(inside(p, s)).toBe(false);
      }
    }
    for (const step of [1, 2]) expect(tubeLines(`rope${step}` as const)).toEqual([rope(step)]);
  });

  it("has one entry per tube: the letters, the head, six ropes", () => {
    expect(TUBES).toEqual(["k", "s", "head", "rope0", "rope1", "rope2", "rope3", "rope4", "rope5"]);
    expect(tubeLines("k")).toEqual([K]);
    expect(tubeLines("s")).toEqual([S]);
  });

  it("clips a line into the runs outside the shapes", () => {
    const square = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]] as const;
    const line = Array.from({ length: 21 }, (_, i) => [i - 5, 5] as const); // x -5..15 through the square
    const runs = clipOutside(line, [square.map((p) => [...p] as const)]);
    expect(runs.length).toBe(2);
    expect(runs[0].at(-1)![0]).toBeLessThan(0);
    expect(runs[1][0][0]).toBeGreaterThan(10);
  });
});
```

- [ ] **Step 2: Run it to see it fail.**
  Run: `npx vitest run office/neon/mark.test.ts`. Expected to fail: the module isn't found.

- [ ] **Step 3: Implement.** `office/neon/mark.ts`:

```ts
/**
 * The KS mark as neon tubes (neon sign spec 6): concept 6, the block KS with a dot for a head and a skipping rope, in
 * its 240-unit design grid with y down, as the logo prototypes drew it. This is the one place its letterforms live:
 * the finished drawing replaces K, S and HEAD here, and the site's logo can read them later.
 */
export type Pt = readonly [number, number];
export type Polyline = Pt[];

const closed = (pts: Pt[]): Polyline => [...pts, pts[0]];

export const K: Polyline = closed([
  [66, 116], [86, 116], [86, 140], [106, 116], [128, 116], [102, 146], [128, 182], [105, 182], [88, 158], [86, 160], [86, 182], [66, 182],
]);
export const S: Polyline = closed([
  [132, 116], [182, 116], [182, 134], [150, 134], [150, 140], [182, 140], [182, 182], [132, 182], [132, 164], [164, 164], [164, 158], [132, 158],
]);
export const HEAD = { cx: 129, cy: 98, r: 8 } as const;
/** Where the rope is held: it turns about the line through these. */
export const HANDS = { left: [56, 132] as Pt, right: [192, 132] as Pt };
/** The rope's Bézier control offset from the hands' line: overhead it clears the head by about a stroke. */
export const ROPE_OFFSET = 72;
export const STEPS = 6;
/** The square the sign's size maps to: 160 units = the anchor's 0.85 m. */
export const BOX = { min: 44, max: 204 } as const;
/** How far the letters and the head hop as the rope passes under, in mark units (~3 cm at 0.85 m). */
export const HOP = 6;

export function headRing(segments = 32): Polyline {
  return closed(Array.from({ length: segments }, (_, i) => {
    const a = (i / segments) * Math.PI * 2;
    return [HEAD.cx + HEAD.r * Math.cos(a), HEAD.cy + HEAD.r * Math.sin(a)] as Pt;
  }));
}

/**
 * The rope at `step` of STEPS, as seen from the front: theta = step x 60 degrees about the hands' line, 0 overhead, 180
 * under the feet. Its middle sits at hands height - ROPE_OFFSET cos(theta), as a cubic from hand to hand.
 */
export function rope(step: number, samples = 96): Polyline {
  const theta = ((((step % STEPS) + STEPS) % STEPS) * 2 * Math.PI) / STEPS;
  const [lx, hy] = HANDS.left;
  const [rx] = HANDS.right;
  const cy = hy - ROPE_OFFSET * Math.cos(theta);
  return Array.from({ length: samples + 1 }, (_, i) => {
    const t = i / samples;
    const a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t ** 2, d = t ** 3;
    return [a * lx + b * lx + c * rx + d * rx, a * hy + b * cy + c * cy + d * hy] as Pt;
  });
}

/** In front of the letters on the way down (60, 120 degrees); everywhere else it goes round behind them. */
export function ropeSide(step: number): "front" | "back" {
  return Math.sin(((step % STEPS) * 2 * Math.PI) / STEPS) > 0.25 ? "front" : "back";
}

/** Even-odd point in polygon (closed polyline). */
export function inside([x, y]: Pt, poly: Polyline): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** The runs of `line` (two points or more) whose points lie outside every shape. */
export function clipOutside(line: Polyline, shapes: Polyline[]): Polyline[] {
  const runs: Polyline[] = [];
  let run: Polyline = [];
  for (const p of line) {
    if (shapes.some((s) => inside(p, s))) {
      if (run.length >= 2) runs.push(run);
      run = [];
    } else run.push(p);
  }
  if (run.length >= 2) runs.push(run);
  return runs;
}

export type TubeId = "k" | "s" | "head" | "rope0" | "rope1" | "rope2" | "rope3" | "rope4" | "rope5";
export const TUBES: readonly TubeId[] = ["k", "s", "head", "rope0", "rope1", "rope2", "rope3", "rope4", "rope5"];

/**
 * What a tube draws. A rope behind the letters is cut where they'd hide it. The under-the-feet rope is cut against the
 * letters as they are mid-hop, HOP higher. A front rope stays whole: the sign cuts a gap in the letters instead (sign.ts).
 */
export function tubeLines(tube: TubeId): Polyline[] {
  if (tube === "k") return [K];
  if (tube === "s") return [S];
  if (tube === "head") return [headRing()];
  const step = Number(tube.slice(4));
  if (ropeSide(step) === "front") return [rope(step)];
  const lift = step === 3 ? HOP : 0;
  const up = (s: Polyline): Polyline => s.map(([x, y]) => [x, y - lift] as Pt);
  return clipOutside(rope(step), [up(K), up(S), up(headRing())]);
}
```

The rope-under test in Step 1 checks that rope 3's lowest point clears the letters. Its ends near the hands still cross the K's lower corner, which is why it's clipped against the hopped letters.

- [ ] **Step 4: Run the test.**
  Run: `npx vitest run office/neon/mark.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add office/neon/mark.ts office/neon/mark.test.ts
git commit -m "Draw the KS mark as neon tubes: the letters, the head and the rope's six positions"
```

---

### Task 3: The timeline

**Files:**
- Create: `office/neon/sequence.ts`
- Test: `office/neon/sequence.test.ts`

**Interfaces:**
- Consumes: from Task 2, `STEPS`, `TUBES`, `type TubeId` from `./mark`.
- Produces:
  - `type NeonPower = "off" | "powering" | "on"`;
  - `STEP_S = 0.2`, `POWER_UP_S = 0.6`, `BAD_TUBE_GAP_S = [8, 20]`, `BAD_TUBE_S = 0.3`;
  - `nextPower(power: NeonPower, inRoom: boolean, t: number, reduced: boolean): NeonPower`;
  - `type NeonFrame = { step: number; brightness: Record<TubeId, number>; hop: number }`, where hop runs 0 to 1;
  - `neonFrame(power: NeonPower, t: number, seed: number, reduced: boolean): NeonFrame`;
  - `badTubes(seed: number, until: number): { at: number; tube: "k" | "s" | "head" | "rope" }[]`, exported for tests.

  `t` is in seconds since entering `power`.

- [ ] **Step 1: Write the failing test.** `office/neon/sequence.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { TUBES } from "./mark";
import { BAD_TUBE_GAP_S, BAD_TUBE_S, POWER_UP_S, STEP_S, badTubes, neonFrame, nextPower } from "./sequence";

const lit = (f: ReturnType<typeof neonFrame>) => TUBES.filter((t) => f.brightness[t] > 0);

describe("power (neon sign spec 3.1)", () => {
  it("powers up on arrival, then stays on; reduced motion skips the power-up", () => {
    expect(nextPower("off", false, 5, false)).toBe("off");
    expect(nextPower("off", true, 0, false)).toBe("powering");
    expect(nextPower("powering", true, POWER_UP_S - 0.01, false)).toBe("powering");
    expect(nextPower("powering", true, POWER_UP_S, false)).toBe("on");
    expect(nextPower("off", true, 0, true)).toBe("on");
  });
  it("goes off the moment the visitor leaves, even mid power-up", () => {
    expect(nextPower("powering", false, 0.1, false)).toBe("off");
    expect(nextPower("on", false, 30, false)).toBe("off");
  });
});

describe("the frame (neon sign spec 3.2-3.4)", () => {
  it("lights nothing while off", () => {
    const f = neonFrame("off", 3, 1, false);
    expect(lit(f)).toEqual([]);
    expect(f.hop).toBe(0);
  });

  it("ends the power-up with the letters, the head and the overhead rope lit", () => {
    const f = neonFrame("powering", POWER_UP_S - 0.001, 1, false);
    expect(lit(f)).toEqual(["k", "s", "head", "rope0"]);
    for (const t of lit(f)) expect(f.brightness[t]).toBe(1);
  });

  it("stutters on: during the power-up some tube is out or dipped", () => {
    const samples = Array.from({ length: 60 }, (_, i) => neonFrame("powering", (i / 60) * POWER_UP_S, 7, false));
    expect(samples.some((f) => (["k", "s", "head", "rope0"] as const).some((t) => f.brightness[t] < 1))).toBe(true);
  });

  it("steps the rope round every STEP_S, one position lit at a time, in order", () => {
    // a time with no bad tube for this seed: before the first event
    const first = badTubes(3, 100)[0].at;
    const steps = Array.from({ length: 12 }, (_, i) => neonFrame("on", i * STEP_S + STEP_S / 2, 3, false));
    expect(first).toBeGreaterThan(12 * STEP_S);
    expect(steps.map((f) => f.step)).toEqual([0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5]);
    for (const f of steps) expect(lit(f)).toEqual(["k", "s", "head", `rope${f.step}`]);
  });

  it("hops only while the rope is under the feet", () => {
    for (let step = 0; step < 6; step++) expect(neonFrame("on", step * STEP_S + 0.01, 3, false).hop).toBe(step === 3 ? 1 : 0);
  });

  it("lets a tube go bad now and then: 8-20 s apart, ~0.3 s each, the same for the same seed", () => {
    const events = badTubes(42, 600);
    expect(events).toEqual(badTubes(42, 600));
    expect(events.length).toBeGreaterThan(600 / BAD_TUBE_GAP_S[1] - 1);
    events.forEach((e, i) => {
      const gap = e.at - (i ? events[i - 1].at : 0);
      expect(gap).toBeGreaterThanOrEqual(BAD_TUBE_GAP_S[0]);
      expect(gap).toBeLessThanOrEqual(BAD_TUBE_GAP_S[1]);
    });
    const e = events[0];
    const during = Array.from({ length: 30 }, (_, i) => neonFrame("on", e.at + (i / 30) * BAD_TUBE_S, 42, false));
    const tube = (f: ReturnType<typeof neonFrame>) => (e.tube === "rope" ? (`rope${f.step}` as const) : e.tube);
    expect(during.some((f) => f.brightness[tube(f)] < 1 && f.brightness[tube(f)] > 0)).toBe(true);
    // and steady again once it's over (the next event is at least 8 s away)
    const after = neonFrame("on", e.at + BAD_TUBE_S + 0.01, 42, false);
    expect(after.brightness[tube(after)]).toBe(1);
  });

  it("dips a bad tube at most twice (well under three flashes a second)", () => {
    const e = badTubes(9, 100)[0];
    const levels = Array.from({ length: 300 }, (_, i) => {
      const f = neonFrame("on", e.at + (i / 300) * BAD_TUBE_S, 9, false);
      return f.brightness[e.tube === "rope" ? (`rope${f.step}` as const) : e.tube];
    });
    let dips = 0;
    for (let i = 1; i < levels.length; i++) if (levels[i] < 1 && levels[i - 1] === 1) dips++;
    expect(dips).toBeLessThanOrEqual(2);
  });

  it("under reduced motion holds the overhead frame, fully lit, still", () => {
    for (const [power, t] of [["on", 0], ["on", 17.3], ["powering", 0.1]] as const) {
      const f = neonFrame(power, t, 5, true);
      expect(f.step).toBe(0);
      expect(f.hop).toBe(0);
      expect(lit(f)).toEqual(["k", "s", "head", "rope0"]);
      for (const tube of lit(f)) expect(f.brightness[tube]).toBe(1);
    }
  });
});
```

- [ ] **Step 2: Run it to see it fail.**
  Run: `npx vitest run office/neon/sequence.test.ts`. Expected to fail: the module isn't found.

- [ ] **Step 3: Implement.** `office/neon/sequence.ts`:

```ts
import { STEPS, TUBES, type TubeId } from "./mark";

/**
 * The neon sign's timeline (neon sign spec 3): off in the walk-in, a stuttering power-up on arrival, then the rope
 * stepping round with the occasional bad tube. Pure: the caller keeps the power state and the time spent in it.
 */
export type NeonPower = "off" | "powering" | "on";

export const STEP_S = 0.2;
export const POWER_UP_S = 0.6;
export const BAD_TUBE_GAP_S = [8, 20] as const;
export const BAD_TUBE_S = 0.3;
const DIP = 0.2; // a dipped tube's brightness

export type NeonFrame = { step: number; brightness: Record<TubeId, number>; hop: number };

export function nextPower(power: NeonPower, inRoom: boolean, t: number, reduced: boolean): NeonPower {
  if (!inRoom) return "off";
  if (power === "off") return reduced ? "on" : "powering";
  if (power === "powering" && (reduced || t >= POWER_UP_S)) return "on";
  return power;
}

/** mulberry32: a small seeded generator, so a seed always gives the same stutter and the same bad tubes. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (r: () => number, lo: number, hi: number) => lo + (hi - lo) * r();

/** Brightness within a window with two dips: [start, length] each, relative to the window. */
function dipped(at: number, dips: readonly (readonly [number, number])[]): number {
  return dips.some(([s, l]) => at >= s && at < s + l) ? DIP : 1;
}

/** Each powered tube's stutter: it comes on at `on`, then dips twice, all done before POWER_UP_S. */
function powerUp(seed: number) {
  const r = random(seed ^ 0x9e3779b9);
  const plan = (lo: number, hi: number) => {
    const on = between(r, lo, hi);
    const d1 = on + between(r, 0.04, 0.08);
    const d2 = d1 + between(r, 0.08, 0.12);
    return { on, dips: [[d1, between(r, 0.03, 0.05)], [d2, between(r, 0.03, 0.05)]] as const };
  };
  // the letters and the head first, then the rope
  return { k: plan(0, 0.12), s: plan(0, 0.12), head: plan(0.02, 0.14), rope0: plan(0.18, 0.3) };
}

export function badTubes(seed: number, until: number): { at: number; tube: "k" | "s" | "head" | "rope" }[] {
  const r = random(seed);
  const kinds = ["k", "s", "head", "rope"] as const;
  const out: { at: number; tube: (typeof kinds)[number] }[] = [];
  for (let at = between(r, ...BAD_TUBE_GAP_S); at <= until; at += between(r, ...BAD_TUBE_GAP_S)) {
    out.push({ at, tube: kinds[Math.floor(r() * kinds.length) % kinds.length] });
  }
  return out;
}

const dark = (): Record<TubeId, number> => Object.fromEntries(TUBES.map((t) => [t, 0])) as Record<TubeId, number>;

export function neonFrame(power: NeonPower, t: number, seed: number, reduced: boolean): NeonFrame {
  const brightness = dark();
  if (power === "off") return { step: 0, brightness, hop: 0 };
  if (reduced) {
    for (const tube of ["k", "s", "head", "rope0"] as const) brightness[tube] = 1;
    return { step: 0, brightness, hop: 0 };
  }
  if (power === "powering") {
    for (const [tube, { on, dips }] of Object.entries(powerUp(seed)) as [TubeId, ReturnType<typeof powerUp>["k"]][]) {
      brightness[tube] = t < on ? 0 : dipped(t, dips);
    }
    return { step: 0, brightness, hop: 0 };
  }
  const step = Math.floor(t / STEP_S) % STEPS;
  for (const tube of ["k", "s", "head", `rope${step}`] as TubeId[]) brightness[tube] = 1;
  const bad = badTubes(seed, t).at(-1);
  if (bad && t < bad.at + BAD_TUBE_S) {
    const r = random(seed ^ Math.floor(bad.at * 1000));
    const d1 = between(r, 0.02, 0.08);
    const d2 = d1 + between(r, 0.1, 0.14);
    const tube: TubeId = bad.tube === "rope" ? (`rope${step}` as TubeId) : bad.tube;
    brightness[tube] = dipped(t - bad.at, [[d1, between(r, 0.03, 0.06)], [d2, between(r, 0.03, 0.06)]]);
  }
  return { step, brightness, hop: step === 3 ? 1 : 0 };
}
```

The `powerUp` plans end before `POWER_UP_S`:
- the rope comes on at ≤ 0.30;
- its first dip starts at ≤ 0.38;
- its second dip starts at ≤ 0.50 and lasts ≤ 0.05.

So every tube is steady by 0.55 s. Check that this holds after any tuning.

- [ ] **Step 4: Run the test.**
  Run: `npx vitest run office/neon/sequence.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add office/neon/sequence.ts office/neon/sequence.test.ts
git commit -m "Time the neon sign: a stuttering power-up, the rope stepping round, and a tube going bad now and then"
```

---

### Task 4: The sign in three.js

**Files:**
- Create: `office/neon/sign.ts`
- Test: `office/neon/sign.test.ts`

**Interfaces:**
- Consumes:
  - from Task 2, `tubeLines`, `ropeSide`, `TUBES`, `BOX`, `HOP`, `STEPS`, `type Polyline`, `type TubeId`;
  - from Task 3, `type NeonFrame`.
- Produces:
  - `type Sign = { root: Group; body: Group; unlit: LineMaterial; materials: LineMaterial[]; core: Record<TubeId, LineMaterial>; glow: Record<TubeId, LineMaterial>; tubes: Record<TubeId, Line2[]>; gaps: (Line2 | null)[] }`;
  - `buildSign(): Sign`, `applyFrame(sign: Sign, frame: NeonFrame): void`, `setSignResolution(sign: Sign, width: number, height: number): void`, `disposeSign(sign: Sign): void`;
  - `toLocal(line: Polyline, z: number): number[]`;
  - `clampDt(dt: number): number`, which `NeonSign` uses.

  `root` is a unit square facing +Z, ready to add under the anchor.

- [ ] **Step 1: Write the failing test.** `office/neon/sign.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Raycaster, Vector3 } from "three";
import { HOP, TUBES } from "./mark";
import { applyFrame, buildSign, clampDt, setSignResolution, toLocal } from "./sign";
import { neonFrame } from "./sequence";

describe("the sign's lines (neon sign spec 4, 6)", () => {
  it("maps the mark's 160-unit box onto a unit square, y up", () => {
    expect(toLocal([[44, 44], [204, 204]], 0.01)).toEqual([-0.5, 0.5, 0.01, 0.5, -0.5, 0.01]);
  });

  it("builds every tube, with the letters and the head in the hopping body", () => {
    const sign = buildSign();
    for (const t of TUBES) expect(sign.tubes[t].length).toBeGreaterThan(0);
    for (const t of ["k", "s", "head"] as const) for (const l of sign.tubes[t]) expect(l.parent?.parent).toBe(sign.body);
    expect(sign.gaps.map((g) => g !== null)).toEqual([false, true, true, false, false, false]);
  });

  it("is never under the pointer", () => {
    const sign = buildSign();
    const ray = new Raycaster(new Vector3(0, 0, 5), new Vector3(0, 0, -1));
    expect(ray.intersectObject(sign.root, true)).toEqual([]);
  });

  it("shows unlit glass when off, and lights what the frame lights", () => {
    const sign = buildSign();
    applyFrame(sign, neonFrame("off", 0, 1, false));
    for (const t of TUBES) expect(sign.core[t].opacity).toBe(0);
    applyFrame(sign, neonFrame("on", 0.45, 1, false)); // step 2: a front rope
    expect(sign.core.rope2.opacity).toBe(1);
    expect(sign.core.rope0.opacity).toBe(0);
    expect(sign.gaps[2]!.visible).toBe(true);
    expect(sign.gaps[1]!.visible).toBe(false);
  });

  it("hops the body while the rope is under the feet", () => {
    const sign = buildSign();
    applyFrame(sign, neonFrame("on", 0.65, 1, false)); // step 3
    expect(sign.body.position.y).toBeCloseTo(HOP / 160);
    applyFrame(sign, neonFrame("on", 0.85, 1, false)); // step 4
    expect(sign.body.position.y).toBe(0);
  });

  it("keeps line widths in CSS pixels", () => {
    const sign = buildSign();
    setSignResolution(sign, 1440, 900);
    for (const m of sign.materials) expect(m.resolution.toArray()).toEqual([1440, 900]);
  });

  it("never lets one long frame jump the clock", () => {
    expect(clampDt(0.016)).toBe(0.016);
    expect(clampDt(9.87)).toBe(0.1);
    expect(clampDt(-1)).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to see it fail.**
  Run: `npx vitest run office/neon/sign.test.ts`. Expected to fail: the module isn't found.

- [ ] **Step 3: Implement.** `office/neon/sign.ts`:

```ts
import { AdditiveBlending, Group } from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { theme } from "../theme";
import { BOX, HOP, STEPS, TUBES, ropeSide, tubeLines, type Polyline, type TubeId } from "./mark";
import type { NeonFrame } from "./sequence";

/**
 * The neon sign as fat lines (neon sign spec 4, 6): each tube a dark unlit line, under a warm-white core and a wide
 * faint glow whose opacity is the tube's brightness. A unit square facing +z; the anchor in the office scales it.
 */
const LIT = "#FFF4E2";
const UNLIT = "#3A3A3A";
const WIDTH = { core: 2, glow: 8, unlit: 1.5, gap: 8 }; // CSS px
const GLOW = 0.35; // the glow's opacity at full brightness
// Layers in front of the wall, in the sign's units (~3 mm apart at 0.85 m): back ropes, letters, the gap a front rope
// cuts in them, front ropes, the head.
const Z = { back: 0, letters: 0.004, gap: 0.008, front: 0.012, head: 0.016 };
const UNIT = BOX.max - BOX.min;
const CENTRE = (BOX.max + BOX.min) / 2;

export function toLocal(line: Polyline, z: number): number[] {
  return line.flatMap(([u, v]) => [(u - CENTRE) / UNIT, (CENTRE - v) / UNIT, z]);
}

/** A frame's time step, held to 0.1 s: a stalled frame (software WebGL, a background tab) can't skip the power-up. */
export function clampDt(dt: number): number {
  return Math.min(0.1, Math.max(0, dt));
}

export type Sign = {
  root: Group;
  body: Group;
  /** The one unlit material every tube shares: its lines always draw. */
  unlit: LineMaterial;
  materials: LineMaterial[];
  core: Record<TubeId, LineMaterial>;
  glow: Record<TubeId, LineMaterial>;
  tubes: Record<TubeId, Line2[]>;
  gaps: (Line2 | null)[];
};

function line(points: number[], material: LineMaterial, order: number): Line2 {
  const l = new Line2(new LineGeometry().setPositions(points), material);
  l.computeLineDistances();
  l.raycast = () => {}; // decoration (spec 2), and Line2's own raycast needs raycaster.camera
  l.renderOrder = order;
  return l;
}

export function buildSign(): Sign {
  const materials: LineMaterial[] = [];
  const material = (color: string, linewidth: number, extra: Partial<{ additive: boolean; transparent: boolean }> = {}) => {
    const m = new LineMaterial({ color, linewidth, fog: false, transparent: extra.transparent ?? false, depthWrite: !extra.additive });
    if (extra.additive) m.blending = AdditiveBlending;
    materials.push(m);
    return m;
  };
  const unlit = material(UNLIT, WIDTH.unlit);
  const root = new Group();
  root.name = "neon_sign";
  const body = new Group(); // the letters and the head: they hop
  const ropes = new Group();
  root.add(ropes, body);
  const core = {} as Record<TubeId, LineMaterial>;
  const glow = {} as Record<TubeId, LineMaterial>;
  const tubes = {} as Record<TubeId, Line2[]>;
  for (const tube of TUBES) {
    core[tube] = material(LIT, WIDTH.core, { transparent: true });
    glow[tube] = material(LIT, WIDTH.glow, { transparent: true, additive: true });
    const isRope = tube.startsWith("rope");
    const z = tube === "head" ? Z.head : !isRope ? Z.letters : ropeSide(Number(tube.slice(4))) === "front" ? Z.front : Z.back;
    const group = new Group();
    (isRope ? ropes : body).add(group);
    tubes[tube] = tubeLines(tube).flatMap((pl) => {
      const pts = toLocal(pl, z);
      const parts = [line(pts, unlit, 0), line(pts, glow[tube], 1), line(pts, core[tube], 2)];
      group.add(...parts);
      return parts;
    });
  }
  const gapMaterial = material(theme.background, WIDTH.gap);
  const gaps = Array.from({ length: STEPS }, (_, step) => {
    if (ropeSide(step) !== "front") return null;
    const g = line(toLocal(tubeLines(`rope${step}` as TubeId)[0], Z.gap), gapMaterial, 1);
    g.visible = false;
    ropes.add(g);
    return g;
  });
  return { root, body, unlit, materials, core, glow, tubes, gaps };
}

export function applyFrame(sign: Sign, frame: NeonFrame): void {
  for (const tube of TUBES) {
    const b = frame.brightness[tube];
    sign.core[tube].opacity = b;
    sign.glow[tube].opacity = b * GLOW;
    // the core and glow lines only draw while lit; the unlit line under them always does
    for (const l of sign.tubes[tube]) if (l.material !== sign.unlit) l.visible = b > 0;
  }
  sign.gaps.forEach((g, step) => {
    if (g) g.visible = frame.step === step && frame.brightness[`rope${step}` as TubeId] > 0;
  });
  sign.body.position.y = (frame.hop * HOP) / UNIT;
}

export function setSignResolution(sign: Sign, width: number, height: number): void {
  for (const m of sign.materials) m.resolution.set(width, height);
}

export function disposeSign(sign: Sign): void {
  sign.root.traverse((o) => {
    if (o instanceof Line2) o.geometry.dispose();
  });
  for (const m of sign.materials) m.dispose();
  sign.root.removeFromParent();
}
```

- [ ] **Step 4: Run the tests and type-check.**
  Run: `npx vitest run office/neon && npx tsc --noEmit`. Expected: PASS, and no type errors.

- [ ] **Step 5: Commit.**

```bash
git add office/neon/sign.ts office/neon/sign.test.ts
git commit -m "Build the neon sign as fat lines: unlit glass, a warm-white core and glow, a gap where the rope crosses in front"
```

---

### Task 5: Mount it in the office

**Files:**
- Create: `office/neon/NeonSign.tsx`
- Modify: `office/OfficeCanvas.tsx` (render `<NeonSign>` at the top of `Office`'s returned fragment, after the `<primitive>`)
- Modify: `office/OfficeExperience.tsx:433` (add `data-neon="off"` to the `.office` div's initial attributes)
- Modify: `office/nodes.test.ts` (use `NEON_NODE` in place of the literal from Task 1)

**Interfaces:**
- Consumes:
  - `buildSign`, `applyFrame`, `setSignResolution`, `disposeSign`, `clampDt` from `./sign`;
  - `neonFrame`, `nextPower`, `type NeonPower` from `./sequence`;
  - `type DirectorState` from `../director/director`.
- Produces:
  - `NEON_NODE = "prop_neon_sign"`;
  - the default export `NeonSign({ scene, director, host, reduced })`;
  - `.office[data-neon]` taking the values `off | powering | on`.

- [ ] **Step 1: Write `office/neon/NeonSign.tsx`.**

```tsx
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Object3D } from "three";
import type { DirectorState } from "../director/director";
import { applyFrame, buildSign, clampDt, disposeSign, setSignResolution, type Sign } from "./sign";
import { neonFrame, nextPower, type NeonPower } from "./sequence";

/** The office model's anchor for the sign: the left wall over the couch, +z into the room (neon sign spec 6). */
export const NEON_NODE = "prop_neon_sign";

let warned = false;

type Props = {
  scene: Object3D;
  director: RefObject<DirectorState>;
  /** Carries data-neon: off | powering | on. */
  host: RefObject<HTMLElement | null>;
  reduced: boolean;
};

/**
 * The neon sign over the couch (neon sign spec): off in the walk-in, powering up as the visitor comes into the room,
 * then stepping round. In the room means anything but the walk-in, so a direct visit that opens an object counts too.
 */
export default function NeonSign({ scene, director, host, reduced }: Props) {
  const anchor = useMemo(() => scene.getObjectByName(NEON_NODE) ?? null, [scene]);
  const seed = useMemo(() => Math.floor(Math.random() * 2 ** 32), []);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const get = useThree((s) => s.get);
  // Built in the effect, not a memo: React's dev double-mount runs the cleanup once, and a memoised sign would come
  // back with its geometry and materials disposed.
  const signRef = useRef<Sign | null>(null);
  const power = useRef<NeonPower>("off");
  const t = useRef(0);

  useEffect(() => {
    if (!anchor) {
      if (!warned) {
        warned = true;
        console.warn(`${NEON_NODE} not found in the office model; no neon sign.`);
      }
      return;
    }
    const sign = buildSign();
    const { size } = get();
    setSignResolution(sign, size.width, size.height);
    applyFrame(sign, neonFrame(power.current, t.current, seed, reduced));
    anchor.add(sign.root);
    signRef.current = sign;
    return () => {
      disposeSign(sign);
      signRef.current = null;
    };
  }, [anchor, seed, reduced, get]);

  useEffect(() => {
    if (signRef.current) setSignResolution(signRef.current, width, height);
  }, [width, height]);

  useFrame((_, dt) => {
    const sign = signRef.current;
    if (!sign) return;
    t.current += clampDt(dt);
    const next = nextPower(power.current, director.current.kind !== "walkIn", t.current, reduced);
    if (next !== power.current) {
      power.current = next;
      t.current = 0;
      if (host.current) host.current.dataset.neon = next;
    }
    applyFrame(sign, neonFrame(power.current, t.current, seed, reduced));
  });

  return null;
}
```

- [ ] **Step 2: Wire it in.**
  - **`OfficeCanvas.tsx`:**
    - `import NeonSign from "./neon/NeonSign";`
    - In `Office`'s return, right after `<primitive object={office.scene} … />`, add `<NeonSign scene={office.scene} director={director} host={host} reduced={reduced} />`. `Office` already has `reduced` (`useMemo(reducedMotion, [])`), `director` and `host`.
  - **`OfficeExperience.tsx`:** add `data-neon="off"` beside `data-notes="up"`.
  - **`nodes.test.ts`:** `import { NEON_NODE } from "./neon/NeonSign";`, and use it in Task 1's test in place of the literal. If importing a `.tsx` into this test pulls in React Three Fiber and breaks the node environment, move `NEON_NODE` to `office/neon/mark.ts` instead and import it from there in both places.

- [ ] **Step 3: Type-check and test.**
  Run: `npx tsc --noEmit && npx vitest run`. Expected: no type errors, and all tests pass. The suite was at 586 passed and 1 skipped before this plan; it should now be higher by the new tests.

- [ ] **Step 4: Commit.**

```bash
git add office/neon/NeonSign.tsx office/OfficeCanvas.tsx office/OfficeExperience.tsx office/nodes.test.ts
git commit -m "Hang the neon sign over the couch: off in the walk-in, powering up as the visitor comes in"
```

---

### Task 6: End to end, and a look

**Files:**
- Create: `e2e/office-neon.spec.ts`

**Interfaces:**
- Consumes: `.office[data-neon]`, `data-director`, `data-walkin-progress`, `data-scene-ready`, and the "Get in touch" link that opens the drawer.

- [ ] **Step 1: Write the spec.** `e2e/office-neon.spec.ts`:

```ts
import { test, expect, type Page } from "@playwright/test";

/** Software WebGL can freeze rendering for ~10 s at a time; see MOVE_WAIT in office-interaction.spec.ts. */
const MOVE_WAIT = 30_000;

const office = (page: Page) => page.locator(".office");
const progress = async (page: Page) => Number(await office(page).getAttribute("data-walkin-progress"));

/** Records every value `.office[data-neon]` takes from now on (as office-monitor.spec.ts records data-notes). */
async function recordNeon(page: Page) {
  await page.evaluate(() => {
    const el = document.querySelector(".office")!;
    const seen: string[] = [];
    (window as unknown as { neonSeen: string[] }).neonSeen = seen;
    new MutationObserver((records) => records.forEach((r, k) => seen.push(records[k + 1]?.oldValue ?? el.getAttribute("data-neon")!)))
      .observe(el, { attributeFilter: ["data-neon"], attributeOldValue: true });
  });
  return () => page.evaluate(() => [...(window as unknown as { neonSeen: string[] }).neonSeen]);
}

async function arrive(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
}

test("the sign is off in the walk-in, powers up on arrival, goes off on leaving and comes back on", async ({ page }) => {
  await page.goto("/");
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  await expect(office(page)).toHaveAttribute("data-neon", "off");
  const seen = await recordNeon(page);
  await arrive(page);
  await expect(office(page)).toHaveAttribute("data-neon", "on", { timeout: MOVE_WAIT });
  expect(await seen()).toEqual(["powering", "on"]);

  await page.mouse.wheel(0, -5000);
  await expect.poll(() => progress(page), { timeout: MOVE_WAIT }).toBeLessThan(0.97);
  await expect(office(page)).toHaveAttribute("data-neon", "off", { timeout: MOVE_WAIT });

  await arrive(page);
  await expect(office(page)).toHaveAttribute("data-neon", "on", { timeout: MOVE_WAIT });
});

test("opening an object leaves the sign on", async ({ page }) => {
  await page.goto("/");
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  await arrive(page);
  await expect(office(page)).toHaveAttribute("data-neon", "on", { timeout: MOVE_WAIT });
  const link = page.getByRole("link", { name: "Get in touch" });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_drawer", { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-neon", "on");
});

test("a direct visit that opens an object powers the sign up too", async ({ page }) => {
  await page.goto("/");
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  const link = page.getByRole("link", { name: "Get in touch" });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", /focus(ing|ed):hs_drawer/, { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-neon", /powering|on/, { timeout: MOVE_WAIT });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("goes straight to on, with no power-up", async ({ page }) => {
    await page.goto("/");
    await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
    const seen = await recordNeon(page);
    await arrive(page);
    await expect(office(page)).toHaveAttribute("data-neon", "on", { timeout: MOVE_WAIT });
    expect(await seen()).toEqual(["on"]);
  });
});
```

The third test assumes the "Get in touch" link is reachable by keyboard from the walk-in (the hidden nav). If it isn't, because the links only work once standing, delete that test. Ledger that Review Focus 1 is then covered only by the unit test, through `nextPower`'s `inRoom`, and say so in the report. Don't invent another route.

- [ ] **Step 2: Run it.** Use one file and one worker. Nothing else may be running in a browser.
  Run: `npx playwright test e2e/office-neon.spec.ts --workers=1`
  **Expected:** all pass. A failure on `["powering", "on"]` that shows extra values such as `["powering", "off", …]` means the power state flickered at the threshold, so look at `nextPower`'s input. Don't loosen the test.

- [ ] **Step 3: Regression.** Run each, one at a time:
  - `npx playwright test e2e/office.spec.ts --workers=1`
  - `npx playwright test e2e/office-interaction.spec.ts --workers=1`

  **Expected:** both pass. The baseline is 18/18 and 12/12.

- [ ] **Step 4: Look at it.**
  - **Capture:** with no test running, write a scratchpad Playwright script (SwiftShader args as in `playwright.config.ts`). Capture the standing view at 1440×900, and the phone at 390×844 panned left by a drag on the canvas, after `data-neon="on"`.
  - **Desktop pair:** take two shots 0.1 s apart on the page's clock, so two rope steps are visible.
  - **Check:**
    - the sign sits on the left wall over the couch, at the angle the mock showed;
    - the tubes are warm white with a soft glow, and the unlit tubes show faint grey;
    - a front rope cuts a dark gap through the letters;
    - nothing on the sign changes colour on hover.
  - **Save** the shots as `neon-site-*.png` in the scratchpad and list them in the report.

- [ ] **Step 5: Commit.**

```bash
git add e2e/office-neon.spec.ts
git commit -m "Prove the neon sign powers up on arrival, holds while an object is open, goes off on leaving, and skips the power-up under reduced motion"
```
