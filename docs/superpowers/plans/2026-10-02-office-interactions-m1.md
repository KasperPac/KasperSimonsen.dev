# Office interactions, milestone 1 (framework + drawer): implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The office becomes navigable. Hovering or tabbing to any of the four objects lights it, labels it and plays its tease. Clicking moves the camera to it. The drawer works end to end: it slides open, a business card appears beside it, "Write to me" opens the contact form panel, and Back or Esc peel the layers off one at a time.

**Architecture:**
- **Source of truth:** the browser location (path plus an `office` key in `history.state`). Every layer (an object in focus, the panel open) is its own history entry, pushed with `window.history.pushState`, which Next keeps in sync.
- **The director:** the pure director reducer turns the location into camera states, and the camera rig drives the camera.
- **Objects:** a small `ObjectMotion` helper eases the drawer, the teases and the monitor flicker every frame.
- **Overlays:** the card and the panel are ordinary DOM over the canvas. The card is pinned beside its object by projecting the object's position each frame, and docked to the bottom of the screen on phones.

**Tech Stack:** Next 16.2.4 (App Router, native `history.pushState` integration), React 19.2.4 (`useSyncExternalStore`), @react-three/fiber 9.8 (pointer events on `<primitive>`), three 0.186, Vitest 5, Playwright 1.63, Blender 5.2 via the Blender MCP.

**Spec:** `docs/superpowers/specs/2026-10-02-office-interactions-design.md` (milestone 1 = section 9.1), on top of `docs/superpowers/specs/2026-10-01-office-redesign-design.md`.

**Builds on (committed):**
- `content/work.ts`, `content/services.ts`, `content/contact.ts`
- `office/hotspots/registry.ts`, `office/scene/targets.ts`
- `office/director/director.ts`
- `office/camera/{pose,basePose,rig}.ts`
- `office/style/cleanEdges.ts` (with `setHighlight`)

These are the first five tasks of the superseded `2026-10-02-office-phase-3-interactions.md`; their code and interfaces are as written there.

## Global Constraints

- **Git and files:**
  - Branch `redesign/office`. Never push without asking Kasper.
  - Stage files by explicit path, never `git add -A` (`.agents/` stays untracked).
  - Commit messages are descriptive and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - LF line endings (enforced by `.gitattributes`).
- **Next 16:** read the relevant guide in `node_modules/next/dist/docs/` before writing Next code (AGENTS.md). Native history is covered in `01-app/01-getting-started/04-linking-and-navigating.md` § Native History API.
- **`history.pushState` rule:** pass **only** `{ office: Layer }` as the state object. Next's patched `pushState` copies its own keys (`__NA`, the router tree) in. If the object you pass already contains `__NA`, Next skips its URL sync (`node_modules/next/dist/client/components/app-router.js`, the `pushState` patch), and `usePathname` and the router go stale. Never spread `window.history.state`.
- **URLs** (interactions spec §3):
  - `/` is the standing spot (or the walk-in);
  - `/contact` is the drawer open with the business card;
  - the panel never changes the URL;
  - browsing the crate or the shelf, and the monitor, are local layers on `/`.
  - Back and Esc step out one layer at a time.
- **Section colours:** `theme.accents[hotspot]`. The drawer's is cyan `#2EF2FF`. One colour shows at a time. Touch markers and non-section UI are white (`theme.line`).
- **Type:** Inter Tight is `--font-ui`, IBM Plex Mono is `--font-mono`. Cards are black with a 1 px white hairline, and the section colour goes on the eyebrow and the button only.
- **Motion** (interactions spec §4): the drawer takes ~0.5 s and opens ~0.30 m; teases take ≤ 0.3 s; the camera uses `FOCUS_SECONDS`. Under reduced motion there's no tease, no camera move and no slide: things switch state, and cards and the panel fade.
- **Accessibility:**
  - every object has a real, keyboard-reachable control (a link with an `href` for routed objects, a button for local ones);
  - tabbing to it shows its label and tease, and Enter opens it;
  - card links are ordinary tab stops;
  - the panel is a dialog: it traps focus, Esc closes it, and focus returns to the control that opened it.
- **Copy:** every visitor-facing word lives in `office/copy.ts` as a draft. Kasper approves it before launch.
- **Runtime node names** are exported constants and required by `office/manifest.json`; `office/nodes.test.ts` keeps them tied.
- **Dependencies:** none new.
- **Ruling (cards):** cards are DOM overlays pinned beside their object by projecting its position each frame, not drei `Html` with `transform`. A camera-facing card looks the same either way. This keeps React context, real links and focus handling, and makes phone docking pure CSS. The spec's technique line is amended to match.

## Review Focus

1. **History stacking under fast input.** A visitor double-clicks the drawer, or clicks "Write to me" twice. That must not stack duplicate history entries, which would make Back need extra presses. *Tests: Task 7 (e2e: double activation, one Back to close).*
2. **A reload while a local layer is on top.** The browser keeps `history.state` across a reload, so a reload at `/` with `{office: {focus: "hs_monitor"}}` must not open the monitor on a fresh page. *Tests: Task 1 (unit), Task 7 (e2e: reload after a local focus).*
3. **Esc with focus outside the panel or card,** for example on the canvas after a mouse click. Esc still backs out exactly one layer, never two (the panel's handler and the window's handler both firing). *Tests: Task 7 (e2e).*
4. **Narrow and short screens.** At 390×844 the card docks to the bottom and stays fully on screen. At 1024×640 the pinned card never runs off the right or bottom edge. *Tests: Task 5 (`placeCard` unit), Task 7 (e2e at 390×844).*
5. **The drawer moving the wrong way.** Blender's local −Y becomes glTF local +Z for the drawer's direction of travel. A wrong axis slides it sideways or into the pedestal. *Tests: Task 3 (unit on the axis constant), Task 4 (Blender check that +Z is out of the pedestal), Task 8 (visual review).*

---

## File structure

| Path | Responsibility |
|---|---|
| `content/contact.ts` | Gains `CONTACT_NAME` and `CONTACT_LINKS` |
| `office/scene/location.ts` | `Layer`, `layerOf(history.state)`, `sceneFor(pathname, layer)`: pure |
| `office/history.ts` | `pushLayer`, `clearLayer`, `useOfficeLocation` (the history bridge) |
| `office/objects/motion.ts` | Node names, drawer travel, teases, flicker; `ObjectMotion` |
| `office/overlay/place.ts` | `placeCard`: pinned card position, clamped to the screen |
| `office/copy.ts` | Visitor-facing words (drafts) |
| `office/cards/Card.tsx`, `office/cards/BusinessCard.tsx` | Card shell; the business card |
| `panels/Panel.tsx`, `panels/ContactForm.tsx` | Dialog shell; the contact form |
| `office/OfficeCanvas.tsx` | Camera rig, hover/click, highlight, motion, overlay positions |
| `office/OfficeExperience.tsx` | Location → director, activation, nav, overlays, card, panel, Esc, scroll lock |
| `app/(office)/office.css` | Nav, label, markers, back control, card, panel and form styles |
| `scripts/blender/office_props.py`, `scripts/blender/greybox_office.py`, `office/manifest.json`, `office/nodes.test.ts` | Business card mesh, focus cameras, manifest entries |
| `e2e/office-interaction.spec.ts` | Milestone 1 e2e |

---

### Task 1: Location model and history bridge

**Files:**
- Create: `office/scene/location.ts`, `office/scene/location.test.ts`, `office/history.ts`

**Interfaces:**
- Consumes: `HOTSPOTS`, `type Hit`, `type HotspotName` (`office/hotspots/registry.ts`); `targetForPath` (`office/scene/targets.ts`).
- Produces:
  - `type Layer = { focus: HotspotName | null; reading: boolean }`, `NO_LAYER`, `LAYER_KEY = "office"`
  - `layerOf(state: unknown): Layer`
  - `sceneFor(pathname: string, layer: Layer): { target: Hit | null; reading: boolean }`
  - `pushLayer(layer: Layer, path?: string): void`, `clearLayer(): void`, `useOfficeLocation(): { pathname: string; layer: Layer }`

- [ ] **Step 1: Write the failing tests `office/scene/location.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { layerOf, LAYER_KEY, NO_LAYER, sceneFor } from "./location";

describe("layerOf", () => {
  it("reads the office layer out of history.state", () =>
    expect(layerOf({ [LAYER_KEY]: { focus: "hs_drawer", reading: true }, __NA: true })).toEqual({ focus: "hs_drawer", reading: true }));
  it.each([[null], [undefined], [{}], [{ [LAYER_KEY]: "nope" }], [{ [LAYER_KEY]: { focus: "hs_sofa", reading: "yes" } }]])(
    "falls back to no layer for %j",
    (state) => expect(layerOf(state)).toEqual(NO_LAYER),
  );
});

describe("sceneFor", () => {
  it("the standing spot", () => expect(sceneFor("/", NO_LAYER)).toEqual({ target: null, reading: false }));
  it("a local layer focuses its object on /", () =>
    expect(sceneFor("/", { focus: "hs_monitor", reading: false })).toEqual({ target: { hotspot: "hs_monitor", item: null }, reading: false }));
  it("a routed path focuses its object whatever the layer says", () =>
    expect(sceneFor("/contact", NO_LAYER)).toEqual({ target: { hotspot: "hs_drawer", item: null }, reading: false }));
  it("the panel opens on top of the drawer", () =>
    expect(sceneFor("/contact", { focus: "hs_drawer", reading: true })).toEqual({ target: { hotspot: "hs_drawer", item: null }, reading: true }));
  it("a record out keeps its item", () =>
    expect(sceneFor("/work/manuva", { focus: "hs_crate", reading: false }).target).toEqual({ hotspot: "hs_crate", item: "manuva" }));
  it("never opens a panel with nothing in focus", () => expect(sceneFor("/", { focus: null, reading: true })).toEqual({ target: null, reading: false }));
  it("unknown paths are the standing spot", () => expect(sceneFor("/admin", NO_LAYER).target).toBeNull());
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run office/scene/location.test.ts`
Expected: FAIL, `Cannot find module './location'`.

- [ ] **Step 3: Create `office/scene/location.ts`**

