# Office Monitor Reel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The monitor stops being an age-check joke. Opening it peels the sticky notes off onto the desk and shows previews of the crate's projects as little windows. The laptop beside it shows the next one and drags it across every ~5 s. **See the case study** plays that project's record.

**Architecture:**
- **Pure parts:**
  - a pure reel state machine (`office/monitor/reel.ts`) decides which slide each screen shows and how far a dragged window has crossed;
  - a pure `NotesMotion` (`office/objects/notes.ts`, the same shape as `ShelfMotion`) moves each note between its place on the bezel and a landing spot on the desk.
- **Printing on the screens:** both prints use M3's `CardFace place="screen"`:
  - on the monitor, `ReelScreen` (it has the focus target and the controls);
  - on a new laptop screen surface, `LaptopScreen` (decorative and `aria-hidden`).
- **The driver:** `useReel` runs the reel on `requestAnimationFrame`. It re-renders only when a slide changes, and moves the dragged window through a CSS variable `--at` (1 = on the laptop, 0 = on the monitor).
- **Playing a record:** See the case study calls the same `activate({ hotspot: "hs_crate", item })` the crate uses, so the URL, Back layering and the record player are unchanged.

**Tech Stack:** Next 16.2.4, React 19.2.4, @react-three/fiber 9.8, drei 10.7 (`Html`), three 0.186, Vitest 5 (node environment, `*.test.ts` only), Playwright 1.63 (SwiftShader, run with `--workers=1`), Blender 5.2 via the Blender MCP.

**Spec:** `docs/superpowers/specs/2026-10-02-office-interactions-design.md`, section 3.5 (amended 2026-10-05), plus the amended lines in sections 4, 6, 7, 8 and 9 (milestone 4).

## Global Constraints

- Branch `redesign/office`. Never push without asking Kasper. Stage by explicit path; never `git add -A` (`.agents/` stays untracked). Commit messages are descriptive and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. LF line endings.
- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next code (AGENTS.md). Never touch `package.json`; no new dependencies.
- Only one agent drives the live Blender 5.2 session. Edit `office_props.py` as `office_props_next.py` and `cp` it over once verified.
- Visitor-facing words live in `office/copy.ts` (drafts for Kasper, in his voice: casual, direct, dry, first person, no marketing words).
- Spec 3.5, binding behaviour:
  - "As the move starts, the sticky notes peel off the bezel one after another (~0.1 s apart) … All are down within ~0.9 s, before the camera arrives (~1.1 s), so the whole screen is clear."
  - "the monitor shows one crate project at a time as a little window: a thin title bar with the project's name, its screenshot filling the window, and a strip along the bottom with its one-line headline and **See the case study**. Small ‹ › arrows and dots step through by hand. Projects follow the crate's order. A project with no screenshot yet … shows a card: its logo, name and headline."
  - "The laptop beside the monitor shows the next project. Every ~5 s (or on ‹ ›), a small pointer arrow grabs that slide's title bar and drags it left off the laptop's screen; it slides in over the monitor from the right … (~0.7 s, eased). The laptop then shows the one after. ‹ plays it backwards: the monitor's slide is dragged right, back onto the laptop, and the previous project shows on the monitor."
  - "the reel holds still while the pointer is over the screen or keyboard focus is in it."
  - "**See the case study** plays that project's record exactly as picking it in the crate does … the URL becomes `/work/<slug>`. Back returns to the monitor; Back again to the standing spot."
  - "Leaving … the notes lift off the desk and hop back to their places on the bezel, each reversing its own fall, finishing as the camera arrives … Leaving mid-fall, each note turns round from wherever it is."
  - "Phones: the monitor keeps most of the width … the laptop is mostly out of shot; the slide still arrives from the right-hand edge."
  - "Reduced motion: no fall, no drag, no auto-advance. The notes are on the desk while the monitor is open and back on the bezel otherwise; ‹ › switch both screens at once."
- The age check (AgeGate, its copy, styles and tests) is removed entirely.
- Phones are where Kasper demos: every visual change is checked at 390×844 and 390×664, plus 1440×900.
- The office GLB stays under 2 MB; `npm run check:models` passes.

## Review Focus

1. **Keyboard focus pausing the reel for everyone.** CardFace focuses the screen's title on arrival for every visitor, so "pause while focus is in it" would freeze the reel for mouse users too. Expected: only focus on a control (a button) pauses it; focus on the title does not. *Test: Task 5 (`holdFor` pauses on a button and not on the heading); Task 6 (e2e: it auto-advances after opening).*
2. **A long frame or a backgrounded tab.** A huge `dt` must never skip a drag or jump two slides; the drag always ends exactly on the next slide. *Test: Task 3 (`tickReel` with a 10 s `dt` finishes one drag and no more); Task 5 (`useReel` clamps `dt` to 0.1 s).*
3. **See the case study, then Back.** Expected: back on the monitor, on the same project, the notes still down; one more Back reaches the standing spot with the notes back on. *Test: Task 6 (e2e).*
4. **Leaving mid-fall.** Back pressed while the notes are still falling: each turns round from where it is, and none snaps. *Test: Task 4 ("turns round mid-fall").*
5. **Phone overflow.** The print stays inside the 640×352 screen face at 390×844 and 390×664, with text ≥ 12 px on screen. *Test: Task 6 (e2e phone).*

---

## File structure

