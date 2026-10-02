# Office Interactions M2 (Crate) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kasper's projects become records in the crate: you flick through them seeing each project's logo, pull one out to read its details printed on the sleeve's back, and Read more opens the full case study.

**Architecture:** Sleeve art is built in Blender from the design-system SVGs listed in `art/sleeves.json` (one row per project, in `work` order), as line geometry on each sleeve's front. The runtime adds a pure `CrateMotion` (flick and pull-out, the same shape as M1's `ObjectMotion`), a pure dig reducer for the inputs (keys, wheel, swipe, clicks), and prints the details on the pulled sleeve's back with M1's `CardFace` (drei `Html` in transform mode), generalised to a sleeve's back face. URLs and Back layering reuse M1's history bridge unchanged: a pulled record is `/work/<slug>`, browsing the crate is a local layer.

**Tech Stack:** Next 16.2.4, React 19.2.4, @react-three/fiber 9.8, drei 10.7 (`Html`), three 0.186, Vitest 5 (node environment, `*.test.ts` only), Playwright 1.63 (SwiftShader), Blender 5.2 via the Blender MCP (`io_curve_svg` importer, enabled).

**Spec:** `docs/superpowers/specs/2026-10-02-office-interactions-design.md` (sections 3.2, 4, 5, 8; amended 2026-10-02 with Kasper's M1-review decisions: white line-geometry logos, details on the sleeve's back, flicking stops at the last project).

## Global Constraints

- Branch `redesign/office`. Never push without asking Kasper; copy approval gates any push.
- Stage files by explicit path; never `git add -A` (`.agents/` stays untracked).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next code (AGENTS.md).
- Agents never touch `package.json` or run `npm install`. No new dependencies.
- LF line endings (`.gitattributes` enforces).
- Visitor-facing copy is a draft for Kasper's approval (his voice); case-study text is reused as it is.
- Motion: record flip ~0.35 s; pull-out ~0.6 s; teases ≤ 0.3 s. Reduced motion: no flips or slides, objects switch state, the camera cuts, cards and the panel fade.
- Records: "Kasper's projects sit at the front, and flipping stops at the last of them. The blank sleeves behind never come up."
- Pull: "The URL becomes `/work/<slug>`". Read more: "The URL is unchanged". Back and Esc step out one layer at a time: close the panel, then put the record back (URL `/`, browsing the crate again), then return to the standing spot.
- "Inside the crate, the arrow keys flip and Enter pulls."
- "Movers: picking a record or an ornament moves the object to the camera, not the camera again."
- The office GLB stays under `office.maxBytes` (2 MB); `npm run check:models` must pass.

## Content track (separate, not in this plan)

Kasper asked (2026-10-02) to replace Forja with Pac-Hub and to add the Pac Technologies website, Nathan Reid and Mac Bennett. Drafts are being written from their repos into `.superpowers/sdd/2026-10-02-office-interactions-m2/content-drafts.md` for his approval. Nothing here depends on them: the crate reads `work` and `art/sleeves.json`, so landing the content later means adding entries to `app/(main)/work/data.ts` and `app/(v2)/v2/work/caseStudies.ts`, a row (and logo file) per project in `art/sleeves.json`, and re-running Task 2's build. Until then the first sleeve is labelled **Pac-Hub** with the Pac Tech logomark while its case study still reads Forja.

## Review Focus