```ts
import { HOTSPOTS, type Hit, type HotspotName } from "../hotspots/registry";
import { targetForPath } from "./targets";

/** What the office keeps in history.state on top of the URL: a local object in focus, and whether the panel is open. */
export type Layer = { focus: HotspotName | null; reading: boolean };

export const NO_LAYER: Layer = { focus: null, reading: false };

/** history.state key. Next.js copies its own keys in alongside it when we push (see history.ts). */
export const LAYER_KEY = "office";

/** The office layer in a history.state value; anything unexpected is no layer. */
export function layerOf(state: unknown): Layer {
  const raw = (state as Record<string, unknown> | null | undefined)?.[LAYER_KEY] as Partial<Layer> | undefined;
  if (!raw || typeof raw !== "object") return NO_LAYER;
  const focus = typeof raw.focus === "string" && (HOTSPOTS as readonly string[]).includes(raw.focus) ? (raw.focus as HotspotName) : null;
  return { focus, reading: focus !== null && raw.reading === true };
}

/** What a location asks the scene to show: the path's target when it routes, else the local layer's object; the panel only over something. */
export function sceneFor(pathname: string, layer: Layer): { target: Hit | null; reading: boolean } {
  const routed = targetForPath(pathname);
  if (routed) return { target: routed, reading: layer.reading };
  if (layer.focus) return { target: { hotspot: layer.focus, item: null }, reading: layer.reading };
  return { target: null, reading: false };
}
```

The second `layerOf` case in Step 1 passes `focus: "hs_sofa"`. That isn't a hotspot, so `focus` is null and `reading` is forced false, which gives `NO_LAYER`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run office/scene`
Expected: PASS (the new tests plus the existing `targets.test.ts`).

- [ ] **Step 5: Create `office/history.ts`** (browser-only; exercised end to end in Task 7)

```ts
import { useSyncExternalStore } from "react";
import { LAYER_KEY, layerOf, NO_LAYER, type Layer } from "./scene/location";

const CHANGE = "office:history";

/**
 * Adds a history entry for `layer` at `path` (default: the current path). Only our key goes in: Next.js's patched
 * pushState copies its own state in, and skips syncing its router when the object already carries `__NA`.
 */
export function pushLayer(layer: Layer, path?: string): void {
  window.history.pushState({ [LAYER_KEY]: layer }, "", path ?? window.location.pathname);
  window.dispatchEvent(new Event(CHANGE));
}

/** A reload keeps history.state, so a fresh office drops any layer it finds. */
export function clearLayer(): void {
  if (layerOf(window.history.state) === NO_LAYER) return;
  window.history.replaceState({ [LAYER_KEY]: NO_LAYER }, "", window.location.pathname);
  window.dispatchEvent(new Event(CHANGE));
}

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

const SERVER = `/|${JSON.stringify(NO_LAYER)}`;
const snapshot = () => `${window.location.pathname}|${JSON.stringify(layerOf(window.history.state))}`;

/** Path + layer, re-rendering on every history change (Back, Forward, our pushes). */
export function useOfficeLocation(): { pathname: string; layer: Layer } {
  const key = useSyncExternalStore(subscribe, snapshot, () => SERVER);
  const bar = key.indexOf("|");
  return { pathname: key.slice(0, bar), layer: JSON.parse(key.slice(bar + 1)) as Layer };
}
```

`layerOf` returns the shared `NO_LAYER` object whenever there's no valid layer, which is what makes the identity check in `clearLayer` correct.

- [ ] **Step 6: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: clean.