| File | Responsibility |
|---|---|
| `content/screens.ts` (+ test) | Each crate project's screenshot (or logo for its card) |
| `office/copy.ts`, `app/(office)/office.css` | Reel copy (drafts) and styles; Task 6 removes the age check's |
| `scripts/blender/office_props.py`, `scripts/blender/greybox_office.py`, `art/office.blend`, `public/models/office.glb`, `office/manifest.json`, `office/nodes.test.ts` | Separate notes with landing spots, laptop screen surface, monitor camera |
| `office/monitor/reel.ts` (+ test) | Pure reel state: hold, drag, step, show, view |
| `office/objects/notes.ts` (+ test) | Pure notes fall and return |
| `office/monitor/useReel.ts` | rAF driver: ticks the reel, writes `--at`, pause bookkeeping |
| `office/cards/ReelWindow.tsx`, `office/cards/ReelScreen.tsx`, `office/cards/LaptopScreen.tsx` (+ `office/cards/reel.test.ts`) | What's printed on the monitor and the laptop |
| `office/cards/CardFace.tsx` | `focus` prop (the laptop's print takes no focus) |
| `office/OfficeCanvas.tsx`, `office/OfficeExperience.tsx` | Wiring; the age check removed |
| `e2e/office-monitor.spec.ts` (new), `e2e/office-shelf.spec.ts`, `e2e/office-interaction.spec.ts` | End to end |

## Execution waves and models

1. **Task 1** (Sonnet).
2. **In parallel:** Task 2 (Opus, the live Blender agent), Task 3 (Sonnet) and Task 4 (Sonnet). The lead commits each one.
3. **Task 5** (Sonnet), once Task 3 has landed, since it imports `office/monitor/reel.ts`.
4. **Task 6** (Opus: wiring and e2e), then Task 7 with Kasper.

---

### Task 1: Screenshots, copy and styles

**Files:**
- Create: `content/screens.ts`, `content/screens.test.ts`
- Modify: `office/copy.ts`, `app/(office)/office.css`

**Interfaces:**
- Produces:
  - `type Screen = { shot?: { src: string; alt: string }; logo?: string }`; `screenFor(slug: string): Screen`.
  - `COPY.reel = { title, caseStudy, prev, next, show(name) }`.
  - CSS classes: `.office-reel`, `.office-reel--laptop`, `.reel-stage`, `.reel-window`, `.reel-bar`, `.reel-name`, `.reel-pointer`, `.reel-body`, `.reel-card`, `.reel-moving`, `.reel-moving--monitor`, `.reel-moving--laptop`, `.reel-strip`, `.reel-headline`, `.reel-controls`, `.reel-dot`.
  - **Leave `COPY.monitor`, `AgeGate` and the `.office-gate-*` CSS in place.** Task 6 removes them.

- [ ] **Step 1: Write the failing test** (`content/screens.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { work } from "./work";
import { screenFor } from "./screens";

const inPublic = (src: string) => existsSync(join(process.cwd(), "public", src));

describe("screens", () => {
  it("gives every crate project a screenshot or a logo for its card", () => {
    for (const w of work) {
      const s = screenFor(w.slug);
      expect(s.shot || s.logo, w.slug).toBeTruthy();
    }
  });
  it("points only at files that exist, each screenshot described", () => {
    for (const w of work) {
      const s = screenFor(w.slug);
      if (s.shot) {
        expect(inPublic(s.shot.src), s.shot.src).toBe(true);
        expect(s.shot.alt.length).toBeGreaterThan(10);
      }
      if (s.logo) expect(inPublic(s.logo), s.logo).toBe(true);
    }
  });
  it("shows Manuva's and Silio's real screens, and Pac-Hub's logo until Kasper sends screenshots", () => {
    expect(screenFor("manuva").shot?.src).toBe("/v2/manuva-live.jpg");
    expect(screenFor("silio").shot?.src).toBe("/silio-dashboard.png");
    expect(screenFor("pac-forge").shot).toBeUndefined();
    expect(screenFor("pac-forge").logo).toBe("/PacTechnologiesEdit_White.png");
  });
  it("has nothing for an unknown slug", () => expect(screenFor("nope")).toEqual({}));
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run content/screens.test.ts`
Expected: FAIL, because `./screens` doesn't exist.

- [ ] **Step 3: Implement `content/screens.ts`**

```ts
/** What a crate project shows on the monitor (interactions spec 3.5): a screenshot, or its logo on a card until there is one. */
export type Screen = { shot?: { src: string; alt: string }; logo?: string };

/** Paths are under /public. Adding Pac-Hub's screenshots later is a `shot` here plus the file. */
const SCREENS: Record<string, Screen> = {
  "pac-forge": { logo: "/PacTechnologiesEdit_White.png" },
  manuva: { shot: { src: "/v2/manuva-live.jpg", alt: "Manuva's site: a manufacturing app's home page" } },
  silio: { shot: { src: "/silio-dashboard.png", alt: "Silio's dashboard: silo levels and batches at a glance" } },
};

export function screenFor(slug: string): Screen {
  return SCREENS[slug] ?? {};
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run content/screens.test.ts`
Expected: PASS.

- [ ] **Step 5: Copy.** Add to `COPY` in `office/copy.ts`, after `monitor` (leave `monitor` there):

```ts
  /** The monitor's reel of past work (spec 3.5). DRAFT. */
  reel: {
    title: "Some things I've built",
    caseStudy: "See the case study",
    prev: "Previous project",
    next: "Next project",
    show: (name: string) => `Show ${name}`,
  },
```

- [ ] **Step 6: Styles.** Append to `app/(office)/office.css`:

```css
/* The monitor's reel (spec 3.5): each project a little window, printed on the monitor; the next one on the laptop. A
   window being dragged across sits in .reel-moving, placed by --at (1 = on the laptop, 0 = on the monitor). */
.office-reel { position: relative; display: flex; flex-direction: column; height: 100%; overflow: hidden; font-size: 18px; }
.reel-stage { position: relative; flex: 1; min-height: 0; overflow: hidden; }
.reel-window { position: absolute; inset: 10px 12px 6px; display: flex; flex-direction: column; border: 1px solid rgba(232, 232, 232, 0.9); background: var(--office-bg); }
.reel-bar { display: flex; align-items: center; gap: 10px; height: 30px; padding: 0 10px; border-bottom: 1px solid rgba(232, 232, 232, 0.5); font: 14px/1 var(--font-mono), ui-monospace, monospace; letter-spacing: 0.06em; }
.reel-bar::before { content: ""; flex: none; width: 34px; height: 8px; background: radial-gradient(circle, rgba(232, 232, 232, 0.7) 3px, transparent 3.5px) 0 0 / 12px 8px repeat-x; }
.reel-name { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.reel-pointer { flex: none; width: 18px; height: 18px; margin-left: auto; fill: var(--office-fg); stroke: var(--office-bg); stroke-width: 1.5; }
.reel-body { position: relative; flex: 1; min-height: 0; }
.reel-body > img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top center; opacity: 0.85; }
.reel-card { height: 100%; display: grid; place-content: center; justify-items: center; gap: 6px; padding: 12px; text-align: center; }
.reel-card img { width: 46%; height: auto; }
.reel-card p { margin: 0; }
.reel-moving { position: absolute; inset: 0; }
.reel-moving--monitor { transform: translateX(calc(var(--at, 0) * 100%)); }
.reel-moving--laptop { transform: translateX(calc((var(--at, 1) - 1) * 100%)); }
.reel-strip { display: flex; align-items: center; gap: 14px; padding: 6px 12px 0; }
.reel-headline { flex: 1; min-width: 0; margin: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: rgba(232, 232, 232, 0.8); }
.office-reel .office-card-cta { position: static; flex: none; padding: 8px 14px; font-size: 15px; white-space: nowrap; }
.reel-controls { display: flex; justify-content: center; align-items: center; gap: 10px; padding: 6px 0 10px; }
.reel-controls button { padding: 2px 6px; background: none; border: 0; color: var(--office-fg); font: 20px/1 var(--font-ui), system-ui, sans-serif; cursor: pointer; }
.reel-controls .reel-dot { width: 9px; height: 9px; padding: 0; border: 1px solid var(--office-fg); border-radius: 50%; }
.reel-controls .reel-dot[aria-current="true"] { background: var(--accent); border-color: var(--accent); }
.office-reel--laptop .reel-window { inset: 8px; }
@media (max-width: 700px), (orientation: portrait) {
  .office-reel { font-size: 26px; }
  .reel-bar { height: 40px; font-size: 22px; }
  .office-reel .office-card-cta { padding: 10px 16px; font-size: 22px; }
  .reel-controls button { font-size: 30px; }
  .reel-controls .reel-dot { width: 14px; height: 14px; }
}
```

- [ ] **Step 7: Check and commit**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all pass; clean.

```bash
git add content/screens.ts content/screens.test.ts office/copy.ts "app/(office)/office.css"
git commit -m "Give each crate project a screen for the monitor, and draft the reel's words and styles"
```

---

### Task 2: Notes that come off, a laptop screen, the monitor camera (Blender)

Runs in the live Blender session, by one agent only. Edit `office_props.py` as `office_props_next.py` and `cp` it over once verified.

**Files:**
- Modify: `scripts/blender/office_props.py` (`build_monitor_notes`, `build_laptop`), `scripts/blender/greybox_office.py` (`FOCUS["monitor"]`, landing spots), `art/office.blend`, `public/models/office.glb`, `office/manifest.json`
- Test: `office/nodes.test.ts`

**Interfaces:**
- Produces:
  - `hs_monitor__notes__note_00`..`_03`: one mesh per note, each a child of `hs_monitor__notes`. The origin is on the note's top centre (where `_note` already puts it); the part's location and rotation are its place on the bezel, and its geometry is in its own frame.
  - `hs_monitor__notes__rest_00`..`_03`: empties, siblings of the notes (also children of `hs_monitor__notes`). Each empty's location and rotation are where its note lies on the desk, for that note's own frame.
  - `prop_laptop__screen`: a flat quad mesh in the lid's screen recess, 1.5 mm proud of it, child of `prop_laptop__lid`. Its geometry is in the lid's frame and faces the lid's front, so in glTF its local +z is out of the screen and +y is up the lid.
  - Retuned `cam_focus_monitor` (landscape). `cam_focus_monitor_portrait` keeps its framing.

- [ ] **Step 1: Write the failing node test** (inside the `describe` in `office/nodes.test.ts`):

```ts
  it("the monitor's notes come off one by one, each with a landing spot, and the laptop has a screen", () => {
    const notes = numbered(manifest.office.nodes, /^hs_monitor__notes__note_(\d\d)$/);
    expect(notes.length).toBeGreaterThanOrEqual(1);
    expect(notes).toEqual(notes.map((_, i) => i));
    notes.forEach((i) => expect(manifest.office.nodes).toContain(`hs_monitor__notes__rest_${String(i).padStart(2, "0")}`));
    expect(manifest.office.nodes).toContain("prop_laptop__screen");
  });
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run office/nodes.test.ts`
Expected: FAIL (no `hs_monitor__notes__note_*`).

- [ ] **Step 3: Separate notes.** In `build_monitor_notes`, give each note its own part instead of one shared bmesh. For note `i` with matrix `m` (as now), build it at the origin and put `m` on the object:

```python
    for i, (x, z, deg) in enumerate(spots[k] for k in order[:count]):
        m = pose @ Matrix.Translation((x, 0, z)) @ Matrix.Rotation(math.radians(deg), 4, "Y") @ grow
        bm = bmesh.new()
        _note(bm, I4, curl=18 + 9 * (i % 3))
        note = _part(f"{name}__note_{i:02d}", bm, root, col)
        note.matrix_basis = m  # its place on the bezel; the runtime moves it between here and its rest_ empty
        if i < len(texts) and texts[i]:
            _note_text(f"{name}__text_{i:02d}", texts[i], note, col, I4)
```

Remove the shared `_part(f"{name}__notes", …)`. The `grow` scale stays in `m`, so the note keeps its size. If `_note_text` can't take a parent and identity matrix like this, keep texts parented to `root` with `m` as before; the greybox passes no texts.

- [ ] **Step 4: Landing spots.** In `greybox_office.py`, after the desk, monitor, laptop, keyboard, mouse and desk mess are built, add an empty `hs_monitor__notes__rest_{i:02d}` (a child of `hs_monitor__notes`) for each note. Each spot must meet all of these:
  - it's on the desk top, in front of or beside the monitor, within 0.45 m of the monitor's base centre, and spread out (≥ 0.08 m between spots);
  - with the note placed at the empty's transform, the note lies flat on the desk top, face up, turned ±10–35° about the vertical, its lowest point 0.5–2 mm above the desk top;
  - the note doesn't touch any other mesh: test BVH overlap between the placed note and every other mesh under `office_root`, and require none;
  - nothing is above it: a ray straight up from each corner hits nothing within 0.3 m.

  Pick candidates on a 2 cm grid over the desk top, filter by those rules, and choose four spread out, keeping to the area the focus camera can't see if possible. Write the chosen spots into a `NOTE_RESTS` table in `greybox_office.py`, in the monitor's frame, with a comment saying how they were found. Leave each note at its bezel place afterwards.

- [ ] **Step 5: The laptop's screen.** In `build_laptop`, after the lid, add the screen quad as a child of the lid. It sits in the lid's recess (the `rect(sw, sh, …)` opening), 1.5 mm in front of the recess face, and is UV-mapped 0..1, like the monitor's. Name it `prop_laptop__screen`. Check in Blender that its normal points out of the screen (towards the person at the desk).

- [ ] **Step 6: Retune the monitor's landscape camera** (`FOCUS["monitor"]["land"]`, 16:10). Requirements:
  - the monitor's screen is fully in frame and at least 45% of the frame's width;
  - the laptop's whole screen is in frame, right of the monitor;
  - nothing hides either screen: ray-cast from the eye to each screen's four corners and require no earlier hit;
  - the eye is ≥ 0.3 m from any mesh.

  Keep the portrait camera as it is. Update the comment above `"monitor"` to say why it's framed this way.

- [ ] **Step 7: Export, build, check.** Run `greybox_office.py` and `export.py` as before. Add these to `office.nodes` in `office/manifest.json`: every `hs_monitor__notes__note_NN`, every `hs_monitor__notes__rest_NN` and `prop_laptop__screen`.

Run: `npm run build:models && npm run check:models && npx vitest run office/nodes.test.ts`
Expected: models OK; PASS.

Render a check from `cam_focus_monitor`, from `cam_focus_monitor_portrait`, and a close-up of the desk with every note at its rest transform. Save them to the scratchpad and list them in the report.

- [ ] **Step 8: Hand over** (the lead commits). Delete `office_props_next.py`. List the changed files, the spots chosen, the camera values and the clearances in the report.

---

### Task 3: The reel (pure)

**Files:**
- Create: `office/monitor/reel.ts`, `office/monitor/reel.test.ts`

**Interfaces:**
- Produces:
  - `REEL_HOLD_SECONDS = 5`, `DRAG_SECONDS = 0.7`.
  - `type ReelState = { index: number; wait: number; drag: { dir: 1 | -1; t: number } | null }`; `initialReel(): ReelState`.
  - `wrap(i, n)`.
  - `tickReel(s, dt, { count, paused, reduced }): ReelState`.
  - `stepReel(s, dir, { count, reduced }): ReelState`.
  - `showSlide(s, i, count): ReelState`.
  - `type ReelView = { monitor: number; laptop: number; moving: { slide: number; at: number } | null }`; `viewOf(s, count): ReelView`.

- [ ] **Step 1: Write the failing tests** (`office/monitor/reel.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { DRAG_SECONDS, initialReel, REEL_HOLD_SECONDS, showSlide, stepReel, tickReel, viewOf, wrap, type ReelState } from "./reel";

const go = { count: 3, paused: false, reduced: false };
const run = (s: ReelState, seconds: number, o = go) => {
  for (let t = 0; t < seconds - 1e-9; t += 1 / 60) s = tickReel(s, 1 / 60, o);
  return s;
};

describe("wrap", () => {
  it("wraps both ways", () => {
    expect(wrap(3, 3)).toBe(0);
    expect(wrap(-1, 3)).toBe(2);
  });
});

describe("tickReel", () => {
  it("holds a slide for REEL_HOLD_SECONDS, then drags the next one across", () => {
    let s = run(initialReel(), REEL_HOLD_SECONDS - 0.1);
    expect(s.drag).toBeNull();
    s = run(s, 0.2);
    expect(s.drag?.dir).toBe(1);
    s = run(s, DRAG_SECONDS + 0.05);
    expect(s).toMatchObject({ index: 1, drag: null });
  });
  it("never moves while paused, and starts the hold again after", () => {
    let s = run(initialReel(), REEL_HOLD_SECONDS - 1);
    s = run(s, 20, { ...go, paused: true });
    expect(s).toMatchObject({ index: 0, wait: 0, drag: null });
    s = run(s, REEL_HOLD_SECONDS - 0.1);
    expect(s.drag).toBeNull();
  });
  it("never auto-advances under reduced motion", () => expect(run(initialReel(), 30, { ...go, reduced: true }).index).toBe(0));
  it("a huge frame finishes the one drag in progress and no more", () => {
    let s = run(initialReel(), REEL_HOLD_SECONDS + 0.1);
    s = tickReel(s, 10, go);
    expect(s).toMatchObject({ index: 1, drag: null });
  });
  it("a long frame mid-hold starts a drag, it doesn't skip it", () => {
    const s = tickReel(initialReel(), 10, go);
    expect(s.drag).toEqual({ dir: 1, t: 0 });
    expect(s.index).toBe(0);
  });
  it("does nothing with fewer than two projects", () => expect(run(initialReel(), 20, { ...go, count: 1 })).toEqual(initialReel()));
});

describe("stepReel", () => {
  it("drags one slide either way by hand", () => {
    expect(stepReel(initialReel(), 1, go).drag).toEqual({ dir: 1, t: 0 });
    expect(stepReel(initialReel(), -1, go).drag).toEqual({ dir: -1, t: 0 });
  });
  it("switches at once under reduced motion", () =>
    expect(stepReel(initialReel(), -1, { ...go, reduced: true })).toEqual({ index: 2, wait: 0, drag: null }));
  it("ignores a step mid-drag", () => {
    const s = stepReel(initialReel(), 1, go);
    expect(stepReel(s, -1, go)).toBe(s);
  });
});

describe("showSlide", () => {
  it("jumps straight to a slide (a dot), no drag", () => expect(showSlide(stepReel(initialReel(), 1, go), 2, 3)).toEqual({ index: 2, wait: 0, drag: null }));
});

describe("viewOf", () => {
  it("at rest: the monitor shows the slide, the laptop the next", () =>
    expect(viewOf(initialReel(), 3)).toEqual({ monitor: 0, laptop: 1, moving: null }));
  it("dragging forward: the next slide crosses from the laptop (1) to the monitor (0), the one after waits under it", () => {
    const start = viewOf({ index: 0, wait: 0, drag: { dir: 1, t: 0 } }, 3);
    expect(start).toEqual({ monitor: 0, laptop: 2, moving: { slide: 1, at: 1 } });
    expect(viewOf({ index: 0, wait: 0, drag: { dir: 1, t: 1 } }, 3).moving?.at).toBe(0);
    const mid = viewOf({ index: 0, wait: 0, drag: { dir: 1, t: 0.5 } }, 3).moving!.at;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
  it("dragging back: the monitor's slide goes back onto the laptop, the previous one under it", () => {
    expect(viewOf({ index: 0, wait: 0, drag: { dir: -1, t: 0 } }, 3)).toEqual({ monitor: 2, laptop: 1, moving: { slide: 0, at: 0 } });
    expect(viewOf({ index: 0, wait: 0, drag: { dir: -1, t: 1 } }, 3).moving?.at).toBe(1);
  });
  it("lands where the next view starts, so nothing jumps when a drag ends", () => {
    const end = viewOf({ index: 0, wait: 0, drag: { dir: 1, t: 1 } }, 3);
    const after = viewOf({ index: 1, wait: 0, drag: null }, 3);
    expect(end.moving!.slide).toBe(after.monitor);
    expect(end.laptop).toBe(after.laptop);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run office/monitor`
Expected: FAIL (no module).

- [ ] **Step 3: Implement `office/monitor/reel.ts`**

```ts
import { easeInOutCubic } from "@/office/camera/pose";

/** How long a slide holds on the monitor before the next is dragged across from the laptop (spec 3.5). */
export const REEL_HOLD_SECONDS = 5;
/** How long a drag between the screens takes. */
export const DRAG_SECONDS = 0.7;

export type ReelState = { index: number; wait: number; drag: { dir: 1 | -1; t: number } | null };

export function initialReel(): ReelState {
  return { index: 0, wait: 0, drag: null };
}

export function wrap(i: number, n: number): number {
  return ((i % n) + n) % n;
}

/**
 * The reel `dt` seconds on. A drag in progress runs to its end (a long frame finishes it and starts nothing more);
 * otherwise the slide holds, and after REEL_HOLD_SECONDS the next is dragged across. Paused, the hold starts again;
 * under reduced motion nothing moves by itself.
 */
export function tickReel(s: ReelState, dt: number, o: { count: number; paused: boolean; reduced: boolean }): ReelState {
  if (o.count < 2) return s;
  if (s.drag) {
    const t = Math.min(1, s.drag.t + dt / DRAG_SECONDS);
    return t < 1 ? { ...s, drag: { ...s.drag, t } } : { index: wrap(s.index + s.drag.dir, o.count), wait: 0, drag: null };
  }
  if (o.paused || o.reduced) return s.wait === 0 ? s : { ...s, wait: 0 };
  const wait = s.wait + dt;
  return wait >= REEL_HOLD_SECONDS ? { ...s, wait: 0, drag: { dir: 1, t: 0 } } : { ...s, wait };
}

/** A step by hand (‹ or ›): drags one slide that way, or under reduced motion switches at once. Ignored mid-drag. */
export function stepReel(s: ReelState, dir: 1 | -1, o: { count: number; reduced: boolean }): ReelState {
  if (o.count < 2 || s.drag) return s;
  if (o.reduced) return { index: wrap(s.index + dir, o.count), wait: 0, drag: null };
  return { ...s, wait: 0, drag: { dir, t: 0 } };
}

/** Straight to slide `i` (a dot), no drag. */
export function showSlide(_s: ReelState, i: number, count: number): ReelState {
  return { index: wrap(i, count), wait: 0, drag: null };
}

export type ReelView = {
  /** The slide on the monitor, under anything being dragged. */
  monitor: number;
  /** The slide on the laptop, under anything being dragged. */
  laptop: number;
  /** The window crossing between the screens, and where it is: 1 on the laptop, 0 on the monitor. */
  moving: { slide: number; at: number } | null;
};

/** What each screen shows. Forward, the next slide crosses from the laptop; back, the monitor's slide returns to it. */
export function viewOf(s: ReelState, count: number): ReelView {
  const next = wrap(s.index + 1, count);
  if (!s.drag) return { monitor: s.index, laptop: next, moving: null };
  const e = easeInOutCubic(s.drag.t);
  if (s.drag.dir === 1) return { monitor: s.index, laptop: wrap(s.index + 2, count), moving: { slide: next, at: 1 - e } };
  return { monitor: wrap(s.index - 1, count), laptop: next, moving: { slide: s.index, at: e } };
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run office/monitor`
Expected: PASS.

- [ ] **Step 5: Hand over** (the lead commits): `office/monitor/reel.ts`, `office/monitor/reel.test.ts`.

---

### Task 4: The notes come off and go back on (pure)

**Files:**
- Create: `office/objects/notes.ts`, `office/objects/notes.test.ts`

**Interfaces:**
- Consumes: `approach` (`./motion`); `easeInOutCubic` (`@/office/camera/pose`).
- Produces:
  - `NOTE_FALL_SECONDS = 0.6`, `NOTE_STAGGER_SECONDS = 0.1`, `NOTE_FLUTTER_M = 0.03`.
  - `notesSeconds(count)`; `noteProgress(i, elapsed)`.
  - `fallPlacement(stuck, rest, t, out)`.
  - `type NotesNodes = { notes: Object3D[]; stuck: Placement[]; rest: Placement[] }`; `findNotesNodes(root: Object3D): NotesNodes`.
  - `class NotesMotion { get down(): boolean; update(nodes, { open, reduced }, dt): void }`.
  - `Placement` is `{ position: Vector3; quaternion: Quaternion }` (the same shape as shelf.ts's; import that type from `./shelf`).

- [ ] **Step 1: Write the failing tests** (`office/objects/notes.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { Group, Object3D, Quaternion, Vector3 } from "three";
import { fallPlacement, findNotesNodes, noteProgress, NotesMotion, notesSeconds, NOTE_FALL_SECONDS, NOTE_STAGGER_SECONDS } from "./notes";

/** hs_monitor__notes with `count` notes up on the bezel and their rest_ empties lower down on the desk. */
function rig(count = 4) {
  const root = new Group();
  root.name = "hs_monitor__notes";
  for (let i = 0; i < count; i++) {
    const n = new Group();
    n.name = `hs_monitor__notes__note_0${i}`;
    n.position.set(-0.2 + 0.13 * i, 0.4, 0);
    n.rotation.y = 0.1 * i;
    const r = new Object3D();
    r.name = `hs_monitor__notes__rest_0${i}`;
    r.position.set(-0.3 + 0.2 * i, 0.002, 0.25);
    r.rotation.set(-Math.PI / 2, 0, 0.3 * (i % 2 ? 1 : -1));
    root.add(n, r);
  }
  return { root, nodes: findNotesNodes(root) };
}
const place = () => ({ position: new Vector3(), quaternion: new Quaternion() });

describe("timing", () => {
  it("all four are down within ~0.9 s", () => expect(notesSeconds(4)).toBeCloseTo(NOTE_FALL_SECONDS + 3 * NOTE_STAGGER_SECONDS));
  it("one after another, NOTE_STAGGER_SECONDS apart", () => {
    expect(noteProgress(0, NOTE_STAGGER_SECONDS)).toBeGreaterThan(0);
    expect(noteProgress(1, NOTE_STAGGER_SECONDS)).toBe(0);
    expect(noteProgress(3, notesSeconds(4))).toBe(1);
  });
});

describe("fallPlacement", () => {
  const { nodes } = rig(1);
  it("starts on the bezel and ends exactly on its spot", () => {
    const a = fallPlacement(nodes.stuck[0], nodes.rest[0], 0, place());
    expect(a.position.distanceTo(nodes.stuck[0].position)).toBeLessThan(1e-9);
    const b = fallPlacement(nodes.stuck[0], nodes.rest[0], 1, place());
    expect(b.position.distanceTo(nodes.rest[0].position)).toBeLessThan(1e-9);
    expect(b.quaternion.angleTo(nodes.rest[0].quaternion)).toBeLessThan(1e-6);
  });
  it("falls: it drops slowly at first and fastest at the end", () => {
    const y = (t: number) => fallPlacement(nodes.stuck[0], nodes.rest[0], t, place()).position.y;
    expect(y(0) - y(0.25)).toBeLessThan(y(0.75) - y(1));
  });
  it("flutters sideways on the way down", () => {
    const mid = fallPlacement(nodes.stuck[0], nodes.rest[0], 0.25, place()).position;
    const straight = nodes.stuck[0].position.clone().lerp(nodes.rest[0].position, 0.25);
    expect(Math.abs(mid.x - straight.x)).toBeGreaterThan(0.005);
  });
});

describe("findNotesNodes", () => {
  it("finds the notes in order with their spots, and skips a note without one", () => {
    const { root, nodes } = rig(3);
    root.remove(root.getObjectByName("hs_monitor__notes__rest_02")!);
    const again = findNotesNodes(root);
    expect(nodes.notes.map((n) => n.name)).toEqual(["hs_monitor__notes__note_00", "hs_monitor__notes__note_01", "hs_monitor__notes__note_02"]);
    expect(again.notes).toHaveLength(2);
  });
});

describe("NotesMotion", () => {
  it("all down within notesSeconds of opening, then `down`", () => {
    const { nodes } = rig();
    const m = new NotesMotion();
    m.update(nodes, { open: true, reduced: false }, notesSeconds(4) - 0.05);
    expect(m.down).toBe(false);
    m.update(nodes, { open: true, reduced: false }, 0.1);
    expect(m.down).toBe(true);
    nodes.notes.forEach((n, i) => expect(n.position.distanceTo(nodes.rest[i].position)).toBeLessThan(1e-9));
  });
  it("back on the bezel the same way when it closes", () => {
    const { nodes } = rig();
    const m = new NotesMotion();
    m.update(nodes, { open: true, reduced: false }, 5);
    m.update(nodes, { open: false, reduced: false }, 5);
    expect(m.down).toBe(false);
    nodes.notes.forEach((n, i) => {
      expect(n.position.distanceTo(nodes.stuck[i].position)).toBeLessThan(1e-9);
      expect(n.quaternion.angleTo(nodes.stuck[i].quaternion)).toBeLessThan(1e-6);
    });
  });
  it("turns round mid-fall from wherever each note is", () => {
    const { nodes } = rig();
    const m = new NotesMotion();
    m.update(nodes, { open: true, reduced: false }, 0.4);
    const at = nodes.notes[0].position.clone();
    m.update(nodes, { open: false, reduced: false }, 0.05);
    expect(nodes.notes[0].position.distanceTo(at)).toBeLessThan(0.1); // no snap home
    expect(nodes.notes[0].position.distanceTo(nodes.stuck[0].position)).toBeGreaterThan(1e-4);
  });
  it("switches at once under reduced motion", () => {
    const { nodes } = rig();
    const m = new NotesMotion();
    m.update(nodes, { open: true, reduced: true }, 1 / 60);
    expect(m.down).toBe(true);
    m.update(nodes, { open: false, reduced: true }, 1 / 60);
    expect(nodes.notes[2].position.distanceTo(nodes.stuck[2].position)).toBeLessThan(1e-9);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run office/objects/notes.test.ts`
Expected: FAIL (no module).

- [ ] **Step 3: Implement `office/objects/notes.ts`**

```ts
import { Quaternion, Vector3, type Object3D } from "three";
import { easeInOutCubic } from "@/office/camera/pose";
import type { Placement } from "./shelf";

/** How long one note takes to fall off the monitor onto the desk, and how far apart they go (spec 3.5). */
export const NOTE_FALL_SECONDS = 0.6;
export const NOTE_STAGGER_SECONDS = 0.1;
/** How far a falling note drifts sideways at most, metres. */
export const NOTE_FLUTTER_M = 0.03;

const NOTE = /^hs_monitor__notes__note_(\d\d)$/;
const restName = (note: string) => note.replace("__note_", "__rest_");

/** How long the whole fall takes for `count` notes. */
export function notesSeconds(count: number): number {
  return NOTE_FALL_SECONDS + NOTE_STAGGER_SECONDS * Math.max(0, count - 1);
}

/** How far note `i` is through its fall, `elapsed` seconds into the notes' fall (0 on the bezel, 1 on the desk). */
export function noteProgress(i: number, elapsed: number): number {
  return Math.min(1, Math.max(0, (elapsed - i * NOTE_STAGGER_SECONDS) / NOTE_FALL_SECONDS));
}

const tilt = new Quaternion();
const Z = new Vector3(0, 0, 1);

/**
 * Where a note is `t` through its fall from `stuck` (on the bezel) to `rest` (on the desk), both in its parent's space:
 * it drifts across, drops slowly then faster, flutters sideways, and turns to lie down. Exactly `stuck` at 0 and
 * `rest` at 1.
 */
export function fallPlacement(stuck: Placement, rest: Placement, t: number, out: Placement): Placement {
  const across = easeInOutCubic(t);
  out.position.lerpVectors(stuck.position, rest.position, across);
  out.position.y = stuck.position.y + (rest.position.y - stuck.position.y) * t * t;
  out.position.x += NOTE_FLUTTER_M * Math.sin(2 * Math.PI * t) * (1 - t);
  out.quaternion.slerpQuaternions(stuck.quaternion, rest.quaternion, across);
  out.quaternion.multiply(tilt.setFromAxisAngle(Z, 0.35 * Math.sin(Math.PI * t)));
  return out;
}

export type NotesNodes = { notes: Object3D[]; stuck: Placement[]; rest: Placement[] };

/** The monitor's notes in order, where each sits on the bezel, and its rest_ spot on the desk (a note without one stays put). */
export function findNotesNodes(root: Object3D): NotesNodes {
  const found: { i: number; note: Object3D; rest: Object3D }[] = [];
  root.traverse((o) => {
    const m = NOTE.exec(o.name);
    const rest = m && o.parent?.getObjectByName(restName(o.name));
    if (m && rest) found.push({ i: Number(m[1]), note: o, rest });
  });
  found.sort((a, b) => a.i - b.i);
  return {
    notes: found.map((f) => f.note),
    stuck: found.map((f) => ({ position: f.note.position.clone(), quaternion: f.note.quaternion.clone() })),
    rest: found.map((f) => ({ position: f.rest.position.clone(), quaternion: f.rest.quaternion.clone() })),
  };
}

const at: Placement = { position: new Vector3(), quaternion: new Quaternion() };

/** Per-frame: the notes fall off while the monitor is open and go back on after, each reversing its own fall. Pure state. */
export class NotesMotion {
  private elapsed = 0;
  private total = 0;

  /** True once every note is on the desk. */
  get down(): boolean {
    return this.total > 0 && this.elapsed === this.total;
  }

  update(nodes: NotesNodes, input: { open: boolean; reduced: boolean }, dt: number): void {
    this.total = notesSeconds(nodes.notes.length);
    const goal = input.open ? this.total : 0;
    this.elapsed = input.reduced ? goal : input.open ? Math.min(goal, this.elapsed + dt) : Math.max(goal, this.elapsed - dt);
    nodes.notes.forEach((n, i) => {
      fallPlacement(nodes.stuck[i], nodes.rest[i], noteProgress(i, this.elapsed), at);
      n.position.copy(at.position);
      n.quaternion.copy(at.quaternion);
    });
  }
}
```

If the "turns round mid-fall" test fails on distance, check that `elapsed` decreases by `dt` (it reverses through the same curve) before changing anything.

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run office/objects`
Expected: PASS (the existing objects tests too).

- [ ] **Step 5: Hand over** (the lead commits): `office/objects/notes.ts`, `office/objects/notes.test.ts`.

---

### Task 5: What the monitor and the laptop show

**Files:**
- Create: `office/cards/ReelWindow.tsx`, `office/cards/ReelScreen.tsx`, `office/cards/LaptopScreen.tsx`, `office/cards/reel.test.ts`, `office/monitor/useReel.ts`
- Modify: `office/cards/CardFace.tsx`

**Interfaces:**
- Consumes: `screenFor` (Task 1); `COPY.reel` (Task 1); the reel module from Task 3 (`ReelView`, `ReelState`, `initialReel`, `tickReel`, `stepReel`, `showSlide`, `viewOf`); `work` (`@/content/work`).
- Produces:
  - `SCREEN_WIDTH_PX = 640` and `LAPTOP_WIDTH_PX = 640`, exported from `ReelScreen.tsx` and `LaptopScreen.tsx`.
  - `ReelScreen({ titleId, view, hold, onStep, onShow, onPlay })`, where `hold: HoldProps`, `onStep(dir: 1 | -1)`, `onShow(i: number)` and `onPlay(slug: string)`. The root has `data-reel` and `data-slide={view.monitor}`.
  - `LaptopScreen({ view })`: `aria-hidden`, root `data-reel`.
  - `useReel(active: boolean, count: number, reduced: boolean): { view: ReelView; step(dir: 1 | -1): void; show(i: number): void; hold: HoldProps }`.
  - `type HoldProps = { onPointerEnter; onPointerLeave; onFocus; onBlur }` (React handlers).
  - `holdFor(target: Element | null): boolean`: true for a focused button or link.
  - `CardFace` gains `focus?: boolean` (default `true`).

- [ ] **Step 1: Write the failing tests** (`office/cards/reel.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { work } from "@/content/work";
import { screenFor } from "@/content/screens";
import { COPY } from "@/office/copy";
import ReelScreen from "./ReelScreen";
import LaptopScreen from "./LaptopScreen";
import { holdFor } from "@/office/monitor/useReel";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
const hold = { onPointerEnter: () => {}, onPointerLeave: () => {}, onFocus: () => {}, onBlur: () => {} };
const screen = (view: { monitor: number; laptop: number; moving: { slide: number; at: number } | null }) =>
  renderToStaticMarkup(createElement(ReelScreen, { titleId: "r", view, hold, onStep: () => {}, onShow: () => {}, onPlay: () => {} }));

describe("ReelScreen", () => {
  const withShot = work.findIndex((w) => screenFor(w.slug).shot);
  const withLogo = work.findIndex((w) => !screenFor(w.slug).shot);

  it("shows the project on the monitor as a window: name, screenshot, headline, See the case study", () => {
    const out = screen({ monitor: withShot, laptop: 0, moving: null });
    const w = work[withShot];
    for (const text of [w.name, w.headline, COPY.reel.caseStudy, COPY.reel.title]) expect(out).toContain(esc(text));
    expect(out).toContain(`src="${screenFor(w.slug).shot!.src}"`);
    expect(out).toContain(`alt="${esc(screenFor(w.slug).shot!.alt)}"`);
    expect(out).toContain(`data-slide="${withShot}"`);
    expect(out).toMatch(/<h2[^>]*id="r"/);
  });
  it("a project without a screenshot gets a card with its logo", () => {
    const out = screen({ monitor: withLogo, laptop: 0, moving: null });
    expect(out).toContain('class="reel-card"');
    expect(out).toContain(`src="${screenFor(work[withLogo].slug).logo}"`);
  });
  it("has ‹ › and a dot per project", () => {
    const out = screen({ monitor: 0, laptop: 1, moving: null });
    expect(out).toContain(`aria-label="${esc(COPY.reel.prev)}"`);
    expect(out).toContain(`aria-label="${esc(COPY.reel.next)}"`);
    expect(out.match(/class="reel-dot"/g)).toHaveLength(work.length);
    expect(out).toContain('aria-current="true"');
  });
  it("draws a window being dragged in, with the pointer on its title bar, hidden from screen readers", () => {
    const out = screen({ monitor: 0, laptop: 2, moving: { slide: 1, at: 0.5 } });
    expect(out).toMatch(/class="reel-moving reel-moving--monitor"[^>]*aria-hidden="true"/);
    expect(out).toContain('class="reel-pointer"');
  });
});

describe("LaptopScreen", () => {
  it("shows the next project, all of it hidden from screen readers", () => {
    const out = renderToStaticMarkup(createElement(LaptopScreen, { view: { monitor: 0, laptop: 1, moving: null } }));
    expect(out).toContain(esc(work[1].name));
    expect(out).toMatch(/^<div[^>]*aria-hidden="true"/);
    expect(out).toContain("data-reel");
  });
});

describe("holdFor", () => {
  it("a focused control holds the reel, the title the screen focuses on arrival doesn't", () => {
    expect(holdFor({ matches: (s: string) => s.includes("button") } as unknown as Element)).toBe(true);
    expect(holdFor({ matches: () => false } as unknown as Element)).toBe(false);
    expect(holdFor(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run office/cards/reel.test.ts`
Expected: FAIL (no modules).

- [ ] **Step 3: `office/cards/ReelWindow.tsx`**

```tsx
"use client";

import type { WorkItem } from "@/content/work";
import { screenFor } from "@/content/screens";

/** A project as a little window (spec 3.5): its name on a title bar, its screenshot or its logo card. `dragged` adds the pointer. */
export default function ReelWindow({ item, dragged = false }: { item: WorkItem; dragged?: boolean }) {
  const { shot, logo } = screenFor(item.slug);
  return (
    <div className="reel-window">
      <div className="reel-bar">
        <span className="reel-name">{item.name}</span>
        {dragged && (
          <svg className="reel-pointer" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 1 L2 13 L5.5 9.8 L8 15 L10 14 L7.6 8.9 L12.5 8.9 Z" />
          </svg>
        )}
      </div>
      <div className="reel-body">
        {shot ? (
          <img src={shot.src} alt={shot.alt} draggable={false} />
        ) : (
          <div className="reel-card">
            {logo && <img src={logo} alt="" draggable={false} />}
            <p>{item.name}</p>
            <p>{item.headline}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `office/cards/ReelScreen.tsx`**

```tsx
"use client";

import { work } from "@/content/work";
import { COPY } from "@/office/copy";
import type { ReelView } from "@/office/monitor/reel";
import type { HoldProps } from "@/office/monitor/useReel";
import ReelWindow from "./ReelWindow";

/** CSS px the monitor's print is laid out at (its screen face is 640 x 352). */
export const SCREEN_WIDTH_PX = 640;

/** What's printed on the monitor (spec 3.5): the project's window, its headline, See the case study, ‹ › and dots. */
export default function ReelScreen({
  titleId,
  view,
  hold,
  onStep,
  onShow,
  onPlay,
}: {
  titleId: string;
  view: ReelView;
  hold: HoldProps;
  onStep: (dir: 1 | -1) => void;
  onShow: (i: number) => void;
  onPlay: (slug: string) => void;
}) {
  const item = work[view.monitor];
  return (
    <div className="office-reel" data-reel data-slide={view.monitor} {...hold}>
      <h2 id={titleId} className="visually-hidden" tabIndex={-1}>
        {COPY.reel.title}
      </h2>
      <div className="reel-stage">
        <ReelWindow item={item} />
        {view.moving && (
          <div className="reel-moving reel-moving--monitor" aria-hidden="true">
            <ReelWindow item={work[view.moving.slide]} dragged />
          </div>
        )}
      </div>
      <div className="reel-strip">
        <p className="reel-headline">{item.headline}</p>
        <button type="button" className="office-card-cta" onClick={() => onPlay(item.slug)}>
          {COPY.reel.caseStudy}
        </button>
      </div>
      <div className="reel-controls">
        <button type="button" aria-label={COPY.reel.prev} onClick={() => onStep(-1)}>
          ‹
        </button>
        {work.map((w, i) => (
          <button key={w.slug} type="button" className="reel-dot" aria-label={COPY.reel.show(w.name)} aria-current={i === view.monitor} onClick={() => onShow(i)} />
        ))}
        <button type="button" aria-label={COPY.reel.next} onClick={() => onStep(1)}>
          ›
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: `office/cards/LaptopScreen.tsx`**

```tsx
"use client";

import { work } from "@/content/work";
import type { ReelView } from "@/office/monitor/reel";
import ReelWindow from "./ReelWindow";

/** CSS px the laptop's print is laid out at. */
export const LAPTOP_WIDTH_PX = 640;

/** What's printed on the laptop (spec 3.5): the next project, and a window leaving for the monitor. Decorative: the monitor carries it all for screen readers. */
export default function LaptopScreen({ view }: { view: ReelView }) {
  return (
    <div className="office-reel office-reel--laptop" data-reel aria-hidden="true">
      <div className="reel-stage">
        <ReelWindow item={work[view.laptop]} />
        {view.moving && (
          <div className="reel-moving reel-moving--laptop">
            <ReelWindow item={work[view.moving.slide]} dragged />
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: `office/monitor/useReel.ts`**

```ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from "react";
import { initialReel, showSlide, stepReel, tickReel, viewOf, type ReelView } from "./reel";

export type HoldProps = {
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onFocus: (e: FocusEvent<HTMLElement>) => void;
  onBlur: (e: FocusEvent<HTMLElement>) => void;
};

/** Whether focus on `target` holds the reel: a control the visitor moved to, not the title the screen focuses on arrival. */
export function holdFor(target: Element | null): boolean {
  return !!target && target.matches("button, a");
}

const viewKey = (v: ReelView) => `${v.monitor}:${v.laptop}:${v.moving?.slide ?? ""}`;

/**
 * Runs the monitor's reel while `active` (spec 3.5). React re-renders only when a slide changes; a dragged window's
 * position goes to `--at` on every `[data-reel]` print each frame. Frames longer than 0.1 s count as 0.1 s, so a stall or
 * a background tab never skips a drag. The slide is kept between visits.
 */
export function useReel(active: boolean, count: number, reduced: boolean) {
  const state = useRef(initialReel());
  const pointer = useRef(false);
  const focus = useRef(false);
  const [view, setView] = useState<ReelView>(() => viewOf(state.current, count));
  const shown = useRef(viewKey(view));

  const publish = useCallback(() => {
    const v = viewOf(state.current, count);
    document.querySelectorAll<HTMLElement>("[data-reel]").forEach((el) => el.style.setProperty("--at", String(v.moving?.at ?? 0)));
    const key = viewKey(v);
    if (key !== shown.current) {
      shown.current = key;
      setView(v);
    }
  }, [count]);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      state.current = tickReel(state.current, dt, { count, paused: pointer.current || focus.current, reduced });
      publish();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      pointer.current = focus.current = false;
    };
  }, [active, count, reduced, publish]);

  const step = useCallback(
    (dir: 1 | -1) => {
      state.current = stepReel(state.current, dir, { count, reduced });
      publish();
    },
    [count, reduced, publish],
  );
  const show = useCallback(
    (i: number) => {
      state.current = showSlide(state.current, i, count);
      publish();
    },
    [count, publish],
  );
  const hold = useMemo<HoldProps>(
    () => ({
      onPointerEnter: () => (pointer.current = true),
      onPointerLeave: () => (pointer.current = false),
      onFocus: (e) => (focus.current = holdFor(e.target)),
      onBlur: (e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) focus.current = false;
      },
    }),
    [],
  );
  return { view, step, show, hold };
}
```

- [ ] **Step 7: `focus` in `CardFace`.** Add `focus = true` to the props (`focus?: boolean`, documented as "move focus to the title as it shows; the laptop's decorative print doesn't"). In the `useFrame` callback, keep marking `data-placed` and focus only when `focus` is true:

```tsx
    el.dataset.placed = "";
    if (focus) document.getElementById(titleId)?.focus({ preventScroll: true });
```

- [ ] **Step 8: Run the tests to see them pass**

Run: `npx vitest run office/cards`
Expected: PASS, including the existing face and AgeGate tests (AgeGate is still there until Task 6).

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 9: Hand over** (the lead commits): the five new files and `office/cards/CardFace.tsx`.

---

### Task 6: Wire it, remove the age check, e2e (lead, Opus)

**Files:**
- Modify: `office/OfficeCanvas.tsx`, `office/OfficeExperience.tsx`, `office/copy.ts`, `app/(office)/office.css`, `e2e/office-shelf.spec.ts`, `e2e/office-interaction.spec.ts`
- Create: `e2e/office-monitor.spec.ts`
- Delete: `office/cards/AgeGate.tsx`, `office/cards/AgeGate.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `OfficeCanvasProps.laptopScreen: { content: ReactNode } | null`.
  - `.office` carries `data-notes` ("up" | "down", written by the canvas).

- [ ] **Step 1: Write the failing e2e** (`e2e/office-monitor.spec.ts`; copy `standInOffice`, `office`, `MOVE_WAIT` and `printedPx` from `e2e/office-shelf.spec.ts`, as the other specs do):

```ts
import { test, expect, type Locator, type Page } from "@playwright/test";
import { work } from "../content/work";
import { COPY } from "../office/copy";

// standInOffice, office, MOVE_WAIT and printedPx as in office-shelf.spec.ts

const reel = (page: Page) => page.getByRole("region", { name: COPY.reel.title });
const laptop = (page: Page) => page.locator(".office-reel--laptop");

async function openMonitor(page: Page) {
  const button = page.getByRole("button", { name: COPY.labels.hs_monitor });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_monitor", { timeout: MOVE_WAIT });
  return button;
}

test("the notes come off, the reel steps on by hand, and See the case study plays the record and comes back", async ({ page }) => {
  await standInOffice(page);
  const button = await openMonitor(page);
  await expect(office(page)).toHaveAttribute("data-notes", "down", { timeout: MOVE_WAIT });
  await expect(reel(page).getByRole("heading", { name: COPY.reel.title })).toBeFocused();
  await expect(page.locator(".office-reel[data-slide]")).toHaveAttribute("data-slide", "0");
  await expect(laptop(page)).toContainText(work[1].name); // the next one waits on the laptop

  await reel(page).getByRole("button", { name: COPY.reel.next }).click();
  await expect(page.locator(".office-reel[data-slide]")).toHaveAttribute("data-slide", "1", { timeout: MOVE_WAIT });
  expect(new URL(page.url()).pathname).toBe("/"); // the reel is local

  await reel(page).getByRole("button", { name: COPY.reel.caseStudy }).click();
  await expect(page).toHaveURL(new RegExp(`/work/${work[1].slug}$`));
  await expect(office(page)).toHaveAttribute("data-playing", work[1].slug);
  await expect(office(page)).toHaveAttribute("data-notes", "up", { timeout: MOVE_WAIT });

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_monitor", { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-notes", "down", { timeout: MOVE_WAIT });
  await expect(page.locator(".office-reel[data-slide]")).toHaveAttribute("data-slide", "1"); // the same project

  await page.keyboard.press("Escape");
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-notes", "up", { timeout: MOVE_WAIT });
  await expect(button).toBeFocused();
});

test("it moves on by itself, and holds while the pointer is on the screen", async ({ page }) => {
  await standInOffice(page);
  await openMonitor(page);
  await page.mouse.move(2, 2);
  await expect(page.locator(".office-reel[data-slide]")).toHaveAttribute("data-slide", "1", { timeout: MOVE_WAIT });
  const box = (await reel(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
  await page.waitForTimeout(7_000);
  await expect(page.locator(".office-reel[data-slide]")).toHaveAttribute("data-slide", "1");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("no fall, no drag, no auto-advance: the arrows switch it at once", async ({ page }) => {
    await standInOffice(page);
    await openMonitor(page);
    await expect(office(page)).toHaveAttribute("data-notes", "down", { timeout: 5_000 });
    await page.mouse.move(2, 2);
    await page.waitForTimeout(6_500);
    await expect(page.locator(".office-reel[data-slide]")).toHaveAttribute("data-slide", "0");
    await reel(page).getByRole("button", { name: COPY.reel.next }).click();
    await expect(page.locator(".office-reel[data-slide]")).toHaveAttribute("data-slide", "1", { timeout: 2_000 });
  });
});

for (const height of [844, 664]) {
  test.describe(`phone 390x${height}`, () => {
    test.use({ viewport: { width: 390, height } });
    test("the reel fits the screen and reads on the phone", async ({ page }) => {
      await standInOffice(page);
      await openMonitor(page);
      const section = page.locator(".office-screen").filter({ has: page.locator(".office-reel[data-slide]") });
      await expect(section).toBeVisible({ timeout: MOVE_WAIT });
      expect(await section.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
      expect(await printedPx(section, ".reel-headline")).toBeGreaterThanOrEqual(12);
    });
  });
}
```

Also:
- In `e2e/office-shelf.spec.ts`, delete the two monitor tests: "the monitor asks your age…" and the phone "age check" test.
- In `e2e/office-interaction.spec.ts`, change the monitor's `into` locator to `page.getByRole("heading", { name: COPY.reel.title })`.

- [ ] **Step 2: Run it to see it fail**

Run: `npx playwright test e2e/office-monitor.spec.ts --workers=1`
Expected: FAIL (no reel yet).

- [ ] **Step 3: The canvas** (`office/OfficeCanvas.tsx`):
1. Import `findNotesNodes, NotesMotion` (`./objects/notes`), `SCREEN_WIDTH_PX` from `./cards/ReelScreen` (replacing the AgeGate import) and `LAPTOP_WIDTH_PX` from `./cards/LaptopScreen`.
2. Add the prop `laptopScreen: { content: ReactNode } | null` (doc: "What's printed on the laptop beside the monitor while the monitor is open, or null"), and add it to `OfficeProps`'s `Pick` and to `Office`'s parameters.
3. In `Office`:

```ts
  const notesRoot = useMemo(() => office.scene.getObjectByName("hs_monitor__notes") ?? null, [office]);
  const notesNodes = useMemo(() => (notesRoot ? findNotesNodes(notesRoot) : { notes: [], stuck: [], rest: [] }), [notesRoot]);
  const notesMotion = useMemo(() => new NotesMotion(), []);
  const notesWereDown = useRef(false);
  const laptop = useMemo(() => (office.scene.getObjectByName("prop_laptop__screen") as Mesh | undefined) ?? null, [office]);
```

4. In the frame loop, after the shelf block:

```ts
    // The notes come off the monitor as its camera move starts and go back on as the camera leaves (spec 3.5).
    notesMotion.update(notesNodes, { open: focused?.hotspot === "hs_monitor", reduced }, dt);
    if (notesMotion.down !== notesWereDown.current) {
      notesWereDown.current = notesMotion.down;
      if (host.current) host.current.dataset.notes = notesMotion.down ? "down" : "up";
    }
```

5. In the JSX, after the monitor's `CardFace`:

```tsx
      {laptopScreen && laptop && (
        <CardFace surface={laptop} place="screen" widthPx={LAPTOP_WIDTH_PX} hotspot="hs_monitor" titleId="laptop-print" focus={false}>
          {laptopScreen.content}
        </CardFace>
      )}
```

- [ ] **Step 4: The page** (`office/OfficeExperience.tsx`):
1. Replace the `AgeGate` import with `ReelScreen`, `LaptopScreen` and `useReel` (`./monitor/useReel`).
2. After `focusedOn`:

```ts
  // The monitor's reel of past work (spec 3.5): runs while the monitor is open, and keeps its place between visits.
  const reel = useReel(focusedOn === "hs_monitor", work.length, reducedMotion());
  const play = useCallback((slug: string) => activate({ hotspot: "hs_crate", item: slug }), [activate]);
```

3. Pass to `<OfficeCanvas>`:

```tsx
            monitorScreen={
              focusedOn === "hs_monitor"
                ? { titleId: "reel-title", content: <ReelScreen titleId="reel-title" view={reel.view} hold={reel.hold} onStep={reel.step} onShow={reel.show} onPlay={play} /> }
                : null
            }
            laptopScreen={focusedOn === "hs_monitor" ? { content: <LaptopScreen view={reel.view} /> } : null}
```

4. Add `data-notes="up"` to the root `.office` element.

`reducedMotion()` reads `matchMedia` on every render. That's fine here, since `useReel` only reads it inside its effect deps. If a lint or test complains, memoise it with `useMemo(reducedMotion, [])` as the canvas does.

- [ ] **Step 5: Remove the age check.**
  - Delete `office/cards/AgeGate.tsx` and `office/cards/AgeGate.test.ts`.
  - Delete `COPY.monitor` from `office/copy.ts`.
  - In `app/(office)/office.css`, delete the `.office-screen` age-check rules: the `.office-screen` padding and title rules, `.office-gate-buttons`, the `.office-screen .office-gate-buttons` and `.office-screen .office-card-cta[aria-pressed…]` rules, and the portrait block written for the age check, including its comment.
  - Replace them with `.office-screen { padding: 0; }`, commented as "The monitor's and the laptop's prints fill their screens edge to edge; .office-reel lays them out."

  Then grep for `AgeGate`, `COPY.monitor`, `office-gate` and `gate-title`: there must be no matches outside `docs/`.

- [ ] **Step 6: Check**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean; all pass.

Run: `npx playwright test e2e/office-monitor.spec.ts e2e/office-shelf.spec.ts e2e/office-interaction.spec.ts --workers=1`
Expected: all pass.

- [ ] **Step 7: Look at it.** Take Playwright screenshots at 1440×900, 390×844 and 390×664, into the scratchpad as `reel-*.png`:
  - the notes mid-fall;
  - the notes down with the reel showing (desktop: the laptop in shot beside the monitor, showing the next project);
  - a drag halfway (the window split across the two screens on desktop, with the pointer on its title bar);
  - Pac-Hub's logo card;
  - after See the case study, then Back.

Check:
- the notes land on clear desk, flat, and nothing pokes through them;
- the window reads as one window crossing the gap;
- the reel fits the screen on phones;
- the desktop camera shows the laptop's whole screen.

Fix framing by the CSS sizes; the camera and the landing spots belong to the Blender agent, so ask the lead.

- [ ] **Step 8: Commit**

```bash
git add office/OfficeCanvas.tsx office/OfficeExperience.tsx office/copy.ts "app/(office)/office.css" e2e/office-monitor.spec.ts e2e/office-shelf.spec.ts e2e/office-interaction.spec.ts
git rm office/cards/AgeGate.tsx office/cards/AgeGate.test.ts
git commit -m "Show past work on the monitor: the notes fall off, the laptop drags the next one across, and the age check goes"
```

- [ ] **Step 9: Full suite.** Run `npx playwright test --workers=1` and record the result in the report.

---

### Task 7: Kasper clicks through

- [ ] Push only with his OK, then give him a fresh preview share link (Vercel MCP `get_access_to_vercel_url` on the branch's latest deployment).
- [ ] He tries the monitor on his phone and desktop: the notes, the reel, the drag, See the case study and Back.
- [ ] Copy approval: `COPY.reel` and the screenshot alt text in `content/screens.ts`.
- [ ] When he sends Pac-Hub screenshots, add them to `public/` and as `shot` in `content/screens.ts`.
- [ ] Record his review decisions in spec section 3.5, and update the project memory.
