# Office Reel: Sharp, Full Screen, Controls on the Monitor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The monitor's screenshot is crisp and opens full screen; the carousel's ‹ › and dots sit over the screenshot; the laptop (or the phone strip) carries the slide's words, now with its description and a details line.

**Architecture:**
- **Monitor print** (`ReelScreen`) is laid out at 1280 px (was 640) so the browser shrinks it onto the screen. It now carries the reel's hidden heading (the focus target), ‹ › zones, the dots (buttons on landscape screens; a position read-out on portrait ones), and an expand button; clicking the screenshot opens the full-screen view.
- **Words print** (`ReelWords`, replacing `ReelControls`) has the label, headline, description, details and action, on the laptop or the portrait strip. No controls.
- **Full-screen view** (`ReelViewer`) is a dialog over the whole window, opened as a history layer (`reading` on `hs_monitor`, as Read more is on other objects), so Esc, × and Back close it. Its ‹ › switch slides at once (`reel.show`). The reel holds while it's open.
- **Content:** `WorkItem` gains `description` and `details`; reel shots are 1920×1080 where available, at least 1280 wide.

**Tech Stack:** Next 16.2.4, React 19.2.4, @react-three/fiber 9.8, drei 10.7 (`Html`), three 0.186, Vitest 5 (node env, `*.test.ts`), Playwright 1.63 (SwiftShader, `--workers=1`).

**Spec:** `docs/superpowers/specs/2026-10-02-office-interactions-design.md` §3.5 (amended 2026-10-06, b5233c6: items 3, 3a, 4, 7, 9).

## Global Constraints

