# Office Whiteboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The whiteboard on the office's back wall is a hidden extra. A visitor who finds it picks up a marker that follows their pointer or finger, draws in five colours, rubs out and wipes. The drawing lasts the visit.

**Architecture:**
- **Hidden extras:** the registry gains `EXTRAS` beside the four signposted `HOTSPOTS`. Extras are hit-testable, focusable and highlightable, but never get a dot, a tour stop or a glint. The director, history layers and Back/Esc treat `hs_whiteboard` like the monitor: a local layer with no URL.
- **Drawing:** a plain `<canvas>` printed onto `hs_whiteboard__surface` with M3's `CardFace place="screen"`. The strokes live in a module-level in-memory store (`office/whiteboard/board.ts`) and are redrawn from it, so they survive leaving and returning but not a reload.
- **The marker:** a pure `ToolMotion` (`office/whiteboard/marker.ts`, the same shape as `ShelfMotion`) moves the held 3D marker or eraser between the tray and the pointer's spot on the board. That spot comes from the canvas pointer through `boardPoint`.
- **Tray colours:** a small `setTint` in `cleanEdges` keeps each tray marker's lines in its colour.

**Tech Stack:** Next 16.2.4, React 19.2.4, @react-three/fiber 9.8, drei 10.7 (`Html`), three 0.186, Vitest 5 (node environment, `*.test.ts` only), Playwright 1.63 (SwiftShader, `--workers=1`), Blender 5.2 via the Blender MCP.

**Spec:** `docs/superpowers/specs/2026-10-05-office-whiteboard-design.md`. It builds on `docs/superpowers/specs/2026-10-02-office-interactions-design.md`.

## Global Constraints

- **Git:** branch `redesign/office`. Never push without asking Kasper. Stage by explicit path; never `git add -A` (`.agents/` and `public/screenshots/` stay untracked; `public/screenshots/` holds unblurred client screenshots and must never be committed). Commit messages are descriptive and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. LF line endings.
- **Code:** read the relevant guide in `node_modules/next/dist/docs/` before writing Next code. Never touch `package.json`; no new dependencies.
- **Kasper's machine struggles:**
  - Playwright runs with `--workers=1` only.
  - Never start extra dev servers or worktrees; the one dev server on port 3010 is shared.
  - Run a spec file at a time, not the whole suite, except where a step says so.
- **Blender:** only one agent drives the live Blender 5.2 session. Edit `office_props.py` as `office_props_next.py` and `cp` it over once verified.
- **Copy:** visitor-facing words live in `office/copy.ts`, or in `COPY` in `greybox_office.py` for 3D text. All new copy is DRAFT for Kasper, in his voice.
- **Spec, binding values:**
  - "Hidden: no dot, no tour stop, no glint. White hover highlight and a small label."
  - "The visitor's own, in memory for the visit: still there if they leave and come back, gone on reload. No storage, no backend, nothing shared."
  - "The chosen 3D marker lifts off the tray and follows the pointer or finger, its tip on the board": "pressed onto the board while drawing, lifted a few millimetres while not."
  - "five colour swatches (white, lime `#C6FF3D`, red `#FF3B30`, cyan `#2EF2FF`, amber `#FFB224`), an eraser, and **Wipe it**", printed along the bottom edge of the board as real buttons.
  - "The board starts with 'TODO: sleep' written on it in white, as part of the drawing." It can be rubbed out and is back on reload.
  - "Back or Esc: the held marker goes back to the tray, the camera returns to the standing spot. The drawing stays on the board for the rest of the visit."
  - Motion: "Marker lift from the tray and return: ~0.4 s, eased. Following the pointer: tight (an exponential follow)." Reduced motion: "The marker jumps … the camera cuts. Drawing works the same."
  - Keyboard: "A last item in the hidden nav", with a visually hidden heading as the print's focus target.
  - "Strokes: round caps and joins, ~6 px at the board's print scale, smoothed … The eraser is ~4× a stroke's width."
- **Phones:** where Kasper demos. Check 390×844 and 390×664 as well as 1440×900. Every tool-strip button is at least 40×40 CSS px on screen on a phone.

## Review Focus

