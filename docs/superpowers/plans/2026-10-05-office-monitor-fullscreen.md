# Office Monitor Full-Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The monitor shows each screenshot edge to edge on a 16:10 screen; the slide's words and the reel's controls move to the laptop (or, on portrait screens, to a strip printed under the monitor).

**Architecture:**
- **Model:** `build_monitor` is called with a taller panel so `hs_monitor__screen` is 16:10 at the same width; the notes, the duck and the two monitor focus cameras follow.
- **Reel state:** `office/monitor/reel.ts` keeps its clock and steps; its view drops the laptop's "next" slide and gains `words`, the slide whose words show (the state's index: it changes as a slide lands).
- **Prints:** `ReelScreen` is the monitor's screenshot(s) only. A new `ReelControls` carries the label, headline, action and ‹ dots ›, printed on the laptop, or on portrait screens on a strip hung under the monitor's screen (`belowFaceFor` in `face.ts`). `LaptopScreen` and `ReelWindow` are deleted.
- **Expandable:** adding a slide stays a content change in `content/screens.ts` (plus its image in `public/reel/`); nothing in this plan hard-codes the slide count.

**Tech Stack:** Next 16.2.4, React 19.2.4, @react-three/fiber 9.8, drei 10.7 (`Html`), three 0.186, Vitest 5 (node environment, `*.test.ts` only), Playwright 1.63 (SwiftShader, `--workers=1`), @gltf-transform/core 4.5, Blender 5.2 via the Blender MCP.

**Spec:** `docs/superpowers/specs/2026-10-02-office-interactions-design.md`, section 3.5 (amended 2026-10-05, commit 4f258d2).

## Global Constraints

- **Git:** branch `redesign/office`. Never push without asking Kasper. Stage by explicit path; never `git add -A` (`.agents/` and `public/screenshots/` stay untracked; `public/screenshots/` holds unblurred client screenshots and must never be committed). Commit messages are descriptive and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. LF line endings.
- **Code:** read the relevant guide in `node_modules/next/dist/docs/` before writing Next code. Never touch `package.json`; no new dependencies.
- **Kasper's machine struggles:**
  - Only one headless browser at a time: never run Playwright while another agent is.
  - Playwright runs with `--workers=1`, one spec file at a time.
  - Never start extra dev servers or worktrees; the one dev server on port 3010 is shared.