- **Git:** branch `redesign/office`; never push without asking Kasper; stage explicit paths (never `git add -A`; `.agents/` and `public/screenshots/` stay untracked, never commit `public/screenshots/`); commit messages descriptive, ending `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; LF.
- **Code:** read `node_modules/next/dist/docs/` before Next-specific code; never touch `package.json`; no new deps.
- **Kasper's PC:** one headless browser at a time; Playwright `--workers=1`, one spec file at a time; the dev server on 3010 is shared, never start another.
- **Copy:** visitor-facing words in `office/copy.ts` (DRAFT, Kasper's voice); slide labels/alt in `content/screens.ts`; project words in `app/(main)/work/data.ts`.
- **Expandable:** adding a project stays content-only; nothing hard-codes the slide or project count.
- **Spec, binding values:**
  - "‹ and › as tall zones at its left and right edges (faint until hovered or focused on a mouse, always shown on touch) and a dot per slide along its bottom edge. On phones the dots only show where the reel is (too small to tap); ‹ › are sized for fingers."
  - Laptop: "its label (mono, like a title bar), its one-line headline, the project's short description, a line of details (years · role · stack) and its action." "Work not in the crate shows its own line and no description or details."
  - "The monitor's print is laid out at twice its old size … the screenshots are 1920 x 1080 (at least 1280 wide)."
  - Full screen: "over the whole browser window, on black, uncropped at its own size, with its label, ‹ ›, and × to close. Esc or × closes it and focus returns to the monitor; ← → step. The reel holds still while it's open. Under reduced motion it opens and steps without fades."
  - Phone strip: "the label, the headline, two lines of the description and the action … every button at least 40 x 40 CSS px on screen."
  - "the visually hidden heading that takes focus as the monitor opens is with the reel's controls on the monitor"; "the position is read as 'Slide n of N'"; "the full-screen view is a dialog named for the slide."

## Review Focus

1. **Monitor tap targets on a phone.** At the 1280 layout the monitor print's scale on a 390-wide phone is ~0.28, so ‹ › zones must be ≥ 143 CSS px wide and tall to be 40 px on screen. *Test: Task 4 phone e2e measures ‹ › on screen.*
2. **Clicking the screenshot vs the zones.** A click on ‹ or › must step, not open full screen; a click elsewhere on the shot opens it. *Test: Task 4 e2e.*
3. **Back/Esc order.** With the full-screen view open, Esc and Back close only the view (the monitor stays open); a second Esc leaves the monitor. *Test: Task 4 e2e.*
4. **Strip fit with the description.** The phone strip keeps fitting on every slide with a 2-line description. *Test: Task 4 phone e2e (existing every-slide fit loop).*
5. **The reel doesn't move under the full-screen view.** *Test: Task 3 unit (`tickReel` paused when held) via `useReel`'s `held` input, and Task 4 e2e (open, wait 7 s of reel clock, same slide).*

---

## File structure

| File | Responsibility |
|---|---|
| `content/work.ts` (+ `content/content.test.ts`), `content/screens.test.ts` | `description`, `details` on WorkItem; shot width ≥ 1280 |
| `office/cards/ReelWords.tsx` (new; replaces `ReelControls.tsx`), `office/cards/reel.test.ts`, `office/cards/reelOwn.test.ts` | The slide's words on the laptop or the strip |
| `office/cards/ReelScreen.tsx` | The monitor: screenshot, heading, ‹ › zones, dots / read-out, expand |
| `office/cards/ReelViewer.tsx` (new, + `office/cards/viewer.test.ts`), `office/monitor/useReel.ts` | The full-screen dialog; the reel holds while it's open |
| `app/(office)/office.css` | Styles for all three |
| `office/OfficeCanvas.tsx`, `office/OfficeExperience.tsx`, `e2e/office-monitor.spec.ts` | Wiring and end to end |

Tasks run **in sequence** (they share `office.css` and `reel.test.ts`): Task 1 → 2 → 3 (Sonnet each), Task 4 (Opus). The lead retakes the two public sites at 1920×1080 before Task 1.

---

### Task 1: The words print, with description and details

**Files:** Modify `content/work.ts`, `content/content.test.ts`, `content/screens.test.ts`, `office/cards/reel.test.ts`, `office/cards/reelOwn.test.ts`, `app/(office)/office.css`. Create `office/cards/ReelWords.tsx`. Delete `office/cards/ReelControls.tsx` (from disk; the lead stages it).

**Interfaces:**
- Produces: `WorkItem.description: string`, `WorkItem.details: string` (`"<years> · <role> · <stackSummary>"`, skipping empty parts). `ReelWords({ view, hold, onPlay, place }: { view: ReelView; hold: HoldProps; onPlay: () => void; place: "laptop" | "strip" })`; `headlineFor(slide)` (moved here); `LAPTOP_WIDTH_PX = 640`, `STRIP_WIDTH_PX = 640`, `STRIP_HEIGHT_PX = 324`, `STRIP_GAP_PX = 28`.

- [ ] **Step 1: Failing tests.**
  - `content/content.test.ts`: every work item has a non-empty `description`, and `details` equals its years, role and stack summary joined by ` · ` (read `app/(main)/work/data.ts`'s `Project` for `stackSummary`; if a project lacks one, `details` omits that part without a dangling separator).
  - `content/screens.test.ts`: every shot is at least 1280 px wide (reuse the file's image-size reader).
  - `office/cards/reel.test.ts`: replace the `ReelControls` describe with a `ReelWords` one:

```ts
describe("ReelWords", () => {
  const crate = slides.findIndex((s) => s.slug);
  const words = (i: number, place: "laptop" | "strip" = "laptop") =>
    renderToStaticMarkup(createElement(ReelWords, { view: { monitor: i, moving: null, words: i }, hold, onPlay: () => {}, place }));
  it("gives a crate slide its label, headline, description, details and See the case study, and no carousel controls", (ctx) => {
    if (crate < 0) return ctx.skip();
    const w = findWork(slides[crate].slug!)!;
    const out = words(crate);
    for (const text of [slides[crate].label, w.headline, w.description, w.details, COPY.reel.caseStudy]) expect(out).toContain(esc(text));
    expect(out).not.toContain(`aria-label="${esc(COPY.reel.prev)}"`);
    expect(out).not.toContain("reel-dot");
    expect(out).toContain(`data-slide="${crate}"`);
  });
  it("on the strip: the same words, description clamped by CSS", (ctx) => {
    if (crate < 0) return ctx.skip();
    expect(words(crate, "strip")).toContain("reel-words--strip");
  });
});
```

  - `office/cards/reelOwn.test.ts` (non-crate slides via `vi.mock`): a `line` slide shows its line and no `reel-description`/`reel-details`; Visit the site and no-button cases as now — switch it to `ReelWords`.
- [ ] **Step 2:** `npx vitest run content office/cards` — FAIL.
- [ ] **Step 3: `content/work.ts`:** add to `WorkItem`:

```ts
  /** The project's one-paragraph description (the reel's words on the laptop). */
  description: string;
  /** Years · role · stack, for the reel's details line. */
  details: string;