1. **A trackpad swipe fires dozens of wheel events**; a person expects one flick per gesture, not the whole crate at once. *Test: Task 4 (`wheelStep` accumulates and cools down).*
2. **Browser Forward back onto `/work/<slug>`** after putting the record back and flicking elsewhere (a refresh gives the standalone page, so this is how the office meets a project URL it didn't open itself); expected: the records in front of it flick forward and it comes out again. *Test: Task 4 (`digFor` follows the pulled slug), Task 6 (e2e Forward).*
3. **Clicking another record while one is pulled out** would stack history entries; expected: nothing happens until it is put back. *Test: Task 4 (`canPull` is false while pulled).*
4. **Resizing or rotating the phone while a record is pulled**; expected: it stays framed. *Test: Task 3 (`pullDistance` by aspect; the pose is recomputed each frame from the live camera).*
5. **A case study with no sections or an empty intro** (the content track's new projects may start thin); expected: the back and the panel still render. *Test: Task 5 (`leadOf([])` is "", `CaseStudy` with no sections).*

---

## File structure

| File | Responsibility |
|---|---|
| `art/logos/*.svg` | Copies of the design-system logos the sleeves use (outlined paths only) |
| `art/sleeves.json` | One row per project, in `work` order: slug, logo files (laid out left to right), optional label |
| `content/sleeves.test.ts` | Sleeves match `work`, files exist, no live `<text>` |
| `scripts/blender/office_props.py` | `build_crate` takes the sleeve rows; `_sleeve_art` imports, fits and places each logo |
| `scripts/blender/greybox_office.py` | Passes the sleeve rows to `build_crate`; crate focus camera retuned |
| `office/objects/crate.ts` (+ test) | Pure crate motion: constants, `clampDig`, `pullDistance`, `pulledPose`, `CrateMotion` |
| `office/crate/dig.ts` (+ test) | Pure input rules: `digFor`, `canPull`, `wheelStep` |
| `office/cards/face.ts` (+ test) | Adds `backFaceFor` beside `faceFor` |
| `office/cards/CardFace.tsx` | `place: "top" \| "back"`; prop `card` renamed `surface` |
| `office/cards/lead.ts` (+ test) | `leadOf(intro)`: the first 2–3 sentences for the sleeve's back |
| `office/cards/SleeveBack.tsx` | What's printed on a pulled sleeve's back |
| `panels/CaseStudy.tsx` (+ `panels/CaseStudy.test.ts`) | The full case study in the panel |
| `office/OfficeCanvas.tsx` | Runs `CrateMotion`, prints the sleeve's back, crate clicks, `data-sleeve` |
| `office/OfficeExperience.tsx` | Dig state, crate control (keys), wheel and swipe, sleeve print, case-study panel |
| `office/copy.ts`, `app/(office)/office.css` | Crate and sleeve copy (drafts) and styles |
| `e2e/office-crate.spec.ts` | Keyboard path, wheel, deep link, reduced motion, phone |

## Execution waves

1. **Lead:** Task 1.
2. **Parallel:** Task 2 (live Blender agent), Task 3 (agent A), Task 4 (agent B), Task 5 (agent C). Each runs only its own tests; the lead commits each task.
3. **Lead:** Task 6 (wiring and e2e), then Task 7 with Kasper.

---

### Task 1: Sleeve rows and logos

**Files:**
- Create: `art/logos/pac-tech-mark.svg`, `art/logos/manuva-mark.svg`, `art/logos/manuva-wordmark.svg`, `art/logos/silio-logo.svg`, `art/sleeves.json`
- Test: `content/sleeves.test.ts`

**Interfaces:**
- Produces: `art/sleeves.json`, an array of `{ "slug": string, "logos": string[] /* repo-relative SVG paths, laid out left to right */, "label": string | null }`, one per entry of `work`, same order.

- [ ] **Step 1: Write the failing test**

```ts
// content/sleeves.test.ts
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { work } from "./work";
import { RECORDS } from "@/office/hotspots/registry";
import sleeves from "@/art/sleeves.json";

describe("sleeves (art/sleeves.json)", () => {
  it("has one sleeve per project, in crate order", () => expect(sleeves.map((s) => s.slug)).toEqual(work.map((w) => w.slug)));
  it("fits in the crate", () => expect(sleeves.length).toBeLessThanOrEqual(RECORDS));
  it("points at logo files that exist and are outlined (Blender's SVG import drops live text)", () => {
    for (const s of sleeves) {
      expect(s.logos.length).toBeGreaterThan(0);
      for (const f of s.logos) {
        expect(existsSync(f), f).toBe(true);
        expect(readFileSync(f, "utf8"), f).not.toMatch(/<text[\s>]/);
      }
    }
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run content/sleeves.test.ts`
Expected: FAIL, cannot resolve `@/art/sleeves.json`.

- [ ] **Step 3: Copy the logos and write the rows**

```bash
mkdir -p art/logos
cp /c/dev/pac-design-system/assets/logo-mark-white.svg art/logos/pac-tech-mark.svg
cp /c/dev/ManuvaDesignSystem/assets/logo-mark.svg art/logos/manuva-mark.svg
cp /c/dev/ManuvaDesignSystem/assets/logo-wordmark.svg art/logos/manuva-wordmark.svg
cp /c/dev/Silio-Design-System/assets/silio-logo.svg art/logos/silio-logo.svg
```

```json
[
  { "slug": "pac-forge", "logos": ["art/logos/pac-tech-mark.svg"], "label": "Pac-Hub" },
  { "slug": "manuva", "logos": ["art/logos/manuva-mark.svg", "art/logos/manuva-wordmark.svg"], "label": null },
  { "slug": "silio", "logos": ["art/logos/silio-logo.svg"], "label": null }
]
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run content/sleeves.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add art/logos/pac-tech-mark.svg art/logos/manuva-mark.svg art/logos/manuva-wordmark.svg art/logos/silio-logo.svg art/sleeves.json content/sleeves.test.ts
git commit -m "List each project's sleeve art in crate order"
```

---

### Task 2: Logos on the sleeves, flip angle, crate camera (Blender)

Runs in the live Blender session. Edit `office_props.py` in a copy and swap it in when verified (memory: parallel imports read it mid-edit).

**Files:**
- Modify: `scripts/blender/office_props.py` (`build_crate`, new `_svg_mesh`, `_sleeve_art`), `scripts/blender/greybox_office.py` (pass the rows; `FOCUS["crate"]`), `art/office.blend`, `public/models/office.glb`, `office/manifest.json`
- Test: `office/nodes.test.ts`

**Interfaces:**
- Consumes: `art/sleeves.json` (Task 1).
- Produces: nodes `hs_crate__record_NN__art` (child of each content record, its logo as a flat mesh 1 mm proud of the sleeve front, facing glTF +z) and `hs_crate__record_NN__label` where a label is given. **Reports `FLIP_ANGLE`** (radians, measured in Step 5) to the lead, who writes it into `office/objects/crate.ts`.

- [ ] **Step 1: Write the failing node test** (inside the `describe` in `office/nodes.test.ts`; `check:models` then holds the GLB to the manifest)

```ts
  it("every project's record has its logo on the front", () => {
    work.forEach((_, i) => expect(manifest.office.nodes).toContain(`hs_crate__record_${String(i).padStart(2, "0")}__art`));
  });
```

with `import { work } from "@/content/work";` at the top.

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run office/nodes.test.ts`
Expected: FAIL on `hs_crate__record_00__art`.

- [ ] **Step 3: Build the sleeve art** (in `office_props.py`, next to `_sleeve`)

```python
ART_BOX = (0.24, 0.12)        # largest logo width and height on a sleeve front, metres
ART_BOX_LABELLED = (0.2, 0.09)
ART_TOP = 0.29                # the art's top edge above the sleeve's bottom: the top of the sleeve shows between flicked records
LABEL_SIZE = 0.032


def _svg_mesh(path):
    """An SVG's filled shapes as one flat bmesh in xy (y up), any scale; None if the file draws nothing."""
    before = set(bpy.data.objects)
    bpy.ops.import_curve.svg(filepath=str(common.REPO / path))
    curves = [o for o in bpy.data.objects if o not in before]
    dg = bpy.context.evaluated_depsgraph_get()
    bm = bmesh.new()
    for o in curves:
        o.data.resolution_u = 4  # few facets per curve: many short edges read as noise
        o.data.fill_mode = "BOTH"
    dg.update()
    for o in curves:
        mesh = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
        mesh.transform(o.matrix_world)
        bm.from_mesh(mesh)
        bpy.data.meshes.remove(mesh)
    cols = {c for o in curves for c in o.users_collection}
    for o in curves:
        data = o.data
        bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.curves.remove(data)
    for c in cols:
        if c is not bpy.context.scene.collection and not c.objects:
            bpy.data.collections.remove(c)
    if not bm.verts:
        bm.free()
        return None
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    return bm


def _bounds(bm):
    xs = [v.co.x for v in bm.verts]
    ys = [v.co.y for v in bm.verts]
    return min(xs), max(xs), min(ys), max(ys)


def _sleeve_art(record, row, col):
    """A project's logo (its SVGs side by side) in line geometry on the front of `record`, top-aligned at ART_TOP and
    centred, with `row['label']` set under it in the built-in font when given."""
    parts = [bm for bm in (_svg_mesh(p) for p in row["logos"]) if bm]
    if not parts:
        return
    # lay the SVGs out left to right at a common height, a gap of 15% of that height between them
    height = max(_bounds(bm)[3] - _bounds(bm)[2] for bm in parts)
    art = bmesh.new()
    x = 0.0
    for bm in parts:
        x0, x1, y0, y1 = _bounds(bm)
        k = height / (y1 - y0)
        bmesh.ops.transform(bm, matrix=Matrix.Translation((x, 0, 0)) @ Matrix.Diagonal((k, k, 1, 1)) @ Matrix.Translation((-x0, -y0, 0)), verts=bm.verts)
        x += (x1 - x0) * k + 0.15 * height
        mesh = bpy.data.meshes.new("tmp")
        bm.to_mesh(mesh)
        bm.free()
        art.from_mesh(mesh)
        bpy.data.meshes.remove(mesh)
    x0, x1, y0, y1 = _bounds(art)
    box = ART_BOX_LABELLED if row.get("label") else ART_BOX
    k = min(box[0] / (x1 - x0), box[1] / (y1 - y0))
    # centre on x, top at ART_TOP; stand it up on the sleeve front (xz plane), 1 mm proud of it, facing -y
    place = (Matrix.Translation((0, -0.0035, ART_TOP)) @ Matrix.Rotation(math.pi / 2, 4, "X")
             @ Matrix.Diagonal((k, k, 1, 1)) @ Matrix.Translation((-(x0 + x1) / 2, -y1, 0)))
    bmesh.ops.transform(art, matrix=place, verts=art.verts)
    _part(f"{record.name}__art", art, record, col)
    if row.get("label"):
        common.text_mesh(f"{record.name}__label", row["label"], LABEL_SIZE, 0.0005,
                         (0, -0.0025, ART_TOP - box[1] - 0.035), record, col)
```

`_part` must accept a bmesh it frees, as elsewhere in this file; check its signature and adapt the call if it differs.

Change `build_crate`'s signature and loop to:

```python
def build_crate(name, location, rotation_z, parent, col, records=9, sleeves=()):
    ...
    for i in range(records):
        ...
        record = _sleeve(f"{name}__record_{i:02d}", root, col, (0.004 * jitter[0], y, 0.012), (-0.14 + 0.012 * (i % 3), 0, 0.01 * jitter[1]))
        if i < len(sleeves):
            _sleeve_art(record, sleeves[i], col)
    return root
```

In `greybox_office.py`, read the rows and pass them:

```python
import json
SLEEVES = json.loads((common.REPO / "art" / "sleeves.json").read_text(encoding="utf-8"))
...
props.build_crate("hs_crate", (desk.x - 1.0, back - 0.3, 0), 0.1, room, col, sleeves=SLEEVES)
```

- [ ] **Step 4: Build and look**

Run `greybox_office.py` in the live session (as in M1 Task 4). Check with a viewport render from `cam_focus_crate` that the front sleeve shows its logo upright, white lines on black, centred, readable, and not past the sleeve's edges. Fix by the knobs (`ART_BOX`, `ART_TOP`) only.

- [ ] **Step 5: Measure the flip angle**

The front record tips forward on its bottom edge (rotation about its local x, positive tips the top towards the crate's front) until it touches the crate's front wall. In Blender, step record 00's x rotation up from its rest in 0.01 rad steps; at each step test overlap between its evaluated mesh and `hs_crate__body` (`mathutils.bvhtree.BVHTree.FromObject` both, `.overlap()`). `FLIP_ANGLE` = the first overlapping step − 0.01 (relative to rest). Restore the rotation. **Report the value**; the lead writes it into `office/objects/crate.ts` (Task 3's provisional 0.3).

- [ ] **Step 6: Retune the crate camera**

With records 00..k flicked forward by `FLIP_ANGLE` (k from 0 to len(sleeves) − 2), the next sleeve's logo must be in frame and unblocked: ray-cast from the eye to the four corners of `hs_crate__record_{k+1}__art`'s bounds and require no hit before it. Retune `FOCUS["crate"]` (`land` and `portrait`) so this holds for every k, with the crate centred (no card beside it any more), the eye ≥ 0.3 m from any mesh. Update the comment above `FOCUS` to say why. Restore the rotations.

- [ ] **Step 7: Export, build, check**

```python
import runpy
runpy.run_path(r"C:\dev\KasperSimonsen.dev\scripts\blender\greybox_office.py", run_name="__main__")
result = runpy.run_path(r"C:\dev\KasperSimonsen.dev\scripts\blender\export.py", run_name="__main__")["SUMMARY"]
```

Run: `npm run build:models && npm run check:models && npx vitest run office content`
Expected: models OK (office under 2048 KB); all tests pass, including Step 1's.

Add `hs_crate__record_NN__art` for every project (00, 01, 02 today) to `office.nodes` in `office/manifest.json`: that turns Step 1's test green, and `check:models` fails the build if the GLB lacks any of them.

- [ ] **Step 8: Commit**

```bash
git add scripts/blender/office_props.py scripts/blender/greybox_office.py art/office.blend public/models/office.glb office/manifest.json office/nodes.test.ts
git commit -m "Put each project's logo on its sleeve and frame the crate for flicking"
```

---

### Task 3: Crate motion (pure)

**Files:**
- Create: `office/objects/crate.ts`
- Test: `office/objects/crate.test.ts`

**Interfaces:**
- Consumes: `approach` (`office/objects/motion.ts`), `easeInOutCubic` (`office/camera/pose.ts`).
- Produces:
  - `SLEEVE_M = 0.315`, `FLIP_ANGLE` (provisional 0.3; Task 2 measures it), `FLIP_SECONDS = 0.35`, `PULL_SECONDS = 0.6`, `PULL_FILL = { height: 0.62, width: 0.86 }`
  - `clampDig(dig: number, count: number): number`
  - `pullDistance(fovDeg: number, aspect: number): number`
  - `pulledPose(camPosition: Vector3, camQuaternion: Quaternion, distance: number, out: { position: Vector3; quaternion: Quaternion }): typeof out`
  - `type CrateNodes = { records: Object3D[]; restPosition: Vector3[]; restQuaternion: Quaternion[] }`, `findCrateNodes(records: Object3D[]): CrateNodes`
  - `class CrateMotion { get pulledDone(): boolean; update(nodes: CrateNodes, input: { dig: number; pulled: number | null; camera: { position: Vector3; quaternion: Quaternion; fov: number }; aspect: number; reduced: boolean }, dt: number): void }`

- [ ] **Step 1: Write the failing tests**

```ts
// office/objects/crate.test.ts
import { describe, it, expect } from "vitest";
import { BoxGeometry, Group, Mesh, Quaternion, Vector3 } from "three";
import { clampDig, CrateMotion, findCrateNodes, FLIP_ANGLE, FLIP_SECONDS, PULL_FILL, PULL_SECONDS, pullDistance, pulledPose, SLEEVE_M } from "./crate";

const camera = { position: new Vector3(0, 1, 2), quaternion: new Quaternion(), fov: 45 };

function crate() {
  const root = new Group();
  root.position.set(1, 0, 0);
  const records = [0, 1, 2].map((i) => {
    const r = new Mesh(new BoxGeometry(SLEEVE_M, SLEEVE_M, 0.005));
    r.position.set(0, 0.012, -0.03 * i);
    r.rotation.x = -0.14;
    root.add(r);
    return r;
  });
  root.updateMatrixWorld(true);
  return { root, nodes: findCrateNodes(records) };
}

describe("clampDig", () => {
  it("stops at the last project", () => expect(clampDig(5, 3)).toBe(2));
  it("stops at the front", () => expect(clampDig(-1, 3)).toBe(0));
});

describe("pullDistance", () => {
  const frac = (d: number, fov: number, aspect: number) => {
    const span = 2 * d * Math.tan((fov * Math.PI) / 360);
    return { h: SLEEVE_M / span, w: SLEEVE_M / (span * aspect) };
  };
  it("fills the height on a wide screen", () => {
    const f = frac(pullDistance(45, 1.6), 45, 1.6);
    expect(f.h).toBeCloseTo(PULL_FILL.height);
    expect(f.w).toBeLessThanOrEqual(PULL_FILL.width);
  });
  it("fills the width on a phone", () => {
    const f = frac(pullDistance(70, 390 / 844), 70, 390 / 844);
    expect(f.w).toBeCloseTo(PULL_FILL.width);
    expect(f.h).toBeLessThanOrEqual(PULL_FILL.height);
  });
});

describe("pulledPose", () => {
  it("hangs the sleeve straight ahead, centred, its back to the camera and upright", () => {
    const out = pulledPose(new Vector3(), new Quaternion(), 0.6, { position: new Vector3(), quaternion: new Quaternion() });
    expect(out.position.toArray().map((v) => +v.toFixed(6))).toEqual([0, -SLEEVE_M / 2, -0.6]);
    const front = new Vector3(0, 0, 1).applyQuaternion(out.quaternion);
    const up = new Vector3(0, 1, 0).applyQuaternion(out.quaternion);
    expect(front.z).toBeCloseTo(-1); // the front faces away; the back faces the camera
    expect(up.y).toBeCloseTo(1);
  });
});

describe("CrateMotion", () => {
  it("flicks the records in front of the dig forward over FLIP_SECONDS, leaving the rest", () => {
    const { nodes } = crate();
    const m = new CrateMotion();
    m.update(nodes, { dig: 1, pulled: null, camera, aspect: 1.6, reduced: false }, FLIP_SECONDS);
    expect(nodes.records[0].rotation.x).toBeCloseTo(-0.14 + FLIP_ANGLE);
    expect(nodes.records[1].rotation.x).toBeCloseTo(-0.14);
  });
  it("is part way through a flick half way through it", () => {
    const { nodes } = crate();
    const m = new CrateMotion();
    m.update(nodes, { dig: 1, pulled: null, camera, aspect: 1.6, reduced: false }, FLIP_SECONDS / 2);
    expect(nodes.records[0].rotation.x).toBeGreaterThan(-0.14);
    expect(nodes.records[0].rotation.x).toBeLessThan(-0.14 + FLIP_ANGLE);
  });
  it("switches at once under reduced motion", () => {
    const { nodes } = crate();
    const m = new CrateMotion();
    m.update(nodes, { dig: 2, pulled: null, camera, aspect: 1.6, reduced: true }, 0.001);
    expect(nodes.records[1].rotation.x).toBeCloseTo(-0.14 + FLIP_ANGLE);
  });
  it("brings the pulled record to the camera, says so, and puts it back", () => {
    const { nodes } = crate();
    const m = new CrateMotion();
    m.update(nodes, { dig: 0, pulled: 0, camera, aspect: 1.6, reduced: false }, PULL_SECONDS);
    expect(m.pulledDone).toBe(true);
    const want = pulledPose(camera.position, camera.quaternion, pullDistance(45, 1.6), { position: new Vector3(), quaternion: new Quaternion() });
    const got = nodes.records[0].getWorldPosition(new Vector3());
    expect(got.distanceTo(want.position)).toBeLessThan(1e-6);
    m.update(nodes, { dig: 0, pulled: null, camera, aspect: 1.6, reduced: false }, PULL_SECONDS);
    expect(m.pulledDone).toBe(false);
    expect(nodes.records[0].position.toArray()).toEqual(nodes.restPosition[0].toArray());
    expect(nodes.records[0].rotation.x).toBeCloseTo(-0.14);
  });
  it("keeps whatever height the tease gave a record that isn't pulled", () => {
    const { nodes } = crate();
    const m = new CrateMotion();
    nodes.records[1].position.y = 0.05; // ObjectMotion's nudge, written earlier in the frame
    m.update(nodes, { dig: 0, pulled: null, camera, aspect: 1.6, reduced: false }, 0.016);
    expect(nodes.records[1].position.y).toBe(0.05);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run office/objects/crate.test.ts`
Expected: FAIL, cannot resolve `./crate`.

- [ ] **Step 3: Implement**

```ts
// office/objects/crate.ts
import { Matrix4, Quaternion, Vector3, type Object3D } from "three";
import { easeInOutCubic } from "@/office/camera/pose";
import { approach } from "./motion";

/** An LP sleeve's side, metres (office_props.SLEEVE). */
export const SLEEVE_M = 0.315;
/** How far a flicked record tips forward on its bottom edge, radians from rest: it leans on the crate's front wall (measured in Blender, plan Task 2). */
export const FLIP_ANGLE = 0.3;
export const FLIP_SECONDS = 0.35;
export const PULL_SECONDS = 0.6;
/** A pulled sleeve fills at most this share of the screen's height and width. */
export const PULL_FILL = { height: 0.62, width: 0.86 };

/** The record at the front of the dig, kept to the records that have projects. */
export function clampDig(dig: number, count: number): number {
  return Math.max(0, Math.min(count - 1, Math.round(dig)));
}

/** How far ahead of a `fovDeg` x `aspect` camera a pulled sleeve hangs so it fills PULL_FILL of the view. */
export function pullDistance(fovDeg: number, aspect: number): number {
  const t = Math.tan((fovDeg * Math.PI) / 360);
  return Math.max(SLEEVE_M / (PULL_FILL.height * 2 * t), SLEEVE_M / (PULL_FILL.width * 2 * t * aspect));
}

const TURN = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);
const ahead = new Vector3();
const up = new Vector3();

/**
 * World pose of a pulled sleeve: its centre straight ahead of the camera at `distance`, upright with the camera and
 * turned round, so its back faces the camera. The sleeve's origin is its bottom edge, its front is local +z.
 */
export function pulledPose(camPosition: Vector3, camQuaternion: Quaternion, distance: number, out: { position: Vector3; quaternion: Quaternion }) {
  ahead.set(0, 0, -1).applyQuaternion(camQuaternion);
  up.set(0, 1, 0).applyQuaternion(camQuaternion);
  out.quaternion.copy(camQuaternion).multiply(TURN);
  out.position.copy(camPosition).addScaledVector(ahead, distance).addScaledVector(up, -SLEEVE_M / 2);
  return out;
}

export type CrateNodes = { records: Object3D[]; restPosition: Vector3[]; restQuaternion: Quaternion[] };

/** The crate's records (index order) and where they rest, local to the crate. */
export function findCrateNodes(records: Object3D[]): CrateNodes {
  return { records, restPosition: records.map((r) => r.position.clone()), restQuaternion: records.map((r) => r.quaternion.clone()) };
}

const tip = new Quaternion();
const X = new Vector3(1, 0, 0);
const target = { position: new Vector3(), quaternion: new Quaternion() };
const world = new Matrix4();
const parentInverse = new Matrix4();
const restWorld = { position: new Vector3(), quaternion: new Quaternion(), scale: new Vector3() };
const blendQ = new Quaternion();
const blendP = new Vector3();

/** Per-frame easing of the flicks and the pull-out. Pure state: no React, no clocks. Runs after ObjectMotion (the tease). */
export class CrateMotion {
  private flip: number[] = [];
  private pull: number[] = [];
  private pulledIndex: number | null = null;

  /** True once the pulled record has arrived in front of the camera (its print waits for it). */
  get pulledDone(): boolean {
    return this.pulledIndex !== null && this.pull[this.pulledIndex] === 1;
  }

  update(
    nodes: CrateNodes,
    input: { dig: number; pulled: number | null; camera: { position: Vector3; quaternion: Quaternion; fov: number }; aspect: number; reduced: boolean },
    dt: number,
  ): void {
    this.pulledIndex = input.pulled;
    const distance = pullDistance(input.camera.fov, input.aspect);
    pulledPose(input.camera.position, input.camera.quaternion, distance, target);
    nodes.records.forEach((r, i) => {
      const wasOut = (this.pull[i] ?? 0) > 0;
      this.flip[i] = approach(this.flip[i] ?? 0, i < input.dig ? 1 : 0, dt, input.reduced ? 0 : FLIP_SECONDS);
      this.pull[i] = approach(this.pull[i] ?? 0, input.pulled === i ? 1 : 0, dt, input.reduced ? 0 : PULL_SECONDS);
      tip.setFromAxisAngle(X, FLIP_ANGLE * easeInOutCubic(this.flip[i]));
      r.quaternion.copy(nodes.restQuaternion[i]).multiply(tip);
      const p = this.pull[i];
      if (p === 0) {
        if (wasOut) r.position.copy(nodes.restPosition[i]); // just put back: all the way home
        else {
          r.position.x = nodes.restPosition[i].x; // y is the tease's (ObjectMotion), left alone
          r.position.z = nodes.restPosition[i].z;
        }
        return;
      }
      // blend from where it stands (in world space) to the pulled pose, then back into the crate's space
      const parent = r.parent;
      if (!parent) return;
      parent.updateWorldMatrix(true, false);
      world.compose(nodes.restPosition[i], r.quaternion, r.scale).premultiply(parent.matrixWorld);
      world.decompose(restWorld.position, restWorld.quaternion, restWorld.scale);
      const e = easeInOutCubic(p);
      blendP.lerpVectors(restWorld.position, target.position, e);
      blendQ.slerpQuaternions(restWorld.quaternion, target.quaternion, e);
      world.compose(blendP, blendQ, restWorld.scale).premultiply(parentInverse.copy(parent.matrixWorld).invert());
      world.decompose(r.position, r.quaternion, restWorld.scale);
    });
  }
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run office/objects/crate.test.ts`
Expected: all pass. If the pulled-pose test fails by the record's scale, the decompose into `restWorld.scale` is the place to look; do not change the test's expectation.

- [ ] **Step 5: Commit**

```bash
git add office/objects/crate.ts office/objects/crate.test.ts
git commit -m "Crate motion: flick records forward and pull one out to the camera"
```

---

### Task 4: Dig rules (pure)

**Files:**
- Create: `office/crate/dig.ts`
- Test: `office/crate/dig.test.ts`

**Interfaces:**
- Consumes: `clampDig` (Task 3), `work` (`content/work.ts`).
- Produces:
  - `digFor(dig: number, pulledSlug: string | null): number`: a pulled record is at the front (the records in front of it flicked).
  - `canPull(focused: HotspotName | null, pulledSlug: string | null): boolean`
  - `type Wheel = { acc: number; quietUntil: number }`, `WHEEL_STEP = 60`, `WHEEL_COOLDOWN_MS = 350`, `wheelStep(w: Wheel, deltaY: number, now: number): { w: Wheel; step: -1 | 0 | 1 }`
  - `SWIPE_PX = 40`, `swipeStep(dy: number): -1 | 0 | 1` (dy = end − start; swiping up flicks forward)

- [ ] **Step 1: Write the failing tests**

```ts
// office/crate/dig.test.ts
import { describe, it, expect } from "vitest";
import { work } from "@/content/work";
import { canPull, digFor, swipeStep, wheelStep, WHEEL_COOLDOWN_MS, WHEEL_STEP, type Wheel } from "./dig";

describe("digFor", () => {
  it("brings a pulled record to the front, wherever the dig was", () => expect(digFor(0, work[work.length - 1].slug)).toBe(work.length - 1));
  it("keeps the dig while nothing is pulled", () => expect(digFor(1, null)).toBe(1));
  it("ignores an unknown slug", () => expect(digFor(1, "nope")).toBe(1));
});

describe("canPull", () => {
  it("pulls while browsing the crate", () => expect(canPull("hs_crate", null)).toBe(true));
  it("doesn't pull a second record while one is out", () => expect(canPull("hs_crate", work[0].slug)).toBe(false));
  it("doesn't pull from anywhere else", () => expect(canPull("hs_shelf", null)).toBe(false));
});

describe("wheelStep (one flick per gesture)", () => {
  const start: Wheel = { acc: 0, quietUntil: 0 };
  it("waits for a full step of scrolling", () => expect(wheelStep(start, WHEEL_STEP - 1, 0).step).toBe(0));
  it("flicks forward on scrolling down, back on scrolling up", () => {
    expect(wheelStep(start, WHEEL_STEP, 0).step).toBe(1);
    expect(wheelStep(start, -WHEEL_STEP, 0).step).toBe(-1);
  });
  it("lets a trackpad's long swipe flick only once, then needs a pause", () => {
    let w = start;
    let flicks = 0;
    for (let t = 0; t < 300; t += 10) {
      const r = wheelStep(w, 30, t); // 30 events of 30 px, 10 ms apart: one gesture
      w = r.w;
      flicks += Math.abs(r.step);
    }
    expect(flicks).toBe(1);
    expect(wheelStep(w, WHEEL_STEP, 300 + WHEEL_COOLDOWN_MS).step).toBe(1);
  });
});

describe("swipeStep", () => {
  it("flicks forward on a swipe up", () => expect(swipeStep(-80)).toBe(1));
  it("flicks back on a swipe down", () => expect(swipeStep(80)).toBe(-1));
  it("ignores a tap", () => expect(swipeStep(5)).toBe(0));
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run office/crate/dig.test.ts`
Expected: FAIL, cannot resolve `./dig`.

- [ ] **Step 3: Implement**

```ts
// office/crate/dig.ts
import { work } from "@/content/work";
import type { HotspotName } from "@/office/hotspots/registry";

/** A pulled record is at the front of the dig: the records in front of it are flicked forward. */
export function digFor(dig: number, pulledSlug: string | null): number {
  const i = pulledSlug ? work.findIndex((w) => w.slug === pulledSlug) : -1;
  return i < 0 ? dig : i;
}

/** A record can be pulled while browsing the crate with none out. */
export function canPull(focused: HotspotName | null, pulledSlug: string | null): boolean {
  return focused === "hs_crate" && pulledSlug === null;
}

export type Wheel = { acc: number; quietUntil: number };
/** Pixels of wheel travel per flick, and the pause before the same gesture can flick again. */
export const WHEEL_STEP = 60;
export const WHEEL_COOLDOWN_MS = 350;

/**
 * One flick per wheel gesture: travel accumulates to WHEEL_STEP, then the gesture is spent until the wheel has been
 * quiet for WHEEL_COOLDOWN_MS (a trackpad keeps firing for a second after the fingers lift).
 */
export function wheelStep(w: Wheel, deltaY: number, now: number): { w: Wheel; step: -1 | 0 | 1 } {
  if (now < w.quietUntil) return { w: { acc: 0, quietUntil: now + WHEEL_COOLDOWN_MS }, step: 0 };
  const acc = w.acc + deltaY;
  if (Math.abs(acc) < WHEEL_STEP) return { w: { acc, quietUntil: 0 }, step: 0 };
  return { w: { acc: 0, quietUntil: now + WHEEL_COOLDOWN_MS }, step: acc > 0 ? 1 : -1 };
}

export const SWIPE_PX = 40;

/** A vertical swipe on a touch screen: up flicks forward, down flicks back, a tap is nothing. */
export function swipeStep(dy: number): -1 | 0 | 1 {
  return Math.abs(dy) < SWIPE_PX ? 0 : dy < 0 ? 1 : -1;
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run office/crate/dig.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add office/crate/dig.ts office/crate/dig.test.ts
git commit -m "Dig rules: one flick per wheel gesture or swipe, one record out at a time"
```

---

### Task 5: The sleeve's back and the case-study panel

**Files:**
- Modify: `office/cards/face.ts`, `office/cards/face.test.ts`, `office/cards/CardFace.tsx`, `office/copy.ts`, `app/(office)/office.css`
- Create: `office/cards/lead.ts`, `office/cards/lead.test.ts`, `office/cards/SleeveBack.tsx`, `panels/CaseStudy.tsx`, `panels/CaseStudy.test.ts`

**Interfaces:**
- Consumes: `WorkItem` (`content/work.ts`), `COPY` (`office/copy.ts`).
- Produces:
  - `backFaceFor(box: Box3, widthPx: number)` → `{ position, rotation, distanceFactor, heightPx }` (same shape as `faceFor`), for an upright sleeve (front +z, up +y): on the −z face, facing −z, text up +y, reading left to right from behind.
  - `CardFace` props become `{ surface: Mesh; place?: "top" | "back"; widthPx?: number; hotspot; titleId; children }` (`place` defaults to `"top"`, `widthPx` to `FACE_WIDTH_PX`). Update its one caller in `office/OfficeCanvas.tsx` (`card={card}` → `surface={card}`).
  - `leadOf(intro: string[], sentences = 3, maxChars = 320): string`
  - `SleeveBack({ item: WorkItem; titleId: string; onReadMore: () => void })`, `SLEEVE_WIDTH_PX = 600`
  - `CaseStudy({ item: WorkItem; titleId: string })`
  - `COPY.sleeve = { readMore: "Read more", stack: "Built with" }`, `COPY.caseStudy = { stack: "Built with", live: "See it live" }`, `COPY.crate = { label: (name: string, n: number, of: number) => string; hint: string }` (drafts)

- [ ] **Step 1: Write the failing tests**

Append to `office/cards/face.test.ts`:

```ts
describe("backFaceFor", () => {
  // a sleeve in its glTF frame: 315 mm square standing on its bottom edge (origin), 5 mm thick, front +z
  const sleeve = new Box3(new Vector3(-0.1575, 0, -0.0025), new Vector3(0.1575, 0.315, 0.0025));
  const face = backFaceFor(sleeve, 600);
  it("spans the sleeve's width with widthPx of HTML", () => expect((600 * face.distanceFactor) / 400).toBeCloseTo(0.315, 6));
  it("is square like the sleeve", () => expect(face.heightPx).toBeCloseTo(600, 6));
  it("sits just behind the back face, centred", () => {
    const [x, y, z] = face.position;
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(0.1575, 6);
    expect(z).toBeLessThan(-0.0025);
  });
  it("faces out of the back, upright, reading left to right from behind", () => {
    const turn = new Euler(...face.rotation);
    expect(new Vector3(0, 0, 1).applyEuler(turn).z).toBeCloseTo(-1, 6);
    expect(new Vector3(0, 1, 0).applyEuler(turn).y).toBeCloseTo(1, 6);
    expect(new Vector3(1, 0, 0).applyEuler(turn).x).toBeCloseTo(-1, 6);
  });
});
```

(and add `backFaceFor` to the file's import from `./face`).

```ts
// office/cards/lead.test.ts
import { describe, it, expect } from "vitest";
import { leadOf } from "./lead";

describe("leadOf", () => {
  it("takes the first three sentences of the first paragraph", () =>
    expect(leadOf(["One. Two! Three? Four.", "Other."])).toBe("One. Two! Three?"));
  it("stops early rather than run past maxChars", () => expect(leadOf(["A short one. " + "x".repeat(400) + "."])).toBe("A short one."));
  it("is empty for an empty intro", () => expect(leadOf([])).toBe(""));
});
```

```ts
// panels/CaseStudy.test.ts
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { work, type WorkItem } from "@/content/work";
import CaseStudy from "./CaseStudy";
import SleeveBack from "@/office/cards/SleeveBack";

const html = (item: WorkItem) => renderToStaticMarkup(createElement(CaseStudy, { item, titleId: "t" }));
/** React escapes text; compare like with like. */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

describe("CaseStudy", () => {
  it("shows the whole case study under a heading the dialog is labelled by", () => {
    const out = html(work[0]);
    expect(out).toContain(`id="t"`);
    expect(out).toContain(esc(work[0].name));
    for (const s of work[0].sections) expect(out).toContain(esc(s.title));
  });
  it("still renders a project with no sections yet", () => expect(html({ ...work[0], sections: [], intro: [] })).toContain(esc(work[0].name)));
});

describe("SleeveBack", () => {
  it("prints the name, years, headline, stack and Read more", () => {
    const out = renderToStaticMarkup(createElement(SleeveBack, { item: work[1], titleId: "s", onReadMore: () => {} }));
    for (const text of [work[1].name, work[1].years, work[1].headline, work[1].stack[0], "Read more"]) expect(out).toContain(esc(text));
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run office/cards panels`
Expected: FAIL: `backFaceFor` is not exported; `./lead`, `./CaseStudy`, `@/office/cards/SleeveBack` cannot be resolved.

- [ ] **Step 3: Implement**

Append to `office/cards/face.ts`:

```ts
/**
 * Where drei's `Html transform` goes to print `widthPx` of HTML on the back of an upright sleeve (its front +z, up +y,
 * origin on its bottom edge): just behind the back face, facing out of it, upright, reading left to right from behind.
 */
export function backFaceFor(box: Box3, widthPx: number) {
  const width = box.max.x - box.min.x;
  const height = box.max.y - box.min.y;
  return {
    position: [(box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, box.min.z - LIFT] as [number, number, number],
    rotation: [0, Math.PI, 0] as [number, number, number],
    distanceFactor: (width * 400) / widthPx,
    heightPx: (widthPx * height) / width,
  };
}
```

`office/cards/CardFace.tsx`: rename the `card` prop to `surface`, add `place` and `widthPx`:

```tsx
export default function CardFace({
  surface,
  place = "top",
  widthPx = FACE_WIDTH_PX,
  hotspot,
  titleId,
  children,
}: {
  surface: Mesh;
  place?: "top" | "back";
  widthPx?: number;
  hotspot: HotspotName;
  titleId: string;
  children: ReactNode;
}) {
  const face = useMemo(() => {
    if (!surface.geometry.boundingBox) surface.geometry.computeBoundingBox();
    return (place === "back" ? backFaceFor : faceFor)(surface.geometry.boundingBox!, widthPx);
  }, [surface, place, widthPx]);
  // ...the rest as now, with `card` → `surface` and `FACE_WIDTH_PX` → `widthPx` in the section's style;
  // add className={place === "back" ? "office-card-face office-sleeve-back" : "office-card-face"} on the section
```

and in `office/OfficeCanvas.tsx` change `<CardFace card={card} ...>` to `<CardFace surface={card} ...>`.

```ts
// office/cards/lead.ts
/** The first `sentences` sentences of an intro's first paragraph, cut back to whole sentences within `maxChars`. */
export function leadOf(intro: string[], sentences = 3, maxChars = 320): string {
  const parts = (intro[0] ?? "").match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [];
  let out = "";
  for (const s of parts.slice(0, sentences)) {
    const next = out ? `${out} ${s}` : s;
    if (next.length > maxChars) break;
    out = next;
  }
  return out;
}
```

```tsx
// office/cards/SleeveBack.tsx
"use client";

import type { WorkItem } from "@/content/work";
import { COPY } from "@/office/copy";
import { leadOf } from "./lead";

/** CSS px the back is laid out at, square like the sleeve. */
export const SLEEVE_WIDTH_PX = 600;

/** What's printed on a pulled sleeve's back, like liner notes (interactions spec 3.2). */
export default function SleeveBack({ item, titleId, onReadMore }: { item: WorkItem; titleId: string; onReadMore: () => void }) {
  return (
    <>
      <p className="office-card-eyebrow">
        {item.years} · {item.role}
      </p>
      <h2 id={titleId} className="office-card-title" tabIndex={-1}>
        {item.name}
      </h2>
      <p className="office-sleeve-headline">{item.headline}</p>
      <p className="office-card-text">{leadOf(item.intro)}</p>
      <p className="office-sleeve-label">{COPY.sleeve.stack}</p>
      <ul className="office-sleeve-stack">
        {item.stack.slice(0, 6).map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <button type="button" className="office-card-cta" onClick={onReadMore}>
        {COPY.sleeve.readMore}
      </button>
    </>
  );
}
```

```tsx
// panels/CaseStudy.tsx
"use client";

import type { WorkItem } from "@/content/work";
import { COPY } from "@/office/copy";

/** A case study in the Read more panel: the intro, every section, the stack and the live link. */
export default function CaseStudy({ item, titleId }: { item: WorkItem; titleId: string }) {
  return (
    <article className="article">
      <p className="article-eyebrow">
        {item.years} · {item.role}
      </p>
      <h2 id={titleId} className="article-title">
        {item.name}
      </h2>
      <p className="article-lede">{item.headline}</p>
      {item.intro.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {item.sections.map((s) => (
        <section key={s.title}>
          <h3>{s.title}</h3>
          {s.paras.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>
      ))}
      <h3>{COPY.caseStudy.stack}</h3>
      <ul className="article-stack">
        {item.stack.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      {item.liveUrl && (
        <p>
          <a href={item.liveUrl} target="_blank" rel="noreferrer">
            {COPY.caseStudy.live}
          </a>
        </p>
      )}
    </article>
  );
}
```

In `office/copy.ts`, add (drafts):

```ts
  sleeve: { readMore: "Read more", stack: "Built with" },
  caseStudy: { stack: "Built with", live: "See it live" },
  crate: {
    label: (name: string, n: number, of: number) => `Record crate: ${name}, ${n} of ${of}. Arrow keys flick, Enter pulls it out.`,
    hint: "Scroll to flick through. Click a record to pull it out.",
  },
```

In `app/(office)/office.css`, after the `.office-card-face` rules:

```css
/* What's printed on a pulled sleeve's back: laid out at 600 px square, mapped onto the 315 mm sleeve. */
.office-sleeve-back { padding: 46px 48px; font-size: 22px; }
.office-sleeve-back .office-card-title { font-size: 52px; }
.office-sleeve-headline { margin: 0 0 18px; font-size: 26px; font-weight: 600; line-height: 1.2; }
.office-sleeve-label { margin: 18px 0 6px; font: 14px/1 var(--font-mono), ui-monospace, monospace; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); }
.office-sleeve-stack { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 4px 16px; font: 17px/1.4 var(--font-mono), ui-monospace, monospace; color: rgba(232, 232, 232, 0.8); }
.office-sleeve-back .office-card-cta { right: 48px; bottom: 46px; }
.article-eyebrow { margin: 0; font: 11px/1.2 var(--font-mono), ui-monospace, monospace; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); }
.article h3 { margin: 28px 0 8px; font-size: 18px; font-weight: 600; }
.article-stack { padding-left: 18px; color: rgba(232, 232, 232, 0.8); }
/* the crate's hint, bottom centre while browsing it */
.office-hint { position: fixed; left: 50%; bottom: 20px; z-index: 3; translate: -50% 0; font: 11px/1 var(--font-mono), ui-monospace, monospace; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(232, 232, 232, 0.7); }
.office-crate { position: fixed; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
```

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run office/cards panels && npx tsc --noEmit -p .`
Expected: all pass; no type errors.

- [ ] **Step 5: Commit**

```bash
git add office/cards/face.ts office/cards/face.test.ts office/cards/CardFace.tsx office/cards/lead.ts office/cards/lead.test.ts office/cards/SleeveBack.tsx panels/CaseStudy.tsx panels/CaseStudy.test.ts office/copy.ts "app/(office)/office.css" office/OfficeCanvas.tsx
git commit -m "Print a sleeve's details on its back and show the case study in the panel"
```

---

### Task 6: Wire the crate, end to end

**Files:**
- Modify: `office/OfficeCanvas.tsx`, `office/OfficeExperience.tsx`, `office/objects/crate.ts` (Task 2's measured `FLIP_ANGLE`)
- Create: `e2e/office-crate.spec.ts`

**Interfaces:**
- Consumes: everything above; M1's `activate`, `read`, `back`, `pushLayer`, `CardFace`, `Panel`.
- Produces: host attributes `data-dig` (front record index) and `data-sleeve` (`out` once the pulled record has arrived, else `in`); a focusable crate control (`role="group"`, `aria-roledescription="record crate"`).

- [ ] **Step 1: Write the failing e2e tests**

```ts
// e2e/office-crate.spec.ts
import { test, expect, type Page } from "@playwright/test";
import { work } from "../content/work";

const office = (page: Page) => page.locator(".office");

async function standInOffice(page: Page) {
  await page.goto("/");
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 15_000 });
}

async function openCrate(page: Page) {
  const button = page.getByRole("button", { name: "The work" });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_crate", { timeout: 10_000 });
  return button;
}

const crate = (page: Page) => page.locator('[aria-roledescription="record crate"]');

test("the keyboard flicks, pulls, reads and steps back out one layer at a time", async ({ page }) => {
  await standInOffice(page);
  const button = await openCrate(page);
  await expect(crate(page)).toBeFocused();
  await expect(office(page)).toHaveAttribute("data-dig", "0");
  await page.keyboard.press("ArrowDown");
  await expect(office(page)).toHaveAttribute("data-dig", "1");
  await page.keyboard.press("ArrowUp");
  await expect(office(page)).toHaveAttribute("data-dig", "0");
  for (let i = 0; i < work.length + 2; i++) await page.keyboard.press("ArrowDown");
  const last = work[work.length - 1];
  await expect(office(page)).toHaveAttribute("data-dig", String(work.length - 1)); // stops at the last project
  await expect(page).toHaveURL(/\/$/); // flicking is local

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/work/${last.slug}$`));
  await expect(office(page)).toHaveAttribute("data-sleeve", "out", { timeout: 10_000 });
  const back = page.getByRole("region", { name: last.name });
  await expect(back).toBeVisible();
  await expect(back.getByRole("heading", { name: last.name })).toBeFocused();

  const more = back.getByRole("button", { name: "Read more" });
  await more.click();
  const dialog = page.getByRole("dialog", { name: last.name });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/work/${last.slug}$`)); // Read more never changes the URL

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(more).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/$/);
  await expect(office(page)).toHaveAttribute("data-sleeve", "in", { timeout: 10_000 });
  await expect(crate(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 10_000 });
  await expect(button).toBeFocused();
});

test("one wheel gesture flicks one record", async ({ page }) => {
  await standInOffice(page);
  await openCrate(page);
  // one gesture: ten events inside a few milliseconds, as a trackpad sends them
  await page.evaluate(() => {
    for (let i = 0; i < 10; i++) window.dispatchEvent(new WheelEvent("wheel", { deltaY: 40 }));
  });
  await expect(office(page)).toHaveAttribute("data-dig", "1");
});

test("Forward onto a project's URL brings its record out again, the ones in front flicked", async ({ page }) => {
  const item = work[work.length - 1];
  await standInOffice(page);
  await openCrate(page);
  for (let i = 0; i < work.length; i++) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/work/${item.slug}$`));
  await page.goBack();
  await expect(office(page)).toHaveAttribute("data-sleeve", "in", { timeout: 10_000 });
  for (let i = 0; i < work.length; i++) await page.keyboard.press("ArrowUp");
  await expect(office(page)).toHaveAttribute("data-dig", "0");
  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`/work/${item.slug}$`));
  await expect(office(page)).toHaveAttribute("data-dig", String(work.length - 1));
  await expect(office(page)).toHaveAttribute("data-sleeve", "out", { timeout: 10_000 });
  await expect(page.getByRole("region", { name: item.name })).toBeVisible();
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("flicks and pulls without animating", async ({ page }) => {
    await standInOffice(page);
    await openCrate(page);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(office(page)).toHaveAttribute("data-sleeve", "out", { timeout: 5_000 });
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("pulls the sleeve close enough to fill most of the width", async ({ page }) => {
    await standInOffice(page);
    await openCrate(page);
    await page.keyboard.press("Enter");
    const back = page.getByRole("region", { name: work[0].name });
    await expect(back).toBeVisible({ timeout: 20_000 });
    expect((await back.boundingBox())!.width).toBeGreaterThan(390 * 0.7);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx playwright test e2e/office-crate.spec.ts --workers=1 --reporter=line`
Expected: FAIL: no element with `aria-roledescription="record crate"`; `data-dig` missing.

- [ ] **Step 3: Write Task 2's measured `FLIP_ANGLE` into `office/objects/crate.ts`** (replace the provisional 0.3) and re-run `npx vitest run office/objects/crate.test.ts` (all pass).

- [ ] **Step 4: Canvas** (`office/OfficeCanvas.tsx`)

Add to `OfficeCanvasProps`:

```ts
  /** The crate: the front record of the dig and the pulled record's index (or null). Read every frame. */
  crate: RefObject<{ dig: number; pulled: number | null }>;
  /** What's printed on the pulled sleeve's back while it shows, or null. */
  sleeveBack: { index: number; titleId: string; content: ReactNode } | null;
  /** The pulled record arrived in front of the camera (true) or left (false). */
  onSleeveOut: (out: boolean) => void;
```

and add `"crate" | "sleeveBack" | "onSleeveOut"` to `OfficeProps`'s `Pick`. In `Office`:

```ts
  const crateNodes = useMemo(() => findCrateNodes(nodes.records), [nodes]);
  const crateMotion = useMemo(() => new CrateMotion(), []);
  const sleeveWasOut = useRef(false);
```

In `useFrame`, after `motion.update(...)`:

```ts
    const c = crate.current;
    crateMotion.update(crateNodes, { dig: c.dig, pulled: c.pulled, camera: { position: camera.position, quaternion: camera.quaternion, fov: (camera as PerspectiveCamera).fov }, aspect: size.width / size.height, reduced }, dt);
    if (crateMotion.pulledDone !== sleeveWasOut.current) {
      sleeveWasOut.current = crateMotion.pulledDone;
      onSleeveOut(crateMotion.pulledDone);
      if (host.current) host.current.dataset.sleeve = crateMotion.pulledDone ? "out" : "in";
    }
```

In `onClick`, after `const hit = pickHit(...)`, before `if (!hit) return;`:

```ts
    // A second click on the crate (not on a record) pulls the front record.
    const focused = focusedHotspot(director.current);
    if (!hit && focused === "hs_crate" && e.intersections.some((i) => hitFor(i.object, null)?.hotspot === "hs_crate")) {
      const slug = work[crate.current.dig]?.slug;
      if (slug) {
        e.stopPropagation();
        onActivate({ hotspot: "hs_crate", item: slug });
      }
      return;
    }
```

(import `hitFor` from the registry, `work` from `@/content/work`, `CrateMotion` and `findCrateNodes` from `./objects/crate`, and `SLEEVE_WIDTH_PX` from `./cards/SleeveBack`), and render the print beside the drawer's:

```tsx
      {sleeveBack && crateNodes.records[sleeveBack.index] && (
        <CardFace surface={crateNodes.records[sleeveBack.index] as Mesh} place="back" widthPx={SLEEVE_WIDTH_PX} hotspot="hs_crate" titleId={sleeveBack.titleId}>
          {sleeveBack.content}
        </CardFace>
      )}
```

Set `data-sleeve="in"` and `data-dig="0"` on the host's initial markup in `OfficeExperience` (next to `data-drawer="shut"`).

- [ ] **Step 5: Experience** (`office/OfficeExperience.tsx`)

Place this block after `focusedOn` is declared and after `activate`, `read` and `live` (it uses all four). Import `type KeyboardEvent as ReactKeyboardEvent` from `react` for the key handler.

```ts
  const pulledSlug = scene.target?.hotspot === "hs_crate" ? scene.target.item : null;
  const [dig, setDig] = useState(0);
  const [sleeveOut, setSleeveOut] = useState(false);
  const crate = useRef({ dig: 0, pulled: null as number | null });
  const wheel = useRef<Wheel>({ acc: 0, quietUntil: 0 });
  const crateRef = useRef<HTMLDivElement | null>(null);
  const pulledIndex = pulledSlug ? work.findIndex((w) => w.slug === pulledSlug) : -1;
  crate.current = { dig: digFor(dig, pulledSlug), pulled: pulledIndex < 0 ? null : pulledIndex };

  // A pulled record (a click, Enter or a link) is at the front; the dig starts again at the front of a fresh visit.
  useEffect(() => {
    if (pulledSlug) setDig((d) => digFor(d, pulledSlug));
  }, [pulledSlug]);
  useEffect(() => {
    if (state.kind === "idle") setDig(0);
  }, [state.kind]);

  const browsing = focusedOn === "hs_crate" && !pulledSlug && !scene.reading;
  const flick = useCallback((step: number) => setDig((d) => clampDig(d + step, work.length)), []);
  const pull = useCallback(() => {
    if (!canPull(focusedHotspot(director.current), live().scene.target?.item ?? null)) return;
    activate({ hotspot: "hs_crate", item: work[crate.current.dig].slug });
  }, [activate]);

  // Wheel and swipe flick while browsing the crate (the page is scroll-locked then).
  useEffect(() => {
    if (!browsing) return;
    const onWheel = (e: WheelEvent) => {
      const r = wheelStep(wheel.current, e.deltaY, performance.now());
      wheel.current = r.w;
      if (r.step) flick(r.step);
    };
    let startY: number | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") startY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (startY === null) return;
      const step = swipeStep(e.clientY - startY);
      startY = null;
      if (step) flick(step);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [browsing, flick]);

  const onCrateKey = (e: ReactKeyboardEvent) => {
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (step) {
      e.preventDefault();
      flick(step);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pull();
    }
  };
```

In `activate`, after `const now = live().scene.target;`, ignore picks while a record is out:

```ts
    if (now?.hotspot === "hs_crate" && now.item && hit.hotspot === "hs_crate") return; // one record out at a time
```

Focus: the crate control takes focus while browsing (instead of the Back button), and again when a record goes back:

```ts
  useEffect(() => {
    if (browsing) crateRef.current?.focus({ preventScroll: true });
  }, [browsing]);
```

and change the Back-button focus effect's condition to `focusedOn && !hasCard && focusedOn !== "hs_crate" && trigger.current`.

Markup, after the Back button:

```tsx
      {browsing && (
        <>
          <div
            ref={crateRef}
            className="office-crate"
            role="group"
            tabIndex={0}
            aria-roledescription="record crate"
            aria-label={COPY.crate.label(work[dig].name, dig + 1, work.length)}
            onKeyDown={onCrateKey}
          />
          <p className="office-hint" aria-hidden="true">
            {COPY.crate.hint}
          </p>
        </>
      )}

      {scene.reading && pulledSlug && (
        <Panel hotspot="hs_crate" titleId="case-title" onClose={back}>
          <CaseStudy item={findWork(pulledSlug)!} titleId="case-title" />
        </Panel>
      )}
```

Canvas props:

```tsx
            crate={crate}
            sleeveBack={pulledSlug && sleeveOut && pulledIndex >= 0 ? { index: pulledIndex, titleId: "sleeve-title", content: <SleeveBack item={work[pulledIndex]} titleId="sleeve-title" onReadMore={read} /> } : null}
            onSleeveOut={setSleeveOut}
```

and `data-dig={crate.current.dig}` on the host `div`. Imports: `work`, `findWork` from `@/content/work`; `clampDig` from `./objects/crate`; `canPull`, `digFor`, `swipeStep`, `wheelStep`, `type Wheel` from `./crate/dig`; `focusedHotspot` from `./director/director`; `SleeveBack`; `CaseStudy` from `@/panels/CaseStudy`.

- [ ] **Step 6: Run the new e2e, then everything**

Run: `npx playwright test e2e/office-crate.spec.ts --workers=1 --reporter=line`
Expected: 5 passed.
Run: `npx vitest run && npx tsc --noEmit -p . && npx playwright test --reporter=line`
Expected: all unit tests pass; no type errors; all e2e pass (M1's 19 plus these 5). If the machine is loaded (other sessions' jobs), re-run failures with `--workers=1` and report both runs.

- [ ] **Step 7: Commit**

```bash
git add office/OfficeCanvas.tsx office/OfficeExperience.tsx office/objects/crate.ts e2e/office-crate.spec.ts
git commit -m "Flick through the crate, pull a record out, read it on the back and in the panel"
```

---

### Task 7: Kasper clicks through

- [ ] **Step 1:** Make sure the dev server is up at http://localhost:3010 (`curl` it; Kasper starts `npm run dev` himself if it isn't). Capture desktop and phone stills of: the crate browsing at dig 0 and at the last project, and a pulled sleeve's back, into the plan's workspace `shots/`. Look at them first; fix anything broken before asking him.
- [ ] **Step 2:** Ask him to: click the crate; scroll, swipe and use the arrow keys to flick; click a record (and the crate) to pull one; Read more; Esc and Back out. List the new drafts in `office/copy.ts` (`sleeve`, `caseStudy`, `crate`). Ask about: flick speed and angle (`FLIP_SECONDS`, `FLIP_ANGLE`), pull-out speed and size (`PULL_SECONDS`, `PULL_FILL`), the logos' size and position (`ART_BOX`, `ART_TOP`), the crate camera, and the back's look. **End the turn** and wait.
- [ ] **Step 3:** Apply his feedback with those knobs, re-running the affected tests and e2e after each change; commit each change separately.