- **Blender:** only one agent drives the live Blender 5.2 session. Edit `office_props.py` as `office_props_next.py` and `cp` it over once verified (this plan shouldn't need to edit it).
- **Copy:** visitor-facing words live in `office/copy.ts`, slide labels/lines/alt in `content/screens.ts`. Nothing new is needed; don't change the copy.
- **Spec, binding values:**
  - "the monitor shows one screenshot at a time, **edge to edge**: no window, title bar or caption on it"; "the monitor's screen is 16:10 like the screenshots (1280 x 800), so nothing is cropped or letterboxed."
  - "The laptop … carries the reel's words and controls, as real buttons: the slide's label (mono, like a title bar), its one-line headline, its action, and ‹, a dot per slide, ›."
  - Action: "**See the case study** for a crate project; **Visit the site** (a new tab) for work not yet in the crate that is live; nothing for a site not live yet."
  - "Every ~5 s (or on ›) the next screenshot slides in over the monitor from the right, the laptop's side (~0.7 s, eased), and the laptop's words change to it as it lands. ‹ plays it backwards: the screenshot slides out to the right and the previous one is underneath."
  - "Pausing: the reel holds still while the pointer is over the monitor or the laptop, or keyboard focus is in the laptop's controls."
  - Phones: "its words and controls are printed on a strip just under the monitor instead: a print in the screen's plane, below the bezel and in front of the stand, sized for fingers (every button at least 40 x 40 CSS px on screen). Only one of the two carries the controls at a time (the strip on portrait screens, the laptop otherwise)."
  - "Reduced motion: no fall, no slide, no auto-advance … ‹ › switch the screenshot and the words at once."
  - "the visually hidden heading that takes focus as the monitor opens is with the laptop's controls; each screenshot keeps its alt text, read with its label."
  - Model: "the monitor's screen (and its bezel) is 16:10, keeping its width; the stand and the sticky notes' bezel spots move to suit. The focus cameras frame the monitor and the laptop on desktop, and the monitor across the width with room for the strip under it on phones."
- **Phones:** check 390×844 and 390×664 as well as 1440×900.

## Rulings made while planning

- **Dots on the strip:** at the strip's print scale (~0.56 on a 390-wide phone) a dot per slide can't be a 40×40 button for more than a handful of slides, and Kasper adds a project every time he does one. On the strip, ‹ › are the buttons and the dots become a position read-out (`3 / 7`, hidden from screen readers, which hear each slide's label as it lands). The laptop keeps a clickable dot per slide; its dot row wraps.
- **Which print carries the controls:** "portrait" means the same as the camera's portrait framing: `innerWidth < innerHeight` (the camera uses `aspect < 1`), re-checked on resize.
- **The button acts on the words' slide** (`view.words`), so what it says and what it does always match; previously it acted on the slide mostly in view mid-drag.

## Review Focus

1. **The strip's buttons on a phone.** ‹, › and See the case study must each be ≥ 40×40 on screen at 390×844 and 390×664, and the strip must be inside the viewport. *Test: Task 4 (phone e2e measures each button and the strip's box).*
2. **Two prints, one set of controls.** On a portrait screen the laptop must not also print the controls (a keyboard user would tab through them twice and a screen reader read them twice). *Test: Task 4 (phone e2e: `.reel-words--laptop` count 0; desktop: `.reel-words--strip` count 0).*
3. **The words change as the slide lands, not when it starts.** Mid-slide the words are still the old slide's, and the button plays the slide its words name. *Test: Task 1 (unit: `words` is the old index mid-drag, the new one after); Task 4 (e2e: See the case study plays the slide the label names).*
4. **The screenshot is uncropped.** The monitor's screen is 16:10 in the exported model and the printed image's box is 16:10. *Test: Task 2 (unit reads the GLB); Task 4 (e2e: the monitor image's box aspect is 1.6 ± 0.03).*
5. **A slide sliding back doesn't flash.** Going back, the outgoing screenshot slides right and is removed when it lands, never jumping back over the monitor. *Test: Task 4 (the existing MutationObserver flash test, retargeted to `.reel-moving`).*

---

## File structure

| File | Responsibility |
|---|---|
| `office/monitor/reel.ts` (+ test) | Reel clock, steps, and the view: what's on the monitor, what's sliding, whose words show |
| `office/monitor/useReel.ts` | The hook: unchanged contract except `current()` returns the words' slide |
| `scripts/blender/greybox_office.py`, `art/office.blend`, `public/models/office.glb`, `office/nodes.test.ts` | The 16:10 monitor, the notes and duck that follow it, the re-framed monitor cameras |
| `office/cards/face.ts` (+ `face.test.ts`), `office/cards/CardFace.tsx` | `belowFaceFor`; CardFace's `below` and `hidden` props |
| `office/cards/ReelScreen.tsx`, `office/cards/ReelControls.tsx` (new), `office/cards/reel.test.ts`, `app/(office)/office.css` | The monitor's screenshots; the words and controls (laptop or strip) |
| `office/cards/LaptopScreen.tsx`, `office/cards/ReelWindow.tsx` | Deleted |
| `office/OfficeCanvas.tsx`, `office/OfficeExperience.tsx`, `office/usePortrait.ts` (new), `e2e/office-monitor.spec.ts` | Wiring and end to end |

## Execution waves and models

1. **In parallel:** Task 1 (Sonnet), Task 2 (Opus, the live Blender agent). The lead commits Task 2.
2. **Task 3** (Sonnet), after Task 1.
3. **Task 4** (Opus): wiring, e2e, screenshots. Then Task 5 with Kasper.

---

### Task 1: The reel's view without the laptop's next slide

**Files:**
- Modify: `office/monitor/reel.ts`, `office/monitor/reel.test.ts`, `office/monitor/useReel.ts`

**Interfaces:**
- Produces:
  - `type ReelView = { monitor: number; moving: { slide: number; at: number } | null; words: number }` — `monitor` is the slide underneath, `moving` the one sliding (`at`: 1 = off the right edge, 0 = covering the monitor), `words` the slide whose words show.
  - `viewOf(s, count): ReelView`. `slideInView` is removed. `atToWrite`, `tickReel`, `stepReel`, `showSlide`, `wrap`, `REEL_HOLD_SECONDS`, `DRAG_SECONDS` keep their signatures.
  - `useReel(...)` returns `{ view, step, show, hold, current }` as before; `current()` returns the words' slide.

- [ ] **Step 1: Write the failing tests.** In `office/monitor/reel.test.ts`, drop `slideInView` from the import and replace the `describe("viewOf" …)` block and any `slideInView` block with:

```ts
describe("viewOf", () => {
  it("shows the slide on the monitor and its words, nothing moving, at rest", () =>
    expect(viewOf(initialReel(), 3)).toEqual({ monitor: 0, moving: null, words: 0 }));
  it("forward: the next screenshot slides in from the right over the current one, whose words stay until it lands", () => {
    const s: ReelState = { index: 0, wait: 0, drag: { dir: 1, t: 0 } };
    expect(viewOf(s, 3)).toEqual({ monitor: 0, moving: { slide: 1, at: 1 }, words: 0 });
    const mid = viewOf({ ...s, drag: { dir: 1, t: 0.5 } }, 3);
    expect(mid.moving!.slide).toBe(1);
    expect(mid.moving!.at).toBeCloseTo(0.5, 9);
    expect(mid.words).toBe(0);
  });
  it("back: the current screenshot slides out to the right over the previous one", () => {
    const s: ReelState = { index: 0, wait: 0, drag: { dir: -1, t: 0 } };
    expect(viewOf(s, 3)).toEqual({ monitor: 2, moving: { slide: 0, at: 0 }, words: 0 });
    expect(viewOf({ ...s, drag: { dir: -1, t: 1 } }, 3).moving!.at).toBeCloseTo(1, 9);
  });
  it("the words change as the slide lands", () => {
    let s = stepReel(initialReel(), 1, go);
    s = run(s, DRAG_SECONDS / 2);
    expect(viewOf(s, 3).words).toBe(0);
    s = run(s, DRAG_SECONDS);
    expect(viewOf(s, 3)).toEqual({ monitor: 1, moving: null, words: 1 });
  });
});
```

  Keep the existing `atToWrite` tests; if any builds a `ReelView` literal with a `laptop` field, replace that field with `words: <same index as monitor>`.

- [ ] **Step 2: Run them to see them fail.** `npx vitest run office/monitor/reel.test.ts` — expected FAIL (the view still has `laptop`, no `words`).

- [ ] **Step 3: Implement.** In `office/monitor/reel.ts`, replace from `export type ReelView` through the end of `slideInView` with:

```ts
export type ReelView = {
  /** The slide on the monitor, under anything sliding. */
  monitor: number;
  /** The screenshot sliding over the monitor, and where it is: 1 off the right edge (the laptop's side), 0 covering it. */
  moving: { slide: number; at: number } | null;
  /** The slide whose words and controls show (spec 3.5): the reel's own slide, which changes as a slide lands. */
  words: number;
};

/** What the monitor shows. Forward, the next screenshot slides in from the right; back, the current one slides out to the right. */
export function viewOf(s: ReelState, count: number): ReelView {
  if (!s.drag) return { monitor: s.index, moving: null, words: s.index };
  const e = easeInOutCubic(s.drag.t);
  if (s.drag.dir === 1) return { monitor: s.index, moving: { slide: wrap(s.index + 1, count), at: 1 - e }, words: s.index };
  return { monitor: wrap(s.index - 1, count), moving: { slide: s.index, at: e }, words: s.index };
}
```

  Update the file's two comments that mention the laptop or dragging between screens to say "slides in over the monitor" (`REEL_HOLD_SECONDS`, `DRAG_SECONDS`, `tickReel`, `stepReel`, `showSlide` doc comments; keep the names).

  In `office/monitor/useReel.ts`:
  - import list: drop `slideInView`;
  - `const viewKey = (v: ReelView) => \`${v.monitor}:${v.moving?.slide ?? ""}:${v.words}\`;`
  - replace the `current` callback and its comment with:

```ts
  /** The slide whose words show, read now: the one the action button plays. */
  const current = useCallback(() => state.current.index, []);
```

  - in the hook's doc comment, "a dragged window's position goes to `--at`" becomes "a sliding screenshot's position goes to `--at`".

- [ ] **Step 4: Run them to see them pass.** `npx vitest run office/monitor` — expected PASS. `npx tsc --noEmit` will now fail in `ReelScreen.tsx`/`LaptopScreen.tsx` (they read `view.laptop`); that is Task 3's to fix. Report those errors, don't fix them.

- [ ] **Step 5: Hand over** (the lead commits `office/monitor/reel.ts`, `office/monitor/reel.test.ts`, `office/monitor/useReel.ts`).

---

### Task 2: A 16:10 monitor in Blender

Runs in the live Blender session, by one agent only.

**Files:**
- Modify: `scripts/blender/greybox_office.py`, `art/office.blend`, `public/models/office.glb`, `office/nodes.test.ts`, `office/manifest.json` (only if a node or camera name changes; none should)

**Interfaces:** in the exported GLB:
- `hs_monitor__screen`: the same node, now 16:10 (0.604 m × 0.3775 m), still centred in its recess and leaning back 5°.
- `hs_monitor__notes__note_NN` and their `__rest_NN`: notes still on the bezel round the taller panel; rests still on the desk.
- `cam_focus_monitor` and `cam_focus_monitor_portrait`: re-framed (below).

- [ ] **Step 1: Write the failing test** (in `office/nodes.test.ts`, with `import { NodeIO } from "@gltf-transform/core";` at the top):

```ts
  it("the monitor's screen is 16:10, like the reel's screenshots (spec 3.5)", async () => {
    const doc = await new NodeIO().read("public/models/office.glb");
    const node = doc.getRoot().listNodes().find((n) => n.getName() === "hs_monitor__screen")!;
    const pos = node.getMesh()!.listPrimitives()[0].getAttribute("POSITION")!;
    const pts = Array.from({ length: pos.getCount() }, (_, i) => pos.getElement(i, [0, 0, 0]));
    const span = (k: number) => Math.max(...pts.map((p) => p[k])) - Math.min(...pts.map((p) => p[k]));
    // the screen leans back about x, so its height lies in the y-z plane
    expect(span(0) / Math.hypot(span(1), span(2))).toBeCloseTo(1.6, 2);
  });
```

  If the screen's geometry turns out to be in a different frame than its node (check with the dump), adapt the test to measure in the screen's own plane and say how.

- [ ] **Step 2: Run it to see it fail.** `npx vitest run office/nodes.test.ts` — expected FAIL at ~1.82.

- [ ] **Step 3: The monitor.** In `scripts/blender/greybox_office.py`:
  - add, near `NOTE_RESTS`: `MONITOR_H = 0.4055  # panel height: 0.008 bezel + 0.3775 screen + 0.02 chin, so the screen is 16:10 at the panel's 0.62 m width (spec 3.5)`;
  - `props.build_monitor("hs_monitor", monitor, 0, room, col, height=MONITOR_H)`;
  - `props.build_monitor_notes("hs_monitor__notes", (0, 0, 0), 0, screen, col, count=len(NOTE_RESTS), height=MONITOR_H)`;
  - the duck sits on the panel's top: `monitor + Vector((0.1, 0.051, 0.441 + (MONITOR_H - 0.36)))`.
  - Check nothing behind or above the monitor now intersects the taller panel (BVH overlap against every other mesh), and that the notes on the bezel still sit on it. Check each `NOTE_RESTS` spot is still clear (the panel's footprint doesn't change, so they should be); if one isn't, re-run the search the comment above `NOTE_RESTS` describes and update the comment's facts.

- [ ] **Step 4: Cameras.** Re-frame `FOCUS["monitor"]` and rewrite its comment to say why:
  - **landscape (16:10):** square on to the screen and level with its centre, slid right so the laptop's whole screen is in shot beside it (the laptop now carries the words): the monitor's screen about 50–55% of the frame width, the laptop's screen fully in frame and readable, the duck on top may be cut; the desk's front edge below the frame so the fallen notes stay out of shot.
  - **portrait (390×844):** the monitor's screen about 92% of the width, with the strip's area in frame under it: the strip is 0.283 m tall (300 px at the screen's 640 px print scale) and hangs 0.011 m (12 px) under the screen's bottom edge, in the screen's plane. Leave ~5% margin under the strip.
  - Both eyes ≥ 0.3 m from any mesh.

- [ ] **Step 5: Look.** Render from both cameras and the standing spot into the scratchpad as `mon-blender-*.png`. On the portrait render, draw (or just measure and report) where the strip's rectangle falls. Check: the monitor reads as a monitor (not too tall a panel for its stand); the notes sit on the bezel; the laptop is in the landscape shot.

- [ ] **Step 6: Export, build, check.** Run `greybox_office.py` then `export.py` as before.

Run: `npm run build:models && npm run check:models && npx vitest run office/nodes.test.ts office/hotspots/manifest.test.ts`
Expected: models OK (office under 2 MB); PASS.

- [ ] **Step 7: Hand over** (the lead commits). Report: the screen's measured size and aspect in the GLB, the camera values, the eye clearances, whether any note rest moved, render paths.

---

### Task 3: The monitor's screenshots, and the words and controls

**Files:**
- Create: `office/cards/ReelControls.tsx`
- Modify: `office/cards/ReelScreen.tsx`, `office/cards/reel.test.ts`, `office/cards/face.ts`, `office/cards/face.test.ts`, `office/cards/CardFace.tsx`, `app/(office)/office.css`
- Delete: `office/cards/LaptopScreen.tsx`, `office/cards/ReelWindow.tsx`

**Interfaces:**
- Consumes: `ReelView` (Task 1: `monitor`, `moving`, `words`); `HoldProps` from `@/office/monitor/useReel`; `slides`, `Slide` from `@/content/screens`; `findWork` from `@/content/work`.
- Produces:
  - `ReelScreen({ view, hold }: { view: ReelView; hold: HoldProps })`, `SCREEN_WIDTH_PX = 640`.
  - `ReelControls({ titleId, view, hold, onStep, onShow, onPlay, place }: { titleId: string; view: ReelView; hold: HoldProps; onStep: (dir: 1 | -1) => void; onShow: (i: number) => void; onPlay: () => void; place: "laptop" | "strip" })`.
  - `LAPTOP_WIDTH_PX = 640`, `STRIP_WIDTH_PX = 640` (= `SCREEN_WIDTH_PX`, so the strip spans the monitor), `STRIP_HEIGHT_PX = 300`, `STRIP_GAP_PX = 12`.
  - `headlineFor(slide: Slide): string`.
  - `belowFaceFor(face: Face, heightPx: number, gapPx: number): Face` in `face.ts`, with `export type Face = ReturnType<typeof screenFaceFor>`.
  - CardFace props: `below?: { heightPx: number; gapPx: number }` (with `place="screen"`: the print hangs under the screen) and `hidden?: boolean` (aria-hidden). `focus={false}` no longer implies hidden.

- [ ] **Step 1: Write the failing tests.**

  Append to `office/cards/face.test.ts` (import `belowFaceFor` beside `screenFaceFor`):

```ts
describe("belowFaceFor", () => {
  // the monitor's 16:10 screen, upright, facing +z, printed 640 px wide
  const corners = [new Vector3(-0.302, -0.18875, 0), new Vector3(0.302, -0.18875, 0), new Vector3(0.302, 0.18875, 0), new Vector3(-0.302, 0.18875, 0)];
  const screen = screenFaceFor(corners, 640);
  it("hangs a print of the same width under the screen, gapPx below its bottom edge, in its plane", () => {
    const k = screen.distanceFactor / 400;
    const f = belowFaceFor(screen, 300, 12);
    expect(f.distanceFactor).toBe(screen.distanceFactor);
    expect(f.rotation).toEqual(screen.rotation);
    expect(f.heightPx).toBe(300);
    expect(f.position[0]).toBeCloseTo(screen.position[0], 9);
    expect(f.position[1]).toBeCloseTo(-0.18875 - (12 + 150) * k, 9);
    expect(f.position[2]).toBeCloseTo(screen.position[2], 9);
  });
  it("follows the screen's lean", () => {
    // leaning back 5 degrees (about x by -0.0873): the screen's up is (0, cos, -sin), so going down it comes forward (+z)
    const leaning = { ...screen, rotation: [-0.0873, 0, 0] as [number, number, number] };
    const f = belowFaceFor(leaning, 300, 12);
    const down = (screen.heightPx / 2 + 12 + 150) * (screen.distanceFactor / 400);
    expect(f.position[1]).toBeCloseTo(screen.position[1] - down * Math.cos(0.0873), 9);
    expect(f.position[2]).toBeCloseTo(screen.position[2] + down * Math.sin(0.0873), 9);
  });
});
```

  (`face.test.ts` already imports `Vector3`; if not, add it.)

  Replace the `ReelScreen` and `LaptopScreen` describes in `office/cards/reel.test.ts` (keep `holdFor`'s) with:

```ts
import ReelControls, { headlineFor } from "./ReelControls";

const view = (monitor: number, words = monitor, moving: { slide: number; at: number } | null = null) => ({ monitor, moving, words });
const controls = (v: ReturnType<typeof view>, place: "laptop" | "strip" = "laptop") =>
  renderToStaticMarkup(createElement(ReelControls, { titleId: "r", view: v, hold, onStep: () => {}, onShow: () => {}, onPlay: () => {}, place }));
const monitor = (v: ReturnType<typeof view>) => renderToStaticMarkup(createElement(ReelScreen, { view: v, hold }));

describe("ReelScreen", () => {
  it("is the screenshot edge to edge, its alt read with its label, and no words or controls", () => {
    const out = monitor(view(2));
    const s = slides[2];
    expect(out).toContain(`src="${s.shot.src}"`);
    expect(out).toContain(`alt="${esc(`${s.label}: ${s.shot.alt}`)}"`);
    expect(out).not.toContain("<button");
    expect(out).not.toContain("reel-bar");
    expect(out).toContain('data-reel=""');
  });
  it("draws the screenshot sliding in over it, hidden from screen readers", () => {
    const out = monitor(view(0, 0, { slide: 1, at: 0.5 }));
    expect(out).toMatch(/class="reel-shot reel-moving"[^>]*aria-hidden="true"/);
    expect(out).toContain(`src="${slides[1].shot.src}"`);
  });
});

describe("ReelControls", () => {
  const crate = slides.findIndex((s) => s.slug);
  const page = slides.findIndex((s) => !s.slug && s.href);
  const notLive = slides.findIndex((s) => !s.slug && !s.href);
  it("names the slide, gives its headline and See the case study, with the hidden heading to take focus", () => {
    const out = controls(view(crate));
    const s = slides[crate];
    expect(out).toContain(`<p class="reel-label">${esc(s.label)}</p>`);
    expect(out).toContain(esc(findWork(s.slug!)!.headline));
    expect(out).toContain(`>${esc(COPY.reel.caseStudy)}<`);
    expect(out).toMatch(/<h2[^>]*id="r"[^>]*class="visually-hidden"/);
    expect(out).toContain(`data-slide="${crate}"`);
  });
  it("says Visit the site for a live page not in the crate, and has no button for a site not live yet", () => {
    expect(controls(view(page))).toContain(`>${esc(COPY.reel.visit)}<`);
    const out = controls(view(notLive));
    expect(out).toContain(esc(slides[notLive].line!));
    expect(out).not.toContain("office-card-cta");
  });
  it("shows the words of the slide it's on, not the one sliding in", () =>
    expect(controls(view(0, 0, { slide: 1, at: 0.4 }))).toContain(esc(slides[0].label)));
  it("on the laptop: ‹, a dot per slide named for it, ›", () => {
    const out = controls(view(0));
    expect(out).toContain(`aria-label="${esc(COPY.reel.prev)}"`);
    expect(out).toContain(`aria-label="${esc(COPY.reel.next)}"`);
    expect(out.match(/class="reel-dot"/g)).toHaveLength(slides.length);
    for (const s of slides) expect(out).toContain(`aria-label="${esc(COPY.reel.show(s.label))}"`);
    expect(out).toContain('aria-current="true"');
  });
  it("on the strip: ‹ › and a read-out of where it is, no dots (too many to tap)", () => {
    const out = controls(view(2), "strip");
    expect(out).not.toContain("reel-dot");
    expect(out).toMatch(new RegExp(`<span class="reel-count" aria-hidden="true">3 / ${slides.length}</span>`));
    expect(out).toContain("reel-words--strip");
  });
  it("headlineFor: a crate project's headline, or the slide's own line", () => {
    expect(headlineFor(slides[crate])).toBe(findWork(slides[crate].slug!)!.headline);
    expect(headlineFor(slides[notLive])).toBe(slides[notLive].line);
  });
});
```

  Remove the old `ReelWindow`/`LaptopScreen` imports from the test file.

- [ ] **Step 2: Run them to see them fail.** `npx vitest run office/cards` — expected FAIL (no `ReelControls`, no `belowFaceFor`).

- [ ] **Step 3: `face.ts`.** Add `Quaternion` to the three import, then append:

```ts
export type Face = ReturnType<typeof screenFaceFor>;

/**
 * A print `heightPx` tall hung under another print's `face`, the same width (and px scale), in its plane and tilt, its top
 * `gapPx` below the face's bottom edge: the reel's words under the monitor on portrait screens (spec 3.5).
 */
export function belowFaceFor(face: Face, heightPx: number, gapPx: number): Face {
  const k = face.distanceFactor / 400;
  const up = new Vector3(0, 1, 0).applyQuaternion(new Quaternion().setFromEuler(new Euler(...face.rotation)));
  const at = new Vector3(...face.position).addScaledVector(up, -(face.heightPx / 2 + gapPx + heightPx / 2) * k);
  return { position: at.toArray() as [number, number, number], rotation: face.rotation, distanceFactor: face.distanceFactor, heightPx };
}
```

- [ ] **Step 4: `CardFace.tsx`.**
  - Props gain `below?: { heightPx: number; gapPx: number }` and `hidden?: boolean` (default `false`), each with a one-line doc comment; `focus`'s comment loses "which is then hidden from screen readers".
  - The `place === "screen"` branch becomes:

```ts
    if (place === "screen") {
      const at = surface.geometry.getAttribute("position");
      const screen = screenFaceFor(Array.from({ length: at.count }, (_, i) => new Vector3().fromBufferAttribute(at, i)), widthPx);
      return below ? belowFaceFor(screen, below.heightPx, below.gapPx) : screen;
    }
```

  with `below?.heightPx, below?.gapPx` added to the memo's deps and `belowFaceFor` to the import.
  - On the section: `aria-labelledby={focus ? titleId : undefined}` stays; `aria-hidden={hidden || undefined}`.

- [ ] **Step 5: `ReelScreen.tsx`** (whole file):

```tsx
"use client";

import { slides, type Slide } from "@/content/screens";
import type { ReelView } from "@/office/monitor/reel";
import type { HoldProps } from "@/office/monitor/useReel";

/** CSS px the monitor's print is laid out at (its 16:10 screen face is 640 x 400). */
export const SCREEN_WIDTH_PX = 640;

/** One screenshot filling the screen; `sliding` is the one moving over it, which screen readers skip (they get it as it lands). */
function Shot({ slide, sliding = false }: { slide: Slide; sliding?: boolean }) {
  return (
    <div className={sliding ? "reel-shot reel-moving" : "reel-shot"} aria-hidden={sliding || undefined}>
      <img src={slide.shot.src} alt={sliding ? "" : `${slide.label}: ${slide.shot.alt}`} draggable={false} />
    </div>
  );
}

/** What's printed on the monitor (spec 3.5): the slide's screenshot edge to edge, and the next one sliding in over it. */
export default function ReelScreen({ view, hold }: { view: ReelView; hold: HoldProps }) {
  return (
    <div className="office-reel" data-reel data-monitor={view.monitor} {...hold}>
      <Shot slide={slides[view.monitor]} />
      {view.moving && <Shot slide={slides[view.moving.slide]} sliding />}
    </div>
  );
}
```

- [ ] **Step 6: `ReelControls.tsx`** (whole file):

```tsx
"use client";

import { findWork } from "@/content/work";
import { slides, type Slide } from "@/content/screens";
import { COPY } from "@/office/copy";
import type { ReelView } from "@/office/monitor/reel";
import type { HoldProps } from "@/office/monitor/useReel";
import { SCREEN_WIDTH_PX } from "./ReelScreen";

/** CSS px the laptop's print is laid out at. */
export const LAPTOP_WIDTH_PX = 640;
/** The strip under the monitor on portrait screens: as wide as the monitor's print, so it spans the screen. */
export const STRIP_WIDTH_PX = SCREEN_WIDTH_PX;
export const STRIP_HEIGHT_PX = 300;
/** Between the screen's bottom edge and the strip, at the screen's print scale: clear of the bezel's chin. */
export const STRIP_GAP_PX = 12;

/** The line a slide's words show: its crate project's headline, or its own line for work not in the crate. */
export function headlineFor(slide: Slide): string {
  return slide.slug ? findWork(slide.slug)!.headline : slide.line!;
}

/**
 * The reel's words and controls (spec 3.5): the slide's label, its headline, its action and ‹ › — on the laptop, or on a
 * strip under the monitor on portrait screens. The laptop has a dot per slide; the strip, sized for fingers, has a
 * read-out of where it is instead (a dot per slide couldn't be tapped once there are more than a few).
 */
export default function ReelControls({
  titleId,
  view,
  hold,
  onStep,
  onShow,
  onPlay,
  place,
}: {
  titleId: string;
  view: ReelView;
  hold: HoldProps;
  onStep: (dir: 1 | -1) => void;
  onShow: (i: number) => void;
  onPlay: () => void;
  place: "laptop" | "strip";
}) {
  const i = view.words;
  const slide = slides[i];
  return (
    <div className={`reel-words reel-words--${place}`} data-slide={i} {...hold}>
      <h2 id={titleId} className="visually-hidden" tabIndex={-1}>
        {COPY.reel.title}
      </h2>
      <p className="reel-label">{slide.label}</p>
      <p className="reel-headline">{headlineFor(slide)}</p>
      {(slide.slug || slide.href) && (
        <button type="button" className="office-card-cta" onClick={onPlay}>
          {slide.slug ? COPY.reel.caseStudy : COPY.reel.visit}
        </button>
      )}
      <div className="reel-controls">
        <button type="button" className="reel-step" aria-label={COPY.reel.prev} onClick={() => onStep(-1)}>
          ‹
        </button>
        {place === "laptop" ? (
          slides.map((s, k) => (
            <button key={k} type="button" className="reel-dot" aria-label={COPY.reel.show(s.label)} aria-current={k === i} onClick={() => onShow(k)} />
          ))
        ) : (
          <span className="reel-count" aria-hidden="true">
            {i + 1} / {slides.length}
          </span>
        )}
        <button type="button" className="reel-step" aria-label={COPY.reel.next} onClick={() => onStep(1)}>
          ›
        </button>
      </div>
    </div>
  );
}
```

  Note the JSX `{i + 1} / {slides.length}` renders as `3 / 7` in static markup with React's text separators; if the test's regex fails on `<!-- -->` separators, render the read-out as one string: `{\`${i + 1} / ${slides.length}\`}`.

- [ ] **Step 7: Delete** `office/cards/LaptopScreen.tsx` and `office/cards/ReelWindow.tsx` (`git rm`).

- [ ] **Step 8: Styles.** In `app/(office)/office.css`, replace every rule from the comment `/* The monitor's reel (spec 3.5): …` through the end of the reel's phone `@media` block (the block ending with `.reel-controls button:last-child { right: 0; … }` and its closing `}`) with:

```css
/* The monitor's reel (spec 3.5): the screenshot edge to edge on the monitor, the next one sliding in over it from the
   right, placed by --at (1 = off the right edge, 0 = covering the monitor). Its words and controls are on the laptop, or
   on portrait screens on a strip under the monitor. */
.office-reel { position: relative; height: 100%; overflow: hidden; background: var(--office-bg); }
.reel-shot { position: absolute; inset: 0; background: var(--office-bg); }
.reel-shot > img { display: block; width: 100%; height: 100%; object-fit: cover; }
.reel-moving { transform: translateX(calc(var(--at, 0) * 100%)); box-shadow: -10px 0 24px rgba(0, 0, 0, 0.55); }
.reel-words { box-sizing: border-box; display: flex; flex-direction: column; gap: 12px; height: 100%; padding: 22px 26px 18px; font-size: 22px; }
.reel-label { display: flex; align-items: center; gap: 10px; margin: 0; font: 16px/1 var(--font-mono), ui-monospace, monospace; letter-spacing: 0.06em; }
.reel-label::before { content: ""; flex: none; width: 34px; height: 8px; background: radial-gradient(circle, rgba(232, 232, 232, 0.7) 3px, transparent 3.5px) 0 0 / 12px 8px repeat-x; }
.reel-headline { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; margin: 0; overflow: hidden; line-height: 1.25; color: rgba(232, 232, 232, 0.85); }
.reel-words .office-card-cta { position: static; align-self: flex-start; padding: 10px 16px; font-size: 17px; white-space: nowrap; }
.reel-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: auto; }
.reel-controls button { padding: 2px 6px; background: none; border: 0; color: var(--office-fg); font: 24px/1 var(--font-ui), system-ui, sans-serif; cursor: pointer; }
.reel-controls .reel-dot { width: 10px; height: 10px; padding: 0; border: 1px solid var(--office-fg); border-radius: 50%; }
.reel-controls .reel-dot[aria-current="true"] { background: var(--accent); border-color: var(--accent); }
.reel-count { font: 26px/1 var(--font-mono), ui-monospace, monospace; letter-spacing: 0.06em; }
/* The strip under the monitor (portrait screens): seen at about half size on a phone, so everything is made to be
   tapped: ‹ › 84 px square, the action 84 px tall, which at ~0.56 come out over 40 px on screen. */
.reel-words--strip { gap: 10px; padding: 16px 18px; font-size: 28px; border: 1px solid rgba(232, 232, 232, 0.6); background: var(--office-bg); }
.reel-words--strip .reel-label { font-size: 22px; }
.reel-words--strip .reel-headline { -webkit-line-clamp: 2; }
.reel-words--strip .office-card-cta { min-height: 84px; padding: 0 22px; font-size: 28px; }
.reel-words--strip .reel-controls { flex-wrap: nowrap; justify-content: space-between; }
.reel-words--strip .reel-step { width: 84px; height: 84px; font-size: 64px; }
```

  Then `grep -n "reel-" "app/(office)/office.css"` and remove any leftover rule naming `.reel-window`, `.reel-bar`, `.reel-name`, `.reel-pointer`, `.reel-body`, `.reel-stage`, `.reel-strip`, `.reel-moving--monitor`, `.reel-moving--laptop` or `.office-reel--laptop`.

- [ ] **Step 9: Run the tests.** `npx vitest run office/cards` — expected PASS. `npx tsc --noEmit` will still report `OfficeCanvas.tsx`/`OfficeExperience.tsx` (they import the deleted files): Task 4 fixes those. Report them; fix nothing outside this task's files.

- [ ] **Step 10: Hand over** (the lead commits the files above, including the two deletions).

---

### Task 4: Wire the reel, e2e, look at it (Opus)

**Files:**
- Create: `office/usePortrait.ts`
- Modify: `office/OfficeCanvas.tsx`, `office/OfficeExperience.tsx`, `e2e/office-monitor.spec.ts`

**Interfaces:**
- Consumes: Task 1's `ReelView`/`useReel`; Task 3's `ReelScreen`, `ReelControls`, `SCREEN_WIDTH_PX`, `LAPTOP_WIDTH_PX`, `STRIP_WIDTH_PX`, `STRIP_HEIGHT_PX`, `STRIP_GAP_PX`, CardFace `below`/`hidden`.
- Produces: `OfficeCanvasProps.monitorScreen: { content: ReactNode } | null`; `OfficeCanvasProps.reelControls: { titleId: string; content: ReactNode; place: "laptop" | "strip" } | null` (replaces `laptopScreen`); `usePortrait(): boolean`.

- [ ] **Step 1: Write the failing e2e.** Rewrite `e2e/office-monitor.spec.ts`. Keep `MOVE_WAIT`, `office`, `standInOffice`, `openMonitor`, `reelSeconds` and `printedPx` as they are; replace the rest:

```ts
const reel = (page: Page) => page.getByRole("region", { name: COPY.reel.title });
const words = (page: Page) => page.locator(".reel-words");
const shotOnMonitor = (page: Page) => page.locator(".office-reel .reel-shot:not(.reel-moving) img");

test("the notes come off, the screenshot fills the monitor, the words are on the laptop, and See the case study plays the record and comes back", async ({ page }) => {
  await standInOffice(page);
  const button = await openMonitor(page);
  await expect(office(page)).toHaveAttribute("data-notes", "down", { timeout: MOVE_WAIT });
  await expect(page.getByRole("heading", { name: COPY.reel.title })).toBeFocused({ timeout: MOVE_WAIT });
  await page.mouse.move(2, 2);
  await expect(page.locator(".reel-words--laptop")).toHaveCount(1);
  await expect(page.locator(".reel-words--strip")).toHaveCount(0);
  const img = (await shotOnMonitor(page).boundingBox())!;
  expect(img.width / img.height).toBeGreaterThan(1.57);
  expect(img.width / img.height).toBeLessThan(1.63);
  await expect(words(page)).toHaveAttribute("data-slide", "0");
  await reel(page).getByRole("button", { name: COPY.reel.next }).click();
  await expect(words(page)).toHaveAttribute("data-slide", "1", { timeout: MOVE_WAIT });
  await expect(shotOnMonitor(page)).toHaveAttribute("src", slides[1].shot.src);
  await expect(words(page).locator(".reel-label")).toHaveText(slides[1].label);
  // the button plays the slide its words name
  await reel(page).getByRole("button", { name: COPY.reel.caseStudy }).click();
  await expect(page).toHaveURL(new RegExp(`/work/${slides[1].slug}$`), { timeout: MOVE_WAIT });
  await page.goBack();
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_monitor", { timeout: MOVE_WAIT });
  await expect(words(page)).toHaveAttribute("data-slide", "1");
  await page.goBack();
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
  await expect(button).toBeFocused();
});

test("it moves on by itself, and holds while the pointer is on the laptop's words", async ({ page }) => {
  test.slow(); // over 12 s of the reel's clock (see reelSeconds)
  await standInOffice(page);
  await openMonitor(page);
  await page.mouse.move(2, 2);
  await reelSeconds(page, 5.7); // the hold and the slide
  await expect(words(page)).toHaveAttribute("data-slide", "1", { timeout: MOVE_WAIT });
  const box = (await words(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
  await reelSeconds(page, 7);
  await expect(words(page)).toHaveAttribute("data-slide", "1");
});

test("‹ slides the screenshot back out to the right, and it never flashes back over the monitor when it lands", async ({ page }) => {
  test.slow(); // a 0.7 s slide on the reel's clock (see reelSeconds)
  await standInOffice(page);
  await openMonitor(page);
  await page.mouse.move(2, 2);
  // Watch every write to --at. A write lands in the middle of a frame's script, and the observer's callback runs right after
  // it, before React's own render: so what it sees (the sliding screenshot still mounted or not) is what that frame paints.
  const watched = page.evaluate(
    () =>
      new Promise<{ seen: number[]; flashed: boolean }>((done) => {
        const root = document.querySelector<HTMLElement>(".office-reel[data-reel]")!;
        const seen: number[] = [];
        let flashed = false;
        const observer = new MutationObserver(() => {
          const at = parseFloat(root.style.getPropertyValue("--at"));
          if (!root.querySelector(".reel-moving")) return;
          // Going back the screenshot moves 0 -> 1; a drop with it still there covers the monitor with the slide that left.
          if (seen.length && at < Math.max(...seen) - 0.3) flashed = true;
          seen.push(at);
        });
        observer.observe(root, { attributes: true, attributeFilter: ["style"] });
        let mounted = false;
        let after = 0;
        const frame = () => {
          mounted ||= !!root.querySelector(".reel-moving");
          if (mounted && !root.querySelector(".reel-moving") && ++after > 4) {
            observer.disconnect();
            done({ seen, flashed });
          } else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
  await reel(page).getByRole("button", { name: COPY.reel.prev }).click();
  await expect(words(page)).toHaveAttribute("data-slide", String(slides.length - 1), { timeout: MOVE_WAIT });
  await expect(shotOnMonitor(page)).toHaveAttribute("src", slides[slides.length - 1].shot.src);
  const { seen, flashed } = await watched;
  expect(seen.length).toBeGreaterThan(1);
  expect(flashed, `--at while the screenshot was mounted: ${seen.join(", ")}`).toBe(false);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("no fall, no slide, no auto-advance: the arrows switch the screenshot and the words at once", async ({ page }) => {
    await standInOffice(page);
    await openMonitor(page);
    await expect(office(page)).toHaveAttribute("data-notes", "down", { timeout: MOVE_WAIT });
    await reel(page).getByRole("button", { name: COPY.reel.next }).click();
    await expect(words(page)).toHaveAttribute("data-slide", "1", { timeout: 2_000 });
    await expect(shotOnMonitor(page)).toHaveAttribute("src", slides[1].shot.src);
    await expect(page.locator(".reel-moving")).toHaveCount(0);
  });
});

for (const height of [844, 664]) {
  test.describe(`phone 390x${height}`, () => {
    test.use({ viewport: { width: 390, height } });
    test("the words move to a strip under the monitor, on the screen and big enough to tap", async ({ page }) => {
      await standInOffice(page);
      await openMonitor(page);
      await expect(page.locator(".reel-words--strip")).toHaveCount(1, { timeout: MOVE_WAIT });
      await expect(page.locator(".reel-words--laptop")).toHaveCount(0);
      const strip = (await words(page).boundingBox())!;
      const shot = (await shotOnMonitor(page).boundingBox())!;
      expect(strip.y).toBeGreaterThan(shot.y + shot.height - 1); // under the monitor
      expect(strip.y + strip.height).toBeLessThanOrEqual(height);
      expect(strip.x).toBeGreaterThanOrEqual(0);
      expect(strip.x + strip.width).toBeLessThanOrEqual(390);
      expect(await printedPx(words(page), ".reel-headline")).toBeGreaterThanOrEqual(12);
      for (const name of [COPY.reel.prev, COPY.reel.next, COPY.reel.caseStudy]) {
        const box = (await reel(page).getByRole("button", { name }).boundingBox())!;
        expect(box.width, name).toBeGreaterThanOrEqual(40);
        expect(box.height, name).toBeGreaterThanOrEqual(40);
      }
    });
  });
}
```

  Check the first test's opening against the old file's (the notes, Back, focus return) and keep any assertion the old one had that this one dropped and that still applies (e.g. the old file's checks on the notes coming back up); say which you kept.

- [ ] **Step 2: Run it to see it fail.** `npx playwright test e2e/office-monitor.spec.ts --workers=1` (no other browser running) — expected FAIL (no `.reel-words`).

- [ ] **Step 3: `office/usePortrait.ts`:**

```ts
"use client";

import { useEffect, useState } from "react";

/** Whether the screen is taller than wide: the same test the focus cameras use for their portrait framing (`aspect < 1`). */
export function usePortrait(): boolean {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const check = () => setPortrait(window.innerWidth < window.innerHeight);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return portrait;
}
```

- [ ] **Step 4: `OfficeCanvas.tsx`.**
  - Imports: drop `LAPTOP_WIDTH_PX` from `./cards/LaptopScreen`; add `import { LAPTOP_WIDTH_PX, STRIP_GAP_PX, STRIP_HEIGHT_PX, STRIP_WIDTH_PX } from "./cards/ReelControls";`.
  - Props: `monitorScreen: { content: ReactNode } | null;` (no `titleId`) and replace `laptopScreen` (prop, destructuring, the `Pick<…>` union near line 251 and the destructure near 259) with `reelControls: { titleId: string; content: ReactNode; place: "laptop" | "strip" } | null;`, doc: "The reel's words and controls (spec 3.5): on the laptop, or on portrait screens on a strip under the monitor's screen."
  - Render:

```tsx
      {monitorScreen && screen && (
        <CardFace surface={screen} place="screen" widthPx={SCREEN_WIDTH_PX} hotspot="hs_monitor" titleId="reel-shot" focus={false}>
          {monitorScreen.content}
        </CardFace>
      )}
      {reelControls?.place === "laptop" && laptop && (
        <CardFace surface={laptop} place="screen" widthPx={LAPTOP_WIDTH_PX} hotspot="hs_monitor" titleId={reelControls.titleId}>
          {reelControls.content}
        </CardFace>
      )}
      {reelControls?.place === "strip" && screen && (
        <CardFace surface={screen} place="screen" widthPx={STRIP_WIDTH_PX} below={{ heightPx: STRIP_HEIGHT_PX, gapPx: STRIP_GAP_PX }} hotspot="hs_monitor" titleId={reelControls.titleId}>
          {reelControls.content}
        </CardFace>
      )}
```

- [ ] **Step 5: `OfficeExperience.tsx`.**
  - Imports: drop `LaptopScreen`; add `import ReelControls from "./cards/ReelControls";` and `import { usePortrait } from "./usePortrait";`.
  - After `const reel = useReel(…)`: `const portraitScreen = usePortrait();`.
  - Replace the comment above `reelCurrent` with: `// The reel's action plays the slide its words name: a crate record plays as picking it in the crate does, a page opens in a new tab.`
  - The props:

```tsx
            monitorScreen={focusedOn === "hs_monitor" ? { content: <ReelScreen view={reel.view} hold={reel.hold} /> } : null}
            reelControls={
              focusedOn === "hs_monitor"
                ? {
                    titleId: "reel-title",
                    place: portraitScreen ? "strip" : "laptop",
                    content: (
                      <ReelControls titleId="reel-title" view={reel.view} hold={reel.hold} onStep={reel.step} onShow={reel.show} onPlay={playReel} place={portraitScreen ? "strip" : "laptop"} />
                    ),
                  }
                : null
            }
```

  - `grep -n "laptop\|reel" office/OfficeExperience.tsx office/OfficeCanvas.tsx` and fix any remaining reference to the deleted props or components.

- [ ] **Step 6: Check.**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean; all pass.

Run (one at a time, no other browser): `npx playwright test e2e/office-monitor.spec.ts --workers=1`, then `npx playwright test e2e/office-interaction.spec.ts --workers=1`
Expected: all pass. If a strip button is under 40 px on screen, enlarge it in the `.reel-words--strip` rules (and `STRIP_HEIGHT_PX` with Task 2's camera if the strip must grow — report it, the camera is the lead's call).

- [ ] **Step 7: Look at it.** Playwright screenshots at 1440×900, 390×844 and 390×664 into the scratchpad as `mon-*.png`: the monitor open at rest, mid-slide, on the Marianne's Hair slide (no button), and on the Pac Technologies slide (Visit the site). Check:
  - the screenshot fills the screen with nothing cropped (compare with the image file);
  - the laptop's words are readable on desktop and the laptop is in shot;
  - on phones the strip sits under the monitor, inside the screen, and reads;
  - the sliding screenshot comes from the laptop's side.

- [ ] **Step 8: Commit**

```bash
git add office/usePortrait.ts office/OfficeCanvas.tsx office/OfficeExperience.tsx e2e/office-monitor.spec.ts
git commit -m "Show each screenshot edge to edge on the monitor, with its words and controls on the laptop, or under the monitor on a phone"
```

---

### Task 5: Kasper looks

- [ ] He opens the monitor at `localhost:3010` on desktop, and on his phone once pushed (ask before pushing).
- [ ] The laptop's words, the strip on the phone, the slide-in.
- [ ] Record his decisions in spec 3.5 and update the project memory.