```

  and in `toItem`: `description: p.description,` and `details: [p.yearRange, p.role, p.stackSummary].filter(Boolean).join(" · "),` (if `stackSummary` isn't on `Project`, use the field that holds the short stack line; say which).
- [ ] **Step 4: `office/cards/ReelWords.tsx`:**

```tsx
"use client";

import { useEffect } from "react";
import { findWork } from "@/content/work";
import { slides, type Slide } from "@/content/screens";
import { COPY } from "@/office/copy";
import type { ReelView } from "@/office/monitor/reel";
import type { HoldProps } from "@/office/monitor/useReel";

/** CSS px the laptop's print is laid out at. */
export const LAPTOP_WIDTH_PX = 640;
/** The strip under the monitor on portrait screens, laid out at the old monitor scale so its words stay finger-sized. */
export const STRIP_WIDTH_PX = 640;
/** Content box 324 - 32 padding - 2 border = 290: label 22 + 2-line headline 70 + 2-line description 70 + action 84 + 3 gaps of 10 = 276. */
export const STRIP_HEIGHT_PX = 324;
/** Between the screen's bottom edge and the strip: the bezel's chin is 0.02 m (~21 px at 640 across the 0.604 m screen), so 28 clears it. */
export const STRIP_GAP_PX = 28;

/** The line a slide's words show: its crate project's headline, or its own line for work not in the crate. */
export function headlineFor(slide: Slide): string {
  return slide.slug ? findWork(slide.slug)!.headline : slide.line!;
}