```bash
git add office/scene/location.ts office/scene/location.test.ts office/history.ts
git commit -m "Add the office location model and history bridge

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Contact details and copy

**Files:**
- Modify: `content/contact.ts`, `content/content.test.ts`
- Create: `office/copy.ts`

**Interfaces:**
- Produces:
  - `CONTACT_NAME = "Kasper Simonsen"`
  - `CONTACT_LINKS: { label: string; href: string }[]`
  - `COPY` with keys `nav`, `labels`, `back`, `close`, `card`, `contact`

- [ ] **Step 1: Add the failing tests** (append to `content/content.test.ts`, and add `CONTACT_LINKS, CONTACT_NAME` to its import from `./contact`)

```ts
describe("business card", () => {
  it("has the name", () => expect(CONTACT_NAME).toBe("Kasper Simonsen"));
  it("has at least one link, all absolute https", () => {
    expect(CONTACT_LINKS.length).toBeGreaterThan(0);
    for (const l of CONTACT_LINKS) expect(l.href).toMatch(/^https:\/\//);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run content`
Expected: FAIL, `CONTACT_NAME` is undefined.

- [ ] **Step 3: Extend `content/contact.ts`** (append)

```ts
export const CONTACT_NAME = "Kasper Simonsen";

/** Links on the business card. LinkedIn goes here when Kasper sends the URL. */
export const CONTACT_LINKS: { label: string; href: string }[] = [{ label: "GitHub", href: "https://github.com/kaspersimonsen" }];
```

- [ ] **Step 4: Create `office/copy.ts`**

```ts
/**
 * Every visitor-facing word in the office. DRAFTS: Kasper approves all of these before launch (spec 4: his voice,
 * conversational, dry, contractions, no marketing words).
 */
export const COPY = {
  nav: "Around the office",
  labels: {
    hs_crate: "The work",
    hs_drawer: "Get in touch",
    hs_shelf: "What I do",
    hs_monitor: "Monitor",
  },
  back: "Back",
  close: "Close",
  card: {
    eyebrow: "Contact",
    role: "Independent software engineer, Cremorne",
    write: "Write to me",
  },
  contact: {
    title: "Get in touch",
    lede: "I reply within 24 hours. Usually faster.",
    name: "Name",
    email: "Email",
    subject: "What's it about",
    message: "Message",
    send: "Send it",
    sending: "Sending…",
    sent: "Sent. Talk soon.",
    error: "That didn't go through. Email me instead:",
  },
} as const;
```

- [ ] **Step 5: Run to verify it passes and commit**

Run: `npx vitest run content && npx tsc --noEmit`
Expected: PASS, clean.

```bash
git add content/contact.ts content/content.test.ts office/copy.ts
git commit -m "Add business card details and the office copy drafts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Object motion

**Files:**
- Create: `office/objects/motion.ts`, `office/objects/motion.test.ts`

**Interfaces:**
- Consumes: `type HotspotName` (registry); `work` (`content/work.ts`), for how many records carry content.
- Produces:
  - node-name constants `DRAWER_NODE = "hs_drawer__drawer"`, `CARD_NODE = "hs_drawer__card"`, `SCREEN_NODE = "hs_monitor__screen"`, `RECORD_NODE = /^hs_crate__record_(\d\d)$/`, `ORNAMENT_NODE = /^hs_shelf__ornament_(\d\d)$/`
  - `DRAWER_AXIS` (unit `Vector3`, glTF local +Z), `DRAWER_OPEN_M = 0.3`, `DRAWER_PEEK_M = 0.03`, `DRAWER_SECONDS = 0.5`, `TEASE_SECONDS = 0.25`, `RECORD_NUDGE_M = 0.03`, `ORNAMENT_BOB_M = 0.012`
  - `DRAWER_RATE = 12`
  - `approach(current, target, dt, seconds)`, `easeToward(current, target, dt, rate)`, `easeOutCubic(t)`, `drawerTarget(open, hovered)`, `screenVisible(sinceHover)`, `ornamentBob(index, seconds, amount)`
  - `type MotionNodes`, `findMotionNodes(root: Object3D): MotionNodes`
  - `class ObjectMotion { update(nodes, input: { open: HotspotName | null; hovered: HotspotName | null; reduced: boolean }, dt: number, now: number): void; readonly drawerOpen: boolean }`

- [ ] **Step 1: Write the failing tests `office/objects/motion.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { Group, Mesh } from "three";
import { work } from "@/content/work";
import {
  approach, DRAWER_AXIS, DRAWER_OPEN_M, DRAWER_PEEK_M, DRAWER_SECONDS, drawerTarget, easeOutCubic, easeToward, findMotionNodes,
  ObjectMotion, ornamentBob, ORNAMENT_BOB_M, RECORD_NUDGE_M, screenVisible, TEASE_SECONDS,
} from "./motion";

function scene() {
  const root = new Group();
  const named = <T extends Group | Mesh>(o: T, name: string, parent: Group) => {
    o.name = name;
    parent.add(o);
    return o;
  };
  const crate = named(new Group(), "hs_crate", root);
  for (let i = 0; i < 5; i++) named(new Group(), `hs_crate__record_0${i}`, crate).position.set(0, 0.1, i * 0.03);
  const drawerRoot = named(new Group(), "hs_drawer", root);
  const drawer = named(new Group(), "hs_drawer__drawer", drawerRoot);
  drawer.position.set(0.1, 0.4, 0);
  const shelf = named(new Group(), "hs_shelf", root);
  for (let i = 0; i < 3; i++) named(new Group(), `hs_shelf__ornament_0${i}`, shelf).position.set(i * 0.2, 0.05, 0);
  const monitor = named(new Group(), "hs_monitor", root);
  const screen = named(new Mesh(), "hs_monitor__screen", monitor);
  return { root, drawer, screen, crate, shelf };
}

const step = (m: ObjectMotion, nodes: ReturnType<typeof findMotionNodes>, input: Parameters<ObjectMotion["update"]>[1], seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 60) m.update(nodes, input, 1 / 60, t);
};

describe("helpers", () => {
  it("approaches a target at a fixed rate and never overshoots", () => {
    expect(approach(0, 1, 0.25, 0.5)).toBeCloseTo(0.5);
    expect(approach(0.9, 1, 1, 0.5)).toBe(1);
    expect(approach(1, 0, 0.25, 0.5)).toBeCloseTo(0.5);
    expect(approach(0, 1, 1, 0)).toBe(1);
  });
  it("eases out", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
  it("eases toward a target exponentially and arrives exactly", () => {
    const half = easeToward(0, 0.3, 0.05, 12);
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(0.3);
    let x = 0;
    for (let i = 0; i < 60; i++) x = easeToward(x, 0.03, 1 / 60, 12);
    expect(x).toBe(0.03);
    expect(easeToward(0, 0.3, 0.016, Infinity)).toBe(0.3);
  });
  it("opens the drawer when it's open, peeks on hover, else shut", () => {
    expect(drawerTarget(true, false)).toBe(DRAWER_OPEN_M);
    expect(drawerTarget(true, true)).toBe(DRAWER_OPEN_M);
    expect(drawerTarget(false, true)).toBe(DRAWER_PEEK_M);
    expect(drawerTarget(false, false)).toBe(0);
  });
  it("flickers the screen twice early on and then stays on", () => {
    expect(screenVisible(0)).toBe(true);
    expect(screenVisible(0.06)).toBe(false);
    expect(screenVisible(0.1)).toBe(true);
    expect(screenVisible(0.16)).toBe(false);
    expect(screenVisible(TEASE_SECONDS + 0.1)).toBe(true);
  });
  it("bobs within the amplitude and out of phase between ornaments", () => {
    for (let t = 0; t < 3; t += 0.1) expect(Math.abs(ornamentBob(0, t, 1))).toBeLessThanOrEqual(ORNAMENT_BOB_M + 1e-9);
    expect(ornamentBob(0, 1, 1)).not.toBeCloseTo(ornamentBob(1, 1, 1));
    expect(ornamentBob(2, 1, 0)).toBe(0);
  });
  it("slides the drawer along glTF local +Z (Blender's local -Y, out of the pedestal)", () =>
    expect(DRAWER_AXIS.toArray()).toEqual([0, 0, 1]));
});

describe("ObjectMotion", () => {
  it("opens the drawer over DRAWER_SECONDS along its axis and closes it again", () => {
    const s = scene();
    const nodes = findMotionNodes(s.root);
    const m = new ObjectMotion();
    step(m, nodes, { open: "hs_drawer", hovered: null, reduced: false }, DRAWER_SECONDS * 0.5);
    expect(s.drawer.position.z).toBeGreaterThan(0);
    expect(s.drawer.position.z).toBeLessThan(DRAWER_OPEN_M);
    expect(m.drawerOpen).toBe(false);
    step(m, nodes, { open: "hs_drawer", hovered: null, reduced: false }, DRAWER_SECONDS);
    expect(s.drawer.position.z).toBeCloseTo(DRAWER_OPEN_M);
    expect(s.drawer.position.x).toBeCloseTo(0.1);
    expect(s.drawer.position.y).toBeCloseTo(0.4);
    expect(m.drawerOpen).toBe(true);
    step(m, nodes, { open: null, hovered: null, reduced: false }, DRAWER_SECONDS + 0.1);
    expect(s.drawer.position.z).toBeCloseTo(0);
  });
  it("snaps instead of sliding under reduced motion, with no teases", () => {
    const s = scene();
    const nodes = findMotionNodes(s.root);
    const m = new ObjectMotion();
    m.update(nodes, { open: "hs_drawer", hovered: null, reduced: true }, 1 / 60, 0);
    expect(s.drawer.position.z).toBeCloseTo(DRAWER_OPEN_M);
    m.update(nodes, { open: null, hovered: "hs_crate", reduced: true }, 1 / 60, 0.1);
    expect(nodes.records[0].position.y).toBeCloseTo(0.1);
  });
  it("nudges only the records that carry a case study", () => {
    const s = scene();
    const nodes = findMotionNodes(s.root);
    const m = new ObjectMotion();
    step(m, nodes, { open: null, hovered: "hs_crate", reduced: false }, TEASE_SECONDS + 0.1);
    nodes.records.forEach((r, i) => expect(r.position.y).toBeCloseTo(i < work.length ? 0.1 + RECORD_NUDGE_M : 0.1));
    step(m, nodes, { open: null, hovered: null, reduced: false }, TEASE_SECONDS + 0.1);
    nodes.records.forEach((r) => expect(r.position.y).toBeCloseTo(0.1));
  });
  it("peeks the drawer on hover", () => {
    const s = scene();
    const nodes = findMotionNodes(s.root);
    const m = new ObjectMotion();
    step(m, nodes, { open: null, hovered: "hs_drawer", reduced: false }, DRAWER_SECONDS);
    expect(s.drawer.position.z).toBeCloseTo(DRAWER_PEEK_M);
  });
  it("flickers the monitor screen when hover begins", () => {
    const s = scene();
    const nodes = findMotionNodes(s.root);
    const m = new ObjectMotion();
    m.update(nodes, { open: null, hovered: "hs_monitor", reduced: false }, 1 / 60, 10);
    m.update(nodes, { open: null, hovered: "hs_monitor", reduced: false }, 1 / 60, 10.06);
    expect(s.screen.visible).toBe(false);
    m.update(nodes, { open: null, hovered: "hs_monitor", reduced: false }, 1 / 60, 10.5);
    expect(s.screen.visible).toBe(true);
  });
  it("is a no-op on a model without the nodes", () => {
    const nodes = findMotionNodes(new Group());
    expect(() => new ObjectMotion().update(nodes, { open: "hs_drawer", hovered: "hs_shelf", reduced: false }, 1 / 60, 0)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run office/objects`
Expected: FAIL, `Cannot find module './motion'`.

- [ ] **Step 3: Create `office/objects/motion.ts`**

```ts
import { Vector3, type Object3D } from "three";
import { work } from "@/content/work";
import type { HotspotName } from "../hotspots/registry";

/** Runtime node names (office.glb). office/nodes.test.ts keeps them required by the manifest. */
export const DRAWER_NODE = "hs_drawer__drawer";
export const CARD_NODE = "hs_drawer__card";
export const SCREEN_NODE = "hs_monitor__screen";
export const RECORD_NODE = /^hs_crate__record_(\d\d)$/;
export const ORNAMENT_NODE = /^hs_shelf__ornament_(\d\d)$/;

/** The drawer slides along its local -Y in Blender, which the glTF exporter turns into local +Z. */
export const DRAWER_AXIS = new Vector3(0, 0, 1);
export const DRAWER_OPEN_M = 0.3;
export const DRAWER_PEEK_M = 0.03;
/** The drawer settles within DRAWER_SECONDS: an exponential ease at DRAWER_RATE per second (~95% there in 0.25 s). */
export const DRAWER_SECONDS = 0.5;
export const DRAWER_RATE = 12;
export const TEASE_SECONDS = 0.25;
export const RECORD_NUDGE_M = 0.03;
export const ORNAMENT_BOB_M = 0.012;

/** Exponential ease-out toward `target`; snaps the last millimetre so it arrives exactly. `rate` Infinity jumps. */
export function easeToward(current: number, target: number, dt: number, rate: number): number {
  if (!Number.isFinite(rate)) return target;
  const next = current + (target - current) * (1 - Math.exp(-dt * rate));
  return Math.abs(target - next) < 0.001 ? target : next;
}

/** Moves `current` toward `target` at a rate that covers 0→1 in `seconds`; 0 seconds jumps there. */
export function approach(current: number, target: number, dt: number, seconds: number): number {
  if (seconds <= 0) return target;
  const step = dt / seconds;
  return current < target ? Math.min(target, current + step) : Math.max(target, current - step);
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** Drawer travel in metres: fully out while open, a peek while hovered, shut otherwise. */
export function drawerTarget(open: boolean, hovered: boolean): number {
  return open ? DRAWER_OPEN_M : hovered ? DRAWER_PEEK_M : 0;
}

/** The monitor's tease: two short blinks just after hover begins. */
export function screenVisible(sinceHover: number): boolean {
  return !((sinceHover > 0.04 && sinceHover < 0.08) || (sinceHover > 0.13 && sinceHover < 0.18));
}

/** Vertical bob of ornament `index` while the shelf is teased; `amount` (0–1) scales it in and out. */
export function ornamentBob(index: number, seconds: number, amount: number): number {
  return ORNAMENT_BOB_M * amount * Math.sin(seconds * 6 + index * 1.3);
}

export type MotionNodes = {
  drawer: Object3D | null;
  drawerRest: Vector3;
  records: Object3D[];
  recordRest: number[];
  ornaments: Object3D[];
  ornamentRest: number[];
  screen: Object3D | null;
};

/** Finds the moving parts by name and remembers where they rest. Missing parts are simply absent. */
export function findMotionNodes(root: Object3D): MotionNodes {
  const records: { i: number; o: Object3D }[] = [];
  const ornaments: { i: number; o: Object3D }[] = [];
  root.traverse((o) => {
    const r = RECORD_NODE.exec(o.name);
    if (r) records.push({ i: Number(r[1]), o });
    const m = ORNAMENT_NODE.exec(o.name);
    if (m) ornaments.push({ i: Number(m[1]), o });
  });
  const byIndex = (a: { i: number }, b: { i: number }) => a.i - b.i;
  const drawer = root.getObjectByName(DRAWER_NODE) ?? null;
  const sortedRecords = records.sort(byIndex).map((x) => x.o);
  const sortedOrnaments = ornaments.sort(byIndex).map((x) => x.o);
  return {
    drawer,
    drawerRest: drawer ? drawer.position.clone() : new Vector3(),
    records: sortedRecords,
    recordRest: sortedRecords.map((o) => o.position.y),
    ornaments: sortedOrnaments,
    ornamentRest: sortedOrnaments.map((o) => o.position.y),
    screen: root.getObjectByName(SCREEN_NODE) ?? null,
  };
}

/** Per-frame easing of the drawer, the teases and the monitor flicker. Pure state: no React, no clocks. */
export class ObjectMotion {
  private drawerM = 0;
  private tease: Record<HotspotName, number> = { hs_crate: 0, hs_drawer: 0, hs_monitor: 0, hs_shelf: 0 };
  private hoverSince = -1;
  private lastHovered: HotspotName | null = null;
  private target = 0;

  /** True once the drawer has finished opening (cards wait for it). */
  get drawerOpen(): boolean {
    return this.target === DRAWER_OPEN_M && this.drawerM === DRAWER_OPEN_M;
  }

  update(nodes: MotionNodes, input: { open: HotspotName | null; hovered: HotspotName | null; reduced: boolean }, dt: number, now: number): void {
    const hovered = input.reduced ? null : input.hovered;
    if (hovered !== this.lastHovered) {
      this.hoverSince = hovered ? now : -1;
      this.lastHovered = hovered;
    }
    for (const h of Object.keys(this.tease) as HotspotName[]) {
      this.tease[h] = approach(this.tease[h], hovered === h ? 1 : 0, dt, input.reduced ? 0 : TEASE_SECONDS);
    }

    this.target = drawerTarget(input.open === "hs_drawer", hovered === "hs_drawer");
    this.drawerM = easeToward(this.drawerM, this.target, dt, input.reduced ? Infinity : DRAWER_RATE);
    if (nodes.drawer) nodes.drawer.position.copy(nodes.drawerRest).addScaledVector(DRAWER_AXIS, this.drawerM);

    nodes.records.forEach((r, i) => {
      r.position.y = nodes.recordRest[i] + (i < work.length ? RECORD_NUDGE_M * easeOutCubic(this.tease.hs_crate) : 0);
    });
    nodes.ornaments.forEach((o, i) => {
      o.position.y = nodes.ornamentRest[i] + ornamentBob(i, now, this.tease.hs_shelf);
    });
    if (nodes.screen) nodes.screen.visible = hovered === "hs_monitor" ? screenVisible(now - this.hoverSince) : true;
  }
}
```

The drawer uses an exponential ease-out toward whichever target applies: open, peek or shut. It moves fast at first, settles softly, and is accurate for both the 30 cm open and the 3 cm peek. It snaps the last millimetre, so `drawerOpen` becomes exactly true.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run office/objects`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add office/objects/motion.ts office/objects/motion.test.ts
git commit -m "Add drawer, tease and flicker motion for the office objects

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Business card and focus cameras in Blender

Runs in Blender. agent-props edits `office_props.py` in the background Blender process. The live session runs `greybox_office.py` and exports. The eight focus cameras are already built (uncommitted in `greybox_office.py` from the superseded plan's Task 6); this task commits them, with the drawer camera retuned.

**Files:**
- Modify: `scripts/blender/office_props.py` (`build_pedestal` gains the card), `scripts/blender/greybox_office.py` (drawer focus camera), `art/office.blend`, `public/models/office.glb`, `office/manifest.json`, `office/nodes.test.ts`
- Create: `office/hotspots/manifest.test.ts`

**Interfaces:**
- Consumes: `HOTSPOTS`, `FOCUS_CAMERA` (registry); `DRAWER_NODE`, `CARD_NODE`, `SCREEN_NODE` (Task 3).
- Produces: the nodes `hs_drawer__drawer` (the sliding drawer) and `hs_drawer__card` (a business-card mesh lying in the drawer tray, a child of the drawer so it slides with it), plus the eight focus cameras, all in `office.glb` and required by the manifest.

- [ ] **Step 1: Write the failing tests**

`office/hotspots/manifest.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import manifest from "../manifest.json";
import { FOCUS_CAMERA, HOTSPOTS } from "./registry";

describe("manifest covers the hotspots", () => {
  it("requires every hotspot node", () => {
    for (const h of HOTSPOTS) expect(manifest.office.nodes).toContain(h);
  });
  it("requires every focus camera and its portrait variant", () => {
    for (const h of HOTSPOTS) {
      expect(manifest.office.cameras).toContain(FOCUS_CAMERA[h]);
      expect(manifest.office.cameras).toContain(`${FOCUS_CAMERA[h]}_portrait`);
    }
  });
});
```

Append to `office/nodes.test.ts` (add the import `import { CARD_NODE, DRAWER_NODE, SCREEN_NODE } from "./objects/motion";`):

```ts
  it("the drawer, its business card and the monitor screen exist", () => {
    for (const n of [DRAWER_NODE, CARD_NODE, SCREEN_NODE]) expect(manifest.office.nodes).toContain(n);
  });
```

Run: `npx vitest run office/hotspots/manifest.test.ts office/nodes.test.ts`
Expected: FAIL. The manifest lacks `cam_focus_crate` and `hs_drawer__card`.

- [ ] **Step 2: Update `office/manifest.json`**

Set `office.cameras` to:

```json
["cam_stand", "cam_stand_portrait", "cam_focus_crate", "cam_focus_crate_portrait", "cam_focus_drawer", "cam_focus_drawer_portrait", "cam_focus_monitor", "cam_focus_monitor_portrait", "cam_focus_shelf", "cam_focus_shelf_portrait"]
```

and append `"hs_drawer__drawer", "hs_drawer__card", "hs_monitor__screen"` to `office.nodes`.

Run: `npx vitest run office/hotspots/manifest.test.ts office/nodes.test.ts`
Expected: PASS. `npm run check:models` now FAILS on `hs_drawer__card` until Step 5.

- [ ] **Step 3: Add the business card in `office_props.py`** (agent-props: working copy, built twice, then swapped in atomically)

In `build_pedestal`, after the top drawer `__drawer` is built, add a card lying in the drawer's tray, parented to the drawer so it slides with it:
- **Object:** a thin box, 0.09 × 0.055 × 0.003 m, named `<name>__card` (so `hs_drawer__card` when the pedestal is `hs_drawer`), centred in the tray 1 cm above the tray floor, its long edge left to right as seen from the front.
- **Lines:** no text on it. The HTML card carries the words, and its edges must draw.
- **Option:** `build_pedestal(..., card=True)`; the default keeps today's output without a card.

The builder already names the drawer `<name>__drawer` with its origin on the front face, and it slides along local −Y.

- [ ] **Step 4: Retune the drawer focus camera** (live agent, `greybox_office.py`)

Pass `card=True` to `build_pedestal` for `hs_drawer`. Then retune `cam_focus_drawer` (and its `_portrait` variant) in the `FOCUS` table so that, with the drawer **open 0.30 m along Blender's local −Y**:
- the camera looks down into the open drawer at ~35–45° below horizontal;
- the card (`hs_drawer__card`) is fully visible at 25–40% of the frame width on landscape, leaving the right side clear for the HTML card overlay;
- on portrait, the card sits centred in the top half, leaving the bottom ~40% clear for the docked card.

Check this by temporarily setting the drawer's location to its open position in Blender, projecting, then restoring it. The camera must stay ≥ 0.3 m from every mesh, with the drawer open and shut.

Also check that the drawer's local −Y points out of the pedestal: its front face moves away from the pedestal body. The runtime slides along glTF +Z on that assumption (`DRAWER_AXIS`).

- [ ] **Step 5: Re-run, export, build, check**

```python
import runpy
runpy.run_path(r"C:\dev\KasperSimonsen.dev\scripts\blender\greybox_office.py", run_name="__main__")
result = runpy.run_path(r"C:\dev\KasperSimonsen.dev\scripts\blender\export.py", run_name="__main__")["SUMMARY"]
```

```bash
npm run build:models && npm run check:models && npx vitest run office
```

Expected: `Models OK`; the office tests pass, including the manifest and node tests.

Render `focus-drawer-open.png` and `focus-drawer-open-portrait.png` into `.superpowers/sdd/2026-10-02-office-interactions-m1/shots/`.

- [ ] **Step 6: Commit**

```bash
git add scripts/blender/office_props.py scripts/blender/greybox_office.py art/office.blend public/models/office.glb office/manifest.json office/nodes.test.ts office/hotspots/manifest.test.ts
git commit -m "Business card in the drawer and focus cameras for every object

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Card, panel and contact form components

**Files:**
- Create: `office/overlay/place.ts`, `office/overlay/place.test.ts`, `office/cards/Card.tsx`, `office/cards/BusinessCard.tsx`, `panels/Panel.tsx`, `panels/ContactForm.tsx`
- Modify: `app/(office)/office.css`

**Interfaces:**
- Consumes: `COPY` (Task 2); `CONTACT_EMAIL`, `CONTACT_LINKS`, `CONTACT_NAME`, `subjectForTopic` (`content/contact.ts`); `theme`; `type HotspotName`.
- Produces:
  - `CARD_GAP = 24`, `EDGE = 16`, `placeCard(anchor: {x, y}, card: {width, height}, viewport: {width, height}): {left, top}`
  - `Card({ hotspot, titleId, cardRef, children })`: `cardRef` is how the canvas positions it
  - `BusinessCard({ titleId, onWrite })`
  - `Panel({ hotspot, titleId, onClose, children })`
  - `ContactForm({ topic?, titleId, level })`

- [ ] **Step 1: Write the failing tests `office/overlay/place.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { CARD_GAP, EDGE, placeCard } from "./place";

const card = { width: 320, height: 240 };
const screen = { width: 1440, height: 900 };

describe("placeCard", () => {
  it("sits to the right of the anchor, vertically centred on it", () =>
    expect(placeCard({ x: 500, y: 450 }, card, screen)).toEqual({ left: 500 + CARD_GAP, top: 450 - 120 }));
  it("never runs off the right edge", () => {
    const p = placeCard({ x: 1300, y: 450 }, card, screen);
    expect(p.left + card.width).toBeLessThanOrEqual(screen.width - EDGE);
  });
  it("never runs off the top or bottom", () => {
    expect(placeCard({ x: 500, y: 20 }, card, screen).top).toBe(EDGE);
    expect(placeCard({ x: 500, y: 890 }, card, screen).top).toBe(screen.height - EDGE - card.height);
  });
  it("keeps a too-tall card pinned to the top edge", () =>
    expect(placeCard({ x: 500, y: 450 }, { width: 320, height: 2000 }, screen).top).toBe(EDGE));
  it("survives an anchor behind the camera (NaN)", () =>
    expect(placeCard({ x: Number.NaN, y: Number.NaN }, card, screen)).toEqual({ left: EDGE, top: EDGE }));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run office/overlay`
Expected: FAIL, `Cannot find module './place'`.

- [ ] **Step 3: Create `office/overlay/place.ts`**

```ts
/** Space between an object's anchor and its card, and the minimum margin to the screen edge (CSS px). */
export const CARD_GAP = 24;
export const EDGE = 16;

/** Where a pinned card goes: right of its object's anchor, centred on it vertically, always fully on screen. */
export function placeCard(
  anchor: { x: number; y: number },
  card: { width: number; height: number },
  viewport: { width: number; height: number },
): { left: number; top: number } {
  if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) return { left: EDGE, top: EDGE };
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
  const left = clamp(anchor.x + CARD_GAP, EDGE, Math.max(EDGE, viewport.width - EDGE - card.width));
  const top = clamp(anchor.y - card.height / 2, EDGE, Math.max(EDGE, viewport.height - EDGE - card.height));
  return { left, top };
}
```

Run: `npx vitest run office/overlay`
Expected: PASS.

- [ ] **Step 4: Create `office/cards/Card.tsx`**

```tsx
"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import { theme } from "@/office/theme";
import type { HotspotName } from "@/office/hotspots/registry";

/**
 * A content card beside its object (interactions spec section 4). The canvas positions it each frame through
 * `cardRef` (placeCard). On narrow screens CSS docks it to the bottom and ignores that position.
 */
export default function Card({
  hotspot,
  titleId,
  cardRef,
  children,
}: {
  hotspot: HotspotName;
  titleId: string;
  cardRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  return (
    <section
      ref={cardRef as RefObject<HTMLElement>}
      className="office-card"
      aria-labelledby={titleId}
      style={{ "--accent": theme.accents[hotspot] } as CSSProperties}
    >
      {children}
    </section>
  );
}
```

- [ ] **Step 5: Create `office/cards/BusinessCard.tsx`**

```tsx
"use client";

import { CONTACT_EMAIL, CONTACT_LINKS, CONTACT_NAME } from "@/content/contact";
import { COPY } from "@/office/copy";

/** The business card in the drawer (interactions spec section 3.3). */
export default function BusinessCard({ titleId, onWrite }: { titleId: string; onWrite: () => void }) {
  return (
    <>
      <p className="office-card-eyebrow">{COPY.card.eyebrow}</p>
      <h2 id={titleId} className="office-card-title">
        {CONTACT_NAME}
      </h2>
      <p className="office-card-text">{COPY.card.role}</p>
      <p className="office-card-text">
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
      <ul className="office-card-links">
        {CONTACT_LINKS.map((l) => (
          <li key={l.href}>
            <a href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
      <button type="button" className="office-card-cta" onClick={onWrite}>
        {COPY.card.write}
      </button>
    </>
  );
}
```

- [ ] **Step 6: Create `panels/Panel.tsx`**

```tsx
"use client";

import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { theme } from "@/office/theme";
import { COPY } from "@/office/copy";
import type { HotspotName } from "@/office/hotspots/registry";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The Read more dialog over the office. It traps focus; Esc, the close button and a click outside call `onClose` (one
 * history step back); focus returns to whatever opened it.
 */
export default function Panel({ hotspot, titleId, onClose, children }: { hotspot: HotspotName; titleId: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialog.current?.focus({ preventScroll: true });
    return () => opener?.focus?.({ preventScroll: true });
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !dialog.current) return;
    const items = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) return e.preventDefault();
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === dialog.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="panel-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="panel"
        style={{ "--accent": theme.accents[hotspot] } as CSSProperties}
        onKeyDown={onKeyDown}
      >
        <button type="button" className="panel-close" onClick={onClose}>
          {COPY.close}
        </button>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create `panels/ContactForm.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { CONTACT_EMAIL, subjectForTopic } from "@/content/contact";
import { COPY } from "@/office/copy";

type Status = "idle" | "sending" | "sent" | "error";

/** The contact form in the office style. Posts the same body to /api/contact as the old form. */
export default function ContactForm({ topic, titleId, level }: { topic?: string; titleId: string; level: 1 | 2 }) {
  const Title = level === 1 ? "h1" : "h2";
  const [form, setForm] = useState({ name: "", email: "", subject: subjectForTopic(topic), message: "" });
  const [status, setStatus] = useState<Status>("idle");
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <article className="article">
      <Title id={titleId} className="article-title">
        {COPY.contact.title}
      </Title>
      <p className="article-lede">{COPY.contact.lede}</p>
      {status === "sent" ? (
        <p role="status">{COPY.contact.sent}</p>
      ) : (
        <form className="form" onSubmit={submit}>
          <label>
            {COPY.contact.name}
            <input required autoComplete="name" value={form.name} onChange={set("name")} />
          </label>
          <label>
            {COPY.contact.email}
            <input required type="email" autoComplete="email" value={form.email} onChange={set("email")} />
          </label>
          <label>
            {COPY.contact.subject}
            <input required value={form.subject} onChange={set("subject")} />
          </label>
          <label>
            {COPY.contact.message}
            <textarea required rows={6} value={form.message} onChange={set("message")} />
          </label>
          <button className="article-cta" type="submit" disabled={status === "sending"}>
            {status === "sending" ? COPY.contact.sending : COPY.contact.send}
          </button>
          {status === "error" && (
            <p role="alert">
              {COPY.contact.error} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
          )}
        </form>
      )}
    </article>
  );
}
```

- [ ] **Step 8: Add the styles** (append to `app/(office)/office.css`)

```css
/* Scrolling would replay the walk-in under an open object. */
html.office-locked {
  overflow: hidden;
}

/* With no 3D, the fallback's own links are the navigation. */
.office[data-office-fallback="true"] :is(.office-nav, .office-label, .office-marker, .office-back, .office-card) {
  display: none;
}

/* Real controls for every object (spec 7.3), hidden until a keyboard user tabs into them. */
.office-nav:not(:focus-within) {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.office-nav:focus-within {
  position: fixed;
  left: 16px;
  bottom: 16px;
  z-index: 3;
  padding: 12px 14px;
  background: var(--office-bg);
  border: 1px solid rgba(232, 232, 232, 0.25);
}
.office-nav ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
.office-nav a,
.office-nav button {
  color: var(--office-fg);
  background: none;
  border: 0;
  padding: 0;
  font: 14px/1.4 var(--font-ui), system-ui, sans-serif;
  text-decoration: none;
  cursor: pointer;
}
.office-nav :focus-visible { outline: 1px solid var(--office-fg); outline-offset: 3px; }

/* Hover/focus label, positioned by the canvas. */
.office-label {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 2;
  pointer-events: none;
  margin-top: -34px;
  translate: -50% 0;
  font: 11px/1 var(--font-mono), ui-monospace, monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  white-space: nowrap;
}

/* Touch markers: white, only where hover isn't possible, only while standing. */
.office-marker {
  display: none;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 2;
  width: 14px;
  height: 14px;
  margin: -24px 0 0 -7px;
  border: 1px solid var(--office-fg);
  border-radius: 50%;
  pointer-events: none;
}
@media (hover: none) {
  .office[data-director="idle"] .office-marker { display: block; animation: office-pulse 1.8s ease-in-out infinite; }
}
@keyframes office-pulse {
  0%, 100% { scale: 1; opacity: 0.9; }
  50% { scale: 1.6; opacity: 0.2; }
}

.office-back {
  position: fixed;
  left: 16px;
  top: 16px;
  z-index: 4;
  padding: 8px 12px;
  background: var(--office-bg);
  color: var(--office-fg);
  border: 1px solid rgba(232, 232, 232, 0.35);
  font: 11px/1 var(--font-mono), ui-monospace, monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}

/* Content cards beside their object (desktop: positioned by the canvas; narrow: docked). */
.office-card {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 3;
  width: min(340px, calc(100vw - 32px));
  padding: 20px 22px;
  background: var(--office-bg);
  border: 1px solid rgba(232, 232, 232, 0.9);
  font: 15px/1.5 var(--font-ui), system-ui, sans-serif;
  animation: office-card-in 0.3s ease-out both;
}
@keyframes office-card-in {
  from { opacity: 0; }
}
@media (max-width: 700px), (orientation: portrait) {
  .office-card { top: auto !important; left: 16px !important; right: 16px; bottom: 16px; width: auto; }
}
.office-card-eyebrow {
  margin: 0 0 6px;
  font: 11px/1.2 var(--font-mono), ui-monospace, monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
}
.office-card-title { margin: 0 0 6px; font-size: 22px; font-weight: 600; line-height: 1.15; }
.office-card-text { margin: 0 0 8px; color: rgba(232, 232, 232, 0.8); }
.office-card a { color: var(--office-fg); }
.office-card-links { margin: 0 0 14px; padding: 0; list-style: none; display: flex; gap: 14px; }
.office-card-cta {
  padding: 10px 16px;
  background: var(--accent);
  color: var(--office-bg);
  border: 0;
  font: 600 14px/1 var(--font-ui), system-ui, sans-serif;
  cursor: pointer;
}

/* The Read more panel. */
.panel-scrim { position: fixed; inset: 0; z-index: 10; }
.panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(560px, 42vw);
  overflow-y: auto;
  padding: 64px 40px 48px;
  background: var(--office-bg);
  border-left: 1px solid rgba(232, 232, 232, 0.2);
  outline: none;
  animation: panel-in 0.35s ease-out both;
}
@keyframes panel-in { from { translate: 40px 0; opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .panel { animation: panel-fade 0.2s ease-out both; }
  .office-marker { animation: none !important; }
}
@keyframes panel-fade { from { opacity: 0; } }
@media (max-width: 900px) {
  .panel { width: 100%; border-left: 0; padding: 64px 20px 40px; }
}
.panel-close {
  position: absolute;
  top: 18px;
  right: 18px;
  padding: 8px 12px;
  background: none;
  color: var(--office-fg);
  border: 1px solid rgba(232, 232, 232, 0.35);
  font: 11px/1 var(--font-mono), ui-monospace, monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}

/* Articles and forms inside panels. */
.article { max-width: 62ch; font: 16px/1.6 var(--font-ui), system-ui, sans-serif; }
.article-title { margin: 8px 0 12px; font-size: clamp(28px, 4vw, 40px); line-height: 1.1; font-weight: 600; letter-spacing: -0.01em; }
.article-lede { font-size: 19px; color: var(--office-fg); }
.article p { color: rgba(232, 232, 232, 0.8); }
.article a { color: var(--office-fg); }
.article-cta {
  display: inline-block;
  padding: 10px 16px;
  background: var(--accent);
  color: var(--office-bg);
  border: 0;
  font: 600 14px/1 var(--font-ui), system-ui, sans-serif;
  text-decoration: none;
  cursor: pointer;
}
.form { display: grid; gap: 14px; margin-top: 20px; }
.form label {
  display: grid;
  gap: 6px;
  font: 11px/1 var(--font-mono), ui-monospace, monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(232, 232, 232, 0.7);
}
.form input,
.form textarea {
  padding: 10px 12px;
  background: transparent;
  color: var(--office-fg);
  border: 1px solid rgba(232, 232, 232, 0.3);
  font: 16px/1.4 var(--font-ui), system-ui, sans-serif;
}
.form :focus-visible { outline: 1px solid var(--accent); border-color: var(--accent); }
```

- [ ] **Step 9: Typecheck and commit**

Run: `npx tsc --noEmit && npx vitest run office/overlay`
Expected: clean; PASS.

```bash
git add office/overlay/place.ts office/overlay/place.test.ts office/cards/Card.tsx office/cards/BusinessCard.tsx panels/Panel.tsx panels/ContactForm.tsx "app/(office)/office.css"
git commit -m "Add the office card, business card, Read more panel and contact form

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Canvas: camera rig, hover, click, highlight, motion, overlay positions

**Files:**
- Modify: `office/OfficeCanvas.tsx`

**Interfaces:**
- Consumes:
  - `CameraRig`, `FOCUS_SECONDS`, `basePose`, `focusPose`, `makePose`, `readPose`, `applyPose`, `type Pose` (camera modules)
  - `setHighlight` (cleanEdges)
  - `HOTSPOTS`, `FOCUS_CAMERA`, `hitFor`, `highlightFor`, `highlightKey`, `type Hit`, `type HotspotName` (registry)
  - `focusedHotspot`, `IDLE_AT`, `type DirectorState` (director)
  - `ObjectMotion`, `findMotionNodes`, `CARD_NODE` (Task 3)
  - `placeCard` (Task 5)
  - `WALKIN_CAMERA` (`office/walkin/cameraPose.ts`)
- Produces:
  - `type OverlayElements = { label: HTMLElement | null; markers: Partial<Record<HotspotName, HTMLElement | null>>; card: HTMLElement | null }`
  - `OfficeCanvasProps` adds `director`, `hover`, `overlay`, `cardShown`, `onProgressCross`, `onSettled`, `onHover`, `onActivate` and `onDrawerOpen`
  - the host's `data-camera` (`"base"`, `"moving"` or `"focus"`) and `data-drawer` (`"shut"` or `"open"`)

- [ ] **Step 1: Replace `office/OfficeCanvas.tsx`**

```tsx
"use client";

import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3, type Object3D, type PerspectiveCamera } from "three";
import manifest from "./manifest.json";
import { theme } from "./theme";
import { applyCleanEdges, setHighlight, setLineResolution, updateEdgeFades, type CleanEdgesHandle } from "./style/cleanEdges";
import { findClipFor, makeClipSampler, progressToTime } from "./walkin/clipSampler";
import { useTurntable } from "./idle/useTurntable";
import { applySkippingGirl, findSkippingGirl } from "./walkin/skippingGirl";
import { findCamera, WALKIN_CAMERA } from "./walkin/cameraPose";
import { applyPose, makePose, readPose, type Pose } from "./camera/pose";
import { basePose, focusPose } from "./camera/basePose";
import { CameraRig, FOCUS_SECONDS } from "./camera/rig";
import { FOCUS_CAMERA, HOTSPOTS, highlightFor, highlightKey, hitFor, type Hit, type HotspotName } from "./hotspots/registry";
import { focusedHotspot, IDLE_AT, type DirectorState } from "./director/director";
import { CARD_NODE, findMotionNodes, ObjectMotion } from "./objects/motion";
import { placeCard } from "./overlay/place";

/** DOM the canvas positions each frame: the hover label, the touch markers and the open content card. */
export type OverlayElements = { label: HTMLElement | null; markers: Partial<Record<HotspotName, HTMLElement | null>>; card: HTMLElement | null };

export type OfficeCanvasProps = {
  /** Walk-in progress 0 → 1. Read every frame; never causes a render. */
  progress: RefObject<number>;
  /** Carries data-scene-ready, data-walkin-progress, data-camera and data-drawer for the page and for tests. */
  host: RefObject<HTMLElement | null>;
  director: RefObject<DirectorState>;
  /** What is hovered (pointer) or keyboard-focused (DOM); highlighted, labelled and teased. */
  hover: RefObject<Hit | null>;
  overlay: RefObject<OverlayElements>;
  /** The object whose content card is showing (its node anchors the card), or null. */
  cardShown: RefObject<HotspotName | null>;
  onProgressCross: (progress: number) => void;
  onSettled: () => void;
  onHover: (hit: Hit | null) => void;
  onActivate: (hit: Hit) => void;
  /** The drawer finished opening (true) or started closing (false). */
  onDrawerOpen: (open: boolean) => void;
};

type OfficeInfo = {
  edges: CleanEdgesHandle;
  focus: Partial<Record<HotspotName, { land: Pose; portrait: Pose | null }>>;
  standPortrait: Pose | null;
  anchors: Partial<Record<HotspotName, Vector3>>;
};

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Loads a model and restyles it as clean edges, keeping line widths right on resize and distance fades current. */
function useCleanEdges(url: string, keyFor?: (mesh: Object3D) => string | null) {
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
        highlightKey: keyFor,
      }),
    [gltf.scene, keyFor],
  );
  useEffect(() => setLineResolution(handle, width, height), [handle, width, height]);
  useFrame(({ camera }) => updateEdgeFades(handle, camera.position)); // dense detail fades with distance
  return { gltf, handle };
}

type StreetProps = Pick<OfficeCanvasProps, "progress" | "host" | "director" | "onProgressCross" | "onSettled"> & { info: RefObject<OfficeInfo | null> };

/** The street, the walk-in and the one place the render camera is driven from. */
function Street({ progress, host, director, onProgressCross, onSettled, info }: StreetProps) {
  const { gltf: street } = useCleanEdges(manifest.street.url);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const walkIn = useMemo(() => {
    const clip = findClipFor(street.animations, WALKIN_CAMERA);
    return { duration: clip.duration, sample: makeClipSampler(clip, street.scene), source: findCamera(street.scene, WALKIN_CAMERA) };
  }, [street]);
  const skippingGirl = useMemo(() => findSkippingGirl(street.scene), [street]);
  const reduced = useMemo(reducedMotion, []);
  const rig = useMemo(() => new CameraRig(), []);
  const poses = useMemo(() => ({ walk: makePose(), base: makePose(), focus: makePose(), now: makePose(), out: makePose() }), []);
  const seen = useRef("");
  const atEnd = useRef<boolean | null>(null);
  const written = useRef({ progress: -1, camera: "" });

  useFrame((_, dt) => {
    const p = progress.current;
    walkIn.sample(progressToTime(p, walkIn.duration));
    if (skippingGirl) applySkippingGirl(skippingGirl, p, reduced);
    readPose(walkIn.source, poses.walk);
    const office = info.current;
    basePose(poses.walk, office?.standPortrait ?? null, p, camera.aspect, poses.base);

    const d = director.current;
    const hotspot = focusedHotspot(d);
    const cams = hotspot ? office?.focus[hotspot] : undefined;
    if (cams) focusPose(cams.land, cams.portrait, camera.aspect, poses.focus);

    // A new state or a new object starts a camera move from wherever the camera is.
    const key = d.kind + (hotspot ?? "");
    if (key !== seen.current) {
      seen.current = key;
      readPose(camera, poses.now);
      if (d.kind === "focusing") {
        // Reduced motion: no camera move (spec 3.7). From the walk-in: cut, never fly through walls.
        if (cams && !reduced) rig.moveTo(poses.now, { kind: "pose", pose: poses.focus }, d.from === "walkIn" ? 0 : FOCUS_SECONDS);
        else rig.moveTo(poses.now, { kind: "base" }, 0);
      } else if (d.kind === "returning") {
        rig.moveTo(poses.now, { kind: "base" }, reduced ? 0 : FOCUS_SECONDS);
      }
    }
    if (rig.advance(dt) && (d.kind === "focusing" || d.kind === "returning")) onSettled();
    applyPose(rig.pose(poses.base, poses.out), camera);

    const end = p >= IDLE_AT;
    if (end !== atEnd.current) {
      atEnd.current = end;
      onProgressCross(p);
    }
    const el = host.current;
    if (!el) return;
    if (Math.abs(p - written.current.progress) > 0.00005) {
      el.dataset.walkinProgress = p.toFixed(4);
      el.dataset.sceneReady = "true";
      written.current.progress = p;
    }
    const cameraState = rig.moving ? "moving" : rig.goalKind === "pose" ? "focus" : "base";
    if (cameraState !== written.current.camera) {
      el.dataset.camera = cameraState;
      written.current.camera = cameraState;
    }
  });

  return <primitive object={street.scene} />;
}

type OfficeProps = Pick<OfficeCanvasProps, "host" | "director" | "hover" | "overlay" | "cardShown" | "onHover" | "onActivate" | "onDrawerOpen"> & {
  info: RefObject<OfficeInfo | null>;
};

/** The office model: hover, click, highlight, object motion, and where the label, markers and card go. */
function Office({ host, director, hover, overlay, cardShown, onHover, onActivate, onDrawerOpen, info }: OfficeProps) {
  const { gltf: office, handle } = useCleanEdges(manifest.office.url, highlightKey);
  useTurntable(office.scene);
  const motion = useMemo(() => new ObjectMotion(), []);
  const nodes = useMemo(() => findMotionNodes(office.scene), [office]);
  const cardNode = useMemo(() => office.scene.getObjectByName(CARD_NODE) ?? null, [office]);
  const reduced = useMemo(reducedMotion, []);
  const shown = useRef<string | null>("");
  const drawerWasOpen = useRef(false);
  const v = useMemo(() => new Vector3(), []);

  useEffect(() => {
    const pose = (name: string) => {
      const node = office.scene.getObjectByName(name);
      return node ? readPose(node, makePose()) : null;
    };
    const focus: OfficeInfo["focus"] = {};
    const anchors: OfficeInfo["anchors"] = {};
    for (const h of HOTSPOTS) {
      const land = pose(FOCUS_CAMERA[h]);
      if (land) focus[h] = { land, portrait: pose(`${FOCUS_CAMERA[h]}_portrait`) };
      const node = office.scene.getObjectByName(h);
      if (node) {
        const box = new Box3().setFromObject(node);
        anchors[h] = new Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
      }
    }
    info.current = { edges: handle, focus, standPortrait: pose("cam_stand_portrait"), anchors };
    return () => {
      info.current = null;
    };
  }, [office, handle, info]);

  useFrame(({ camera, size, clock }, dt) => {
    const d = director.current;
    const focused = d.kind === "focusing" || d.kind === "focused" ? d.target : null;
    motion.update(nodes, { open: focused?.hotspot ?? null, hovered: hover.current?.hotspot ?? null, reduced }, dt, clock.elapsedTime);
    if (motion.drawerOpen !== drawerWasOpen.current) {
      drawerWasOpen.current = motion.drawerOpen;
      onDrawerOpen(motion.drawerOpen);
      if (host.current) host.current.dataset.drawer = motion.drawerOpen ? "open" : "shut";
    }

    const lit = hover.current ?? focused;
    const key = lit ? `${highlightFor(lit)}:${lit.hotspot}` : null;
    if (key !== shown.current) {
      setHighlight(handle, lit ? highlightFor(lit) : null, lit ? theme.accents[lit.hotspot] : theme.line);
      shown.current = key;
    }

    const project = (p: Vector3) => {
      v.copy(p).project(camera);
      return v.z > 1 ? { x: Number.NaN, y: Number.NaN } : { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
    };
    const anchors = info.current?.anchors;
    const { label, markers, card } = overlay.current;
    const hovered = hover.current;
    if (label && anchors && hovered) {
      const a = anchors[hovered.hotspot];
      if (a) {
        const s = project(a);
        label.style.transform = `translate(${s.x}px, ${s.y}px)`;
      }
    }
    if (anchors) for (const h of HOTSPOTS) {
      const el = markers[h];
      const a = anchors[h];
      if (el && a) {
        const s = project(a);
        el.style.transform = `translate(${s.x}px, ${s.y}px)`;
      }
    }
    if (card && cardShown.current === "hs_drawer" && cardNode) {
      const s = project(cardNode.getWorldPosition(new Vector3()));
      const { left, top } = placeCard(s, { width: card.offsetWidth, height: card.offsetHeight }, size);
      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
    }
  });

  const interactive = () => {
    const d = director.current;
    return d.kind === "idle" || d.kind === "focused";
  };
  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive()) return;
    e.stopPropagation();
    const hit = hitFor(e.object, focusedHotspot(director.current));
    onHover(hit);
    document.body.style.cursor = hit ? "pointer" : "";
  };
  const onPointerOut = () => {
    onHover(null);
    document.body.style.cursor = "";
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive()) return;
    const hit = hitFor(e.object, focusedHotspot(director.current));
    if (!hit) return;
    e.stopPropagation();
    onActivate(hit);
  };

  return <primitive object={office.scene} onPointerMove={onPointerMove} onPointerOut={onPointerOut} onClick={onClick} />;
}

export default function OfficeCanvas(props: OfficeCanvasProps) {
  const info = useRef<OfficeInfo | null>(null);
  return (
    <Canvas dpr={[1, 2]} camera={{ fov: 50, near: 0.1, far: 10000 }} gl={{ antialias: true }}>
      <color attach="background" args={[theme.background]} />
      <fog attach="fog" args={[theme.background, theme.fogNear, theme.fogFar]} />
      <Suspense fallback={null}>
        <Street {...props} info={info} />
        {/* The office streams in separately so the street can show first. */}
        <Suspense fallback={null}>
          <Office {...props} info={info} />
        </Suspense>
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(manifest.street.url);
```

Interaction rule in `hitFor`: with an object focused, only that object's items count. A click elsewhere in the scene does nothing, and the back control, Esc or Back return to the standing spot.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors only in `office/OfficeExperience.tsx`, which doesn't pass the new props yet. Task 7 replaces it, so commit both together at the end of Task 7.

---

### Task 7: Page layer and milestone 1 e2e

**Files:**
- Modify: `office/OfficeExperience.tsx`, `e2e/office.spec.ts`
- Create: `e2e/office-interaction.spec.ts`

**Interfaces:**
- Consumes:
  - Task 1: `useOfficeLocation`, `pushLayer`, `clearLayer`, `sceneFor`, `NO_LAYER`, `type Layer`
  - registry: `pathForTarget` (`office/scene/targets.ts`), `labelFor`, `sameHit`, `HOTSPOTS`
  - director: `reduceDirector`, `initialDirector`, `describeDirector`, `isLocked`
  - `COPY`; `Card`, `BusinessCard`, `Panel`, `ContactForm`; `OfficeCanvas` and `OverlayElements` (Task 6)
- Produces:
  - nav controls with these accessible names: `COPY.labels.hs_crate` (button), `COPY.labels.hs_drawer` (link `href="/contact"`), `COPY.labels.hs_shelf` (button), `COPY.labels.hs_monitor` (button)
  - the business card `section` named `CONTACT_NAME`, and its "Write to me" button
  - the dialog named `COPY.contact.title`

- [ ] **Step 1: Write the failing e2e `e2e/office-interaction.spec.ts`**

```ts
import { test, expect, type Page } from "@playwright/test";

const office = (page: Page) => page.locator(".office");
const progress = async (page: Page) => Number(await office(page).getAttribute("data-walkin-progress"));

async function standInOffice(page: Page) {
  await page.goto("/");
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 15_000 });
}

async function openDrawer(page: Page) {
  const link = page.getByRole("link", { name: "Get in touch" });
  await link.focus();
  await page.keyboard.press("Enter");
  return link;
}

test("tabbing to an object labels and lights it", async ({ page }) => {
  await standInOffice(page);
  await page.getByRole("link", { name: "Get in touch" }).focus();
  await expect(office(page)).toHaveAttribute("data-hover", "hs_drawer");
  await page.getByRole("button", { name: "The work" }).focus();
  await expect(office(page)).toHaveAttribute("data-hover", "hs_crate");
});

test("the drawer opens with the business card, Write to me opens the form, Esc peels one layer at a time", async ({ page }) => {
  await standInOffice(page);
  const link = await openDrawer(page);
  await expect(page).toHaveURL(/\/contact$/);
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_drawer", { timeout: 10_000 });
  await expect(office(page)).toHaveAttribute("data-drawer", "open", { timeout: 10_000 });
  const card = page.getByRole("region", { name: "Kasper Simonsen" });
  await expect(card).toBeVisible();
  await expect(card.getByRole("link", { name: "hello@kaspersimonsen.dev" })).toHaveAttribute("href", "mailto:hello@kaspersimonsen.dev");

  const write = card.getByRole("button", { name: "Write to me" });
  await write.click();
  const dialog = page.getByRole("dialog", { name: "Get in touch" });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/contact$/);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(write).toBeFocused();
  await expect(page).toHaveURL(/\/contact$/);

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/$/);
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 10_000 });
  await expect(office(page)).toHaveAttribute("data-drawer", "shut", { timeout: 10_000 });
  await expect(link).toBeAttached();
  expect(await progress(page)).toBeGreaterThan(0.99);
});

test("browser Back peels the same layers", async ({ page }) => {
  await standInOffice(page);
  await openDrawer(page);
  await page.getByRole("button", { name: "Write to me" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("region", { name: "Kasper Simonsen" })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 10_000 });
});

test("a double activation adds one history entry, so one Back closes it", async ({ page }) => {
  await standInOffice(page);
  await page.getByRole("button", { name: "Monitor" }).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", /focus(ing|ed):hs_monitor/, { timeout: 10_000 });
  await page.goBack();
  await expect(office(page)).toHaveAttribute("data-director", /returning|idle/, { timeout: 10_000 });
  expect(new URL(page.url()).pathname).toBe("/");
});

test("the crate, shelf and monitor focus locally with no URL change", async ({ page }) => {
  await standInOffice(page);
  for (const [name, hotspot] of [["The work", "hs_crate"], ["What I do", "hs_shelf"], ["Monitor", "hs_monitor"]] as const) {
    await page.getByRole("button", { name }).focus();
    await page.keyboard.press("Enter");
    await expect(office(page)).toHaveAttribute("data-director", `focused:${hotspot}`, { timeout: 10_000 });
    expect(new URL(page.url()).pathname).toBe("/");
    await page.getByRole("button", { name: "Back" }).click();
    await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 10_000 });
  }
});

test("a reload doesn't reopen a local layer", async ({ page }) => {
  await standInOffice(page);
  await page.getByRole("button", { name: "Monitor" }).focus();
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_monitor", { timeout: 10_000 });
  await page.reload();
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  await expect(office(page)).toHaveAttribute("data-director", /walkIn|idle/);
});

test("Esc with focus outside the panel still backs out exactly one layer", async ({ page }) => {
  await standInOffice(page);
  await openDrawer(page);
  await page.getByRole("button", { name: "Write to me" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page).toHaveURL(/\/contact$/);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/$/);
});

test("focus stays inside the panel", async ({ page }) => {
  await standInOffice(page);
  await openDrawer(page);
  await page.getByRole("button", { name: "Write to me" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  for (let i = 0; i < 15; i++) await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"))).toBe(true);
});

test("the walk-in can't be scrolled while an object is open", async ({ page }) => {
  await standInOffice(page);
  await openDrawer(page);
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_drawer", { timeout: 10_000 });
  await page.mouse.wheel(0, -5000);
  await page.waitForTimeout(2000);
  expect(await progress(page)).toBeGreaterThan(0.99);
});

test("refreshing /contact gives the standalone page", async ({ page }) => {
  const res = await page.goto("/contact");
  expect(res?.status()).toBe(200);
  await expect(office(page)).toHaveCount(0);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("opens the drawer without moving the camera", async ({ page }) => {
    await standInOffice(page);
    await openDrawer(page);
    await expect(office(page)).toHaveAttribute("data-director", "focused:hs_drawer", { timeout: 10_000 });
    await expect(office(page)).toHaveAttribute("data-camera", "base");
    await expect(office(page)).toHaveAttribute("data-drawer", "open");
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("docks the card at the bottom of the screen", async ({ page }) => {
    await standInOffice(page);
    await openDrawer(page);
    const card = page.getByRole("region", { name: "Kasper Simonsen" });
    await expect(card).toBeVisible({ timeout: 10_000 });
    const box = await card.boundingBox();
    expect(box && box.y + box.height).toBeGreaterThan(844 - 40);
    expect(box && box.x).toBeGreaterThanOrEqual(15);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test e2e/office-interaction.spec.ts`
Expected: FAIL. There are no "Get in touch", "The work" or "Monitor" controls yet. (The project doesn't typecheck either until Step 3; Playwright still runs the dev server.)

- [ ] **Step 3: Replace `office/OfficeExperience.tsx`**

```tsx
"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useReducer, useRef, useState, type CSSProperties } from "react";
import OfficeErrorBoundary from "./OfficeErrorBoundary";
import { theme } from "./theme";
import { COPY } from "./copy";
import { useWalkInProgress } from "./walkin/useWalkInProgress";
import { describeDirector, initialDirector, isLocked, reduceDirector, type DirectorState } from "./director/director";
import { pathForTarget } from "./scene/targets";
import { layerOf, sceneFor } from "./scene/location";
import { clearLayer, pushLayer, useOfficeLocation } from "./history";
import { HOTSPOTS, labelFor, sameHit, type Hit, type HotspotName } from "./hotspots/registry";
import type { OverlayElements } from "./OfficeCanvas";
import Card from "./cards/Card";
import BusinessCard from "./cards/BusinessCard";
import Panel from "@/panels/Panel";
import ContactForm from "@/panels/ContactForm";

// three.js never runs on the server and never ships to pages that don't render the office.
const OfficeCanvas = dynamic(() => import("./OfficeCanvas"), { ssr: false });

const toEnd = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
const back = () => window.history.back();

/** Fixed full-screen office over a scroll track exactly as long as the walk-in. The location drives everything. */
export default function OfficeExperience() {
  const { pathname, layer } = useOfficeLocation();
  const scene = sceneFor(pathname, layer);
  const host = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const progress = useWalkInProgress(track);
  const [state, dispatch] = useReducer(reduceDirector, undefined, initialDirector);
  const director = useRef<DirectorState>(state);
  director.current = state;
  const hover = useRef<Hit | null>(null);
  const [hovered, setHovered] = useState<Hit | null>(null);
  const overlay = useRef<OverlayElements>({ label: null, markers: {}, card: null });
  const cardRef = useRef<HTMLElement | null>(null);
  const cardShown = useRef<HotspotName | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // A reload keeps history.state; a fresh office starts with no layer.
  useEffect(clearLayer, []);

  // The location asks for a target; the director moves the camera there (or home).
  const targetKey = scene.target ? `${scene.target.hotspot}:${scene.target.item ?? ""}` : "";
  useEffect(() => {
    if (scene.target) {
      if (director.current.kind === "walkIn") toEnd();
      dispatch({ type: "focus", target: scene.target });
    } else dispatch({ type: "release" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  const onHover = useCallback((hit: Hit | null) => {
    if (sameHit(hover.current, hit)) return;
    hover.current = hit;
    setHovered(hit);
    if (host.current) host.current.dataset.hover = hit ? hit.hotspot : "";
  }, []);

  // One history entry per new layer: what the live entry already shows is never pushed again (double clicks, repeat Enter).
  const live = () => {
    const l = layerOf(window.history.state);
    return { layer: l, scene: sceneFor(window.location.pathname, l) };
  };
  const activate = useCallback((hit: Hit) => {
    const now = live().scene.target;
    if (now && sameHit(now, hit)) return;
    pushLayer({ focus: hit.hotspot, reading: false }, pathForTarget(hit) ?? "/");
  }, []);
  const read = useCallback(() => {
    const { layer: l, scene: s } = live();
    if (!l.reading && s.target) pushLayer({ focus: s.target.hotspot, reading: true });
  }, []);

  // Esc backs out one layer. With focus inside the panel, its own handler takes Esc and stops it reaching here.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const d = director.current;
      if (live().scene.reading || d.kind === "focusing" || d.kind === "focused") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Scrolling would replay the walk-in under an open object.
  useEffect(() => {
    document.documentElement.classList.toggle("office-locked", isLocked(state));
    return () => document.documentElement.classList.remove("office-locked");
  }, [state]);

  const focusedOn = state.kind === "focused" ? state.target.hotspot : null;
  const showCard = focusedOn === "hs_drawer" && drawerOpen;
  cardShown.current = showCard ? "hs_drawer" : null;
  // The canvas positions the card; hand it the element once React has attached it.
  useEffect(() => {
    overlay.current.card = cardRef.current;
  });

  const navProps = (hit: Hit) => ({ onFocus: () => onHover(hit), onBlur: () => onHover(null) });

  return (
    <div ref={host} className="office" data-walkin-progress="0" data-director={describeDirector(state)} data-drawer="shut">
      <div className="office-stage">
        <OfficeErrorBoundary host={host}>
          <OfficeCanvas
            progress={progress}
            host={host}
            director={director}
            hover={hover}
            overlay={overlay}
            cardShown={cardShown}
            onProgressCross={(value) => dispatch({ type: "progress", value })}
            onSettled={() => dispatch({ type: "settled" })}
            onHover={onHover}
            onActivate={activate}
            onDrawerOpen={setDrawerOpen}
          />
        </OfficeErrorBoundary>
      </div>

      <nav className="office-nav" aria-label={COPY.nav}>
        <ul>
          <li>
            <button type="button" onClick={() => activate({ hotspot: "hs_crate", item: null })} {...navProps({ hotspot: "hs_crate", item: null })}>
              {COPY.labels.hs_crate}
            </button>
          </li>
          <li>
            <a
              href="/contact"
              onClick={(e) => {
                e.preventDefault();
                activate({ hotspot: "hs_drawer", item: null });
              }}
              {...navProps({ hotspot: "hs_drawer", item: null })}
            >
              {COPY.labels.hs_drawer}
            </a>
          </li>
          <li>
            <button type="button" onClick={() => activate({ hotspot: "hs_shelf", item: null })} {...navProps({ hotspot: "hs_shelf", item: null })}>
              {COPY.labels.hs_shelf}
            </button>
          </li>
          <li>
            <button type="button" onClick={() => activate({ hotspot: "hs_monitor", item: null })} {...navProps({ hotspot: "hs_monitor", item: null })}>
              {COPY.labels.hs_monitor}
            </button>
          </li>
        </ul>
      </nav>

      <div
        ref={(el) => {
          overlay.current.label = el;
        }}
        className="office-label"
        aria-hidden="true"
        hidden={!hovered}
        style={{ "--accent": hovered ? theme.accents[hovered.hotspot] : theme.line } as CSSProperties}
      >
        {hovered ? labelFor(hovered, COPY.labels) : ""}
      </div>
      {HOTSPOTS.map((h) => (
        <span
          key={h}
          ref={(el) => {
            overlay.current.markers[h] = el;
          }}
          className="office-marker"
          aria-hidden="true"
        />
      ))}

      {focusedOn && !scene.reading && (
        <button type="button" className="office-back" onClick={back}>
          {COPY.back}
        </button>
      )}

      {showCard && (
        <Card hotspot="hs_drawer" titleId="card-title" cardRef={cardRef}>
          <BusinessCard titleId="card-title" onWrite={read} />
        </Card>
      )}

      {scene.reading && scene.target?.hotspot === "hs_drawer" && (
        <Panel hotspot="hs_drawer" titleId="panel-title" onClose={back}>
          <ContactForm titleId="panel-title" level={2} />
        </Panel>
      )}

      <div ref={track} className="office-track" style={{ height: `${theme.walkInScreens * 100}vh` }} aria-hidden="true" />
    </div>
  );
}
```

- [ ] **Step 4: Add the director check to `e2e/office.spec.ts`** (append)

```ts
test("the director is idle at the standing spot and the camera follows the walk-in", async ({ page }) => {
  await openOffice(page);
  await expect(office(page)).toHaveAttribute("data-director", "walkIn");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 15_000 });
  await expect(office(page)).toHaveAttribute("data-camera", "base");
});
```

- [ ] **Step 5: Run everything**

Run: `npx tsc --noEmit && npx vitest run && npx playwright test`
Expected:
- tsc clean;
- all unit tests green;
- 7 tests in `office.spec.ts` and 12 in `office-interaction.spec.ts`, all green.

If "the drawer opens…" fails because one Esc pops two layers, the panel's Escape isn't stopping the window listener. Confirm the panel's `onKeyDown` runs, and that `stopPropagation` plus `stopImmediatePropagation` on the native event keep it from reaching `window`. Fix the cause; don't add delays.

- [ ] **Step 6: Build**

Run: `RESEND_API_KEY=re_placeholder_for_local_build npm run build`
Expected: `Models OK` and a successful build. The placeholder only satisfies `/api/contact`'s module-level `new Resend()`; Vercel has the real key.

- [ ] **Step 7: Commit**

```bash
git add office/OfficeCanvas.tsx office/OfficeExperience.tsx e2e/office.spec.ts e2e/office-interaction.spec.ts
git commit -m "Make the office navigable: hover, focus moves, history layers and the drawer's business card

Every object is reachable by pointer and keyboard and lights, labels and
teases on hover. Clicking moves the camera to it; the drawer slides open
to a business card whose Write to me opens the contact form. The URL
and history drive the scene, so Back and Esc peel one layer at a time.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Review with Kasper

- [ ] **Step 1: Capture.** With `npm run dev` running, use the capture script from phase 1 (`.superpowers/sdd/2026-10-02-office-phase-3-interactions/capture.mjs`, adapted to click through states) at 1440×900 and 390×844 for each of these states:
  - the standing spot;
  - hover on each object (focus each nav control);
  - the crate, shelf and monitor focused;
  - the drawer open with its card;
  - the contact panel.

  Save them into `.superpowers/sdd/2026-10-02-office-interactions-m1/shots/`. Check yourself first:
  - the drawer slides straight out of the pedestal;
  - the card sits right of the drawer without covering it;
  - every focus pose frames its object;
  - on the phone the card is docked and nothing is cut off.
- [ ] **Step 2: Kasper clicks through it.** Tell him to open http://localhost:3010, then:
  - hover and Tab through the objects;
  - open the drawer;
  - use Write to me, Esc and Back;
  - try the crate, shelf and monitor focus moves.

  List the drafts in `office/copy.ts` for approval. Ask about tease strength, camera speed (`FOCUS_SECONDS`), drawer travel (`DRAWER_OPEN_M`) and the card's look. **End the turn** and wait.
- [ ] **Step 3: Apply feedback** with the knobs: `TEASE_SECONDS`, `RECORD_NUDGE_M`, `DRAWER_PEEK_M`, `ORNAMENT_BOB_M`, `DRAWER_OPEN_M`, `DRAWER_SECONDS` (`office/objects/motion.ts`); `FOCUS_SECONDS` (`office/camera/rig.ts`); the `FOCUS` tuples (`greybox_office.py`); `.office-card` and `.panel` (`office.css`); `office/copy.ts`. Re-run Task 7 Step 5 after each change, and commit each change separately.
