# Office redesign, phase 3 (Office and director): implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the office interactive. Hovering or tabbing to an object lights it in its section colour with a label. Clicking it moves the camera to that object. URLs such as `/work/manuva`, `/contact` and `/services/<slug>` open a panel over the scene, and Back, Esc or the close control return the camera to the standing spot. Phones get tap markers and portrait framing.

**Architecture:** A pure director reducer (walk-in → idle → focusing → focused → returning) is the single source of scene state. The URL drives it through `targetForPath`; crate and shelf browsing and the monitor are local states with their own history entry and no URL. A pure camera rig blends from the current pose to a goal: the walk-in pose (with portrait and aspect handling), or a Blender focus camera. One `useFrame` in the canvas applies it. Panels are Next parallel and intercepting routes (`@panel`, `(.)work/[slug]`, `(.)contact`, `(.)services/[slug]`) inside the `(office)` layout, so the canvas never unmounts. Direct visits render standalone pages.

**Tech Stack:** Next 16.2.4 App Router (parallel and intercepting routes), React 19.2.4, @react-three/fiber 9.8 (pointer events on `<primitive>`), three 0.186, Vitest 5, Playwright 1.63, Blender 5.2 via the Blender MCP.

**Spec:** `docs/superpowers/specs/2026-10-01-office-redesign-design.md`. Phase 3 is section 9, item 3. The behaviour comes from sections 3.4–3.7, 5.1–5.3 and 7.3–7.5.

## Global Constraints

- **Git:** branch `redesign/office`. Never push without asking Kasper. Stage files by explicit path, never `git add -A` (`.agents/` stays untracked). Commit messages are descriptive and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. LF line endings; check with `git ls-files --eol <path>`.
- **Next 16:** read the relevant guide in `node_modules/next/dist/docs/` before writing Next code (AGENTS.md). Parallel and intercepting routes are covered in `01-app/03-api-reference/03-file-conventions/parallel-routes.md`, `intercepting-routes.md` and `default.md`.
- **No scroll jumps:** every `Link` in the office uses `scroll={false}` and every `router.push` uses `{ scroll: false }`. Otherwise Next scrolls to the top and the walk-in rewinds to the street.
- **The URL is the single source of truth** (spec 5.2): `/` is the standing spot, `/work/<slug>` focuses the crate, `/contact` the drawer, `/services/<slug>` the shelf. Browsing the crate or the shelf before picking, and the monitor, are local only.
- **Section colours** (spec 4): hover and focus use `theme.accents[hotspot]`. Work (`hs_crate`) is `#C6FF3D`, services (`hs_shelf`) `#FF3B30`, contact (`hs_drawer`) `#2EF2FF`, the monitor (`hs_monitor`) `#FFB224`. One colour shows at a time. Touch markers and non-section UI stay white (`theme.line`).
- **Type:** Inter Tight is `--font-ui`, IBM Plex Mono is `--font-mono`, both already loaded in `app/(office)/layout.tsx`. Nothing from the old design system.
- **Node names:**
  - hotspots `hs_crate` (records `hs_crate__record_00`…`_08`), `hs_drawer` (sliding front `hs_drawer__drawer`), `hs_monitor`, `hs_shelf` (ornaments `hs_shelf__ornament_00`…`_04`);
  - focus cameras `cam_focus_crate`, `cam_focus_drawer`, `cam_focus_monitor` and `cam_focus_shelf`, each with a `_portrait` variant.
- **Copy:** every visitor-facing word in the office lives in `office/copy.ts` as a draft. Kasper approves it before launch (spec 4). Case-study and service bodies reuse the existing site copy verbatim.
- **Reduced motion** (spec 3.7): opening an object moves no camera; panels fade and don't slide.
- **Accessibility** (spec 7.3): every hotspot item can be reached by keyboard through real links. Tabbing highlights the object in 3D and Enter opens it. Panels are dialogs: they trap focus, Esc closes them, and focus returns to the trigger.
- **Scope:** no new npm dependencies. Components are verified with Playwright, pure logic with Vitest (node environment).
- **Standalone pages:** `/work/[slug]` and `/contact` stay in `(main)` until phase 5. `/services/[slug]` is new, standalone in `(office)`.

## Review Focus

1. **Rapid input during a camera move.** A visitor presses Esc or Back while the camera is still flying in, or picks another object mid-move. The camera retargets smoothly from wherever it is, the director never sticks in `focusing`, and the scroll lock lifts once the camera is back. *Tests: Task 3 (reducer), Task 4 (rig retarget), Task 9 (e2e: Esc mid-move).*
2. **A panel URL arriving mid-walk-in.** A visitor tabs to a link at 40% of the walk-in, or presses Forward into `/work/<slug>`. The camera cuts straight to the focus pose instead of flying through walls, and closing the panel leaves the visitor at the standing spot. *Tests: Task 3 (focus from walkIn), Task 4 (zero-duration move), Task 9 (e2e).*
3. **Next's scroll-to-top on soft navigation** rewinding the walk-in to the street when a panel opens or closes. *Tests: Task 9 (e2e: progress stays at 1 through open, Back and Esc).*
4. **Focus getting lost.** Tab escapes the dialog, focus lands on `<body>` after closing, or a panel opened by a 3D click returns focus to nowhere. *Tests: Task 9 (e2e: trap, return to the trigger link).*
5. **Narrow screens.** At 390×844 and at 4:3 the standing spot and every focus pose keep their objects in frame, and the panel becomes a full-screen sheet. *Tests: Task 4 (basePose, focusPose, widenForAspect), Task 6 (Blender framing check), Task 10 (visual review).*

---

## File structure

| Path | Responsibility |
|---|---|
| `content/work.ts`, `content/services.ts`, `content/contact.ts` | Case studies, services and contact details, shared by the 3D scene, panels and standalone pages |
| `office/hotspots/registry.ts` | Hotspot names, focus cameras, record/ornament → content mapping, pointer hit-testing, highlight keys |
| `office/scene/targets.ts` | URL ↔ scene target (`targetForPath`, `pathForTarget`) |
| `office/director/director.ts` | Director state machine (pure reducer) |
| `office/camera/pose.ts` | `Pose` type; read, copy, blend and apply poses; aspect widening; easing |
| `office/camera/basePose.ts` | The walk-in pose for a frame (portrait standing pose, narrow-screen widening) and focus-pose selection |
| `office/camera/rig.ts` | `CameraRig`: eases from the current pose to a goal over a duration |
| `office/style/cleanEdges.ts` | Gains per-hotspot highlight line materials and `setHighlight` |
| `scripts/blender/greybox_office.py`, `office/manifest.json` | Focus cameras |
| `office/OfficeCanvas.tsx` | Camera rig in the frame loop, hover and click on the office, highlight, label and marker positions |
| `office/OfficeExperience.tsx` | Director state, URL sync, local focus history, scroll lock, keyboard nav, overlays |
| `office/copy.ts` | Visitor-facing words in the office (drafts for Kasper) |
| `panels/Panel.tsx` | Accessible dialog shell over the scene |
| `panels/WorkArticle.tsx`, `panels/ServiceArticle.tsx`, `panels/ContactForm.tsx` | Panel and standalone bodies |
| `app/(office)/layout.tsx` | Renders the `panel` slot |
| `app/(office)/@panel/**` | Slot defaults and intercepting routes |
| `app/(office)/services/[slug]/page.tsx` | Standalone service page |
| `app/(office)/office.css` | Nav, label, markers, browse, back control, panel and article styles |
| `app/sitemap.ts` | Adds `/services/*` |
| `e2e/office-interaction.spec.ts` | Interaction e2e |

---

### Task 1: Content modules

**Files:**
- Create: `content/work.ts`, `content/services.ts`, `content/contact.ts`, `content/content.test.ts`