1. **Pointer coordinates on a 3D-transformed canvas.** `offsetX/offsetY` on a CSS-3D-transformed element must give canvas-local coordinates, or every stroke lands in the wrong place. *Test: Task 6 (e2e: a drag across the board's middle lights pixels in the canvas's middle).*
2. **Drawing on a phone.** A finger drag must draw, not scroll or pan the room. *Test: Task 5 (`touch-action: none` on the canvas); Task 6 (e2e with `hasTouch`: a touch drag lights pixels).*
3. **Leaving mid-stroke.** Esc or Back while the pointer is down must end the stroke cleanly, return the marker to the tray, and not start a stray line next time. *Test: Task 3 (`endStroke` is idempotent and a fresh `startStroke` begins a new stroke); Task 4 (the held tool goes home when `held` is null).*
4. **The whiteboard leaking into the signposted lists:** a fifth dot, a tour stop or a glint would break the "hidden" brief. *Test: Task 1 (unit: `HOTSPOTS` unchanged and `EXTRAS` separate); Task 6 (e2e: four markers only).*
5. **The drawing surviving a return but not a reload.** *Test: Task 3 (the store keeps its items across reads; `resetBoard` restores the start); Task 6 (e2e: draw, Esc, open again and the pixels are still there; reload and they're gone).*

---

## File structure

| File | Responsibility |
|---|---|
| `office/hotspots/registry.ts` (+ test) | `EXTRAS`, `ALL_HOTSPOTS`, `SignpostName`/`ExtraName`/`HotspotName`, tool highlight keys |
| `office/style/cleanEdges.ts` (+ test) | `setTint`: a fixed line colour for a highlight group, kept when highlights reset |
| `office/theme.ts`, `office/copy.ts`, `office/camera/rig.ts`, `office/objects/motion.ts`, `office/camera/pan.ts`, `office/hints/glint.ts`, `office/scene/location.ts`, `office/hotspots/proxies.ts` | Extras in the records and lists that need them; signposted-only lists typed as such |
| `scripts/blender/office_props.py`, `scripts/blender/greybox_office.py`, `art/office.blend`, `public/models/office.glb`, `office/manifest.json`, `office/nodes.test.ts` | `hs_whiteboard` with a surface, five markers and an eraser; the hint note; focus cameras |
| `office/whiteboard/strokes.ts` (+ test) | Pure: stroke and text items, adding points, drawing items onto a 2D context |
| `office/whiteboard/board.ts` (+ test) | The visit's drawing (module state), start items, wipe, reset |
| `office/whiteboard/marker.ts` (+ test) | Pure: `boardPoint`, `handPlacement`, `findTools`, `ToolMotion` |
| `office/cards/Whiteboard.tsx` (+ `office/cards/whiteboard.test.ts`), `app/(office)/office.css` | What's printed on the board: canvas and tool strip |
| `office/OfficeCanvas.tsx`, `office/OfficeExperience.tsx` | Wiring |
| `e2e/office-whiteboard.spec.ts` (new), `e2e/office.spec.ts` | End to end |

## Execution waves and models

1. **Task 1** (Sonnet): the registry, types and tint. Everything else imports its types.
2. **In parallel:** Task 2 (Opus, the live Blender agent), Task 3 (Sonnet), Task 4 (Sonnet). The lead commits each one.
3. **Task 5** (Sonnet), after Task 3, because it reads the board store.
4. **Task 6** (Opus): wiring and e2e. Then Task 7 with Kasper.

---

### Task 1: Hidden extras in the registry, and tinted tray markers

**Files:**
- Modify:
  - `office/hotspots/registry.ts`, `office/hotspots/registry.test.ts`
  - `office/style/cleanEdges.ts`, `office/style/cleanEdges.test.ts`
  - `office/theme.ts`, `office/copy.ts`, `office/camera/rig.ts`, `office/objects/motion.ts`, `office/camera/pan.ts`, `office/hints/glint.ts`
  - `office/scene/location.ts`, `office/scene/location.test.ts`, `office/hotspots/proxies.ts`

**Interfaces:**
- Produces:
  - `HOTSPOTS` (unchanged: the four signposted) and `type SignpostName`.
  - `EXTRAS = ["hs_whiteboard"] as const` and `type ExtraName`.
  - `type HotspotName = SignpostName | ExtraName`.
  - `ALL_HOTSPOTS: readonly HotspotName[]`.
  - `FOCUS_CAMERA.hs_whiteboard = "cam_focus_whiteboard"`.
  - `TOOL_NODE = /^hs_whiteboard__(marker_\d\d|eraser)$/`.
  - `highlightKey` returns a tool's own node name for its meshes.
  - `setTint(handle, key, color)`.
  - `theme.accents.hs_whiteboard = theme.line`.
  - `COPY.labels.hs_whiteboard`, and `COPY.whiteboard` (see Step 5).
  - `FOCUS_MOVES.hs_whiteboard`.

- [ ] **Step 1: Write the failing tests.**

  Add to `office/hotspots/registry.test.ts`, adding `ALL_HOTSPOTS, EXTRAS, HOTSPOTS, TOOL_NODE` to its imports. The `node` helper is the one already in that file; read the top of the file and adapt the calls to its signature.

```ts
describe("hidden extras", () => {
  it("keeps the signposted four as they are, and the whiteboard apart", () => {
    expect(HOTSPOTS).toEqual(["hs_crate", "hs_drawer", "hs_monitor", "hs_shelf"]);
    expect(EXTRAS).toEqual(["hs_whiteboard"]);
    expect(ALL_HOTSPOTS).toEqual([...HOTSPOTS, ...EXTRAS]);
  });
  it("hits the whiteboard like any object while nothing's focused", () => {
    const board = node("hs_whiteboard", node("hs_whiteboard__board", new Mesh()));
    expect(hitFor(board.children[0].children[0] ?? board.children[0], null)).toEqual({ hotspot: "hs_whiteboard", item: null });
  });
  it("gives each tray tool its own highlight group, and knows the tool nodes", () => {
    const marker = new Mesh();
    node("hs_whiteboard", node("hs_whiteboard__marker_02", marker));
    expect(highlightKey(marker)).toBe("hs_whiteboard__marker_02");
    expect(TOOL_NODE.test("hs_whiteboard__eraser")).toBe(true);
    expect(TOOL_NODE.test("hs_whiteboard__board")).toBe(false);
  });
});
```

  Add to `office/scene/location.test.ts`:

```ts
  it("keeps the whiteboard as a local layer", () =>
    expect(layerOf({ [LAYER_KEY]: { focus: "hs_whiteboard", reading: false } })).toEqual({ focus: "hs_whiteboard", reading: false, topic: null }));
```

  Add to `office/style/cleanEdges.test.ts`, using its existing helpers to build a handle with highlight groups. Read the file's setup first.

```ts
describe("setTint", () => {
  it("keeps a group in its own colour, back to it after a highlight passes", () => {
    // a handle with groups "hs_whiteboard__marker_01" and "hs_crate", built the way this file's other highlight tests do
    setTint(handle, "hs_whiteboard__marker_01", "#C6FF3D");
    expect(handle.highlights.get("hs_whiteboard__marker_01")!.color.getHexString()).toBe("c6ff3d");
    setHighlight(handle, "hs_whiteboard", "#e8e8e8");
    expect(handle.highlights.get("hs_whiteboard__marker_01")!.color.getHexString()).toBe("e8e8e8"); // lit with the board
    setHighlight(handle, null, "#e8e8e8");
    expect(handle.highlights.get("hs_whiteboard__marker_01")!.color.getHexString()).toBe("c6ff3d"); // back to its tint
    expect(handle.highlights.get("hs_crate")!.color.getHexString()).toBe("e8e8e8"); // untinted groups go to the base
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run office/hotspots office/scene office/style`
Expected: FAIL (`EXTRAS`, `TOOL_NODE` and `setTint` don't exist).

- [ ] **Step 3: The registry.** In `office/hotspots/registry.ts`:

```ts
/** The four objects the office signposts (dots, tour, glints, the visible nav): the ways in. */
export const HOTSPOTS = ["hs_crate", "hs_drawer", "hs_monitor", "hs_shelf"] as const;
export type SignpostName = (typeof HOTSPOTS)[number];
/** Hidden extras (whiteboard spec): hoverable, focusable and openable, but never signposted. The TV's games come next. */
export const EXTRAS = ["hs_whiteboard"] as const;
export type ExtraName = (typeof EXTRAS)[number];
export type HotspotName = SignpostName | ExtraName;
export const ALL_HOTSPOTS: readonly HotspotName[] = [...HOTSPOTS, ...EXTRAS];

/** The whiteboard tray's markers and eraser: each its own highlight group, so each keeps its own colour. */
export const TOOL_NODE = /^hs_whiteboard__(marker_\d\d|eraser)$/;
```

  - `isHotspot` checks `ALL_HOTSPOTS`.
  - Add `hs_whiteboard: "cam_focus_whiteboard"` to `FOCUS_CAMERA`.
  - In `highlightKey`, return `o.name` when `TOOL_NODE.test(o.name)`, checked before the `ITEM`/hotspot test in the same loop.

- [ ] **Step 4: Tint.** In `office/style/cleanEdges.ts`, add `tints: Map<string, string>` to `CleanEdgesHandle`, created empty in `applyCleanEdges`:

```ts
/** A highlight group's own resting line colour (the whiteboard's tray markers); highlights come and go over it. */
export function setTint(handle: CleanEdgesHandle, key: string, color: string): void {
  handle.tints.set(key, color);
  handle.highlights.get(key)?.color.set(color);
}
```

  In `setHighlight`, a group that isn't lit goes to `handle.tints.get(key) ?? handle.baseColor` instead of `handle.baseColor`.

- [ ] **Step 5: The records and lists.**
  - **theme:** `theme.ts` accents gains `hs_whiteboard: "#e8e8e8", // hidden extras light white (the line colour)`.
  - **copy.ts labels:** `labels` gains `hs_whiteboard: "Have a go"`. Add, as DRAFT:

```ts
  /** The whiteboard, a hidden extra (whiteboard spec). DRAFT. */
  whiteboard: {
    nav: "The whiteboard (just for fun)",
    title: "Whiteboard",
    todo: "TODO: sleep",
    note: "(next sprint)",
    tools: { white: "White marker", lime: "Green marker", red: "Red marker", cyan: "Blue marker", amber: "Orange marker" },
    eraser: "Eraser",
    wipe: "Wipe it",
  },
  /** After the arrival tour, once: a nudge that there's more to find. DRAFT. */
  hintsMore: "Some things in here do more than they look.",
```

  - **rig:** `FOCUS_MOVES` gains `hs_whiteboard: { seconds: FOCUS_SECONDS, arc: null }`.
  - **motion:** `ObjectMotion`'s `tease` record gains `hs_whiteboard: 0`.
  - **pan:** in `pan.ts`, type `PAN_AT` and the `panFor`/`inView` parameters as `SignpostName`.
  - **glint:** in `glint.ts`, type `nextGlint`'s `last`, `among` and return as `SignpostName`.
  - **tour:** in `hints/tour.ts`, `TOUR` is `SignpostName[]` and `tourAt` returns `SignpostName | null`.
  - **location:** `location.ts` validates `focus` against `ALL_HOTSPOTS`.
  - **proxies:** `proxies.ts` iterates `ALL_HOTSPOTS`, so the whiteboard's tray is part of its hover area.

- [ ] **Step 6: Run the tests to see them pass, and type-check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all pass. tsc may report call sites in `office/OfficeExperience.tsx` and `office/OfficeCanvas.tsx` where a `HotspotName` now meets a `SignpostName` parameter (the glint, tour and pan calls). Fix those minimally:
- the markers' `HOTSPOTS.map` and the glint `among` stay on `HOTSPOTS`;
- `show(at ? …)` from `tourAt` is fine;
- in `OfficeCanvas`, the focus-camera and anchor loop at ~line 277 iterates `ALL_HOTSPOTS`, so the whiteboard gets its camera and label anchor;
- the dot-position loop at ~366 stays on `HOTSPOTS`.

Make no other changes in those two files.

- [ ] **Step 7: Commit**

```bash
git add office/hotspots/registry.ts office/hotspots/registry.test.ts office/style/cleanEdges.ts office/style/cleanEdges.test.ts office/theme.ts office/copy.ts office/camera/rig.ts office/objects/motion.ts office/camera/pan.ts office/hints/glint.ts office/hints/tour.ts office/scene/location.ts office/scene/location.test.ts office/hotspots/proxies.ts office/OfficeExperience.tsx office/OfficeCanvas.tsx
git commit -m "Let the office have hidden extras beside its four signposted objects, starting with the whiteboard"
```

---

### Task 2: The whiteboard in Blender

Runs in the live Blender session, by one agent only. Edit `office_props.py` as `office_props_next.py` and `cp` it over once verified.

**Files:**
- Modify: `scripts/blender/office_props.py` (`build_whiteboard`), `scripts/blender/greybox_office.py` (the call, `COPY`, the sticky note, `FOCUS`), `art/office.blend`, `public/models/office.glb`, `office/manifest.json`
- Test: `office/nodes.test.ts`

**Interfaces:** each of these is a node in the exported GLB, with its frame as seen by three.js.
- **`hs_whiteboard`:** the whiteboard root, renamed from `prop_whiteboard`.
- **`hs_whiteboard__surface`:** one flat quad over the board's writing area (the inside of its frame), 1 mm in front of the board face. Its geometry is in the root's frame; in glTF its local +z points out of the board towards the room and +y is up.
- **`hs_whiteboard__marker_00`..`_04`** (white, lime, red, cyan, amber, in that order):
  - one mesh each, lying in the tray, children of `hs_whiteboard`;
  - origin at the felt tip;
  - in glTF, the marker's local +z runs along its body from the tip towards the cap end.
- **`hs_whiteboard__eraser`:** child of `hs_whiteboard`. Origin at the centre of its felt (working) face; in glTF its local +z points out of its back, away from the felt.
- **No 3D text on the board any more:** "TODO: sleep" and "(next sprint)" are drawn by the runtime.
- **`prop_sticky_note`:** gets the hint text, `COPY["whiteboard_hint"]`, which is `"some things in\nhere do more\nthan they look"` (DRAFT).
- **Cameras:** `cam_focus_whiteboard` and `cam_focus_whiteboard_portrait`.

- [ ] **Step 1: Write the failing node test** (in `office/nodes.test.ts`):

```ts
  it("the whiteboard is a hidden extra with a surface to draw on, five markers and an eraser, and its cameras", () => {
    for (const n of ["hs_whiteboard", "hs_whiteboard__surface", "hs_whiteboard__eraser"]) expect(manifest.office.nodes).toContain(n);
    for (let i = 0; i < 5; i++) expect(manifest.office.nodes).toContain(`hs_whiteboard__marker_0${i}`);
    expect(manifest.office.cameras).toContain("cam_focus_whiteboard");
    expect(manifest.office.cameras).toContain("cam_focus_whiteboard_portrait");
  });
```

- [ ] **Step 2: Run it to see it fail.** `npx vitest run office/nodes.test.ts`, expected to fail on `hs_whiteboard`.

- [ ] **Step 3: Build it.**
  - **`build_whiteboard`:** gains `drawable=False`. When true:
    - it draws no `text` or `note` (the runtime draws them);
    - it adds the `__surface` quad;
    - it builds the five markers and the eraser as separate parts.
  - **The tray:** widen or deepen it as needed so the five markers (about 0.11–0.12 m long, 0.016 m across, with a slightly thicker cap) and the eraser lie in it without touching each other or the tray. Two staggered rows of markers along a full-width tray is one way. Keep it reading as a whiteboard tray from the standing spot.
  - **greybox:** in `greybox_office.py`, call `props.build_whiteboard("hs_whiteboard", …, drawable=True)` and pass the hint to `build_sticky_note(..., text=COPY["whiteboard_hint"])`. Add `"whiteboard_hint"` to `COPY`, and keep `"whiteboard"`/`"whiteboard_note"` with a comment that the runtime now draws them (office/copy.ts).
  - **Frames:** check every interface frame above in the exported GLB, not just in Blender. Read the GLB with `@gltf-transform/core`, as the reel's Blender task did, and report the axes you found.

- [ ] **Step 4: Cameras.** Add a `"whiteboard"` entry to `FOCUS`:
  - **landscape (16:10):** square on to the board, with the writing surface about 75–85% of the frame's height and the tray in shot below it;
  - **portrait (390×844):** the surface across about 92% of the width, the tray in shot;
  - both eyes ≥ 0.3 m from any mesh;
  - a comment saying why.

- [ ] **Step 5: Look.**
  - Render from both new cameras and from the standing spot. Check the tray reads as markers and an eraser, the board is blank, and the hint note is legible from the whiteboard camera.
  - Check there are no intersections between the tools, the tray and the board (BVH overlap, pairwise).
  - Save the renders as `wb-blender-*.png` in the scratchpad.

- [ ] **Step 6: Export, build, check.** Run `greybox_office.py` and then `export.py`, as in the earlier Blender tasks. Add every new node and camera to `office/manifest.json`.

Run: `npm run build:models && npm run check:models && npx vitest run office/nodes.test.ts`
Expected: models OK and the office under 2 MB; PASS.

- [ ] **Step 7: Hand over** (the lead commits). Delete `office_props_next.py`. In the report, list the changed files, the frames found in the GLB, the camera values and the clearances.

---

### Task 3: Strokes and the visit's drawing (pure)

**Files:**
- Create: `office/whiteboard/strokes.ts`, `office/whiteboard/strokes.test.ts`, `office/whiteboard/board.ts`, `office/whiteboard/board.test.ts`

**Interfaces:**
- Produces, from `strokes.ts`:
  - `type Pt = { x: number; y: number }` (canvas CSS px, origin top left).
  - `type Stroke = { kind: "stroke"; erase: boolean; color: string; width: number; points: Pt[] }`.
  - `type Writing = { kind: "text"; text: string; x: number; y: number; size: number; color: string }`.
  - `type Item = Stroke | Writing`.
  - `STROKE_PX = 6`, `ERASER_PX = 24`, `MIN_STEP_PX = 1.5`.
  - `addPoint(stroke, pt): boolean`: false when the point is too close to the last one.
  - `drawItems(ctx: Ctx2D, items: Item[], font: string)`.
  - `type Ctx2D`: the subset of `CanvasRenderingContext2D` used, so tests can pass a recorder.
- Produces, from `board.ts`:
  - `startItems(): Item[]`: "TODO: sleep", an underline stroke and "(next sprint)", in white, matching the old 3D board.
  - `boardItems(): Item[]`.
  - `startStroke(erase: boolean, color: string, at: Pt): Stroke`.
  - `extendStroke(at: Pt): boolean`.
  - `endStroke(): void`.
  - `wipe(): void`.
  - `resetBoard(): void`, for tests.

- [ ] **Step 1: Write the failing tests.**

  `office/whiteboard/strokes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { addPoint, drawItems, ERASER_PX, STROKE_PX, type Ctx2D, type Stroke } from "./strokes";

/** Records every call and property set on a fake 2D context. */
function recorder() {
  const calls: string[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (_t, k: string) => (...args: unknown[]) => calls.push(`${k}(${args.join(",")})`),
    set: (_t, k: string, v) => (calls.push(`${k}=${v}`), true),
  }) as unknown as Ctx2D;
  return { ctx, calls };
}
const stroke = (erase = false): Stroke => ({ kind: "stroke", erase, color: "#C6FF3D", width: erase ? ERASER_PX : STROKE_PX, points: [{ x: 10, y: 10 }] });

describe("addPoint", () => {
  it("skips a point that hasn't moved far enough, so a still pointer doesn't pile up points", () => {
    const s = stroke();
    expect(addPoint(s, { x: 10.5, y: 10.5 })).toBe(false);
    expect(addPoint(s, { x: 20, y: 10 })).toBe(true);
    expect(s.points).toHaveLength(2);
  });
});

describe("drawItems", () => {
  it("draws a marker stroke with round caps and joins in its colour", () => {
    const { ctx, calls } = recorder();
    const s = stroke();
    addPoint(s, { x: 30, y: 10 });
    addPoint(s, { x: 50, y: 30 });
    drawItems(ctx, [s], "Inter");
    expect(calls).toContain("globalCompositeOperation=source-over");
    expect(calls).toContain("lineCap=round");
    expect(calls).toContain("lineJoin=round");
    expect(calls).toContain("strokeStyle=#C6FF3D");
    expect(calls).toContain(`lineWidth=${STROKE_PX}`);
    expect(calls.some((c) => c.startsWith("quadraticCurveTo("))).toBe(true); // smoothed through midpoints
  });
  it("rubs out with the eraser", () => {
    const { ctx, calls } = recorder();
    drawItems(ctx, [stroke(true)], "Inter");
    expect(calls).toContain("globalCompositeOperation=destination-out");
    expect(calls).toContain(`lineWidth=${ERASER_PX}`);
  });
  it("a single tap still leaves a dot", () => {
    const { ctx, calls } = recorder();
    drawItems(ctx, [stroke()], "Inter");
    expect(calls.some((c) => c.startsWith("lineTo(") || c.startsWith("arc("))).toBe(true);
  });
  it("writes text in the given font and colour", () => {
    const { ctx, calls } = recorder();
    drawItems(ctx, [{ kind: "text", text: "TODO: sleep", x: 40, y: 80, size: 64, color: "#e8e8e8" }], "Inter Tight");
    expect(calls).toContain("font=600 64px Inter Tight");
    expect(calls).toContain("fillText(TODO: sleep,40,80)");
  });
});
```

  `office/whiteboard/board.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { boardItems, endStroke, extendStroke, resetBoard, startItems, startStroke, wipe } from "./board";
import { COPY } from "@/office/copy";

beforeEach(resetBoard);

describe("the visit's drawing", () => {
  it("starts with TODO: sleep and the note, as the old board had them", () => {
    const texts = startItems().filter((i) => i.kind === "text").map((i) => (i as { text: string }).text);
    expect(texts).toEqual([COPY.whiteboard.todo, COPY.whiteboard.note]);
    expect(boardItems()).toEqual(startItems());
  });
  it("keeps strokes as they're drawn, and between reads (leaving and coming back)", () => {
    startStroke(false, "#FF3B30", { x: 10, y: 10 });
    expect(extendStroke({ x: 40, y: 10 })).toBe(true);
    endStroke();
    expect(boardItems()).toHaveLength(startItems().length + 1);
    expect(boardItems()).toHaveLength(startItems().length + 1);
  });
  it("ends a stroke safely twice, and the next drag starts a new one", () => {
    startStroke(false, "#FF3B30", { x: 10, y: 10 });
    endStroke();
    endStroke();
    expect(extendStroke({ x: 50, y: 50 })).toBe(false); // no stroke open: nothing added
    startStroke(true, "", { x: 60, y: 60 });
    expect(boardItems()).toHaveLength(startItems().length + 2);
  });
  it("wipes everything, TODO: sleep included", () => {
    startStroke(false, "#FF3B30", { x: 10, y: 10 });
    wipe();
    expect(boardItems()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run them to see them fail.** `npx vitest run office/whiteboard`, expected to fail with no modules.

- [ ] **Step 3: Implement `office/whiteboard/strokes.ts`:**

```ts
/** A point on the board's canvas, in CSS px from its top left. */
export type Pt = { x: number; y: number };
export type Stroke = { kind: "stroke"; erase: boolean; color: string; width: number; points: Pt[] };
export type Writing = { kind: "text"; text: string; x: number; y: number; size: number; color: string };
export type Item = Stroke | Writing;

/** Marker and eraser widths at the board's print scale (whiteboard spec 4), and the least a pointer must move to add a point. */
export const STROKE_PX = 6;
export const ERASER_PX = 24;
export const MIN_STEP_PX = 1.5;

/** The parts of a 2D canvas context this draws with (a recorder stands in for it in tests). */
export type Ctx2D = Pick<
  CanvasRenderingContext2D,
  "beginPath" | "moveTo" | "lineTo" | "quadraticCurveTo" | "stroke" | "fillText" | "save" | "restore"
> & { globalCompositeOperation: string; lineCap: string; lineJoin: string; strokeStyle: string; fillStyle: string; lineWidth: number; font: string; textBaseline: string };

/** Adds `pt` to the stroke unless it's within MIN_STEP_PX of the last point. True if added. */
export function addPoint(stroke: Stroke, pt: Pt): boolean {
  const last = stroke.points[stroke.points.length - 1];
  if (last && Math.hypot(pt.x - last.x, pt.y - last.y) < MIN_STEP_PX) return false;
  stroke.points.push(pt);
  return true;
}

/** Draws the board's items in order: writing filled, strokes smoothed through their midpoints, the eraser cutting out. */
export function drawItems(ctx: Ctx2D, items: Item[], font: string): void {
  for (const item of items) {
    ctx.save();
    if (item.kind === "text") {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = item.color;
      ctx.font = `600 ${item.size}px ${font}`;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(item.text, item.x, item.y);
    } else {
      ctx.globalCompositeOperation = item.erase ? "destination-out" : "source-over";
      ctx.strokeStyle = item.erase ? "#000" : item.color;
      ctx.lineWidth = item.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const p = item.points;
      ctx.beginPath();
      ctx.moveTo(p[0].x, p[0].y);
      if (p.length === 1) ctx.lineTo(p[0].x + 0.01, p[0].y); // a tap leaves a dot
      for (let i = 1; i < p.length - 1; i++) ctx.quadraticCurveTo(p[i].x, p[i].y, (p[i].x + p[i + 1].x) / 2, (p[i].y + p[i + 1].y) / 2);
      if (p.length > 1) ctx.lineTo(p[p.length - 1].x, p[p.length - 1].y);
      ctx.stroke();
    }
    ctx.restore();
  }
}
```

  The `lineCap=round` assertion expects the recorder to see `lineCap=round`. It does, because the setter records `key=value`.

- [ ] **Step 4: Implement `office/whiteboard/board.ts`:**

```ts
import { COPY } from "@/office/copy";
import { addPoint, ERASER_PX, STROKE_PX, type Item, type Pt, type Stroke } from "./strokes";

/** White, the office's line colour: what the board was written in. */
const INK = "#e8e8e8";

/** What the board starts with: TODO: sleep, its wavy underline and the note, where the old 3D board had them (in board CSS px). */
export function startItems(): Item[] {
  const wave: Pt[] = Array.from({ length: 9 }, (_, k) => ({ x: 40 + 37 * k, y: 104 + 5 * Math.sin(k * 1.9) }));
  return [
    { kind: "text", text: COPY.whiteboard.todo, x: 40, y: 86, size: 64, color: INK },
    { kind: "stroke", erase: false, color: INK, width: 5, points: wave },
    { kind: "text", text: COPY.whiteboard.note, x: 76, y: 160, size: 40, color: INK },
  ];
}

// The visit's drawing: module state, so it outlives the board's print (leave and come back) but not a reload.
let items: Item[] = startItems();
let open: Stroke | null = null;

export function boardItems(): Item[] {
  return items;
}

export function startStroke(erase: boolean, color: string, at: Pt): Stroke {
  open = { kind: "stroke", erase, color, width: erase ? ERASER_PX : STROKE_PX, points: [at] };
  items.push(open);
  return open;
}

/** Adds a point to the stroke being drawn; false when none is open or the point is too close to the last. */
export function extendStroke(at: Pt): boolean {
  return open ? addPoint(open, at) : false;
}

export function endStroke(): void {
  open = null;
}

export function wipe(): void {
  items = [];
  open = null;
}

/** Back to a fresh visit (tests). */
export function resetBoard(): void {
  items = startItems();
  open = null;
}
```

  The text positions are a first guess, which Task 6's visual check tunes.

- [ ] **Step 5: Run them to see them pass.** `npx vitest run office/whiteboard`, expected to PASS.

- [ ] **Step 6: Hand over** (the lead commits): the four files.

---

### Task 4: The marker in the hand (pure)

**Files:**
- Create: `office/whiteboard/marker.ts`, `office/whiteboard/marker.test.ts`

**Interfaces:**
- Consumes: `type Placement` from `@/office/objects/shelf`; `approach` from `@/office/objects/motion`; `easeInOutCubic` from `@/office/camera/pose`.
- Produces:
  - `type Face = { position: [number, number, number]; rotation: [number, number, number]; distanceFactor: number; heightPx: number }`, i.e. `screenFaceFor`'s return.
  - `boardPoint(face, widthPx, pt: Pt, out: Vector3): Vector3`: a canvas point to the surface's local space.
  - `handPlacement(surface: Object3D, local: Vector3, kind: "marker" | "eraser", pressing: boolean, out: Placement): Placement`: world space.
  - `LIFT_M = 0.004`, `TOOL_SECONDS = 0.4`, `FOLLOW_RATE = 18`.
  - `type ToolId = 0 | 1 | 2 | 3 | 4 | "eraser"`.
  - `type ToolNodes = { tools: Map<ToolId, Object3D>; rest: Map<ToolId, Placement> }`; `findTools(root: Object3D): ToolNodes`.
  - `class ToolMotion { update(nodes, { held: ToolId | null; hand: Placement | null; reduced: boolean }, dt): void }`.

- [ ] **Step 1: Write the failing tests** (`office/whiteboard/marker.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { Euler, Group, Mesh, Quaternion, Vector3 } from "three";
import { boardPoint, findTools, handPlacement, LIFT_M, TOOL_SECONDS, ToolMotion } from "./marker";

// A surface 0.57 x 0.42 m facing +z, printed at 800 px wide (distanceFactor = width * 400 / px).
const face = { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], distanceFactor: (0.57 * 400) / 800, heightPx: (800 * 0.42) / 0.57 };
const place = () => ({ position: new Vector3(), quaternion: new Quaternion() });

describe("boardPoint", () => {
  it("maps the canvas's corners and centre onto the surface", () => {
    expect(boardPoint(face, 800, { x: 400, y: face.heightPx / 2 }, new Vector3()).length()).toBeLessThan(1e-9);
    const tl = boardPoint(face, 800, { x: 0, y: 0 }, new Vector3());
    expect(tl.x).toBeCloseTo(-0.285, 6);
    expect(tl.y).toBeCloseTo(0.21, 6);
    expect(tl.z).toBeCloseTo(0, 9);
  });
  it("follows a tilted surface", () => {
    const tilted = { ...face, rotation: [-0.1, 0, 0] as [number, number, number] };
    const p = boardPoint(tilted, 800, { x: 400, y: 0 }, new Vector3());
    expect(p.z).toBeLessThan(0); // the top leans back
  });
});

describe("handPlacement", () => {
  const surface = new Group();
  surface.position.set(1, 1.6, 4);
  surface.updateMatrixWorld(true);
  it("puts a pressing marker's tip on the board, lifted ones LIFT_M out", () => {
    const local = new Vector3(0.1, 0, 0);
    const pressed = handPlacement(surface, local, "marker", true, place());
    expect(pressed.position.distanceTo(new Vector3(1.1, 1.6, 4))).toBeLessThan(1e-9);
    const lifted = handPlacement(surface, local, "marker", false, place());
    expect(lifted.position.z - 4).toBeCloseTo(LIFT_M, 9);
  });
  it("holds a marker tilted out from the board like a pen, and the eraser flat to it", () => {
    const body = new Vector3(0, 0, 1).applyQuaternion(handPlacement(surface, new Vector3(), "marker", true, place()).quaternion);
    expect(body.z).toBeGreaterThan(0.5); // away from the board
    expect(body.z).toBeLessThan(0.99); // but tilted, not straight out
    const back = new Vector3(0, 0, 1).applyQuaternion(handPlacement(surface, new Vector3(), "eraser", true, place()).quaternion);
    expect(back.z).toBeCloseTo(1, 6);
  });
});

/** hs_whiteboard with five markers and an eraser lying in the tray. */
function rig() {
  const root = new Group();
  root.name = "hs_whiteboard";
  for (let i = 0; i < 5; i++) {
    const m = new Mesh();
    m.name = `hs_whiteboard__marker_0${i}`;
    m.position.set(-0.2 + 0.1 * i, -0.24, -0.03);
    m.quaternion.setFromEuler(new Euler(0, Math.PI / 2, 0));
    root.add(m);
  }
  const e = new Mesh();
  e.name = "hs_whiteboard__eraser";
  e.position.set(0.25, -0.24, -0.03);
  root.add(e);
  root.updateMatrixWorld(true);
  return { root, nodes: findTools(root) };
}

describe("ToolMotion", () => {
  const hand = { position: new Vector3(0.1, 0.05, 0.004), quaternion: new Quaternion() };
  it("lifts the held tool to the hand over TOOL_SECONDS and leaves the others in the tray", () => {
    const { nodes } = rig();
    const m = new ToolMotion();
    m.update(nodes, { held: 2, hand, reduced: false }, TOOL_SECONDS / 2);
    const two = nodes.tools.get(2)!;
    expect(two.position.distanceTo(nodes.rest.get(2)!.position)).toBeGreaterThan(0.01);
    for (let i = 0; i < 30; i++) m.update(nodes, { held: 2, hand, reduced: false }, 1 / 60);
    expect(two.getWorldPosition(new Vector3()).distanceTo(hand.position)).toBeLessThan(0.002);
    expect(nodes.tools.get(0)!.position.equals(nodes.rest.get(0)!.position)).toBe(true);
  });
  it("puts it back in the tray when nothing's held (leaving the board)", () => {
    const { nodes } = rig();
    const m = new ToolMotion();
    m.update(nodes, { held: "eraser", hand, reduced: false }, 1);
    m.update(nodes, { held: null, hand: null, reduced: false }, 1);
    expect(nodes.tools.get("eraser")!.position.equals(nodes.rest.get("eraser")!.position)).toBe(true);
  });
  it("jumps under reduced motion", () => {
    const { nodes } = rig();
    const m = new ToolMotion();
    m.update(nodes, { held: 0, hand, reduced: true }, 1 / 60);
    expect(nodes.tools.get(0)!.getWorldPosition(new Vector3()).distanceTo(hand.position)).toBeLessThan(1e-9);
  });
  it("swapping tools sends the old one home while the new one comes", () => {
    const { nodes } = rig();
    const m = new ToolMotion();
    m.update(nodes, { held: 0, hand, reduced: false }, 1);
    m.update(nodes, { held: 3, hand, reduced: false }, TOOL_SECONDS / 2);
    expect(nodes.tools.get(0)!.position.distanceTo(nodes.rest.get(0)!.position)).toBeGreaterThan(0.001);
    m.update(nodes, { held: 3, hand, reduced: false }, 1);
    expect(nodes.tools.get(0)!.position.equals(nodes.rest.get(0)!.position)).toBe(true);
  });
});
```

- [ ] **Step 2: Run them to see them fail.** `npx vitest run office/whiteboard/marker.test.ts`, expected to fail.

- [ ] **Step 3: Implement `office/whiteboard/marker.ts`:**

```ts
import { Euler, Matrix4, Quaternion, Vector3, type Object3D } from "three";
import { easeInOutCubic } from "@/office/camera/pose";
import { approach } from "@/office/objects/motion";
import type { Placement } from "@/office/objects/shelf";
import type { Pt } from "./strokes";

/** How far a held tool sits off the board when not drawing, how long it takes to and from the tray, how tightly it follows (whiteboard spec 4). */
export const LIFT_M = 0.004;
export const TOOL_SECONDS = 0.4;
export const FOLLOW_RATE = 18;

export type Face = { position: [number, number, number]; rotation: [number, number, number]; distanceFactor: number; heightPx: number };
export type ToolId = 0 | 1 | 2 | 3 | 4 | "eraser";

const basis = new Quaternion();
const axis = new Vector3();

/** Where a point on the board's canvas is on its surface, in the surface's own space (drei maps 1 px to distanceFactor / 400). */
export function boardPoint(face: Face, widthPx: number, pt: Pt, out: Vector3): Vector3 {
  const k = face.distanceFactor / 400;
  basis.setFromEuler(new Euler(...face.rotation));
  out.set((pt.x - widthPx / 2) * k, (face.heightPx / 2 - pt.y) * k, 0).applyQuaternion(basis);
  return out.add(axis.set(...face.position));
}

const normal = new Vector3();
const up = new Vector3();
const right = new Vector3();
const dir = new Vector3();
const lean = new Quaternion();
const Z = new Vector3(0, 0, 1);

/**
 * A held tool's world pose at `local` on the surface (its own space, +z out of the board): a marker's tip there,
 * its body tilted out and to the lower right like a pen in a right hand; the eraser flat to the board. Lifted LIFT_M
 * off the board unless pressing.
 */
export function handPlacement(surface: Object3D, local: Vector3, kind: "marker" | "eraser", pressing: boolean, out: Placement): Placement {
  surface.updateWorldMatrix(true, false);
  const q = surface.getWorldQuaternion(new Quaternion());
  normal.set(0, 0, 1).applyQuaternion(q);
  up.set(0, 1, 0).applyQuaternion(q);
  right.set(1, 0, 0).applyQuaternion(q);
  out.position.copy(local).applyMatrix4(surface.matrixWorld).addScaledVector(normal, pressing ? 0 : LIFT_M);
  dir.copy(normal).addScaledVector(right, kind === "marker" ? 0.45 : 0).addScaledVector(up, kind === "marker" ? -0.35 : 0).normalize();
  out.quaternion.setFromUnitVectors(Z, dir);
  return out;
}

export type ToolNodes = { tools: Map<ToolId, Object3D>; rest: Map<ToolId, Placement> };

/** The tray's five markers (00..04) and eraser under the whiteboard, and where each rests (local to its parent). */
export function findTools(root: Object3D): ToolNodes {
  const tools = new Map<ToolId, Object3D>();
  const rest = new Map<ToolId, Placement>();
  const add = (id: ToolId, o: Object3D | undefined) => {
    if (!o) return;
    tools.set(id, o);
    rest.set(id, { position: o.position.clone(), quaternion: o.quaternion.clone() });
  };
  for (let i = 0; i < 5; i++) add(i as ToolId, root.getObjectByName(`hs_whiteboard__marker_0${i}`));
  add("eraser", root.getObjectByName("hs_whiteboard__eraser"));
  return { tools, rest };
}

const local: Placement = { position: new Vector3(), quaternion: new Quaternion() };
const world = new Matrix4();
const inverse = new Matrix4();
const unusedScale = new Vector3();
const ONE = new Vector3(1, 1, 1);

/** Per-frame: the held tool comes from the tray to the hand and follows it; the rest go (or stay) home. Pure state. */
export class ToolMotion {
  private t = new Map<ToolId, number>();
  private followed = new Map<ToolId, Placement>();

  update(nodes: ToolNodes, input: { held: ToolId | null; hand: Placement | null; reduced: boolean }, dt: number): void {
    for (const [id, o] of nodes.tools) {
      const rest = nodes.rest.get(id)!;
      const holding = input.held === id && input.hand !== null;
      const t = approach(this.t.get(id) ?? 0, holding ? 1 : 0, dt, input.reduced ? 0 : TOOL_SECONDS);
      this.t.set(id, t);
      if (t === 0 || !o.parent) {
        o.position.copy(rest.position);
        o.quaternion.copy(rest.quaternion);
        this.followed.delete(id);
        continue;
      }
      // the hand, in the tool's parent's space, followed tightly (or exactly under reduced motion)
      if (input.hand) {
        o.parent.updateWorldMatrix(true, false);
        world.compose(input.hand.position, input.hand.quaternion, ONE).premultiply(inverse.copy(o.parent.matrixWorld).invert());
        world.decompose(local.position, local.quaternion, unusedScale);
        let f = this.followed.get(id);
        if (!f || input.reduced) {
          f = { position: local.position.clone(), quaternion: local.quaternion.clone() };
          this.followed.set(id, f);
        } else {
          const k = 1 - Math.exp(-dt * FOLLOW_RATE);
          f.position.lerp(local.position, k);
          f.quaternion.slerp(local.quaternion, k);
        }
      }
      const f = this.followed.get(id);
      if (!f) continue;
      const e = easeInOutCubic(t);
      o.position.lerpVectors(rest.position, f.position, e);
      o.quaternion.slerpQuaternions(rest.quaternion, f.quaternion, e);
    }
  }
}
```

  If "follows tightly" makes the first test's `< 0.002` fail after 30 frames, check `FOLLOW_RATE` before touching the test: 0.5 s at rate 18 converges to well under 1 mm.

- [ ] **Step 4: Run them to see them pass.** `npx vitest run office/whiteboard`, expected to PASS.

- [ ] **Step 5: Hand over** (the lead commits): the two files.

---

### Task 5: What's printed on the board

**Files:**
- Create: `office/cards/Whiteboard.tsx`, `office/cards/whiteboard.test.ts`
- Modify: `app/(office)/office.css`

**Interfaces:**
- Consumes: the board store (Task 3); `COPY.whiteboard` (Task 1); `theme.accents` and `theme.line`.
- Produces:
  - `WHITEBOARD_WIDTH_PX = 800`.
  - `TOOLS: { id: ToolId; color: string; label: string }[]`: white, lime, red, cyan and amber. `ToolId` is imported from `@/office/whiteboard/marker`.
  - `type BoardPointer = { pt: Pt | null; pressing: boolean }`.
  - `Whiteboard({ titleId, heightPx, tool, onTool, pointer }: { titleId: string; heightPx: number; tool: ToolId; onTool: (t: ToolId) => void; pointer: { current: BoardPointer } })`.

- [ ] **Step 1: Write the failing test** (`office/cards/whiteboard.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { COPY } from "@/office/copy";
import Whiteboard, { TOOLS } from "./Whiteboard";

const html = (tool: (typeof TOOLS)[number]["id"] = 0) =>
  renderToStaticMarkup(createElement(Whiteboard, { titleId: "w", heightPx: 590, tool, onTool: () => {}, pointer: { current: { pt: null, pressing: false } } }));

describe("Whiteboard", () => {
  it("has a canvas to draw on and a hidden heading to take focus", () => {
    const out = html();
    expect(out).toContain("<canvas");
    expect(out).toMatch(/<h2[^>]*id="w"[^>]*class="visually-hidden"|<h2[^>]*class="visually-hidden"[^>]*id="w"/);
  });
  it("prints five swatches, the eraser and Wipe it as buttons, the held one pressed", () => {
    const out = html(2);
    for (const t of TOOLS) expect(out).toContain(`aria-label="${t.label}"`);
    expect(out).toContain(`>${COPY.whiteboard.wipe}<`);
    expect(out).toContain(`aria-label="${COPY.whiteboard.eraser}"`);
    expect(out.match(/aria-pressed="true"/g)).toHaveLength(1);
  });
  it("uses the office's five colours, white first", () =>
    expect(TOOLS.map((t) => t.color)).toEqual(["#e8e8e8", "#C6FF3D", "#FF3B30", "#2EF2FF", "#FFB224"]));
});
```

- [ ] **Step 2: Run it to see it fail.** `npx vitest run office/cards/whiteboard.test.ts`, expected to FAIL.

- [ ] **Step 3: Implement `office/cards/Whiteboard.tsx`:**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { COPY } from "@/office/copy";
import { theme } from "@/office/theme";
import { boardItems, endStroke, extendStroke, startStroke, wipe } from "@/office/whiteboard/board";
import { drawItems, type Ctx2D, type Pt } from "@/office/whiteboard/strokes";
import type { ToolId } from "@/office/whiteboard/marker";

/** CSS px the board's print is laid out at (whiteboard spec): mapped onto hs_whiteboard__surface. */
export const WHITEBOARD_WIDTH_PX = 800;
/** The canvas's bitmap is this many times its CSS size, so lines stay crisp when the camera comes in close. */
const DENSITY = 2;

export const TOOLS: { id: Exclude<ToolId, "eraser">; color: string; label: string }[] = [
  { id: 0, color: theme.line, label: COPY.whiteboard.tools.white },
  { id: 1, color: theme.accents.hs_crate, label: COPY.whiteboard.tools.lime },
  { id: 2, color: theme.accents.hs_shelf, label: COPY.whiteboard.tools.red },
  { id: 3, color: theme.accents.hs_drawer, label: COPY.whiteboard.tools.cyan },
  { id: 4, color: theme.accents.hs_monitor, label: COPY.whiteboard.tools.amber },
];

/** Where the pointer is on the board and whether it's drawing: read by the canvas each frame to move the held marker. */
export type BoardPointer = { pt: Pt | null; pressing: boolean };

/** What's printed on the whiteboard: a canvas drawn on with the held tool, and the tool strip along the bottom. */
export default function Whiteboard({
  titleId,
  heightPx,
  tool,
  onTool,
  pointer,
}: {
  titleId: string;
  heightPx: number;
  tool: ToolId;
  onTool: (t: ToolId) => void;
  pointer: { current: BoardPointer };
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const font = () => getComputedStyle(document.body).fontFamily;
  const redraw = () => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.setTransform(DENSITY, 0, 0, DENSITY, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    drawItems(ctx as unknown as Ctx2D, boardItems(), font());
  };
  useEffect(redraw, []);

  const at = (e: React.PointerEvent<HTMLCanvasElement>): Pt => ({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
  const colour = tool === "eraser" ? "" : TOOLS[tool].color;
  const drawHeight = heightPx - STRIP_PX;

  return (
    <div className="office-whiteboard">
      <h2 id={titleId} className="visually-hidden" tabIndex={-1}>
        {COPY.whiteboard.title}
      </h2>
      <canvas
        ref={canvas}
        className="whiteboard-canvas"
        width={WHITEBOARD_WIDTH_PX * DENSITY}
        height={drawHeight * DENSITY}
        style={{ width: WHITEBOARD_WIDTH_PX, height: drawHeight }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = at(e);
          startStroke(tool === "eraser", colour, p);
          pointer.current = { pt: p, pressing: true };
          redraw();
        }}
        onPointerMove={(e) => {
          const p = at(e);
          pointer.current = { pt: p, pressing: pointer.current.pressing };
          if (pointer.current.pressing && extendStroke(p)) redraw();
        }}
        onPointerUp={() => {
          endStroke();
          pointer.current = { ...pointer.current, pressing: false };
        }}
        onPointerCancel={() => {
          endStroke();
          pointer.current = { ...pointer.current, pressing: false };
        }}
        onPointerLeave={() => {
          if (!pointer.current.pressing) pointer.current = { pt: pointer.current.pt, pressing: false };
        }}
      />
      <div className="whiteboard-tools">
        {TOOLS.map((t) => (
          <button key={t.id} type="button" className="whiteboard-swatch" aria-label={t.label} aria-pressed={tool === t.id} style={{ ["--swatch" as string]: t.color }} onClick={() => onTool(t.id)} />
        ))}
        <button type="button" className="whiteboard-eraser" aria-label={COPY.whiteboard.eraser} aria-pressed={tool === "eraser"} onClick={() => onTool("eraser")} />
        <button
          type="button"
          className="whiteboard-wipe"
          onClick={() => {
            wipe();
            redraw();
          }}
        >
          {COPY.whiteboard.wipe}
        </button>
      </div>
    </div>
  );
}

/** Height of the tool strip along the board's bottom edge, in CSS px. */
export const STRIP_PX = 96;
```

  Move `STRIP_PX` above the component if your linter complains about use before definition.

- [ ] **Step 4: Styles.** Append to `app/(office)/office.css`:

```css
/* The whiteboard (a hidden extra): a canvas to draw on, the tool strip along its bottom edge. */
.office-screen:has(.office-whiteboard) { padding: 0; }
.office-whiteboard { position: relative; display: flex; flex-direction: column; height: 100%; }
.whiteboard-canvas { display: block; touch-action: none; cursor: crosshair; }
.whiteboard-tools { display: flex; align-items: center; gap: 18px; height: 96px; padding: 0 24px; border-top: 1px solid rgba(232, 232, 232, 0.25); }
.whiteboard-swatch,
.whiteboard-eraser { width: 56px; height: 56px; padding: 0; border: 2px solid rgba(232, 232, 232, 0.5); border-radius: 50%; background: var(--swatch, transparent); cursor: pointer; }
.whiteboard-eraser { border-radius: 8px; background: repeating-linear-gradient(45deg, rgba(232, 232, 232, 0.6) 0 6px, transparent 6px 12px); }
.whiteboard-swatch[aria-pressed="true"],
.whiteboard-eraser[aria-pressed="true"] { outline: 3px solid var(--office-fg); outline-offset: 4px; }
.whiteboard-wipe { margin-left: auto; padding: 14px 22px; background: none; border: 1px solid rgba(232, 232, 232, 0.6); color: var(--office-fg); font: 600 24px/1 var(--font-ui), system-ui, sans-serif; cursor: pointer; }
```

  The 56 px buttons, at the board's phone print scale (about 0.45), come out at about 25 px on screen, below the 40 px minimum. Task 6 measures them and enlarges them inside the phone media query, after it knows the real scale.

- [ ] **Step 5: Run the test to see it pass.** `npx vitest run office/cards`, expected to PASS. Also run `npx tsc --noEmit`, expected to be clean.

- [ ] **Step 6: Hand over** (the lead commits): the two new files and `office.css`.

---

### Task 6: Wire the whiteboard, e2e (lead, Opus)

**Files:**
- Modify: `office/OfficeCanvas.tsx`, `office/OfficeExperience.tsx`, `app/(office)/office.css` (phone sizes), `e2e/office.spec.ts`
- Create: `e2e/office-whiteboard.spec.ts`

**Interfaces:**
- Produces:
  - `OfficeCanvasProps.whiteboard: { print: { titleId: string; content: ReactNode } | null; state: RefObject<{ held: ToolId | null; pointer: BoardPointer }> }`.
  - `.office` carries `data-whiteboard` ("open" | "shut") for tests.

- [ ] **Step 1: Write the failing e2e** (`e2e/office-whiteboard.spec.ts`). Copy `standInOffice`, `office` and `MOVE_WAIT` from another spec, as they all do.

```ts
import { test, expect, type Page } from "@playwright/test";
import { COPY } from "../office/copy";

// standInOffice, office, MOVE_WAIT as in office-shelf.spec.ts

const canvas = (page: Page) => page.locator(".whiteboard-canvas");
/** Count of non-transparent pixels on the board's canvas. */
const inked = (page: Page) =>
  canvas(page).evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  });
/** Count of inked pixels in the middle ninth of the canvas (the drag below goes through it). */
const inkedMiddle = (page: Page) =>
  canvas(page).evaluate((c: HTMLCanvasElement) => {
    const w = c.width / 3, h = c.height / 3;
    const d = c.getContext("2d")!.getImageData(w, h, w, h).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  });

async function openBoard(page: Page) {
  const item = page.getByRole("button", { name: COPY.whiteboard.nav });
  await item.focus();
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_whiteboard", { timeout: MOVE_WAIT });
  await expect(page.getByRole("heading", { name: COPY.whiteboard.title })).toBeFocused({ timeout: MOVE_WAIT });
  return item;
}
async function scribble(page: Page) {
  const box = (await canvas(page).boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.5);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) await page.mouse.move(box.x + box.width * (0.35 + 0.03 * k), box.y + box.height * (0.5 + 0.01 * k));
  await page.mouse.up();
}

test("hidden: no dot, no tour stop, just a nav item for keyboards", async ({ page }) => {
  await standInOffice(page);
  await expect(page.locator(".office-marker")).toHaveCount(4);
  await expect(page.locator('.office-marker[data-hotspot="hs_whiteboard"]')).toHaveCount(0);
});

test("draw where the pointer goes, swap colours, wipe it, leave and come back to it", async ({ page }) => {
  await standInOffice(page);
  const item = await openBoard(page);
  const start = await inked(page);
  expect(start).toBeGreaterThan(0); // TODO: sleep is on it
  const middle = await inkedMiddle(page);
  await scribble(page);
  expect(await inkedMiddle(page)).toBeGreaterThan(middle); // the line is where the pointer went
  await page.getByRole("button", { name: COPY.whiteboard.tools.red }).click();
  await expect(page.getByRole("button", { name: COPY.whiteboard.tools.red })).toHaveAttribute("aria-pressed", "true");
  await scribble(page);
  const drawn = await inked(page);

  await page.keyboard.press("Escape");
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
  await expect(item).toBeFocused();
  await openBoard(page);
  expect(await inked(page)).toBe(drawn); // still there

  await page.getByRole("button", { name: COPY.whiteboard.wipe }).click();
  expect(await inked(page)).toBe(0);

  await page.reload();
  await standInOffice(page);
  await openBoard(page);
  expect(await inked(page)).toBe(start); // a fresh visit: TODO: sleep again
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("a finger draws, and every tool is big enough to tap", async ({ page }) => {
    await standInOffice(page);
    await openBoard(page);
    for (const name of [...Object.values(COPY.whiteboard.tools), COPY.whiteboard.eraser, COPY.whiteboard.wipe]) {
      const b = (await page.getByRole("button", { name }).boundingBox())!;
      expect(b.width, name).toBeGreaterThanOrEqual(40);
      expect(b.height, name).toBeGreaterThanOrEqual(40);
    }
    const before = await inkedMiddle(page);
    const box = (await canvas(page).boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const pt = (f: number) => ({ x: box.x + box.width * (0.35 + 0.3 * f), y: box.y + box.height * 0.5 });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt(0)] });
    for (let k = 1; k <= 10; k++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [pt(k / 10)] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    expect(await inkedMiddle(page)).toBeGreaterThan(before);
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("still draws", async ({ page }) => {
    await standInOffice(page);
    await openBoard(page);
    const before = await inked(page);
    await scribble(page);
    expect(await inked(page)).toBeGreaterThan(before);
  });
});
```

  If `office.spec.ts` asserts the hint line's exact text (`COPY_HINTS`), update it for the added sentence (Step 3.5).

- [ ] **Step 2: Run it to see it fail.** `npx playwright test e2e/office-whiteboard.spec.ts --workers=1`, expected to fail (no nav item).

- [ ] **Step 3: Wire it.** In `office/OfficeExperience.tsx`:
  1. **Tool state:** `const [tool, setTool] = useState<ToolId>(0);`.
  2. **The shared ref:** `const whiteboard = useRef<{ held: ToolId | null; pointer: BoardPointer }>({ held: null, pointer: { pt: null, pressing: false } });`. Each render, set `whiteboard.current.held = focusedOn === "hs_whiteboard" ? tool : null`.
     In a `useEffect` on `[focusedOn]` (not during render), when `focusedOn` isn't the whiteboard, reset `whiteboard.current.pointer = { pt: null, pressing: false }` and call `endStroke()`, so leaving mid-stroke never leaves a stroke open.
  3. **The print:** pass `whiteboard={{ print: focusedOn === "hs_whiteboard" ? { titleId: "wb-title", content: <Whiteboard titleId="wb-title" heightPx={boardHeightPx} tool={tool} onTool={setTool} pointer={…} /> } : null, state: whiteboard }}` to `<OfficeCanvas>`. `pointer` is an object whose `current` getter and setter read and write `whiteboard.current.pointer`. `boardHeightPx` comes from the canvas: the canvas reports the surface's face `heightPx` through a new `onBoardHeight` callback once the model has loaded. Store it in state, defaulting to 590.
  4. **The nav item:** add a last `<li>` to the nav: `<button type="button" onClick={() => activate({ hotspot: "hs_whiteboard", item: null })} {...navProps({ hotspot: "hs_whiteboard", item: null })}>{COPY.whiteboard.nav}</button>`.
  5. **The hint line:** after `{COPY.hints}`, add `<span className="office-hints-more"> {COPY.hintsMore}</span>` inside the wide span. The tall (phone) line stays the pan hint.

  In `office/OfficeCanvas.tsx`, inside `Office`:
  1. **Find the parts:** `const surface = useMemo(() => office.scene.getObjectByName("hs_whiteboard__surface") as Mesh | undefined ?? null, [office]);`. Compute its face with `screenFaceFor` over its geometry and `WHITEBOARD_WIDTH_PX`, the same way `CardFace` does for `place="screen"`. Report `face.heightPx` through `onBoardHeight`.
  2. **The tools:** `const toolNodes = useMemo(() => { const r = office.scene.getObjectByName("hs_whiteboard"); return r ? findTools(r) : { tools: new Map(), rest: new Map() }; }, [office]);` and `const toolMotion = useMemo(() => new ToolMotion(), []);`.
  3. **Tint once:** after `applyCleanEdges`, in an effect on `[handle]`, call `setTint(handle, "hs_whiteboard__marker_0" + i, TOOLS[i].color)` for i = 1..4. The white one stays at the base colour.
  4. **The held tool, each frame (after the notes):**

```ts
    // The whiteboard's held tool follows the pointer on the board; leaving puts it back in the tray (whiteboard spec 3).
    const wb = whiteboard.state.current;
    let hand: Placement | null = null;
    if (wb.held !== null && surface && boardFace) {
      if (wb.pointer.pt) {
        boardPoint(boardFace, WHITEBOARD_WIDTH_PX, wb.pointer.pt, boardLocal);
        lastBoardLocal.copy(boardLocal);
      }
      hand = handPlacement(surface, lastBoardLocal, wb.held === "eraser" ? "eraser" : "marker", wb.pointer.pressing, handPose);
    }
    toolMotion.update(toolNodes, { held: wb.held, hand, reduced }, dt);
    const open = focused?.hotspot === "hs_whiteboard";
    if (open !== wbWasOpen.current) {
      wbWasOpen.current = open;
      if (host.current) host.current.dataset.whiteboard = open ? "open" : "shut";
    }
```

     with the module-level or memoised scratch objects `boardLocal`, `lastBoardLocal` (initially the board's centre, `(0, 0, 0)` local, or the face's position), `handPose` and `wbWasOpen`.
  5. **The print:** after the laptop's `CardFace`: `{whiteboard.print && surface && <CardFace surface={surface} place="screen" widthPx={WHITEBOARD_WIDTH_PX} hotspot="hs_whiteboard" titleId={whiteboard.print.titleId}>{whiteboard.print.content}</CardFace>}`.
  6. **The test hook:** add `data-whiteboard="shut"` to `.office`'s root in OfficeExperience.

- [ ] **Step 4: Phone sizes.** Measure the tool buttons at 390×844. Inside the existing `@media (max-width: 700px), (orientation: portrait)` block, enlarge `.whiteboard-tools` (its height and `STRIP_PX` together), `.whiteboard-swatch`, `.whiteboard-eraser` and `.whiteboard-wipe` until each is at least 40×40 on screen.

  If the strip has to grow, `STRIP_PX` must match on phones. Make `STRIP_PX` a prop, or read the strip's height with a ref instead of the constant, and say which you chose.

- [ ] **Step 5: Check.**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean; all pass.

Run: `npx playwright test e2e/office-whiteboard.spec.ts --workers=1`, then `npx playwright test e2e/office.spec.ts e2e/office-interaction.spec.ts --workers=1`
Expected: all pass.

- [ ] **Step 6: Look at it.** Take Playwright screenshots at 1440×900, 390×844 and 390×664 into the scratchpad as `wb-*.png`:
  - the whiteboard hovered from the standing spot (white highlight and "Have a go");
  - the board open with the white marker on it;
  - mid-drag, with the marker's tip on the line;
  - a red line drawn with the red marker held;
  - the eraser held;
  - after Wipe it.

  Check that:
  - the marker's tip sits on the line being drawn;
  - "TODO: sleep" sits where the 3D text used to be (tune `startItems` positions if not);
  - the strip fits the board's bottom edge;
  - the hint note is readable.

- [ ] **Step 7: Commit**

```bash
git add office/OfficeCanvas.tsx office/OfficeExperience.tsx "app/(office)/office.css" e2e/office-whiteboard.spec.ts e2e/office.spec.ts office/whiteboard/board.ts
git commit -m "Let visitors draw on the whiteboard: pick up a marker, draw in five colours, rub out, wipe"
```

  Include `office/whiteboard/board.ts` only if Step 6 retuned `startItems`.

---

### Task 7: Kasper draws on it

- [ ] Ask Kasper before pushing. Once he says yes, push and send a fresh preview share link (Vercel MCP `get_access_to_vercel_url` on the branch's latest deployment).
- [ ] He finds it, then draws on his phone and on desktop: the marker in the hand, the line weight, the colours, the eraser and Wipe it.
- [ ] Copy approval: `COPY.labels.hs_whiteboard`, `COPY.whiteboard.*`, `COPY.hintsMore`, and the sticky-note hint in `greybox_office.py`'s `COPY`.
- [ ] Record his decisions in the whiteboard spec, and update the project memory.