/** The reel's words (spec 3.5): the slide's label, headline, description, details and action — on the laptop, or on a strip under the monitor on portrait screens. */
export default function ReelWords({ view, hold, onPlay, place }: { view: ReelView; hold: HoldProps; onPlay: () => void; place: "laptop" | "strip" }) {
  const i = view.words;
  const slide = slides[i];
  const work = slide.slug ? findWork(slide.slug) : undefined;
  // a print unmounted under the mouse (a resize to portrait swaps it) never gets its pointerleave: release the hold
  useEffect(() => () => hold.onPointerLeave(), [hold]);
  return (
    <div className={`reel-words reel-words--${place}`} data-slide={i} {...hold}>
      <p className="reel-label">
        <span>{slide.label}</span>
      </p>
      <p className="reel-headline">{headlineFor(slide)}</p>
      {work && <p className="reel-description">{work.description}</p>}
      {work && place === "laptop" && <p className="reel-details">{work.details}</p>}
      {(slide.slug || slide.href) && (
        <button type="button" className="office-card-cta" onClick={onPlay}>
          {slide.slug ? COPY.reel.caseStudy : COPY.reel.visit}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: CSS** (`app/(office)/office.css`): delete the `.reel-controls`, `.reel-dots`, `.reel-dot`, `.reel-step`, `.reel-count` rules inside the words sections (Task 2 adds the monitor's own), and add:

```css
.reel-description { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; margin: 0; overflow: hidden; line-height: 1.3; color: rgba(232, 232, 232, 0.7); }
.reel-details { margin: 0; font: 15px/1.3 var(--font-mono), ui-monospace, monospace; letter-spacing: 0.04em; color: rgba(232, 232, 232, 0.6); }
.reel-words .office-card-cta { margin-top: auto; }
.reel-words--laptop .reel-description { font-size: 24px; }
.reel-words--laptop .reel-details { font-size: 19px; }
.reel-words--strip .reel-description { -webkit-line-clamp: 2; font-size: 28px; line-height: 1.25; }
```

  Keep the laptop's sizes for label/headline/CTA; check by arithmetic that the laptop print (640 × ~432) fits label + 3-line headline + 4-line description + details + CTA with its padding, and shrink the description's clamp to 3 if not (say so).
- [ ] **Step 6:** `npx vitest run content office/cards` — PASS (OfficeCanvas/OfficeExperience tsc errors from the deleted `ReelControls` are Task 4's; report them).
- [ ] **Step 7: Hand over** (lead commits).

---

### Task 2: The monitor print: sharp, with the carousel on it

**Files:** Modify `office/cards/ReelScreen.tsx`, `office/cards/reel.test.ts`, `app/(office)/office.css`, `office/copy.ts`.

**Interfaces:**
- Consumes: `ReelView`, `HoldProps`, `slides`, `COPY.reel.{title, prev, next, show, position}`.
- Produces: `SCREEN_WIDTH_PX = 1280`; `ReelScreen({ titleId, view, hold, onStep, onShow, onOpen, dots }: { titleId: string; view: ReelView; hold: HoldProps; onStep: (dir: 1 | -1) => void; onShow: (i: number) => void; onOpen: () => void; dots: "buttons" | "marker" })`; `COPY.reel.expand` (DRAFT: "See it full screen").

- [ ] **Step 1: Failing tests** in `office/cards/reel.test.ts` (keep the `Shot`/preload tests, adapting the render call to the new props):

```ts
const monitorOf = (i: number, dots: "buttons" | "marker" = "buttons") =>
  renderToStaticMarkup(createElement(ReelScreen, { titleId: "r", view: { monitor: i, moving: null, words: i }, hold, onStep: () => {}, onShow: () => {}, onOpen: () => {}, dots }));

describe("ReelScreen's carousel", () => {
  it("carries the hidden heading, ‹ ›, a dot button per slide and the expand button", () => {
    const out = monitorOf(0);
    expect(out).toMatch(/<h2[^>]*id="r"[^>]*class="visually-hidden"/);
    expect(out).toContain(`aria-label="${esc(COPY.reel.prev)}"`);
    expect(out).toContain(`aria-label="${esc(COPY.reel.next)}"`);
    expect(out.match(/class="reel-dot"/g)).toHaveLength(slides.length);
    expect(out).toContain(`aria-label="${esc(COPY.reel.expand)}"`);
  });
  it("on portrait screens the dots only mark the position, read as Slide n of N", () => {
    const out = monitorOf(1, "marker");
    expect(out).not.toContain('class="reel-dot"');
    expect(out).toContain(esc(COPY.reel.position(2, slides.length)));
  });
});
```

- [ ] **Step 2:** `npx vitest run office/cards` — FAIL.
- [ ] **Step 3:** `office/copy.ts` `reel` gains `expand: "See it full screen",` (DRAFT). Keep `position`.
- [ ] **Step 4: `ReelScreen.tsx`** — keep `Shot` and `neighbours`; set `SCREEN_WIDTH_PX = 1280` with the comment "(its 16:9 screen face is 1280 x 720: laid out at twice the screen's on-screen size so the browser shrinks it, crisp, spec 3.5 3a)"; the component becomes:

```tsx
export default function ReelScreen({ titleId, view, hold, onStep, onShow, onOpen, dots }: {
  titleId: string; view: ReelView; hold: HoldProps; onStep: (dir: 1 | -1) => void; onShow: (i: number) => void; onOpen: () => void; dots: "buttons" | "marker";
}) {
  const i = view.words;
  return (
    <div className="office-reel" data-reel data-monitor={view.monitor} {...hold}>
      <h2 id={titleId} className="visually-hidden" tabIndex={-1}>{COPY.reel.title}</h2>
      {/* the screenshot opens full screen; the zones and buttons over it don't */}
      <div className="reel-open" onClick={onOpen}>
        <Shot slide={slides[view.monitor]} />
        {view.moving && <Shot slide={slides[view.moving.slide]} sliding />}
      </div>
      {neighbours(view.monitor).map((src) => (
        <img key={src} className="reel-preload" src={src} alt="" aria-hidden="true" draggable={false} />
      ))}
      <button type="button" className="reel-zone reel-zone--prev" aria-label={COPY.reel.prev} onClick={() => onStep(-1)}>‹</button>
      <button type="button" className="reel-zone reel-zone--next" aria-label={COPY.reel.next} onClick={() => onStep(1)}>›</button>
      <button type="button" className="reel-expand" aria-label={COPY.reel.expand} onClick={onOpen}>⤢</button>
      <div className="reel-dots">
        {dots === "buttons" ? (
          slides.map((s, k) => <button key={k} type="button" className="reel-dot" aria-label={COPY.reel.show(s.label)} aria-current={k === i} onClick={() => onShow(k)} />)
        ) : (
          <>
            {slides.map((_, k) => <span key={k} className="reel-pip" aria-hidden="true" data-current={k === i || undefined} />)}
            <span className="visually-hidden">{COPY.reel.position(i + 1, slides.length)}</span>
          </>
        )}
      </div>
    </div>
  );
}
```

  (Import `COPY`.) Update the file's doc comments.
- [ ] **Step 5: CSS** — monitor print at 1280 × 720; sizes are for that layout (on a 1440-wide desktop the print scale is ~0.6, on a 390-wide phone ~0.28):

```css
.reel-open { position: absolute; inset: 0; cursor: zoom-in; }
.reel-zone { position: absolute; top: 0; bottom: 96px; z-index: 2; width: 16%; padding: 0; border: 0; color: var(--office-fg); font: 140px/1 var(--font-ui), system-ui, sans-serif; cursor: pointer; opacity: 0; transition: opacity 0.2s; }
.reel-zone--prev { left: 0; background: linear-gradient(to right, rgba(11, 11, 11, 0.55), transparent); }
.reel-zone--next { right: 0; background: linear-gradient(to left, rgba(11, 11, 11, 0.55), transparent); }
.office-reel:hover .reel-zone, .reel-zone:focus-visible { opacity: 1; }
.reel-expand { position: absolute; top: 18px; right: 18px; z-index: 2; width: 72px; height: 72px; border: 1px solid rgba(232, 232, 232, 0.6); background: rgba(11, 11, 11, 0.6); color: var(--office-fg); font: 40px/1 var(--font-ui), system-ui, sans-serif; cursor: pointer; opacity: 0; transition: opacity 0.2s; }
.office-reel:hover .reel-expand, .reel-expand:focus-visible { opacity: 1; }
.reel-dots { position: absolute; left: 0; right: 0; bottom: 0; z-index: 2; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 22px; min-height: 96px; padding: 0 16%; box-sizing: border-box; background: linear-gradient(to top, rgba(11, 11, 11, 0.6), transparent); }
.reel-dot { width: 26px; height: 26px; padding: 0; border: 2px solid var(--office-fg); border-radius: 50%; background: none; cursor: pointer; }
.reel-dot[aria-current="true"] { background: var(--accent); border-color: var(--accent); }
.reel-pip { width: 30px; height: 30px; border: 3px solid var(--office-fg); border-radius: 50%; }
.reel-pip[data-current] { background: var(--accent); border-color: var(--accent); }
@media (hover: none) { .reel-zone, .reel-expand { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .reel-zone, .reel-expand { transition: none; } }
```

  Keep `.office-reel`, `.reel-shot`, `.reel-moving`, `.reel-preload`. On a 390-wide phone, the zones are 16% of 1280 = 205 CSS px wide → ~57 px on screen; check the height too.
- [ ] **Step 6:** `npx vitest run office/cards` — PASS. Hand over.

---

### Task 3: The full-screen view, and the reel holding for it

**Files:** Create `office/cards/ReelViewer.tsx`, `office/cards/viewer.test.ts`. Modify `office/monitor/useReel.ts`, `app/(office)/office.css`, `office/copy.ts`.

**Interfaces:**
- Produces: `ReelViewer({ index, titleId, onStep, onClose }: { index: number; titleId: string; onStep: (dir: 1 | -1) => void; onClose: () => void })`; `useReel(active, count, reduced, held = false)` — `held` pauses the reel like the pointer does; `COPY.close` is reused for ×.

- [ ] **Step 1: Failing test** `office/cards/viewer.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { slides } from "@/content/screens";
import { COPY } from "@/office/copy";
import ReelViewer from "./ReelViewer";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
const html = (i: number) => renderToStaticMarkup(createElement(ReelViewer, { index: i, titleId: "v", onStep: () => {}, onClose: () => {} }));

describe("ReelViewer", () => {
  it("is a modal dialog named for the slide, its screenshot uncropped, with ‹ › and close", () => {
    const out = html(1);
    expect(out).toMatch(/role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="v"|aria-labelledby="v"[^>]*role="dialog"/);
    expect(out).toContain(`id="v"`);
    expect(out).toContain(esc(slides[1].label));
    expect(out).toContain(`src="${slides[1].shot.src}"`);
    expect(out).toContain(`alt="${esc(slides[1].shot.alt)}"`);
    for (const name of [COPY.reel.prev, COPY.reel.next]) expect(out).toContain(`aria-label="${esc(name)}"`);
    expect(out).toContain(`>${esc(COPY.close)}<`);
  });
});
```

- [ ] **Step 2:** FAIL.
- [ ] **Step 3: `ReelViewer.tsx`** — modelled on `panels/Panel.tsx` (read it: focus capture/return, Tab trap, Esc stops propagation and calls `onClose`):

```tsx
"use client";

import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { slides } from "@/content/screens";
import { COPY } from "@/office/copy";

const FOCUSABLE = "button:not([disabled])";

/**
 * The reel's full-screen view (spec 3.5 3a): the screenshot over the whole window, on black, uncropped at its own size,
 * with its label, ‹ › and close. Esc and close call `onClose` (one history step back); ← → step; focus returns to the
 * monitor (whatever opened it).
 */
export default function ReelViewer({ index, titleId, onStep, onClose }: { index: number; titleId: string; onStep: (dir: 1 | -1) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!opener.current) opener.current = document.activeElement as HTMLElement | null;
  }, []);
  useEffect(() => {
    const back = opener.current;
    dialog.current?.focus({ preventScroll: true });
    return () => back?.focus?.({ preventScroll: true });
  }, []);
  const slide = slides[index];
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      onClose();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      onStep(e.key === "ArrowLeft" ? -1 : 1);
    } else if (e.key === "Tab" && dialog.current) {
      const items = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  return (
    <div ref={dialog} className="reel-viewer" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={onKeyDown}>
      <p id={titleId} className="reel-viewer-label">{slide.label}</p>
      <img className="reel-viewer-shot" src={slide.shot.src} alt={slide.shot.alt} draggable={false} />
      <button type="button" className="reel-viewer-step reel-viewer-step--prev" aria-label={COPY.reel.prev} onClick={() => onStep(-1)}>‹</button>
      <button type="button" className="reel-viewer-step reel-viewer-step--next" aria-label={COPY.reel.next} onClick={() => onStep(1)}>›</button>
      <button type="button" className="reel-viewer-close" onClick={onClose}>{COPY.close}</button>
    </div>
  );
}
```

- [ ] **Step 4: CSS:**

```css
/* The reel's full-screen view (spec 3.5 3a): over everything, on black, the screenshot uncropped. */
.reel-viewer { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; background: #000; outline: none; animation: reel-viewer-in 0.2s ease-out; }
.reel-viewer-shot { max-width: 100vw; max-height: calc(100vh - 96px); object-fit: contain; }
.reel-viewer-label { position: absolute; top: 18px; left: 20px; margin: 0; font: 14px/1 var(--font-mono), ui-monospace, monospace; letter-spacing: 0.06em; color: var(--office-fg); }
.reel-viewer-close { position: absolute; top: 10px; right: 12px; min-width: 44px; min-height: 44px; padding: 0 14px; background: none; border: 1px solid rgba(232, 232, 232, 0.6); color: var(--office-fg); font: 14px/1 var(--font-mono), ui-monospace, monospace; letter-spacing: 0.06em; cursor: pointer; }
.reel-viewer-step { position: absolute; top: 50%; translate: 0 -50%; width: 56px; height: 96px; background: rgba(11, 11, 11, 0.55); border: 0; color: var(--office-fg); font: 48px/1 var(--font-ui), system-ui, sans-serif; cursor: pointer; }
.reel-viewer-step--prev { left: 8px; }
.reel-viewer-step--next { right: 8px; }
@keyframes reel-viewer-in { from { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .reel-viewer { animation: none; } }
```

  Check `z-index: 60` sits above the office's own overlays (grep `z-index` in office.css; the Read more `.panel-scrim` is the reference) and say what you chose.
- [ ] **Step 5: `useReel(active, count, reduced, held = false)`** — the tick's `paused` becomes `pointer.current || focus.current || held`; `held` goes in the loop effect's deps. Doc comment: "`held`: the full-screen view is open (spec 3.5 3a)."
- [ ] **Step 6:** `npx vitest run office` — PASS (Task 4's tsc errors excepted). Hand over.

---

### Task 4: Wire it, e2e, look at it (Opus)

**Files:** Modify `office/OfficeCanvas.tsx`, `office/OfficeExperience.tsx`, `e2e/office-monitor.spec.ts`.

- [ ] **Step 1: e2e** — update `e2e/office-monitor.spec.ts` (keep its helpers and every still-valid assertion):
  - ‹ › and the dots are found inside the **monitor** print (`.office-reel`), not the words; the heading takes focus on open; the words print has no ‹ ›.
  - Laptop words show the description and details for a crate slide (`findWork(slug).description`, `.details`).
  - **Full screen:** click the screenshot (centre, away from the zones) → `getByRole("dialog", { name: slides[i].label })` visible, its `img` src is the slide's shot and its rendered box is within the viewport and ≥ 0.9 × the viewport's width or height (uncropped `contain`); `ArrowRight` → the dialog names the next slide; Esc → dialog gone, `data-director` still `focused:hs_monitor`, focus back on the monitor (the element that opened it); a second Esc leaves the monitor. Back (`page.goBack()`) also closes the dialog without leaving the monitor.
  - **Zones don't open full screen:** clicking ‹ steps (words' `data-slide` changes) and no dialog appears.
  - **Hold:** with the view open, `reelSeconds(page, 7)` → still the same slide after closing.
  - **Phones (390×844, 390×664, 768×1024):** ‹ › on the monitor are ≥ 40×40 on screen; the dots are a marker (no `.reel-dot` buttons); the strip shows the description, fits on every slide (existing loop), and its CTA is ≥ 40 px.
  - **Desktop sharpness proxy:** the monitor print's `offsetWidth` is 1280.
- [ ] **Step 2:** run it — FAIL.
- [ ] **Step 3: OfficeCanvas:** the monitor `CardFace` becomes the labelled, focused print (`titleId={monitorScreen.titleId}`, default `focus`); its prop is `monitorScreen: { titleId: string; content: ReactNode } | null`. Rename `reelControls` → `reelWords: { content: ReactNode; place: "laptop" | "strip" } | null`, rendered with `focus={false}` (a placeholder `titleId` with a comment, as the monitor had) on the laptop or, below the screen, the strip (`STRIP_WIDTH_PX`, `below` as now). Imports from `./cards/ReelWords`.
- [ ] **Step 4: OfficeExperience:**
  - `const viewing = scene.reading && scene.target?.hotspot === "hs_monitor";`
  - `useReel(focusedOn === "hs_monitor", slides.length, reduced, viewing)`.
  - `openViewer` = the existing `read` pattern: push a layer `{ focus: "hs_monitor", reading: true, topic: null }` when not already reading (reuse `read` if it already does exactly this for the focused target).
  - Monitor print: `<ReelScreen titleId="reel-title" view={reel.view} hold={reel.hold} onStep={reel.step} onShow={reel.show} onOpen={openViewer} dots={portraitScreen ? "marker" : "buttons"} />`.
  - Words print: `<ReelWords view={reel.view} hold={reel.hold} onPlay={playReel} place={reelPlace} />`.
  - `{viewing && <ReelViewer index={reel.view.words} titleId="reel-viewer-title" onStep={(d) => reel.show(wrap(reel.view.words + d, slides.length))} onClose={back} />}` placed with the other overlays (import `wrap` from `./monitor/reel`).
  - Make sure the window-level Esc handler (which calls `back()` while focused/reading) doesn't also fire when the viewer handled Esc (the viewer stops propagation, as Panel does) and that a reload with a `reading` layer on the monitor doesn't reopen the viewer if other local layers don't (check `office-interaction.spec.ts`'s "a reload doesn't reopen a local layer" and keep it true).
- [ ] **Step 5: Check:** `npx tsc --noEmit && npx vitest run`; then, one at a time: `npx playwright test e2e/office-monitor.spec.ts --workers=1`, `npx playwright test e2e/office-interaction.spec.ts --workers=1`.
- [ ] **Step 6: Look:** screenshots (scratchpad `reel2-*.png`) at 1440×900 (rest, hovering the shot so ‹ › and expand show, full-screen view), 390×844 and 768×1024 (monitor + strip, full-screen view). Check: the monitor's screenshot is visibly crisper than before (compare with `mon-desk-r1-*.png`), ‹ › and dots sit over the screenshot, the laptop reads with its description and details, the strip fits.
- [ ] **Step 7: Commit** `office/OfficeCanvas.tsx office/OfficeExperience.tsx e2e/office-monitor.spec.ts` — "Put the reel's carousel on the monitor, open its screenshot full screen, and fill the laptop with the project's description and details".

---

### Task 5: Kasper looks

- [ ] Desktop at `localhost:3010` and his phone once pushed (ask first). Record his decisions in spec 3.5; update the project memory.