**Interfaces:**
- Produces:
  - `type WorkItem = { slug: string; name: string; headline: string; years: string; role: string; stack: string[]; liveUrl?: string; intro: string[]; sections: CaseSection[] }`, `work: WorkItem[]` (newest first; the crate's records follow this order), `findWork(slug: string): WorkItem | undefined`
  - `type Service = { slug: string; number: string; name: string; meta: string; timeline: string; description: string; fitsLabel: string; fitsBody: string; requiresLabel: string; requiresBody: string; replyHint: string; ctaLabel: string; topic: "tools" | "platforms" }`, `services: Service[]`, `findService(slug: string): Service | undefined`
  - `CONTACT_EMAIL = "hello@kaspersimonsen.dev"`, `subjectForTopic(topic: string | undefined): string`

- [ ] **Step 1: Write the failing tests `content/content.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { findWork, work } from "./work";
import { findService, services } from "./services";
import { CONTACT_EMAIL, subjectForTopic } from "./contact";

describe("work", () => {
  it("has the three case studies, newest first", () =>
    expect(work.map((w) => w.slug)).toEqual(["pac-forge", "manuva", "silio"]));
  it("gives every item a name, a headline and an intro", () => {
    for (const w of work) {
      expect(w.name).not.toBe("");
      expect(w.headline).not.toBe("");
      expect(w.intro.length).toBeGreaterThan(0);
    }
  });
  it("has unique slugs", () => expect(new Set(work.map((w) => w.slug)).size).toBe(work.length));
  it("finds by slug", () => {
    expect(findWork("manuva")?.name).toBe("Manuva");
    expect(findWork("nope")).toBeUndefined();
  });
});

describe("services", () => {
  it("has the two services with url-safe slugs", () =>
    expect(services.map((s) => s.slug)).toEqual(["tools-and-dashboards", "platforms-and-systems"]));
  it("keeps the existing headlines and contact topics", () => {
    expect(services.map((s) => s.name)).toEqual(["Tools & Dashboards", "Platforms & Systems"]);
    expect(services.map((s) => s.topic)).toEqual(["tools", "platforms"]);
  });
  it("finds by slug", () => {
    expect(findService("platforms-and-systems")?.number).toBe("02");
    expect(findService("nope")).toBeUndefined();
  });
});

describe("contact", () => {
  it("has the address", () => expect(CONTACT_EMAIL).toBe("hello@kaspersimonsen.dev"));
  it.each([
    ["tools", "Tools & dashboards enquiry"],
    ["platforms", "Platforms & systems enquiry"],
    ["other", ""],
    [undefined, ""],
  ])("subject for %j", (topic, subject) => expect(subjectForTopic(topic)).toBe(subject));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run content`
Expected: FAIL, `Cannot find module './work'`.

- [ ] **Step 3: Create `content/work.ts`**

```ts
import { currently, previously, type Project } from "@/app/(main)/work/data";
import { caseStudies, type CaseSection } from "@/app/(v2)/v2/work/caseStudies";

/** A case study as the office shows it. Record sleeves, panels and standalone pages all read this. */
export type WorkItem = {
  slug: string;
  name: string;
  headline: string;
  years: string;
  role: string;
  stack: string[];
  liveUrl?: string;
  intro: string[];
  sections: CaseSection[];
};

function toItem(p: Project): WorkItem {
  const study = caseStudies.find((c) => c.slug === p.slug);
  return {
    slug: p.slug,
    name: p.displayName,
    headline: p.headline,
    years: p.yearRange,
    role: p.role,
    stack: p.stack,
    liveUrl: p.liveUrl,
    intro: study?.intro ?? [p.description],
    sections: study?.sections ?? [],
  };
}

/** Newest first: current work, then previous. The crate's records follow this order. */
export const work: WorkItem[] = [...currently, ...previously].map(toItem);

export function findWork(slug: string): WorkItem | undefined {
  return work.find((w) => w.slug === slug);
}
```

- [ ] **Step 4: Create `content/services.ts`** (copy verbatim from `app/(main)/work-with-me/Offerings.tsx`)

```ts
/** What Kasper offers. The shelf's ornaments, service panels and /services/<slug> pages all read this. */
export type Service = {
  slug: string;
  number: string;
  name: string;
  meta: string;
  timeline: string;
  description: string;
  fitsLabel: string;
  fitsBody: string;
  requiresLabel: string;
  requiresBody: string;
  replyHint: string;
  ctaLabel: string;
  /** `?topic=` for the contact form, which pre-fills the subject. */
  topic: "tools" | "platforms";
};

export const services: Service[] = [
  {
    slug: "tools-and-dashboards",
    number: "01",
    name: "Tools & Dashboards",
    meta: "Fixed Scope",
    timeline: "1–3 Weeks",
    description:
      "Small builds for teams that need something specific done properly. One problem, one interface, and whatever has to happen underneath it. Priced per project. Delivered in weeks, not months.",
    fitsLabel: "Typically fits",
    fitsBody:
      "Internal tools only your team uses. Workflow apps you can't buy off the shelf. Custom reporting views. Client portals. Small Shopify add-ons. Making two systems that don't speak to each other start speaking.",
    requiresLabel: "What I need from you",
    requiresBody:
      "A clear description of what it should do. Access to any existing systems it has to talk to. Someone who can answer questions as they come up — ideally not by committee.",
    replyHint: "— I reply within 24 hours. Usually faster.",
    ctaLabel: "Start a small build",
    topic: "tools",
  },
  {
    slug: "platforms-and-systems",
    number: "02",
    name: "Platforms & Systems",
    meta: "Per Project",
    timeline: "6–16 Weeks",
    description:
      "Longer builds. The whole thing — how it's put together, where the data lives, what users interact with, what operators interact with. Usually something that doesn't exist yet, for a business that needs it to. Priced per project after we've talked it through.",
    fitsLabel: "Typically fits",
    fitsBody:
      "Apps that serve many companies at once and absolutely can't leak data between them. AI-powered tools that do real work, not a wrapper around ChatGPT. Shopify stores with something unusual going on behind them. Software running a factory floor, a warehouse, or a production plant. Anything where the numbers have to reconcile and the audit trail has to hold up.",
    requiresLabel: "How it usually goes",
    requiresBody:
      "A short scoping call first. Then a written proposal with scope, milestones, timeline, and price. I build in weekly visible chunks — you see real progress every week, not a demo at the end after months of silence.",
    replyHint: "— expect a scoping call within the week",
    ctaLabel: "Start a platform",
    topic: "platforms",
  },
];

export function findService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}
```

- [ ] **Step 5: Create `content/contact.ts`**

```ts
export const CONTACT_EMAIL = "hello@kaspersimonsen.dev";

// Same subjects as the old /contact form, so ?topic= links keep working on both.
const SUBJECTS: Record<string, string> = {
  tools: "Tools & dashboards enquiry",
  platforms: "Platforms & systems enquiry",
};

/** Pre-filled subject for a `?topic=` value; empty for anything else. */
export function subjectForTopic(topic: string | undefined): string {
  return (topic && SUBJECTS[topic]) || "";
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `npx vitest run content`
Expected: PASS, all tests green. If `findWork("manuva")?.name` isn't `"Manuva"`, read `displayName` in `app/(main)/work/data.ts` and fix the test's expectation, not the module.

- [ ] **Step 7: Commit**

```bash
git add content/work.ts content/services.ts content/contact.ts content/content.test.ts
git commit -m "Add shared work, services and contact content for the office

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Hotspot registry and URL targets

**Files:**
- Create: `office/hotspots/registry.ts`, `office/hotspots/registry.test.ts`, `office/scene/targets.ts`, `office/scene/targets.test.ts`

**Interfaces:**
- Consumes: `work`, `findWork`, `services`, `findService` (Task 1).
- Produces:
  - `HOTSPOTS = ["hs_crate", "hs_drawer", "hs_monitor", "hs_shelf"] as const`, `type HotspotName`, `type Hit = { hotspot: HotspotName; item: string | null }`
  - `FOCUS_CAMERA: Record<HotspotName, string>`, `RECORDS = 9`, `ORNAMENTS = 5`
  - `itemAt(hotspot, index): string | null`, `itemNode(hotspot, slug): string | null`
  - `hitFor(object: Object3D | null, focused: HotspotName | null): Hit | null`
  - `highlightKey(object: Object3D): string | null`, `highlightFor(hit: Hit): string`, `sameHit(a: Hit | null, b: Hit | null): boolean`, `labelFor(hit: Hit, labels: Record<HotspotName, string>): string`
  - `targetForPath(pathname: string): Hit | null`, `pathForTarget(target: Hit): string | null`

- [ ] **Step 1: Write the failing tests `office/hotspots/registry.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { Group, Mesh } from "three";
import { work } from "@/content/work";
import { services } from "@/content/services";
import { hitFor, highlightFor, highlightKey, itemAt, itemNode, labelFor, ORNAMENTS, RECORDS, sameHit } from "./registry";

/** office_root › hs_crate › (hs_crate__body mesh, record_00 › mesh, record_05 › mesh), hs_shelf › ornament_01 › mesh, hs_drawer › mesh, prop_chair mesh */
function scene() {
  const node = (name: string, ...children: Array<Group | Mesh>) => {
    const g = new Group();
    g.name = name;
    children.forEach((c) => g.add(c));
    return g;
  };
  const mesh = (name: string) => Object.assign(new Mesh(), { name });
  const body = mesh("hs_crate__body");
  const rec0 = mesh("rec0_mesh");
  const rec5 = mesh("rec5_mesh");
  const orn1 = mesh("orn1_mesh");
  const drawer = mesh("hs_drawer__drawer");
  const chair = mesh("prop_chair");
  node(
    "office_root",
    node("hs_crate", body, node("hs_crate__record_00", rec0), node("hs_crate__record_05", rec5)),
    node("hs_shelf", node("hs_shelf__ornament_01", orn1)),
    node("hs_drawer", drawer),
    chair,
  );
  return { body, rec0, rec5, orn1, drawer, chair };
}

describe("hitFor", () => {
  const s = scene();
  it("idle: any part of a hotspot is the whole hotspot", () => {
    expect(hitFor(s.rec0, null)).toEqual({ hotspot: "hs_crate", item: null });
    expect(hitFor(s.body, null)).toEqual({ hotspot: "hs_crate", item: null });
    expect(hitFor(s.drawer, null)).toEqual({ hotspot: "hs_drawer", item: null });
  });
  it("idle: set dressing is nothing", () => expect(hitFor(s.chair, null)).toBeNull());
  it("focused on the crate: a record with content is that case study", () =>
    expect(hitFor(s.rec0, "hs_crate")).toEqual({ hotspot: "hs_crate", item: work[0].slug }));
  it("focused on the crate: blank sleeves and the crate body are nothing", () => {
    expect(hitFor(s.rec5, "hs_crate")).toBeNull();
    expect(hitFor(s.body, "hs_crate")).toBeNull();
  });
  it("focused on the crate: other hotspots are nothing", () => expect(hitFor(s.drawer, "hs_crate")).toBeNull());
  it("focused on the shelf: an ornament with content is that service", () =>
    expect(hitFor(s.orn1, "hs_shelf")).toEqual({ hotspot: "hs_shelf", item: services[1].slug }));
  it("nothing under the pointer is nothing", () => expect(hitFor(null, null)).toBeNull());
});

describe("items", () => {
  it("maps records to work and ornaments to services, in order", () => {
    expect(itemAt("hs_crate", 0)).toBe(work[0].slug);
    expect(itemAt("hs_crate", work.length)).toBeNull();
    expect(itemAt("hs_shelf", 1)).toBe(services[1].slug);
    expect(itemAt("hs_shelf", services.length)).toBeNull();
    expect(itemAt("hs_drawer", 0)).toBeNull();
  });
  it("finds the node behind a slug", () => {
    expect(itemNode("hs_crate", work[2].slug)).toBe("hs_crate__record_02");
    expect(itemNode("hs_shelf", services[0].slug)).toBe("hs_shelf__ornament_00");
    expect(itemNode("hs_crate", "nope")).toBeNull();
  });
  it("has room in the crate and on the shelf for all the content", () => {
    expect(work.length).toBeLessThanOrEqual(RECORDS);
    expect(services.length).toBeLessThanOrEqual(ORNAMENTS);
  });
});

describe("highlighting", () => {
  const s = scene();
  it("keys a mesh by its record or ornament, else its hotspot", () => {
    expect(highlightKey(s.rec0)).toBe("hs_crate__record_00");
    expect(highlightKey(s.body)).toBe("hs_crate");
    expect(highlightKey(s.orn1)).toBe("hs_shelf__ornament_01");
    expect(highlightKey(s.drawer)).toBe("hs_drawer");
    expect(highlightKey(s.chair)).toBeNull();
  });
  it("highlights an item's node, or the whole hotspot", () => {
    expect(highlightFor({ hotspot: "hs_crate", item: work[1].slug })).toBe("hs_crate__record_01");
    expect(highlightFor({ hotspot: "hs_drawer", item: null })).toBe("hs_drawer");
  });
  it("compares hits by value", () => {
    expect(sameHit({ hotspot: "hs_crate", item: null }, { hotspot: "hs_crate", item: null })).toBe(true);
    expect(sameHit({ hotspot: "hs_crate", item: null }, { hotspot: "hs_crate", item: "manuva" })).toBe(false);
    expect(sameHit(null, null)).toBe(true);
    expect(sameHit(null, { hotspot: "hs_drawer", item: null })).toBe(false);
  });
  it("labels an item by its content name, else by the hotspot label", () => {
    const labels = { hs_crate: "C", hs_drawer: "D", hs_monitor: "M", hs_shelf: "S" };
    expect(labelFor({ hotspot: "hs_crate", item: "manuva" }, labels)).toBe("Manuva");
    expect(labelFor({ hotspot: "hs_shelf", item: services[0].slug }, labels)).toBe(services[0].name);
    expect(labelFor({ hotspot: "hs_drawer", item: null }, labels)).toBe("D");
  });
});
```

- [ ] **Step 2: Write the failing tests `office/scene/targets.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { work } from "@/content/work";
import { services } from "@/content/services";
import { pathForTarget, targetForPath } from "./targets";

describe("targetForPath", () => {
  it.each([
    ["/", null],
    ["/contact", { hotspot: "hs_drawer", item: null }],
    ["/contact/", { hotspot: "hs_drawer", item: null }],
    ["/work/manuva", { hotspot: "hs_crate", item: "manuva" }],
    ["/work/nope", null],
    ["/work", null],
    ["/services/tools-and-dashboards", { hotspot: "hs_shelf", item: "tools-and-dashboards" }],
    ["/services/nope", null],
    ["/services/tools-and-dashboards/extra", null],
    ["/admin", null],
  ])("%s", (path, target) => expect(targetForPath(path)).toEqual(target));
});

describe("pathForTarget", () => {
  it("routes the drawer, a record and an ornament", () => {
    expect(pathForTarget({ hotspot: "hs_drawer", item: null })).toBe("/contact");
    expect(pathForTarget({ hotspot: "hs_crate", item: "silio" })).toBe("/work/silio");
    expect(pathForTarget({ hotspot: "hs_shelf", item: "platforms-and-systems" })).toBe("/services/platforms-and-systems");
  });
  it("keeps browsing and the monitor local (no URL)", () => {
    expect(pathForTarget({ hotspot: "hs_crate", item: null })).toBeNull();
    expect(pathForTarget({ hotspot: "hs_shelf", item: null })).toBeNull();
    expect(pathForTarget({ hotspot: "hs_monitor", item: null })).toBeNull();
  });
  it("round-trips every piece of content", () => {
    for (const w of work) expect(targetForPath(pathForTarget({ hotspot: "hs_crate", item: w.slug })!)).toEqual({ hotspot: "hs_crate", item: w.slug });
    for (const s of services) expect(targetForPath(pathForTarget({ hotspot: "hs_shelf", item: s.slug })!)).toEqual({ hotspot: "hs_shelf", item: s.slug });
  });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npx vitest run office/hotspots office/scene`
Expected: FAIL, `Cannot find module './registry'` and `'./targets'`.

- [ ] **Step 4: Create `office/hotspots/registry.ts`**

```ts
import type { Object3D } from "three";
import { findWork, work } from "@/content/work";
import { findService, services } from "@/content/services";

export const HOTSPOTS = ["hs_crate", "hs_drawer", "hs_monitor", "hs_shelf"] as const;
export type HotspotName = (typeof HOTSPOTS)[number];

/** What a pointer or a keyboard focus points at: a hotspot, and optionally one piece of its content. */
export type Hit = { hotspot: HotspotName; item: string | null };

/** The Blender camera each hotspot focuses with. `<name>_portrait` is used below a 1:1 aspect when it exists. */
export const FOCUS_CAMERA: Record<HotspotName, string> = {
  hs_crate: "cam_focus_crate",
  hs_drawer: "cam_focus_drawer",
  hs_monitor: "cam_focus_monitor",
  hs_shelf: "cam_focus_shelf",
};

/** Records in the crate and ornaments on the shelf, as modelled (office_props.py). */
export const RECORDS = 9;
export const ORNAMENTS = 5;

const ITEM = /^(hs_crate)__record_(\d\d)$|^(hs_shelf)__ornament_(\d\d)$/;

function isHotspot(name: string): name is HotspotName {
  return (HOTSPOTS as readonly string[]).includes(name);
}

/** Content slug behind a record or ornament index; null for blank sleeves, decorative ornaments and other hotspots. */
export function itemAt(hotspot: HotspotName, index: number): string | null {
  if (hotspot === "hs_crate") return work[index]?.slug ?? null;
  if (hotspot === "hs_shelf") return services[index]?.slug ?? null;
  return null;
}

/** Node name of the record or ornament carrying `slug`. */
export function itemNode(hotspot: HotspotName, slug: string): string | null {
  const pad = (i: number) => String(i).padStart(2, "0");
  if (hotspot === "hs_crate") {
    const i = work.findIndex((w) => w.slug === slug);
    return i < 0 ? null : `hs_crate__record_${pad(i)}`;
  }
  if (hotspot === "hs_shelf") {
    const i = services.findIndex((s) => s.slug === slug);
    return i < 0 ? null : `hs_shelf__ornament_${pad(i)}`;
  }
  return null;
}

/**
 * What a pointer over `object` means. With nothing focused it is the whole hotspot. Focused on a hotspot,
 * only that hotspot's records or ornaments that carry content count; everything else is null.
 */
export function hitFor(object: Object3D | null, focused: HotspotName | null): Hit | null {
  let item: { hotspot: HotspotName; index: number } | null = null;
  for (let o: Object3D | null = object; o; o = o.parent) {
    const m = ITEM.exec(o.name);
    if (m && !item) item = { hotspot: (m[1] ?? m[3]) as HotspotName, index: Number(m[2] ?? m[4]) };
    if (isHotspot(o.name)) {
      if (focused === null) return { hotspot: o.name, item: null };
      if (focused !== o.name || !item) return null;
      const slug = itemAt(o.name, item.index);
      return slug ? { hotspot: o.name, item: slug } : null;
    }
  }
  return null;
}

/** Edge-highlight group of a mesh: its record or ornament, else its hotspot, else none. */
export function highlightKey(object: Object3D): string | null {
  for (let o: Object3D | null = object; o; o = o.parent) {
    if (ITEM.test(o.name) || isHotspot(o.name)) return o.name;
  }
  return null;
}

/** Highlight prefix for a hit: the item's node when it has one, else the whole hotspot. */
export function highlightFor(hit: Hit): string {
  return (hit.item && itemNode(hit.hotspot, hit.item)) || hit.hotspot;
}

export function sameHit(a: Hit | null, b: Hit | null): boolean {
  return a === b || (!!a && !!b && a.hotspot === b.hotspot && a.item === b.item);
}

/** Text for the hover label: the content's own name for an item, else the hotspot's label. */
export function labelFor(hit: Hit, labels: Record<HotspotName, string>): string {
  if (hit.item && hit.hotspot === "hs_crate") return findWork(hit.item)?.name ?? labels.hs_crate;
  if (hit.item && hit.hotspot === "hs_shelf") return findService(hit.item)?.name ?? labels.hs_shelf;
  return labels[hit.hotspot];
}
```

- [ ] **Step 5: Create `office/scene/targets.ts`**

```ts
import { findWork } from "@/content/work";
import { findService } from "@/content/services";
import type { Hit } from "../hotspots/registry";

/** What a URL asks the scene to show; null means the standing spot. Unknown slugs are null (the page 404s). */
export function targetForPath(pathname: string): Hit | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 1 && parts[0] === "contact") return { hotspot: "hs_drawer", item: null };
  if (parts.length === 2 && parts[0] === "work" && findWork(parts[1])) return { hotspot: "hs_crate", item: parts[1] };
  if (parts.length === 2 && parts[0] === "services" && findService(parts[1])) return { hotspot: "hs_shelf", item: parts[1] };
  return null;
}

/** The URL for a target, or null for the local-only states: browsing the crate or the shelf, and the monitor. */
export function pathForTarget(target: Hit): string | null {
  if (target.hotspot === "hs_drawer") return "/contact";
  if (target.hotspot === "hs_crate" && target.item) return `/work/${target.item}`;
  if (target.hotspot === "hs_shelf" && target.item) return `/services/${target.item}`;
  return null;
}
```

- [ ] **Step 6: Run to verify they pass**

Run: `npx vitest run office/hotspots office/scene`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add office/hotspots/registry.ts office/hotspots/registry.test.ts office/scene/targets.ts office/scene/targets.test.ts
git commit -m "Add the hotspot registry and the URL-to-scene mapping

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Director state machine

**Files:**
- Create: `office/director/director.ts`, `office/director/director.test.ts`

**Interfaces:**
- Consumes: `Hit`, `HotspotName` (Task 2).
- Produces:
  - `IDLE_AT = 0.995`
  - `type DirectorState = { kind: "walkIn" } | { kind: "idle" } | { kind: "focusing"; target: Hit; from: "walkIn" | "idle" | "focus" | "returning" } | { kind: "focused"; target: Hit } | { kind: "returning" }`
  - `type DirectorEvent = { type: "progress"; value: number } | { type: "focus"; target: Hit } | { type: "release" } | { type: "settled" }`
  - `initialDirector(): DirectorState`, `reduceDirector(state, event): DirectorState`
  - `describeDirector(state): string` (`"walkIn"`, `"idle"`, `"focusing:hs_crate"`, `"focused:hs_crate"`, `"returning"`), `focusedHotspot(state): HotspotName | null`, `isLocked(state): boolean`

- [ ] **Step 1: Write the failing tests `office/director/director.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { describeDirector, focusedHotspot, IDLE_AT, initialDirector, isLocked, reduceDirector, type DirectorEvent, type DirectorState } from "./director";

const crate = { hotspot: "hs_crate", item: null } as const;
const manuva = { hotspot: "hs_crate", item: "manuva" } as const;
const drawer = { hotspot: "hs_drawer", item: null } as const;
const run = (s: DirectorState, ...events: DirectorEvent[]) => events.reduce(reduceDirector, s);

describe("walk-in and idle", () => {
  it("starts walking in", () => expect(initialDirector()).toEqual({ kind: "walkIn" }));
  it("becomes idle at the end of the walk-in and walks in again when scrolled back", () => {
    const idle = run(initialDirector(), { type: "progress", value: IDLE_AT });
    expect(idle).toEqual({ kind: "idle" });
    expect(run(idle, { type: "progress", value: 0.5 })).toEqual({ kind: "walkIn" });
  });
  it("ignores progress that changes nothing", () => {
    const s = initialDirector();
    expect(run(s, { type: "progress", value: 0.4 })).toBe(s);
  });
});

describe("focus", () => {
  it("idle → focusing → focused", () => {
    const focusing = run({ kind: "idle" }, { type: "focus", target: drawer });
    expect(focusing).toEqual({ kind: "focusing", target: drawer, from: "idle" });
    expect(run(focusing, { type: "settled" })).toEqual({ kind: "focused", target: drawer });
  });
  it("remembers a focus that interrupts the walk-in (the camera cuts instead of flying)", () =>
    expect(run(initialDirector(), { type: "focus", target: drawer })).toEqual({ kind: "focusing", target: drawer, from: "walkIn" }));
  it("switches item within the focused hotspot without moving the camera", () =>
    expect(run({ kind: "focused", target: crate }, { type: "focus", target: manuva })).toEqual({ kind: "focused", target: manuva }));
  it("retargets mid-move to another hotspot", () =>
    expect(run({ kind: "focusing", target: crate, from: "idle" }, { type: "focus", target: drawer })).toEqual({ kind: "focusing", target: drawer, from: "focus" }));
  it("moves on from a focused hotspot to another", () =>
    expect(run({ kind: "focused", target: crate }, { type: "focus", target: drawer })).toEqual({ kind: "focusing", target: drawer, from: "focus" }));
  it("refocuses while returning", () =>
    expect(run({ kind: "returning" }, { type: "focus", target: crate })).toEqual({ kind: "focusing", target: crate, from: "returning" }));
  it("re-asking for the same target changes nothing", () => {
    const s: DirectorState = { kind: "focused", target: drawer };
    expect(run(s, { type: "focus", target: { ...drawer } })).toBe(s);
  });
  it("ignores walk-in progress while focused (the scroll is locked)", () => {
    const s: DirectorState = { kind: "focused", target: drawer };
    expect(run(s, { type: "progress", value: 0.2 })).toBe(s);
  });
});

describe("release", () => {
  it("focused → returning → idle", () => {
    const back = run({ kind: "focused", target: drawer }, { type: "release" });
    expect(back).toEqual({ kind: "returning" });
    expect(run(back, { type: "settled" })).toEqual({ kind: "idle" });
  });
  it("releases mid-move too (Esc while the camera is flying in)", () =>
    expect(run({ kind: "focusing", target: drawer, from: "idle" }, { type: "release" })).toEqual({ kind: "returning" }));
  it("is a no-op when nothing is focused", () => {
    const s: DirectorState = { kind: "idle" };
    expect(run(s, { type: "release" })).toBe(s);
  });
  it("ignores a stray settled", () => {
    const s: DirectorState = { kind: "idle" };
    expect(run(s, { type: "settled" })).toBe(s);
  });
});

describe("helpers", () => {
  it("describes states for the DOM", () => {
    expect(describeDirector({ kind: "walkIn" })).toBe("walkIn");
    expect(describeDirector({ kind: "focusing", target: crate, from: "idle" })).toBe("focusing:hs_crate");
    expect(describeDirector({ kind: "focused", target: drawer })).toBe("focused:hs_drawer");
    expect(describeDirector({ kind: "returning" })).toBe("returning");
  });
  it("knows the focused hotspot", () => {
    expect(focusedHotspot({ kind: "focused", target: manuva })).toBe("hs_crate");
    expect(focusedHotspot({ kind: "idle" })).toBeNull();
  });
  it("locks the scroll from focusing until back at idle", () => {
    expect(isLocked({ kind: "walkIn" })).toBe(false);
    expect(isLocked({ kind: "idle" })).toBe(false);
    expect(isLocked({ kind: "focusing", target: crate, from: "idle" })).toBe(true);
    expect(isLocked({ kind: "focused", target: crate })).toBe(true);
    expect(isLocked({ kind: "returning" })).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run office/director`
Expected: FAIL, `Cannot find module './director'`.

- [ ] **Step 3: Create `office/director/director.ts`**

```ts
import { sameHit, type Hit, type HotspotName } from "../hotspots/registry";

/** Walk-in progress at or above this counts as standing in the office. */
export const IDLE_AT = 0.995;

export type DirectorState =
  | { kind: "walkIn" }
  | { kind: "idle" }
  | { kind: "focusing"; target: Hit; from: "walkIn" | "idle" | "focus" | "returning" }
  | { kind: "focused"; target: Hit }
  | { kind: "returning" };

export type DirectorEvent =
  | { type: "progress"; value: number }
  | { type: "focus"; target: Hit }
  | { type: "release" }
  | { type: "settled" };

export function initialDirector(): DirectorState {
  return { kind: "walkIn" };
}

/** The scene's state machine (spec 5.3). Pure: the canvas moves the camera, the page drives the URL. */
export function reduceDirector(state: DirectorState, event: DirectorEvent): DirectorState {
  switch (event.type) {
    case "progress":
      if (state.kind === "walkIn" && event.value >= IDLE_AT) return { kind: "idle" };
      if (state.kind === "idle" && event.value < IDLE_AT) return { kind: "walkIn" };
      return state;
    case "focus": {
      const target = event.target;
      if (state.kind === "focused" && state.target.hotspot === target.hotspot)
        return sameHit(state.target, target) ? state : { kind: "focused", target };
      if (state.kind === "focusing" && state.target.hotspot === target.hotspot)
        return sameHit(state.target, target) ? state : { ...state, target };
      const from = state.kind === "walkIn" || state.kind === "idle" || state.kind === "returning" ? state.kind : "focus";
      return { kind: "focusing", target, from };
    }
    case "release":
      return state.kind === "focusing" || state.kind === "focused" ? { kind: "returning" } : state;
    case "settled":
      if (state.kind === "focusing") return { kind: "focused", target: state.target };
      if (state.kind === "returning") return { kind: "idle" };
      return state;
  }
}

export function describeDirector(state: DirectorState): string {
  return state.kind === "focusing" || state.kind === "focused" ? `${state.kind}:${state.target.hotspot}` : state.kind;
}

export function focusedHotspot(state: DirectorState): HotspotName | null {
  return state.kind === "focusing" || state.kind === "focused" ? state.target.hotspot : null;
}

/** Scrolling would replay the walk-in under an open object, so it is locked from focusing until back at idle. */
export function isLocked(state: DirectorState): boolean {
  return state.kind === "focusing" || state.kind === "focused" || state.kind === "returning";
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run office/director`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add office/director/director.ts office/director/director.test.ts
git commit -m "Add the office director state machine

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Camera poses and rig

**Files:**
- Create: `office/camera/pose.ts`, `office/camera/basePose.ts`, `office/camera/rig.ts`, `office/camera/camera.test.ts`

**Interfaces:**
- Produces:
  - `type Pose = { position: Vector3; quaternion: Quaternion; fov: number }`, `makePose()`, `readPose(source: Object3D, out)`, `copyPose(from, out)`, `blendPose(a, b, t, out)`, `applyPose(pose, camera: PerspectiveCamera)`
  - `DESIGN_ASPECT = 1.6`, `MAX_FOV = 95`, `widenForAspect(fovDeg, aspect)`, `easeInOutCubic(t)`, `smoothstep(e0, e1, x)`
  - `PORTRAIT_FROM = 0.9`, `basePose(walkIn: Pose, standPortrait: Pose | null, progress, aspect, out)`, `focusPose(land: Pose, portrait: Pose | null, aspect, out)`
  - `FOCUS_SECONDS = 1.1`, `type RigGoal = { kind: "base" } | { kind: "pose"; pose: Pose }`, `class CameraRig { moveTo(current, goal, seconds); advance(dt): boolean; pose(base, out): Pose; readonly moving: boolean; readonly goalKind: "base" | "pose" }`

- [ ] **Step 1: Write the failing tests `office/camera/camera.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { Object3D, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { applyPose, blendPose, copyPose, DESIGN_ASPECT, easeInOutCubic, makePose, MAX_FOV, readPose, smoothstep, widenForAspect, type Pose } from "./pose";
import { basePose, focusPose, PORTRAIT_FROM } from "./basePose";
import { CameraRig, FOCUS_SECONDS } from "./rig";

const pose = (x: number, fov = 50, yaw = 0): Pose => ({
  position: new Vector3(x, 0, 0),
  quaternion: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw),
  fov,
});

describe("pose", () => {
  it("reads a node's world pose and a camera's fov", () => {
    const parent = new Object3D();
    parent.position.set(10, 0, 0);
    const cam = new PerspectiveCamera(42);
    cam.position.set(1, 2, 3);
    parent.add(cam);
    const p = readPose(cam, makePose());
    expect(p.position.toArray()).toEqual([11, 2, 3]);
    expect(p.fov).toBe(42);
  });
  it("blends position, rotation and fov", () => {
    const out = blendPose(pose(0, 40, 0), pose(10, 60, Math.PI / 2), 0.5, makePose());
    expect(out.position.x).toBeCloseTo(5);
    expect(out.fov).toBeCloseTo(50);
    expect(out.quaternion.angleTo(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 4))).toBeLessThan(1e-6);
  });
  it("blends in place", () => {
    const a = pose(0);
    blendPose(a, pose(10), 0.25, a);
    expect(a.position.x).toBeCloseTo(2.5);
  });
  it("applies to a camera and updates its projection only when the fov changes", () => {
    const cam = new PerspectiveCamera(50);
    let updates = 0;
    cam.updateProjectionMatrix = () => void updates++;
    applyPose(pose(3, 50), cam);
    expect(cam.position.x).toBe(3);
    expect(updates).toBe(0);
    applyPose(pose(3, 70), cam);
    expect(cam.fov).toBe(70);
    expect(updates).toBe(1);
  });
  it("copies without sharing vectors", () => {
    const a = pose(1);
    const b = copyPose(a, makePose());
    a.position.x = 9;
    expect(b.position.x).toBe(1);
  });
});

describe("widenForAspect", () => {
  it("leaves 16:10 and wider alone", () => {
    expect(widenForAspect(50, DESIGN_ASPECT)).toBe(50);
    expect(widenForAspect(50, 16 / 9)).toBe(50);
  });
  it("keeps the 16:10 horizontal view on a 4:3 screen", () => {
    const fov = widenForAspect(50, 4 / 3);
    const h = (v: number, a: number) => 2 * Math.atan(Math.tan(((v * Math.PI) / 180) / 2) * a);
    expect(h(fov, 4 / 3)).toBeCloseTo(h(50, DESIGN_ASPECT), 6);
  });
  it("caps very narrow screens", () => expect(widenForAspect(50, 0.2)).toBe(MAX_FOV));
  it("ignores a broken aspect", () => expect(widenForAspect(50, 0)).toBe(50));
});

describe("easing", () => {
  it("eases in and out between 0 and 1", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(0.25)).toBeLessThan(0.25);
  });
  it("smoothsteps with clamping", () => {
    expect(smoothstep(0.9, 1, 0.5)).toBe(0);
    expect(smoothstep(0.9, 1, 1.2)).toBe(1);
    expect(smoothstep(0.9, 1, 0.95)).toBeCloseTo(0.5);
  });
});

describe("basePose", () => {
  const walk = pose(0, 50);
  const portrait = pose(10, 85);
  it("is the walk-in pose on a landscape screen", () => {
    const out = basePose(walk, portrait, 1, 16 / 10, makePose());
    expect(out.position.x).toBe(0);
    expect(out.fov).toBe(50);
  });
  it("widens the walk-in on a 4:3 screen", () =>
    expect(basePose(walk, portrait, 0.5, 4 / 3, makePose()).fov).toBeCloseTo(widenForAspect(50, 4 / 3)));
  it("eases into the portrait standing pose at the end on portrait screens", () => {
    expect(basePose(walk, portrait, PORTRAIT_FROM, 0.46, makePose()).position.x).toBe(0);
    expect(basePose(walk, portrait, 1, 0.46, makePose()).position.x).toBeCloseTo(10);
    expect(basePose(walk, portrait, 1, 0.46, makePose()).fov).toBeCloseTo(85);
  });
  it("falls back to widening when there is no portrait pose", () =>
    expect(basePose(walk, null, 1, 0.46, makePose()).fov).toBeCloseTo(widenForAspect(50, 0.46)));
});

describe("focusPose", () => {
  it("uses the landscape camera on landscape screens", () => expect(focusPose(pose(1, 40), pose(2, 70), 1.6, makePose()).position.x).toBe(1));
  it("uses the portrait camera on portrait screens", () => expect(focusPose(pose(1, 40), pose(2, 70), 0.5, makePose()).position.x).toBe(2));
  it("widens the landscape camera when there is no portrait one", () =>
    expect(focusPose(pose(1, 40), null, 0.5, makePose()).fov).toBeCloseTo(widenForAspect(40, 0.5)));
});

describe("CameraRig", () => {
  const base = pose(0);
  it("follows the base pose when idle", () => {
    const rig = new CameraRig();
    expect(rig.pose(base, makePose()).position.x).toBe(0);
    expect(rig.moving).toBe(false);
  });
  it("eases from the current pose to a goal over the duration", () => {
    const rig = new CameraRig();
    rig.moveTo(pose(0), { kind: "pose", pose: pose(10) }, FOCUS_SECONDS);
    expect(rig.advance(FOCUS_SECONDS / 2)).toBe(false);
    expect(rig.moving).toBe(true);
    expect(rig.pose(base, makePose()).position.x).toBeCloseTo(5);
    expect(rig.advance(FOCUS_SECONDS)).toBe(true);
    expect(rig.pose(base, makePose()).position.x).toBe(10);
    expect(rig.goalKind).toBe("pose");
  });
  it("reports completion once", () => {
    const rig = new CameraRig();
    rig.moveTo(pose(0), { kind: "pose", pose: pose(10) }, 1);
    expect(rig.advance(2)).toBe(true);
    expect(rig.advance(2)).toBe(false);
  });
  it("cuts on a zero-length move but still reports completion on the next advance", () => {
    const rig = new CameraRig();
    rig.moveTo(pose(-5), { kind: "pose", pose: pose(10) }, 0);
    expect(rig.advance(0.016)).toBe(true);
    expect(rig.pose(base, makePose()).position.x).toBe(10);
  });
  it("retargets from wherever the camera is", () => {
    const rig = new CameraRig();
    rig.moveTo(pose(0), { kind: "pose", pose: pose(10) }, 1);
    rig.advance(0.5);
    const now = rig.pose(base, makePose());
    rig.moveTo(now, { kind: "base" }, 1);
    expect(rig.pose(base, makePose()).position.x).toBeCloseTo(now.position.x);
    rig.advance(1);
    expect(rig.pose(base, makePose()).position.x).toBe(0);
  });
  it("tracks a moving base pose on the way back", () => {
    const rig = new CameraRig();
    rig.moveTo(pose(10), { kind: "base" }, 1);
    rig.advance(1);
    expect(rig.pose(pose(3), makePose()).position.x).toBe(3);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run office/camera`
Expected: FAIL, `Cannot find module './pose'`.

- [ ] **Step 3: Create `office/camera/pose.ts`**

```ts
import { MathUtils, Quaternion, Vector3, type Object3D, type PerspectiveCamera } from "three";

/** Where a camera is, where it looks, and its vertical field of view (degrees). */
export type Pose = { position: Vector3; quaternion: Quaternion; fov: number };

/** Frames are composed for 16:10; narrower screens keep that horizontal view. */
export const DESIGN_ASPECT = 16 / 10;
export const MAX_FOV = 95;

const scale = new Vector3();

export function makePose(): Pose {
  return { position: new Vector3(), quaternion: new Quaternion(), fov: 50 };
}

/** World pose of a node (a Blender camera); its fov when it is a perspective camera. */
export function readPose(source: Object3D, out: Pose): Pose {
  source.updateWorldMatrix(true, false);
  source.matrixWorld.decompose(out.position, out.quaternion, scale);
  if ((source as PerspectiveCamera).isPerspectiveCamera) out.fov = (source as PerspectiveCamera).fov;
  return out;
}

export function copyPose(from: Pose, out: Pose): Pose {
  out.position.copy(from.position);
  out.quaternion.copy(from.quaternion);
  out.fov = from.fov;
  return out;
}

/** `out` = a → b at t (position lerp, rotation slerp, fov lerp). `out` may be `a`. */
export function blendPose(a: Pose, b: Pose, t: number, out: Pose): Pose {
  out.position.lerpVectors(a.position, b.position, t);
  out.quaternion.slerpQuaternions(a.quaternion, b.quaternion, t);
  out.fov = a.fov + (b.fov - a.fov) * t;
  return out;
}

export function applyPose(pose: Pose, camera: PerspectiveCamera): void {
  camera.position.copy(pose.position);
  camera.quaternion.copy(pose.quaternion);
  if (camera.fov !== pose.fov) {
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
  }
}

/** Vertical fov that keeps a 16:10 frame's horizontal view on narrower screens (4:3, portrait). */
export function widenForAspect(fovDeg: number, aspect: number, design = DESIGN_ASPECT, max = MAX_FOV): number {
  if (!(aspect > 0) || aspect >= design) return fovDeg;
  const half = MathUtils.degToRad(fovDeg) / 2;
  return Math.min(max, MathUtils.radToDeg(2 * Math.atan(Math.tan(half) * (design / aspect))));
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
```

- [ ] **Step 4: Create `office/camera/basePose.ts`**

```ts
import { blendPose, copyPose, smoothstep, widenForAspect, type Pose } from "./pose";

/** On portrait screens the walk-in hands over to the portrait standing pose over the last stretch. */
export const PORTRAIT_FROM = 0.9;

/** The walk-in's camera for this frame: widened for narrow screens, ending at the portrait standing pose on portrait screens. */
export function basePose(walkIn: Pose, standPortrait: Pose | null, progress: number, aspect: number, out: Pose): Pose {
  copyPose(walkIn, out);
  out.fov = widenForAspect(out.fov, aspect);
  if (aspect < 1 && standPortrait) {
    const k = smoothstep(PORTRAIT_FROM, 1, progress);
    if (k > 0) blendPose(out, standPortrait, k, out);
  }
  return out;
}

/** A hotspot's focus camera: its portrait variant on portrait screens when there is one, else the landscape one, widened. */
export function focusPose(land: Pose, portrait: Pose | null, aspect: number, out: Pose): Pose {
  if (aspect < 1 && portrait) return copyPose(portrait, out);
  copyPose(land, out);
  out.fov = widenForAspect(out.fov, aspect);
  return out;
}
```

- [ ] **Step 5: Create `office/camera/rig.ts`**

```ts
import { blendPose, copyPose, easeInOutCubic, makePose, type Pose } from "./pose";

/** How long the camera takes to move to an object and back. */
export const FOCUS_SECONDS = 1.1;

/** "base" follows the walk-in (it can move every frame); "pose" holds a fixed camera. */
export type RigGoal = { kind: "base" } | { kind: "pose"; pose: Pose };

/** Eases the render camera from wherever it is to a goal. Retargeting mid-move starts from the current pose, so nothing jumps. */
export class CameraRig {
  private from = makePose();
  private goal: RigGoal = { kind: "base" };
  private t = 1;
  private duration = 0;

  /** Start moving from `current` to `goal` over `seconds`; 0 cuts there on the next advance. */
  moveTo(current: Pose, goal: RigGoal, seconds: number): void {
    copyPose(current, this.from);
    this.goal = goal;
    this.duration = Math.max(0, seconds);
    this.t = 0;
  }

  /** Step by `dt` seconds. True only on the frame a move completes. */
  advance(dt: number): boolean {
    if (this.t >= 1) return false;
    this.t = this.duration > 0 ? Math.min(1, this.t + dt / this.duration) : 1;
    return this.t >= 1;
  }

  get moving(): boolean {
    return this.t < 1;
  }

  get goalKind(): "base" | "pose" {
    return this.goal.kind;
  }

  /** The camera this frame, given the walk-in's `base` pose. */
  pose(base: Pose, out: Pose): Pose {
    const target = this.goal.kind === "base" ? base : this.goal.pose;
    return this.t >= 1 ? copyPose(target, out) : blendPose(this.from, target, easeInOutCubic(this.t), out);
  }
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `npx vitest run office/camera`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add office/camera/pose.ts office/camera/basePose.ts office/camera/rig.ts office/camera/camera.test.ts
git commit -m "Add camera poses, portrait-aware base pose and the focus rig

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Edge highlight groups

**Files:**
- Modify: `office/style/cleanEdges.ts`, `office/style/cleanEdges.test.ts`

**Interfaces:**
- Consumes: nothing new (the key function comes from the caller; Task 7 passes `highlightKey` from Task 2).
- Produces:
  - `CleanEdgesOptions` gains `highlightKey?: (mesh: Object3D) => string | null`.
  - `CleanEdgesHandle` gains `highlights: Map<string, LineMaterial>` and `baseColor: string`.
  - `setHighlight(handle, prefix: string | null, color: string): void` colours every group whose key equals `prefix` or starts with `prefix + "__"`, and resets the rest to `baseColor`.
  - `setLineResolution` also updates the highlight materials.

- [ ] **Step 1: Write the failing tests** (append to `office/style/cleanEdges.test.ts`, which already imports `describe/it/expect` and `three` and has the `opts` used by earlier tests; add `setHighlight` to its import from `./cleanEdges`)

```ts
describe("highlight groups", () => {
  const build = () => {
    const root = new Group();
    const named = (name: string, child?: Mesh) => {
      const g = new Group();
      g.name = name;
      if (child) g.add(child);
      root.add(g);
      return g;
    };
    const drawer = new Mesh(new BoxGeometry());
    const record = new Mesh(new BoxGeometry());
    const plain = new Mesh(new BoxGeometry());
    named("hs_drawer", drawer);
    named("hs_crate").add(Object.assign(new Group(), { name: "hs_crate__record_00" }).add(record));
    root.add(plain);
    const key = (o: Object3D) => {
      for (let n: Object3D | null = o; n; n = n.parent) if (n.name.startsWith("hs_")) return n.name;
      return null;
    };
    const handle = applyCleanEdges(root, { ...opts, highlightKey: key });
    const lineOf = (m: Mesh) => (m.children.find((c) => c.userData.cleanEdges) as LineSegments2).material as LineMaterial;
    return { handle, drawer, record, plain, lineOf };
  };

  it("gives each highlight key its own line material and leaves the rest shared", () => {
    const { handle, drawer, record, plain, lineOf } = build();
    expect(lineOf(plain)).toBe(handle.line);
    expect(lineOf(drawer)).not.toBe(handle.line);
    expect(lineOf(record)).not.toBe(lineOf(drawer));
    expect([...handle.highlights.keys()].sort()).toEqual(["hs_crate__record_00", "hs_drawer"]);
  });

  it("colours a hotspot and its items, then resets", () => {
    const { handle, drawer, record, lineOf } = build();
    setHighlight(handle, "hs_crate", "#ff0000");
    expect(lineOf(record).color.getHexString()).toBe("ff0000");
    expect(lineOf(drawer).color.getHexString()).toBe(new Color(opts.line).getHexString());
    setHighlight(handle, null, "#ff0000");
    expect(lineOf(record).color.getHexString()).toBe(new Color(opts.line).getHexString());
  });

  it("colours one item without its siblings", () => {
    const { handle, record, lineOf } = build();
    setHighlight(handle, "hs_crate__record_00", "#00ff00");
    expect(lineOf(record).color.getHexString()).toBe("00ff00");
  });

  it("does not match a prefix that is only the start of another name", () => {
    const { handle, drawer, lineOf } = build();
    setHighlight(handle, "hs_draw", "#00ff00");
    expect(lineOf(drawer).color.getHexString()).toBe(new Color(opts.line).getHexString());
  });

  it("keeps highlight lines the right width on resize", () => {
    const { handle, drawer, lineOf } = build();
    setLineResolution(handle, 800, 600);
    expect(lineOf(drawer).resolution.toArray()).toEqual([800, 600]);
  });

  it("works without a highlightKey", () => {
    const root = new Group();
    root.add(new Mesh(new BoxGeometry()));
    expect(applyCleanEdges(root, opts).highlights.size).toBe(0);
  });
});
```

Add `Color`, `Object3D`, `BoxGeometry`, `Group` and `Mesh` to the test file's `three` import, and `LineMaterial` and `LineSegments2` to its addon imports, if any are not already there.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run office/style`
Expected: FAIL. `setHighlight` isn't exported, and `handle.highlights` is undefined.

- [ ] **Step 3: Implement in `office/style/cleanEdges.ts`**

Extend the types:

```ts
export type CleanEdgesOptions = {
  /** Fill colour. Matches the background so fills read as "hidden lines removed". */
  background: string;
  line: string;
  /** CSS pixels */
  lineWidth: number;
  thresholdDeg: number;
  /** Groups meshes whose lines can be recoloured together (hover). Null keeps the shared line. */
  highlightKey?: (mesh: Object3D) => string | null;
};

export type CleanEdgesHandle = {
  fill: MeshBasicMaterial;
  line: LineMaterial;
  fades: EdgeFadeGroup[];
  /** One line material per highlight key. */
  highlights: Map<string, LineMaterial>;
  baseColor: string;
};
```

In `applyCleanEdges`, declare `const highlights = new Map<string, LineMaterial>();` next to `fades`. Replace `let material = line;` and the fade block's opening with:

```ts
    const fade = fadeFor(mesh);
    const highlight = fade ? null : (opts.highlightKey?.(mesh) ?? null);
    let material = line;
    if (highlight) {
      let m = highlights.get(highlight);
      if (!m) {
        m = new LineMaterial({ color: opts.line, linewidth: opts.lineWidth, fog: true });
        highlights.set(highlight, m);
      }
      material = m;
    }
    if (fade) {
```

Keep the rest of the fade block as it is. Change the return to:

```ts
  return { fill, line, fades: [...fades.values()], highlights, baseColor: opts.line };
```

Add `setHighlight`, and extend `setLineResolution`:

```ts
/** Recolours the lines of `prefix` and everything under it (`prefix__…`); every other highlight group goes back to the base colour. */
export function setHighlight(handle: CleanEdgesHandle, prefix: string | null, color: string): void {
  for (const [key, material] of handle.highlights) {
    const on = prefix !== null && (key === prefix || key.startsWith(`${prefix}__`));
    material.color.set(on ? color : handle.baseColor);
  }
}

/** Line widths are in CSS pixels relative to this; call on every canvas resize. */
export function setLineResolution(handle: CleanEdgesHandle, width: number, height: number): void {
  handle.line.resolution.set(width, height);
  for (const g of handle.fades) g.material.resolution.set(width, height);
  for (const m of handle.highlights.values()) m.resolution.set(width, height);
}
```

Update the doc comment of `applyCleanEdges` with one line: "`opts.highlightKey` groups meshes into recolourable line materials, driven by `setHighlight`."

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run office/style`
Expected: PASS, with all earlier cleanEdges tests unchanged and green.

- [ ] **Step 5: Commit**

```bash
git add office/style/cleanEdges.ts office/style/cleanEdges.test.ts
git commit -m "Add recolourable highlight groups to the clean-edge renderer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Focus cameras in Blender

Runs in the live Blender session through the Blender MCP (`mcp__blender__execute_blender_code`), the same way the phase 1 scripts did.

**Files:**
- Modify: `scripts/blender/greybox_office.py`, `art/office.blend`, `public/models/office.glb`, `office/manifest.json`
- Create: `office/hotspots/manifest.test.ts`

**Interfaces:**
- Consumes: `HOTSPOTS`, `FOCUS_CAMERA` (Task 2).
- Produces: eight cameras in `office.glb`, `cam_focus_{crate,drawer,monitor,shelf}` and each one's `_portrait` variant, parented to `office_room`. The manifest's `office.cameras` lists all eight.

- [ ] **Step 1: Write the failing test `office/hotspots/manifest.test.ts`**

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

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run office/hotspots/manifest.test.ts`
Expected: FAIL, `expected [ 'cam_stand', 'cam_stand_portrait' ] to include 'cam_focus_crate'`.

- [ ] **Step 3: Add the cameras to `office/manifest.json`**

Set `office.cameras` to:

```json
"cameras": ["cam_stand", "cam_stand_portrait", "cam_focus_crate", "cam_focus_crate_portrait", "cam_focus_drawer", "cam_focus_drawer_portrait", "cam_focus_monitor", "cam_focus_monitor_portrait", "cam_focus_shelf", "cam_focus_shelf_portrait"]
```

Run: `npx vitest run office/hotspots/manifest.test.ts`
Expected: PASS. `npm run check:models` now FAILS with `office: missing camera "cam_focus_crate"` and seven more, until Step 5.

- [ ] **Step 4: Add the focus cameras in `scripts/blender/greybox_office.py`**

Add a `FOCUS` table and a builder next to where `cam_stand` and `cam_stand_portrait` are created. Use the file's existing `camera(name, fov_deg, col, parent=None)` and `look(eye, target)` helpers, in `office_room` coordinates (the same frame `cam_stand` uses):

```python
# Focus cameras (spec 3.5). Landscape frames leave the right ~40% for the panel, so the object sits
# about a third in from the left. Portrait frames centre the object (the panel is a full-screen sheet there).
# (eye, look-at, fov) in office_room coordinates. Tune by eye with the stills from Step 6.
FOCUS = {
    "crate": {"land": (EYE_CRATE, AT_CRATE, 45.0), "portrait": (EYE_CRATE_P, AT_CRATE_P, 70.0)},
    "drawer": {"land": (EYE_DRAWER, AT_DRAWER, 45.0), "portrait": (EYE_DRAWER_P, AT_DRAWER_P, 70.0)},
    "monitor": {"land": (EYE_MONITOR, AT_MONITOR, 40.0), "portrait": (EYE_MONITOR_P, AT_MONITOR_P, 65.0)},
    "shelf": {"land": (EYE_SHELF, AT_SHELF, 45.0), "portrait": (EYE_SHELF_P, AT_SHELF_P, 70.0)},
}


def build_focus_cameras(room, col):
    for name, poses in FOCUS.items():
        for variant, (eye, at, fov) in poses.items():
            cam = camera(f"cam_focus_{name}" + ("_portrait" if variant == "portrait" else ""), fov, col, room)
            cam.location = Vector(eye)
            cam.rotation_mode = "QUATERNION"
            cam.rotation_quaternion = look(eye, at)
```

Replace each `EYE_*`/`AT_*` with concrete tuples, worked out from the hotspot objects' real positions in the current layout (read them in the live session):
- **Crate:** the camera drops low and looks down into the crate, so the front records (`hs_crate__record_00..02`) read clearly.
- **Drawer:** slightly above and in front of the pedestal, so the top drawer front (`hs_drawer__drawer`) and the desk edge are in frame. The drawer opens in phase 4.
- **Monitor:** pushed up to the screen, which fills about 60% of the frame width, centred (no panel).
- **Shelf:** level with the shelf, all five ornaments in frame.

Call `build_focus_cameras(room, col)` where the stand cameras are built, after the room. Every camera must stay ≥ 0.3 m from every mesh: run the existing clearance helper against the eight poses.

- [ ] **Step 5: Run in Blender, export, build and check**

```python
import runpy
runpy.run_path(r"C:\dev\KasperSimonsen.dev\scripts\blender\greybox_office.py", run_name="__main__")
result = runpy.run_path(r"C:\dev\KasperSimonsen.dev\scripts\blender\export.py", run_name="__main__")["SUMMARY"]
```

Then:

```bash
npm run build:models && npm run check:models
```

Expected: `Models OK`; office still within its 2 MB budget.

- [ ] **Step 6: Check the framing**

Render each of the eight cameras as Workbench stills into `.superpowers/sdd/2026-10-02-office-phase-3-interactions/shots/focus-<name>[-portrait].png`. The landscape stills render at 1440×900, the portrait ones at 390×844. Project the target object's bounding box through each camera and confirm both of these:
- **Landscape:** the object sits fully inside the frame, with its centre between 25% and 45% of the frame width.
- **Portrait:** the object sits fully inside the frame, centred within ±15%.

Fix the poses until both hold, then re-run Step 5.

- [ ] **Step 7: Commit**

```bash
git add scripts/blender/greybox_office.py art/office.blend public/models/office.glb office/manifest.json office/hotspots/manifest.test.ts
git commit -m "Add focus cameras for the crate, drawer, monitor and shelf

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Canvas: camera rig, hover, click, highlight

**Files:**
- Modify: `office/OfficeCanvas.tsx`, `office/OfficeExperience.tsx`

**Interfaces:**
- Consumes:
  - Task 2: `HOTSPOTS`, `FOCUS_CAMERA`, `hitFor`, `highlightFor`, `highlightKey`, `type Hit`, `type HotspotName`
  - Task 3: `IDLE_AT`, `focusedHotspot`, `type DirectorState`
  - Task 4: `makePose`, `readPose`, `applyPose`, `type Pose`, `basePose`, `focusPose`, `CameraRig`, `FOCUS_SECONDS`
  - Task 5: `setHighlight`
  - Task 6: the focus cameras
- Produces:
  - `type OverlayElements = { label: HTMLElement | null; markers: Partial<Record<HotspotName, HTMLElement | null>> }`
  - `OfficeCanvasProps` adds `director`, `hover`, `overlay`, `onProgressCross`, `onSettled`, `onHover` and `onActivate`.
  - The host element gains `data-camera` (`"base"`, `"moving"` or `"focus"`). Task 9's e2e reads it.

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
import { findCamera } from "./walkin/cameraPose";
import { applyPose, makePose, readPose, type Pose } from "./camera/pose";
import { basePose, focusPose } from "./camera/basePose";
import { CameraRig, FOCUS_SECONDS } from "./camera/rig";
import { FOCUS_CAMERA, HOTSPOTS, highlightFor, highlightKey, hitFor, type Hit, type HotspotName } from "./hotspots/registry";
import { focusedHotspot, IDLE_AT, type DirectorState } from "./director/director";

const WALKIN_CAMERA = "cam_walkin";

/** DOM elements the canvas positions over hotspots each frame: the hover label and the touch markers. */
export type OverlayElements = { label: HTMLElement | null; markers: Partial<Record<HotspotName, HTMLElement | null>> };

export type OfficeCanvasProps = {
  /** Walk-in progress 0 → 1. Read every frame; never causes a render. */
  progress: RefObject<number>;
  /** Carries data-scene-ready, data-walkin-progress and data-camera for the page and for tests. */
  host: RefObject<HTMLElement | null>;
  director: RefObject<DirectorState>;
  /** What is hovered (pointer) or keyboard-focused (DOM); highlighted and labelled. */
  hover: RefObject<Hit | null>;
  overlay: RefObject<OverlayElements>;
  /** Walk-in progress crossed IDLE_AT (either way). */
  onProgressCross: (progress: number) => void;
  /** A camera move for the current focusing/returning state finished. */
  onSettled: () => void;
  onHover: (hit: Hit | null) => void;
  onActivate: (hit: Hit) => void;
};

/** What the office model gives the camera and the overlays once it has loaded. */
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

type StreetProps = Pick<OfficeCanvasProps, "progress" | "host" | "director" | "onProgressCross" | "onSettled"> & {
  info: RefObject<OfficeInfo | null>;
};

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

    // Every frame the focus goal follows the screen's aspect (rotation, resize).
    const d = director.current;
    const hotspot = focusedHotspot(d);
    const cams = hotspot ? office?.focus[hotspot] : undefined;
    if (cams) focusPose(cams.land, cams.portrait, camera.aspect, poses.focus);

    // A new state (or a new object) starts the matching camera move, from wherever the camera is.
    const key = d.kind + (hotspot ?? "");
    if (key !== seen.current) {
      seen.current = key;
      readPose(camera, poses.now);
      if (d.kind === "focusing") {
        // Reduced motion: no camera move at all (spec 3.7). From the walk-in: cut, never fly through walls.
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

type OfficeProps = Pick<OfficeCanvasProps, "director" | "hover" | "overlay" | "onHover" | "onActivate"> & {
  info: RefObject<OfficeInfo | null>;
};

/** The office model: hover, click, highlight, and the positions of the label and touch markers. */
function Office({ director, hover, overlay, onHover, onActivate, info }: OfficeProps) {
  const { gltf: office, handle } = useCleanEdges(manifest.office.url, highlightKey);
  useTurntable(office.scene);
  const shown = useRef<string | null>("");
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

  useFrame(({ camera, size }) => {
    const d = director.current;
    const lit = hover.current ?? (d.kind === "focusing" || d.kind === "focused" ? d.target : null);
    const key = lit ? `${highlightFor(lit)}:${lit.hotspot}` : null;
    if (key !== shown.current) {
      setHighlight(handle, lit ? highlightFor(lit) : null, lit ? theme.accents[lit.hotspot] : theme.line);
      shown.current = key;
    }
    const place = (el: HTMLElement, anchor: Vector3) => {
      v.copy(anchor).project(camera);
      el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px)`;
    };
    const anchors = info.current?.anchors;
    const label = overlay.current?.label;
    const hovered = hover.current;
    if (label && anchors) {
      const anchor = hovered ? anchors[hovered.hotspot] : undefined;
      if (anchor) place(label, anchor);
    }
    const markers = overlay.current?.markers;
    if (markers && anchors) for (const h of HOTSPOTS) {
      const el = markers[h];
      const anchor = anchors[h];
      if (el && anchor) place(el, anchor);
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

- [ ] **Step 2: Wire the director into `office/OfficeExperience.tsx`** (the minimal wiring. Task 8 adds navigation and the overlays.)

```tsx
"use client";

import dynamic from "next/dynamic";
import { useCallback, useReducer, useRef } from "react";
import OfficeErrorBoundary from "./OfficeErrorBoundary";
import { theme } from "./theme";
import { useWalkInProgress } from "./walkin/useWalkInProgress";
import { describeDirector, initialDirector, reduceDirector, type DirectorState } from "./director/director";
import { sameHit, type Hit } from "./hotspots/registry";
import type { OverlayElements } from "./OfficeCanvas";

// three.js never runs on the server and never ships to pages that don't render the office.
const OfficeCanvas = dynamic(() => import("./OfficeCanvas"), { ssr: false });

/** Fixed full-screen office over a scroll track exactly as long as the walk-in. */
export default function OfficeExperience() {
  const host = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const progress = useWalkInProgress(track);
  const [state, dispatch] = useReducer(reduceDirector, undefined, initialDirector);
  const director = useRef<DirectorState>(state);
  director.current = state;
  const hover = useRef<Hit | null>(null);
  const overlay = useRef<OverlayElements>({ label: null, markers: {} });

  const onHover = useCallback((hit: Hit | null) => {
    if (sameHit(hover.current, hit)) return;
    hover.current = hit;
    if (host.current) host.current.dataset.hover = hit ? hit.hotspot : "";
  }, []);

  return (
    <div ref={host} className="office" data-walkin-progress="0" data-director={describeDirector(state)}>
      <div className="office-stage">
        <OfficeErrorBoundary host={host}>
          <OfficeCanvas
            progress={progress}
            host={host}
            director={director}
            hover={hover}
            overlay={overlay}
            onProgressCross={(value) => dispatch({ type: "progress", value })}
            onSettled={() => dispatch({ type: "settled" })}
            onHover={onHover}
            onActivate={() => {}}
          />
        </OfficeErrorBoundary>
      </div>
      <div ref={track} className="office-track" style={{ height: `${theme.walkInScreens * 100}vh` }} aria-hidden="true" />
    </div>
  );
}
```

- [ ] **Step 3: Add an e2e check that the director reaches idle** (append to `e2e/office.spec.ts`)

```ts
test("the director is idle at the standing spot and the camera follows the walk-in", async ({ page }) => {
  await openOffice(page);
  await expect(office(page)).toHaveAttribute("data-director", "walkIn");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 15_000 });
  await expect(office(page)).toHaveAttribute("data-camera", "base");
});
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npx vitest run && npx playwright test`
Expected: tsc clean, all unit tests green, and 7 e2e tests green (the six phase 1 tests plus the new one).

- [ ] **Step 5: Commit**

```bash
git add office/OfficeCanvas.tsx office/OfficeExperience.tsx e2e/office.spec.ts
git commit -m "Drive the camera through the director and rig; hover and highlight hotspots

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Page layer: URL sync, local focus, keyboard nav, overlays

**Files:**
- Create: `office/copy.ts`
- Modify: `office/OfficeExperience.tsx`, `app/(office)/office.css`, `e2e/office.spec.ts`

**Interfaces:**
- Consumes:
  - Task 1: `work`, `services`
  - Task 2: `targetForPath`, `pathForTarget`, `labelFor`, `sameHit`, `type Hit`, `type HotspotName`
  - Task 3: `isLocked`, `describeDirector`
  - Task 7: `OverlayElements`
- Produces:
  - `COPY` (`office/copy.ts`), extended by Task 9;
  - the nav links (accessible names: each work item's name, each service's name, `COPY.labels.hs_drawer`, `COPY.labels.hs_monitor`), each carrying `data-hit="<hotspot>:<item>"`;
  - the root element class `office-locked` while the director is locked;
  - the history-state key `officeFocus`.

- [ ] **Step 1: Create `office/copy.ts`**

```ts
/**
 * Every visitor-facing word in the office. DRAFTS: Kasper approves all of these before launch (spec 4: his voice,
 * conversational, dry, contractions, no marketing words). Case-study and service bodies come from content/ unchanged.
 */
export const COPY = {
  nav: "Around the office",
  labels: {
    hs_crate: "The work",
    hs_drawer: "Get in touch",
    hs_shelf: "What I do",
    hs_monitor: "Monitor",
  },
  browse: {
    hs_crate: "Pick a record",
    hs_shelf: "Pick one",
  },
  back: "Back",
} as const;
```

- [ ] **Step 2: Write the failing e2e tests** (append to `e2e/office.spec.ts`)

```ts
async function standInOffice(page: Page) {
  await openOffice(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 15_000 });
}

test("tabbing to an object's link highlights it", async ({ page }) => {
  await standInOffice(page);
  await page.getByRole("link", { name: "Get in touch" }).focus();
  await expect(office(page)).toHaveAttribute("data-hover", "hs_drawer");
  await page.getByRole("link", { name: "Manuva" }).focus();
  await expect(office(page)).toHaveAttribute("data-hover", "hs_crate");
});

test("the monitor is a local focus: no URL, Esc and Back both return to the standing spot", async ({ page }) => {
  await standInOffice(page);
  const monitor = page.getByRole("button", { name: "Monitor" });
  await monitor.focus();
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_monitor", { timeout: 10_000 });
  expect(new URL(page.url()).pathname).toBe("/");
  await page.keyboard.press("Escape");
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 10_000 });

  await monitor.focus();
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_monitor", { timeout: 10_000 });
  await page.goBack();
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 10_000 });
  expect(new URL(page.url()).pathname).toBe("/");
});

test("the walk-in can't be scrolled while an object is open", async ({ page }) => {
  await standInOffice(page);
  await page.getByRole("button", { name: "Monitor" }).focus();
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_monitor", { timeout: 10_000 });
  await page.mouse.wheel(0, -5000);
  await page.waitForTimeout(2000);
  expect(await progress(page)).toBeGreaterThan(0.99);
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npx playwright test -g "tabbing|local focus|scrolled while"`
Expected: FAIL. There is no "Get in touch" link and no "Monitor" button yet.

- [ ] **Step 4: Replace `office/OfficeExperience.tsx`**

```tsx
"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState, type CSSProperties } from "react";
import OfficeErrorBoundary from "./OfficeErrorBoundary";
import { theme } from "./theme";
import { COPY } from "./copy";
import { useWalkInProgress } from "./walkin/useWalkInProgress";
import { describeDirector, initialDirector, isLocked, reduceDirector, type DirectorState } from "./director/director";
import { pathForTarget, targetForPath } from "./scene/targets";
import { HOTSPOTS, labelFor, sameHit, type Hit, type HotspotName } from "./hotspots/registry";
import type { OverlayElements } from "./OfficeCanvas";
import { work } from "@/content/work";
import { services } from "@/content/services";

// three.js never runs on the server and never ships to pages that don't render the office.
const OfficeCanvas = dynamic(() => import("./OfficeCanvas"), { ssr: false });

/** history.state key for the local-only focus states (crate and shelf browsing, the monitor). */
const LOCAL_FOCUS = "officeFocus";

const isLocalFocus = (d: DirectorState) => (d.kind === "focusing" || d.kind === "focused") && pathForTarget(d.target) === null;
const toEnd = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
const hitKey = (hit: Hit) => `${hit.hotspot}:${hit.item ?? ""}`;

/** Fixed full-screen office over a scroll track exactly as long as the walk-in. */
export default function OfficeExperience() {
  const pathname = usePathname();
  const router = useRouter();
  const host = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const progress = useWalkInProgress(track);
  const [state, dispatch] = useReducer(reduceDirector, undefined, initialDirector);
  const director = useRef<DirectorState>(state);
  director.current = state;
  const hover = useRef<Hit | null>(null);
  const [hovered, setHovered] = useState<Hit | null>(null);
  const overlay = useRef<OverlayElements>({ label: null, markers: {} });

  const onHover = useCallback((hit: Hit | null) => {
    if (sameHit(hover.current, hit)) return;
    hover.current = hit;
    setHovered(hit);
    if (host.current) host.current.dataset.hover = hit ? hit.hotspot : "";
  }, []);

  // The URL drives the scene (spec 5.2). Back to "/" returns to local browsing when that's where the visitor came from.
  useEffect(() => {
    const target = targetForPath(pathname);
    if (target) {
      if (director.current.kind === "walkIn") toEnd();
      dispatch({ type: "focus", target });
      return;
    }
    const local = window.history.state?.[LOCAL_FOCUS] as HotspotName | undefined;
    if (local) dispatch({ type: "focus", target: { hotspot: local, item: null } });
    else if (!isLocalFocus(director.current)) dispatch({ type: "release" });
  }, [pathname]);

  // Local focus gets its own history entry, so browser Back (or Esc) releases it.
  const focusLocal = useCallback((hotspot: HotspotName) => {
    if (director.current.kind === "walkIn") toEnd();
    window.history.pushState({ ...window.history.state, [LOCAL_FOCUS]: hotspot }, "");
    dispatch({ type: "focus", target: { hotspot, item: null } });
  }, []);
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      if (isLocalFocus(director.current) && !e.state?.[LOCAL_FOCUS]) dispatch({ type: "release" });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isLocalFocus(director.current)) window.history.back();
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Scrolling would replay the walk-in under an open object.
  useEffect(() => {
    document.documentElement.classList.toggle("office-locked", isLocked(state));
    return () => document.documentElement.classList.remove("office-locked");
  }, [state]);

  const onActivate = useCallback(
    (hit: Hit) => {
      const path = pathForTarget(hit);
      if (!path) return focusLocal(hit.hotspot);
      // A 3D click has no focusable trigger: mark the matching nav link so the panel returns focus there.
      document.querySelectorAll("[data-panel-return]").forEach((el) => el.removeAttribute("data-panel-return"));
      document.querySelector(`[data-hit="${hitKey(hit)}"]`)?.setAttribute("data-panel-return", "true");
      router.push(path, { scroll: false });
    },
    [router, focusLocal],
  );

  const navProps = (hit: Hit) => ({
    "data-hit": hitKey(hit),
    onFocus: () => onHover(hit),
    onBlur: () => onHover(null),
  });
  const local = isLocalFocus(state) && state.kind === "focused" ? state.target.hotspot : null;
  const browse = local === "hs_crate" || local === "hs_shelf" ? local : null;

  return (
    <div ref={host} className="office" data-walkin-progress="0" data-director={describeDirector(state)}>
      <div className="office-stage">
        <OfficeErrorBoundary host={host}>
          <OfficeCanvas
            progress={progress}
            host={host}
            director={director}
            hover={hover}
            overlay={overlay}
            onProgressCross={(value) => dispatch({ type: "progress", value })}
            onSettled={() => dispatch({ type: "settled" })}
            onHover={onHover}
            onActivate={onActivate}
          />
        </OfficeErrorBoundary>
      </div>

      <nav className="office-nav" aria-label={COPY.nav}>
        <ul>
          {work.map((w) => (
            <li key={w.slug}>
              <Link href={`/work/${w.slug}`} scroll={false} {...navProps({ hotspot: "hs_crate", item: w.slug })}>
                {w.name}
              </Link>
            </li>
          ))}
          {services.map((s) => (
            <li key={s.slug}>
              <Link href={`/services/${s.slug}`} scroll={false} {...navProps({ hotspot: "hs_shelf", item: s.slug })}>
                {s.name}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/contact" scroll={false} {...navProps({ hotspot: "hs_drawer", item: null })}>
              {COPY.labels.hs_drawer}
            </Link>
          </li>
          <li>
            <button type="button" onClick={() => focusLocal("hs_monitor")} {...navProps({ hotspot: "hs_monitor", item: null })}>
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

      {browse && (
        <div className="office-browse" style={{ "--accent": theme.accents[browse] } as CSSProperties}>
          <p className="office-browse-title">{COPY.browse[browse]}</p>
          <ul>
            {(browse === "hs_crate" ? work.map((w) => [w.slug, w.name, `/work/${w.slug}`]) : services.map((s) => [s.slug, s.name, `/services/${s.slug}`])).map(
              ([slug, name, href]) => (
                <li key={slug}>
                  <Link href={href} scroll={false}>
                    {name}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </div>
      )}
      {local && (
        <button type="button" className="office-back" onClick={() => window.history.back()}>
          {COPY.back}
        </button>
      )}

      <div ref={track} className="office-track" style={{ height: `${theme.walkInScreens * 100}vh` }} aria-hidden="true" />
    </div>
  );
}
```

- [ ] **Step 5: Add the styles** (append to `app/(office)/office.css`)

```css
/* Scrolling would replay the walk-in under an open object. */
html.office-locked {
  overflow: hidden;
}

/* Real links for every object (spec 7.3): hidden until a keyboard user tabs into them. */
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
.office-nav ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}
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
.office-nav a:focus-visible,
.office-nav button:focus-visible {
  outline: 1px solid var(--office-fg);
  outline-offset: 3px;
}

/* Hover/focus label, positioned over the object by the canvas. */
.office-label {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 2;
  pointer-events: none;
  margin: -34px 0 0 0;
  translate: -50% 0;
  font: 11px/1 var(--font-mono), ui-monospace, monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  white-space: nowrap;
}

/* Touch markers (spec 3.4): only on devices that can't hover, only while standing in the office. White, not section colours. */
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
  .office[data-director="idle"] .office-marker {
    display: block;
    animation: office-pulse 1.8s ease-in-out infinite;
  }
}
@keyframes office-pulse {
  0%, 100% { transform-origin: center; scale: 1; opacity: 0.9; }
  50% { scale: 1.6; opacity: 0.2; }
}
@media (prefers-reduced-motion: reduce) {
  .office-marker { animation: none !important; }
}

/* Local browsing (crate, shelf) and the back control. */
.office-browse {
  position: fixed;
  right: 16px;
  top: 50%;
  z-index: 2;
  translate: 0 -50%;
  max-width: min(320px, calc(100vw - 32px));
  padding: 16px 18px;
  background: var(--office-bg);
  border-left: 1px solid var(--accent);
}
.office-browse-title {
  margin: 0 0 10px;
  font: 11px/1 var(--font-mono), ui-monospace, monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
}
.office-browse ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}
.office-browse a {
  color: var(--office-fg);
  font: 600 18px/1.3 var(--font-ui), system-ui, sans-serif;
  text-decoration: none;
}
.office-browse a:hover,
.office-browse a:focus-visible {
  color: var(--accent);
}
.office-back {
  position: fixed;
  left: 16px;
  top: 16px;
  z-index: 2;
  padding: 8px 12px;
  background: var(--office-bg);
  color: var(--office-fg);
  border: 1px solid rgba(232, 232, 232, 0.35);
  font: 11px/1 var(--font-mono), ui-monospace, monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
@media (max-width: 640px) {
  .office-browse {
    top: auto;
    bottom: 16px;
    right: 16px;
    left: 16px;
    max-width: none;
    translate: none;
  }
}
```

- [ ] **Step 6: Run to verify they pass**

Run: `npx tsc --noEmit && npx playwright test`
Expected: tsc clean, all e2e green (10 tests).

- [ ] **Step 7: Commit**

```bash
git add office/copy.ts office/OfficeExperience.tsx "app/(office)/office.css" e2e/office.spec.ts
git commit -m "Keyboard nav, hover labels, touch markers and local focus in the office

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Panels and routes

**Files:**
- Create: `panels/Panel.tsx`, `panels/WorkArticle.tsx`, `panels/ServiceArticle.tsx`, `panels/ContactForm.tsx`, `app/(office)/@panel/default.tsx`, `app/(office)/@panel/page.tsx`, `app/(office)/@panel/(.)work/[slug]/page.tsx`, `app/(office)/@panel/(.)contact/page.tsx`, `app/(office)/@panel/(.)services/[slug]/page.tsx`, `app/(office)/services/[slug]/page.tsx`, `e2e/office-interaction.spec.ts`
- Modify: `office/copy.ts`, `app/(office)/layout.tsx`, `app/(office)/office.css`, `app/sitemap.ts`

**Interfaces:**
- Consumes:
  - Task 1: `work`, `findWork`, `WorkItem`, `services`, `findService`, `Service`, `CONTACT_EMAIL`, `subjectForTopic`
  - Task 2: `HotspotName`
  - Task 8: `COPY`, the nav links, and `data-panel-return`
- Produces:
  - a dialog per route, with accessible name = the article title;
  - the standalone page `/services/<slug>`;
  - the sitemap entries `/services/*`.

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

async function open(page: Page, name: string) {
  const link = page.getByRole("link", { name });
  await link.focus();
  await page.keyboard.press("Enter");
  return link;
}

test("a link opens its panel over the office, moves the camera, and Esc returns focus to it", async ({ page }) => {
  await standInOffice(page);
  const link = await open(page, "Get in touch");
  await expect(page).toHaveURL(/\/contact$/);
  const dialog = page.getByRole("dialog", { name: "Get in touch" });
  await expect(dialog).toBeVisible();
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_drawer", { timeout: 10_000 });
  await expect(office(page)).toHaveAttribute("data-camera", "focus");
  expect(await progress(page)).toBeGreaterThan(0.99);

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/$/);
  await expect(dialog).toBeHidden();
  await expect(link).toBeFocused();
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 10_000 });
  expect(await progress(page)).toBeGreaterThan(0.99);
});

test("browser Back closes a panel", async ({ page }) => {
  await standInOffice(page);
  await open(page, "Tools & Dashboards");
  await expect(page).toHaveURL(/\/services\/tools-and-dashboards$/);
  await expect(page.getByRole("dialog", { name: "Tools & Dashboards" })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 10_000 });
});

test("a case study opens as a panel with the crate in focus", async ({ page }) => {
  await standInOffice(page);
  await open(page, "Manuva");
  await expect(page.getByRole("dialog", { name: "Manuva" })).toBeVisible();
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_crate", { timeout: 10_000 });
});

test("focus stays inside an open panel", async ({ page }) => {
  await standInOffice(page);
  await open(page, "Get in touch");
  await expect(page.getByRole("dialog")).toBeVisible();
  for (let i = 0; i < 15; i++) await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"))).toBe(true);
});

test("Esc mid-move turns the camera round and unlocks the scroll", async ({ page }) => {
  await standInOffice(page);
  await open(page, "Get in touch");
  await expect(office(page)).toHaveAttribute("data-camera", "moving");
  await page.keyboard.press("Escape");
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 10_000 });
  await expect(page.locator("html")).not.toHaveClass(/office-locked/);
});

test("a panel link mid-walk-in cuts to the object and closes at the standing spot", async ({ page }) => {
  await page.goto("/");
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.4));
  await open(page, "Get in touch");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(office(page)).toHaveAttribute("data-camera", "focus", { timeout: 10_000 });
  await page.keyboard.press("Escape");
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 15_000 });
  expect(await progress(page)).toBeGreaterThan(0.99);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("opens panels without moving the camera", async ({ page }) => {
    await standInOffice(page);
    await open(page, "Get in touch");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(office(page)).toHaveAttribute("data-director", "focused:hs_drawer", { timeout: 10_000 });
    await expect(office(page)).toHaveAttribute("data-camera", "base");
  });
});

test("direct visits render standalone pages", async ({ page }) => {
  const service = await page.goto("/services/tools-and-dashboards");
  expect(service?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Tools & Dashboards" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Enter the office" })).toHaveAttribute("href", "/");
  await expect(office(page)).toHaveCount(0);

  const study = await page.goto("/work/manuva");
  expect(study?.status()).toBe(200);
  await expect(office(page)).toHaveCount(0);

  expect((await page.goto("/services/nope"))?.status()).toBe(404);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test e2e/office-interaction.spec.ts`
Expected: FAIL. Activating a link performs a full navigation to `(main)`'s `/contact` (no dialog), and `/services/tools-and-dashboards` is a 404.

- [ ] **Step 3: Extend `office/copy.ts`** (replace the file)

```ts
/**
 * Every visitor-facing word in the office. DRAFTS: Kasper approves all of these before launch (spec 4: his voice,
 * conversational, dry, contractions, no marketing words). Case-study and service bodies come from content/ unchanged.
 */
export const COPY = {
  nav: "Around the office",
  labels: {
    hs_crate: "The work",
    hs_drawer: "Get in touch",
    hs_shelf: "What I do",
    hs_monitor: "Monitor",
  },
  browse: {
    hs_crate: "Pick a record",
    hs_shelf: "Pick one",
  },
  back: "Back",
  close: "Close",
  enterOffice: "Enter the office",
  visit: "Have a look",
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

- [ ] **Step 4: Create `panels/Panel.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { theme } from "@/office/theme";
import { COPY } from "@/office/copy";
import type { HotspotName } from "@/office/hotspots/registry";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** A dialog over the office (spec 7.3): traps focus, Esc and the close control go back, focus returns to the trigger. */
export default function Panel({ hotspot, titleId, children }: { hotspot: HotspotName; titleId: string; children: ReactNode }) {
  const router = useRouter();
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialog.current?.focus({ preventScroll: true });
    return () => {
      const marked = document.querySelector<HTMLElement>('[data-panel-return="true"]');
      marked?.removeAttribute("data-panel-return");
      (marked ?? opener)?.focus?.({ preventScroll: true });
    };
  }, []);

  const close = () => router.back();
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
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
    <div className="panel-scrim" onClick={(e) => e.target === e.currentTarget && close()}>
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
        <button type="button" className="panel-close" onClick={close}>
          {COPY.close}
        </button>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `panels/WorkArticle.tsx`**

```tsx
import type { WorkItem } from "@/content/work";
import { COPY } from "@/office/copy";

/** A case study: in a panel (level 2) or a standalone page (level 1). Body copy is the existing case-study copy. */
export default function WorkArticle({ item, titleId, level }: { item: WorkItem; titleId: string; level: 1 | 2 }) {
  const Title = level === 1 ? "h1" : "h2";
  const Section = level === 1 ? "h2" : "h3";
  return (
    <article className="article">
      <p className="article-eyebrow">
        {item.years} · {item.role}
      </p>
      <Title id={titleId} className="article-title">
        {item.name}
      </Title>
      <p className="article-lede">{item.headline}</p>
      {item.intro.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {item.sections.map((s) => (
        <section key={s.title}>
          <Section>{s.title}</Section>
          {s.paras.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {s.image && (
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.image.src} alt={s.image.caption} loading="lazy" />
              <figcaption>{s.image.caption}</figcaption>
            </figure>
          )}
        </section>
      ))}
      <p className="article-meta">{item.stack.join(" · ")}</p>
      {item.liveUrl && (
        <p>
          <a className="article-cta" href={item.liveUrl} target="_blank" rel="noreferrer">
            {COPY.visit}
          </a>
        </p>
      )}
    </article>
  );
}
```

- [ ] **Step 6: Create `panels/ServiceArticle.tsx`**

```tsx
import Link from "next/link";
import type { Service } from "@/content/services";

/** A service: in a panel (level 2) or a standalone page (level 1). Copy is the existing Work With Me copy. */
export default function ServiceArticle({ service, titleId, level }: { service: Service; titleId: string; level: 1 | 2 }) {
  const Title = level === 1 ? "h1" : "h2";
  const Section = level === 1 ? "h2" : "h3";
  return (
    <article className="article">
      <p className="article-eyebrow">
        {service.number} · {service.meta} · {service.timeline}
      </p>
      <Title id={titleId} className="article-title">
        {service.name}
      </Title>
      <p className="article-lede">{service.description}</p>
      <section>
        <Section>{service.fitsLabel}</Section>
        <p>{service.fitsBody}</p>
      </section>
      <section>
        <Section>{service.requiresLabel}</Section>
        <p>{service.requiresBody}</p>
      </section>
      <p>
        <Link className="article-cta" href={`/contact?topic=${service.topic}`} scroll={false}>
          {service.ctaLabel}
        </Link>
      </p>
      <p className="article-meta">{service.replyHint}</p>
    </article>
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
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
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

- [ ] **Step 8: Add the `panel` slot to `app/(office)/layout.tsx`**

Change the component signature and body to:

```tsx
export default function OfficeLayout({ children, panel }: { children: React.ReactNode; panel: React.ReactNode }) {
  return (
    <html lang="en" className={`${ui.variable} ${mono.variable}`}>
      <body>
        {children}
        {panel}
        <Analytics />
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Create the slot files**

`app/(office)/@panel/default.tsx`:

```tsx
// Nothing in the panel slot after a full page load (parallel-routes.md: default.js).
export default function Default() {
  return null;
}
```

`app/(office)/@panel/page.tsx`:

```tsx
// Soft navigation back to "/" closes the panel (parallel-routes.md: Closing the modal).
export default function NoPanel() {
  return null;
}
```

`app/(office)/@panel/(.)work/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Panel from "@/panels/Panel";
import WorkArticle from "@/panels/WorkArticle";
import { findWork, work } from "@/content/work";

export function generateStaticParams() {
  return work.map((w) => ({ slug: w.slug }));
}

export default async function WorkPanel({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = findWork(slug);
  if (!item) notFound();
  return (
    <Panel hotspot="hs_crate" titleId="panel-title">
      <WorkArticle item={item} titleId="panel-title" level={2} />
    </Panel>
  );
}
```

`app/(office)/@panel/(.)contact/page.tsx`:

```tsx
import Panel from "@/panels/Panel";
import ContactForm from "@/panels/ContactForm";

export default async function ContactPanel({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  return (
    <Panel hotspot="hs_drawer" titleId="panel-title">
      <ContactForm topic={topic} titleId="panel-title" level={2} />
    </Panel>
  );
}
```

`app/(office)/@panel/(.)services/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Panel from "@/panels/Panel";
import ServiceArticle from "@/panels/ServiceArticle";
import { findService, services } from "@/content/services";

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export default async function ServicePanel({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = findService(slug);
  if (!service) notFound();
  return (
    <Panel hotspot="hs_shelf" titleId="panel-title">
      <ServiceArticle service={service} titleId="panel-title" level={2} />
    </Panel>
  );
}
```

- [ ] **Step 10: Create the standalone `app/(office)/services/[slug]/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ServiceArticle from "@/panels/ServiceArticle";
import { findService, services } from "@/content/services";
import { COPY } from "@/office/copy";
import { theme } from "@/office/theme";

export const dynamicParams = false;

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const service = findService((await params).slug);
  return service ? { title: `${service.name} | Kasper Simonsen`, description: service.description } : {};
}

/** Direct visit to /services/<slug>: the service as a normal page, with a way into the office. */
export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const service = findService((await params).slug);
  if (!service) notFound();
  return (
    <main className="standalone" style={{ "--accent": theme.accents.hs_shelf } as React.CSSProperties}>
      <ServiceArticle service={service} titleId="page-title" level={1} />
      <p>
        <Link className="article-cta" href="/">
          {COPY.enterOffice}
        </Link>
      </p>
    </main>
  );
}
```

- [ ] **Step 11: Add the panel, article and form styles** (append to `app/(office)/office.css`)

```css
/* Panels over the scene: a right-hand sheet on desktop, full screen on phones. */
.panel-scrim {
  position: fixed;
  inset: 0;
  z-index: 10;
}
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
@keyframes panel-in {
  from { translate: 40px 0; opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .panel { animation: panel-fade 0.2s ease-out both; }
}
@keyframes panel-fade {
  from { opacity: 0; }
}
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

/* Articles: panels and standalone pages share these. */
.article {
  max-width: 62ch;
  font: 16px/1.6 var(--font-ui), system-ui, sans-serif;
}
.article-eyebrow,
.article-meta {
  font: 11px/1.4 var(--font-mono), ui-monospace, monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
}
.article-title {
  margin: 8px 0 12px;
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.1;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.article-lede {
  font-size: 19px;
  color: var(--office-fg);
}
.article p {
  color: rgba(232, 232, 232, 0.8);
}
.article h2,
.article h3 {
  margin: 32px 0 8px;
  font-size: 15px;
  font-weight: 600;
}
.article a {
  color: var(--office-fg);
}
.article figure {
  margin: 24px 0;
}
.article img {
  max-width: 100%;
  height: auto;
  border: 1px solid rgba(232, 232, 232, 0.15);
}
.article figcaption {
  margin-top: 6px;
  font: 12px/1.4 var(--font-mono), ui-monospace, monospace;
  color: rgba(232, 232, 232, 0.6);
}
.article-cta {
  display: inline-block;
  padding: 10px 16px;
  background: var(--accent);
  color: var(--office-bg) !important;
  border: 0;
  font: 600 14px/1 var(--font-ui), system-ui, sans-serif;
  text-decoration: none;
  cursor: pointer;
}
.form {
  display: grid;
  gap: 14px;
  margin-top: 20px;
}
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
.form input:focus-visible,
.form textarea:focus-visible {
  outline: 1px solid var(--accent);
  border-color: var(--accent);
}

/* Standalone pages (direct visits). */
.standalone {
  min-height: 100vh;
  padding: 72px 20px;
  display: grid;
  justify-content: center;
}
```

- [ ] **Step 12: Add `/services/*` to `app/sitemap.ts`**

Add the import `import { services } from "@/content/services";`, then before the `return`:

```ts
  const serviceRoutes: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${base}/services/${s.slug}`,
    priority: 0.8,
    changeFrequency: "monthly" as const,
  }));
```

and return `[...staticRoutes, ...caseStudies, ...serviceRoutes]`.

- [ ] **Step 13: Run to verify it passes**

Run: `npx tsc --noEmit && npx vitest run && npx playwright test`
Expected: tsc clean, all unit tests green, all e2e green (10 in `office.spec.ts` plus 8 in `office-interaction.spec.ts`).

If interception doesn't happen for `/work/<slug>` or `/contact`, a full page load to `(main)` happens instead and no dialog appears. In that case Next isn't intercepting across root layouts. Don't add workarounds in the client. Ledger it as a ruling and move the standalone `work/[slug]` and `contact` pages into `(office)` early, from phase 5. Their bodies become `WorkArticle` (level 1) and `ContactForm` (level 1) on the `.standalone` layout, like the service page, and `(main)`'s versions are deleted. Then re-run.

- [ ] **Step 14: Build**

Run: `RESEND_API_KEY=re_placeholder_for_local_build npm run build`
Expected: `Models OK`. Routes include `/services/[slug]` (●, two paths) and the `@panel` interception segments, and there are no type errors. (The placeholder key only satisfies `/api/contact`'s module-level `new Resend()`; Vercel has the real one.)

- [ ] **Step 15: Commit**

```bash
git add panels/Panel.tsx panels/WorkArticle.tsx panels/ServiceArticle.tsx panels/ContactForm.tsx office/copy.ts "app/(office)/layout.tsx" "app/(office)/@panel/default.tsx" "app/(office)/@panel/page.tsx" "app/(office)/@panel/(.)work/[slug]/page.tsx" "app/(office)/@panel/(.)contact/page.tsx" "app/(office)/@panel/(.)services/[slug]/page.tsx" "app/(office)/services/[slug]/page.tsx" "app/(office)/office.css" app/sitemap.ts e2e/office-interaction.spec.ts
git commit -m "Open case studies, services and contact as panels over the office

Intercepting routes in an @panel slot keep the canvas mounted; direct
visits render standalone pages. /services/<slug> is new.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Review with Kasper

- [ ] **Step 1: Full green run**

Run: `npx tsc --noEmit && npx vitest run && npx playwright test && RESEND_API_KEY=re_placeholder_for_local_build npm run build`
Expected: all green. Fix anything that isn't before involving Kasper.

- [ ] **Step 2: Capture for review**

With `npm run dev` running, use a Playwright script (like phase 1's `capture.mjs`; headless SwiftShader) to capture the following at 1440×900 and 390×844:
- the standing spot;
- hover on each object (move the mouse to the label anchor positions, or focus each nav link);
- each object focused: crate browse, monitor, `/contact`, `/work/manuva`, `/services/platforms-and-systems`.

Save them into `.superpowers/sdd/2026-10-02-office-phase-3-interactions/shots/`. Check yourself first:
- every focus pose frames its object;
- the panel never covers the object on desktop;
- the label sits above the object;
- on the phone, nothing is cut off at the standing spot.

- [ ] **Step 3: Kasper reviews it in the browser**

Tell Kasper to open http://localhost:3010, scroll in, and try hover, clicks, keyboard Tab, Back and Esc, on desktop and on his phone if he can. List the drafts in `office/copy.ts` for his approval. Ask about:
- the camera move speed (`FOCUS_SECONDS`);
- the focus framings;
- the panel width;
- whether hover should also flip the object to the triangle-mesh look (spec 3.4 defers this to phase 3).

**End the turn** and wait.

- [ ] **Step 4: Apply feedback**

| Feedback | Knob |
|---|---|
| Camera moves too fast or slow | `FOCUS_SECONDS` in `office/camera/rig.ts` |
| A framing is off | that camera's tuple in `FOCUS` (`greybox_office.py`), then re-export |
| Panel too wide or narrow | `.panel` width in `office.css` |
| Copy | `office/copy.ts` |
| Label position | `.office-label` margin |

Re-run Step 1 after each change, then commit each change with a descriptive message.
