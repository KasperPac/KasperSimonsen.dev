# Office Interactions M3 (Shelf + Monitor) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The shelf holds Kasper's four services as ornaments (gear, globe, phone, desktop computer). Picking one floats it to the camera with a plaque card beside it, and Read more opens the full service, which ends with the two engagement models and their contact buttons. `/services/<slug>` gets a standalone page. The monitor shows a fake Australian age check with a punchline behind each button.

**Architecture:** The four services and the two engagement models move into `content/services.ts`. The shelf is the crate's pattern again: browsing is a local history layer, a picked ornament is `/services/<slug>`, and Read more is a layer on top. One addition: an engagement-model button pushes a `topic` layer that opens the contact form over the service panel. A pure `ShelfMotion` (the same shape as `CrateMotion`) floats the picked ornament to a spot in front of the shelf's focus camera. The plaque is M1's pinned DOM `Card`, built but not used until now, placed each frame from the ornament's screen rectangle (`screenRect` + `placeCard`) and docked by CSS on phones. The monitor's gag is printed on `hs_monitor__screen` with `CardFace` and a new `place="screen"`, mapped onto the tilted screen quad by `screenFaceFor`.

**Tech Stack:** Next 16.2.4 App Router, React 19.2.4, @react-three/fiber 9.8, drei 10.7 (`Html`), three 0.186, Vitest 5 (node environment, `*.test.ts` only), Playwright 1.63 (SwiftShader), Blender 5.2 via the Blender MCP.

**Spec:** `docs/superpowers/specs/2026-10-02-office-interactions-design.md`, sections 3.4, 3.5, 3.6, 4, 5, 7 and 8, milestone 3. The base spec is `docs/superpowers/specs/2026-10-01-office-redesign-design.md` (section 7.1 covers the fallback).

## Global Constraints

- Branch `redesign/office`. Never push without asking Kasper; copy approval gates any push.
- Stage files by explicit path; never `git add -A` (`.agents/` stays untracked).
- Commit messages are descriptive and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next code (AGENTS.md).
- Agents never touch `package.json` or run `npm install`. No new dependencies.
- LF line endings (`.gitattributes` enforces).
- Only one agent drives the live Blender 5.2 session. Edit `office_props.py` in a copy (`office_props_next.py`) and `cp` it over once verified, because other agents import it mid-edit (memory: atomic module swaps).
- Visitor-facing words live in `office/copy.ts` or `content/services.ts`. **The four service texts, the plaque, shelf and screen labels, and the monitor gag are drafts in Kasper's voice: casual, direct, dry, contractions, first person, no marketing words, no rule-of-three lists. He approves them before any push.** The engagement-model copy is reused verbatim.
- Shelf services and ornaments, in order: "Industrial automation | Gear", "Web design and development (sites) | Globe", "App design and development (web apps, Android, iOS) | Phone", "PC software development (desktop) | Desktop computer".
- "Click an ornament: it floats forward and turns to face the camera. The URL becomes `/services/<slug>`. A plaque card shows the name, 2–3 lines and **Read more**."
- "**Read more** opens the full service in the panel. It ends with **Two ways to work with me**, the existing Tools & Dashboards and Platforms & Systems copy, each with a button that opens the contact form with its topic pre-filled."
- "Back peels the layers as for the crate." Read more never changes the URL. Shelf browsing and the monitor are local layers with no URL.
- Monitor: "a fake Australian age-verification gate in Kasper's voice. Both buttons get a punchline. There is no URL; Back or Esc returns to the standing spot. No adult imagery." No real agency's name or branding either.
- Motion: ornament ~0.6 s; teases ≤ 0.3 s. "Movers: picking a record or an ornament moves the object to the camera, not the camera again." Reduced motion: objects switch state, the camera cuts, cards and the panel fade.
- Cards: black with a 1 px white hairline; the section colour goes on the eyebrow and the button only. They fade in once the object's move has finished. Desktop: object left of centre, card to its right. Phones: the card docks at the bottom.
- Phones are where Kasper demos: check every visual change at 390×844 and 390×664 before calling it done.
- The office GLB stays under `office.maxBytes` (2 MB); `npm run check:models` must pass.

## Review Focus

1. **Picking another ornament while one is out.** The crate forbids this. On a four-ornament shelf the visitor will do it anyway. Expected: the old ornament goes home, the new one comes out, and there is still only one history entry, so one Back returns to the shelf. *Test: Task 3 (`replaceLayer` replaces, never pushes), Task 4 (a swap sends the old one home while the new one comes out), Task 7 (e2e swap, then one Back).*
2. **Back or Esc while the ornament is still floating out.** Expected: it turns round from wherever it is and the plaque never shows. *Test: Task 4 ("goes back the way it came, from wherever it is").*
3. **Forward onto `/services/<slug>` from the standing spot,** after backing out. Expected: the camera goes to the shelf, the ornament floats out once, and the plaque waits for the camera to arrive. *Test: Task 7 (e2e Forward).*
4. **The contact form opened from a service panel.** Expected: Esc closes only the form, focus returns to the button that opened it, and the service panel is still there underneath. A stale or forged `topic` in `history.state` never opens a form. *Test: Task 3 (`layerOf` validates the topic and drops it when not reading), Task 7 (e2e Esc order and focus).*
5. **A phone rotated or resized with an ornament out.** Expected: it stays framed above the docked plaque. *Test: Task 4 (portrait placement uses `PRESENT_AT.portrait`; the pose is recomputed every frame from the live aspect), Task 7 (e2e docked plaque at 390×844).*

---

## File structure

| File | Responsibility |
|---|---|
| `content/services.ts` | Four `services` (the shelf) + two `engagementModels` (existing copy) |
| `content/contact.ts` | Adds `TOPICS`, `Topic`, `isTopic` |
| `content/content.test.ts`, `office/scene/targets.test.ts` | Updated for the new slugs |
| `office/copy.ts`, `app/(office)/office.css` | Shelf, plaque, service, screen and standalone copy (drafts) and styles |
| `office/scene/location.ts` (+ test) | `Layer.topic`; `sceneFor` returns it |
| `office/history.ts` (+ new `office/history.test.ts`) | `replaceLayer` |
| `office/hotspots/registry.ts` (+ test) | `ORNAMENTS = 4` |
| `scripts/blender/office_props.py`, `scripts/blender/greybox_office.py` | Four new ornaments; shelf focus cameras retuned |
| `art/office.blend`, `public/models/office.glb`, `office/manifest.json`, `office/nodes.test.ts` | Rebuilt model; ornament nodes required |
| `office/objects/shelf.ts` (+ test) | Pure: `presentDistance`, `presentedPlacement`, `findShelfNodes`, `ShelfMotion` |
| `office/objects/motion.ts` (+ test) | The bob holds while the shelf is open |
| `office/cards/face.ts` (+ test), `office/cards/CardFace.tsx` | `screenFaceFor`; `place="screen"` |
| `office/cards/AgeGate.tsx` | The monitor's gag |
| `office/cards/Plaque.tsx` | The plaque card beside a picked ornament |
| `panels/ServiceArticle.tsx` (+ `panels/ServiceArticle.test.ts`) | A service in the panel and on its standalone page |
| `app/(office)/services/[slug]/page.tsx` | Standalone `/services/<slug>` |
| `office/OfficeErrorBoundary.tsx`, `app/sitemap.ts` | Services in the fallback and the sitemap |
| `office/OfficeCanvas.tsx`, `office/OfficeExperience.tsx` | Wiring |
| `e2e/office-shelf.spec.ts` (new), `e2e/office-interaction.spec.ts`, `e2e/office.spec.ts` | End to end |

## Execution waves

1. **Lead:** Task 1. Every other task imports its content, copy and styles, so it lands first. It is also the only task that edits `office/copy.ts` and `office.css`.
2. **Parallel:** Task 2 (live Blender agent), Task 3 (agent A), Task 4 (agent B), Task 5 (agent C) and Task 6 (agent D). Their files don't overlap. Each agent runs only its own tests, and the lead commits each task.
3. **Lead:** Task 7 (wiring and e2e), then Task 8 with Kasper.

---

### Task 1: Content, copy and styles

**Files:**
- Modify: `content/services.ts`, `content/contact.ts`, `content/content.test.ts`, `office/scene/targets.test.ts`, `office/copy.ts`, `app/(office)/office.css`

**Interfaces:**
- Produces:
  - `type Service = { slug: string; number: string; name: string; ornament: "gear" | "globe" | "phone" | "computer"; summary: string; body: string[] }`; `services: Service[]` (4, shelf order); `findService(slug): Service | undefined`.
  - `type EngagementModel` (the old `Service` fields: `slug, number, name, meta, timeline, description, fitsLabel, fitsBody, requiresLabel, requiresBody, replyHint, ctaLabel, topic: Topic`); `engagementModels: EngagementModel[]` (2).
  - `TOPICS = ["tools", "platforms"] as const`; `type Topic`; `isTopic(v: unknown): v is Topic` (all in `content/contact.ts`).
  - `COPY.shelf`, `COPY.plaque`, `COPY.service`, `COPY.monitor`, `COPY.enter` (shapes below).
  - CSS classes: `.office-shelf`, `.office-card .office-card-title:focus`, `.office-screen` (+ `.office-gate-buttons`, `.office-gate-reply`), `.article-model`, `.article-label`, `.article-hint`, `.standalone`, `.standalone-enter`.

- [ ] **Step 1: Write the failing content tests.** Replace the `describe("services", …)` block in `content/content.test.ts` with the block below, add `engagementModels` to the `./services` import and `isTopic` to the `./contact` import, and add the `isTopic` test to `describe("contact")`.

```ts
describe("services", () => {
  it("has the four shelf services, in shelf order, with url-safe slugs", () => {
    expect(services.map((s) => s.slug)).toEqual(["industrial-automation", "websites", "apps", "desktop-software"]);
    for (const s of services) expect(s.slug).toMatch(/^[a-z0-9-]+$/);
  });
  it("gives each one its ornament: gear, globe, phone, desktop computer", () =>
    expect(services.map((s) => s.ornament)).toEqual(["gear", "globe", "phone", "computer"]));
  it("numbers them 01 to 04", () => expect(services.map((s) => s.number)).toEqual(["01", "02", "03", "04"]));
  it("keeps each plaque summary to two or three lines", () => {
    for (const s of services) {
      expect(s.summary.length).toBeGreaterThan(40);
      expect(s.summary.length).toBeLessThanOrEqual(200);
    }
  });
  it("has a body to read for every service", () => {
    for (const s of services) {
      expect(s.body.length).toBeGreaterThan(0);
      for (const p of s.body) expect(p).not.toBe("");
    }
  });
  it("finds by slug", () => {
    expect(findService("apps")?.ornament).toBe("phone");
    expect(findService("tools-and-dashboards")).toBeUndefined();
  });
});

describe("engagement models", () => {
  it("keeps the two existing models, headlines and contact topics", () => {
    expect(engagementModels.map((m) => m.name)).toEqual(["Tools & Dashboards", "Platforms & Systems"]);
    expect(engagementModels.map((m) => m.topic)).toEqual(["tools", "platforms"]);
  });
  it("every topic pre-fills a subject", () => {
    for (const m of engagementModels) expect(subjectForTopic(m.topic)).not.toBe("");
  });
});
```

```ts
  it("knows its topics", () => {
    expect(isTopic("tools")).toBe(true);
    expect(isTopic("platforms")).toBe(true);
    expect(isTopic("other")).toBe(false);
    expect(isTopic(undefined)).toBe(false);
  });
```

In `office/scene/targets.test.ts`, replace the old slugs: `/services/tools-and-dashboards` becomes `/services/websites` (both rows), and `platforms-and-systems` becomes `apps` in the `pathForTarget` test. Add a row `["/services/tools-and-dashboards", null]`, since an engagement model is not a shelf service.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run content office/scene`
Expected: FAIL. `engagementModels` and `isTopic` aren't exported, and the slugs differ.

- [ ] **Step 3: Add the topics** to `content/contact.ts` (replacing the `SUBJECTS` declaration's type):

```ts
/** `?topic=` values the contact form knows: the two engagement models. */
export const TOPICS = ["tools", "platforms"] as const;
export type Topic = (typeof TOPICS)[number];

export function isTopic(value: unknown): value is Topic {
  return typeof value === "string" && (TOPICS as readonly string[]).includes(value);
}

// Same subjects as the old /contact form, so ?topic= links keep working on both.
const SUBJECTS: Record<Topic, string> = {
  tools: "Tools & dashboards enquiry",
  platforms: "Platforms & systems enquiry",
};

/** Pre-filled subject for a `?topic=` value; empty for anything else. */
export function subjectForTopic(topic: string | undefined): string {
  return isTopic(topic) ? SUBJECTS[topic] : "";
}
```

- [ ] **Step 4: Rewrite `content/services.ts`.** Rename the existing type to `EngagementModel` and the array to `engagementModels`, keep both entries word for word, and type `topic` as `Topic` (import it from `./contact`). Then add the shelf services above it:

```ts
import type { Topic } from "./contact";

/** A service on the shelf: one ornament each. Plaques, service panels and /services/<slug> pages read this. DRAFT copy, Kasper approves. */
export type Service = {
  slug: string;
  number: string;
  name: string;
  /** The ornament it stands as on the shelf (office_props.py builds them in this order). */
  ornament: "gear" | "globe" | "phone" | "computer";
  /** Two or three lines on the plaque. */
  summary: string;
  /** The Read more, a paragraph each. */
  body: string[];
};

export const services: Service[] = [
  {
    slug: "industrial-automation",
    number: "01",
    name: "Industrial automation",
    ornament: "gear",
    summary: "PLC and HMI work, mostly Siemens and Omron, and the software that joins the machines up to the rest of the business.",
    body: [
      "Machines don't care how nice your dashboard looks. They care whether the code is right, and whether someone can fault-find it at 2 am without ringing me.",
      "I write and change PLC and HMI code, do safety upgrades on lines that are already running, and build the software around them: production tracking, reporting, and getting machine data into the systems the office already uses.",
      "Brownfield's fine. Most of the job is changing something that works, carefully, and writing down what changed.",
    ],
  },
  {
    slug: "websites",
    number: "02",
    name: "Websites",
    ornament: "globe",
    summary: "Sites that load fast, say plainly what you do, and that you can update yourself without ringing me. Next.js mostly.",
    body: [
      "Most business sites need less than they're sold: a clear page about what you do, and an easy way to get hold of you.",
      "I build them in Next.js on Vercel, with the words and pictures somewhere you can edit them yourself. Shopify when you're selling things.",
      "If the site has to do something odd behind the scenes, that's where I'm most useful.",
    ],
  },
  {
    slug: "apps",
    number: "03",
    name: "Apps",
    ornament: "phone",
    summary: "Web apps, and iPhone and Android apps. Built for the people who'll actually use them, gloves and patchy wifi included.",
    body: [
      "An app is usually a spreadsheet that's outgrown itself. Inventory, production, jobs, quotes: whatever the business runs on that's held together by one person's macros.",
      "I build web apps in Next.js and phone apps in React Native, so one codebase covers iPhone and Android. Warehouse scanners and plant-floor tablets too.",
      "It keeps working when the wifi drops, keeps each customer's data to itself, and doesn't fall over the week after launch.",
    ],
  },
  {
    slug: "desktop-software",
    number: "04",
    name: "Desktop software",
    ornament: "computer",
    summary: "Windows software for when a browser won't do: talking to hardware, running offline on a plant PC, or chewing through files locally.",
    body: [
      "Some jobs don't belong in a browser. The PC's bolted to a machine, the network comes and goes, or the files are too big to upload anywhere.",
      "I write desktop tools that talk to serial devices, PLCs and label printers, run without an internet connection, and install without a fight with IT.",
      "Usually it's a small utility someone's been wishing existed for years. Sometimes it's the whole operator station.",
    ],
  },
];

export function findService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}
```

Write the doc comment on `EngagementModel` as: `/** The two ways to work with Kasper. Every service's Read more ends with them (existing site copy, verbatim). */`.

- [ ] **Step 5: Add the copy** to `COPY` in `office/copy.ts` (after `crate`):

```ts
  shelf: {
    label: "Shelf",
    hint: "Click one to pick it up.",
    hintTouch: "Tap one to pick it up.",
  },
  plaque: { eyebrow: (number: string) => `What I do · ${number}`, readMore: "Read more" },
  service: { eyebrow: "What I do", ways: "Two ways to work with me" },
  /** On the standalone pages, back into the office. */
  enter: "Enter the office",
  /** The monitor's gag (spec 3.5): a fake Australian age check. No real agency's name. */
  monitor: {
    eyebrow: "Age verification",
    title: "Hang on. How old are you?",
    text: "Australian law wants to know who's looking at screens now. This one's got TypeScript on it, so I have to ask.",
    over: "I'm 18 or over",
    under: "I'm under 18",
    replies: {
      over: "No ID, no questions. About as thorough as the real ones. It's only terminal windows on here anyway.",
      under: "Honest. Nobody ever presses this one. You're fine, it's just code. Go tell your parents to hire me.",
    },
  },
```

- [ ] **Step 6: Add the styles** at the end of `app/(office)/office.css`:

```css
/* The shelf's ornaments as real links (spec 5): focus lights the ornament in 3D, so the links themselves stay hidden. */
.office-shelf { position: fixed; width: 1px; height: 1px; margin: 0; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

/* The plaque beside a picked ornament: a focus target for the reader, not a control. */
.office-card .office-card-title:focus { outline: none; }

/* What's printed on the monitor's screen: laid out at 640 px, mapped onto the screen. */
.office-screen { padding: 40px 46px; font-size: 22px; }
.office-screen .office-card-title { font-size: 46px; }
.office-gate-buttons { display: flex; gap: 16px; margin-top: 18px; }
.office-screen .office-gate-buttons .office-card-cta { position: static; }
.office-screen .office-card-cta[aria-pressed="false"] { background: transparent; color: var(--office-fg); outline: 1px solid rgba(232, 232, 232, 0.6); }
.office-gate-reply { margin: 18px 0 0; min-height: 2.7em; color: var(--accent); }
@media (max-width: 700px), (orientation: portrait) {
  .office-screen { font-size: 26px; }
  .office-screen .office-card-title { font-size: 50px; }
}

/* A service's Read more ends with the two ways to work. */
.article-model { margin-top: 24px; padding-top: 18px; border-top: 1px solid rgba(232, 232, 232, 0.2); }
.article-model h3,
.article-model h4 { margin: 0 0 4px; font-size: 18px; font-weight: 600; }
.article-label { margin: 14px 0 2px; font: 11px/1.2 var(--font-mono), ui-monospace, monospace; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(232, 232, 232, 0.6); }
.article-hint { font-size: 14px; }

/* Standalone pages (a shared or refreshed link), in the office's style. */
.standalone { max-width: 62ch; margin: 0 auto; padding: 48px 16px 80px; }
.standalone-enter { display: inline-block; margin-bottom: 32px; color: var(--office-fg); font: 11px/1.2 var(--font-mono), ui-monospace, monospace; letter-spacing: 0.1em; text-transform: uppercase; }
```

- [ ] **Step 7: Run all unit tests**

Run: `npx vitest run`
Expected: PASS, including Step 1's tests. `registry.test.ts` still passes, because it reads `services` by index and `services.length` (4) is ≤ `ORNAMENTS` (5).

Run: `npx tsc --noEmit`
Expected: no errors (nothing imports the old `Service` fields).

- [ ] **Step 8: Commit**

```bash
git add content/services.ts content/contact.ts content/content.test.ts office/scene/targets.test.ts office/copy.ts "app/(office)/office.css"
git commit -m "Put the four services on the shelf and keep the two ways to work for their Read more"
```

---

### Task 2: Four ornaments and the shelf camera (Blender)

Runs in the live Blender session, by one agent only. Edit `office_props.py` as `office_props_next.py` and `cp` it over once verified.

**Files:**
- Modify: `scripts/blender/office_props.py` (`build_shelf`; replace the five `_ornament_*` builders with four), `scripts/blender/greybox_office.py` (`FOCUS["shelf"]` and its comment), `art/office.blend`, `public/models/office.glb`, `office/manifest.json`
- Test: `office/nodes.test.ts`

**Interfaces:**
- Consumes: `services` order (Task 1): gear, globe, phone, computer.
- Produces: nodes `hs_shelf__ornament_00`..`_03` (no `_04`). Each has its origin at its base, its front facing the room (Blender −y, which is glTF local +z), and is 0.12–0.19 m tall with a footprint inside 0.15 m wide × 0.12 m deep. Retuned cameras `cam_focus_shelf` and `cam_focus_shelf_portrait`.

- [ ] **Step 1: Write the failing node test** (inside the `describe` in `office/nodes.test.ts`, adding `import { services } from "@/content/services";`):

```ts
  it("the shelf has one ornament per service, and no more", () => {
    services.forEach((_, i) => expect(manifest.office.nodes).toContain(`hs_shelf__ornament_${String(i).padStart(2, "0")}`));
    expect(manifest.office.nodes).not.toContain(`hs_shelf__ornament_${String(services.length).padStart(2, "0")}`);
  });
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run office/nodes.test.ts`
Expected: FAIL on `hs_shelf__ornament_00`.

- [ ] **Step 3: Build the ornaments** (in `office_props_next.py`). Replace `_ornament_cog`, `_ornament_layers`, `_ornament_rocket`, `_ornament_trophy` and `_ornament_hourglass` with the four builders below, and change `build_shelf`'s ornament loop to:

```python
    y = -depth / 2
    builders = (_ornament_gear, _ornament_globe, _ornament_phone, _ornament_computer)  # services order (content/services.ts)
    for i, (build, x) in enumerate(zip(builders, (-0.36, -0.12, 0.12, 0.36))):
        bm = bmesh.new()
        build(bm)
        _part(f"{name}__ornament_{i:02d}", bm, root, col, (x * width, y, 0), (0, 0, 0.12 * (i % 2 * 2 - 1)))
    return root


def _ornament_gear(bm):
    """Industrial automation: a gear standing on a little plinth, its face to the room."""
    teeth, r_out, r_root = 10, 0.07, 0.056
    pts = []
    for k in range(teeth):
        a = 2 * math.pi * k / teeth
        for da, r in ((-0.36, r_root), (-0.2, r_out), (0.2, r_out), (0.36, r_root)):
            pts.append((r * math.cos(a + da * math.pi / teeth * 2), r * math.sin(a + da * math.pi / teeth * 2)))
    inner = [(0.022 * x / math.hypot(x, y), 0.022 * y / math.hypot(x, y)) for x, y in pts]
    _strip(bm, pts, inner, 0.022, Matrix.Translation((0, -0.011, 0.088)) @ XZ, closed=True)
    _slab(bm, 0.08, 0.05, 0.0, 0.02, r=0.006, top=0.004)


def _ornament_globe(bm):
    """Websites: a desk globe, tilted on its axis inside a half-meridian, on a stem and a round foot."""
    r, zc = 0.058, 0.098
    tilt = _m((0, 0, zc), (0, math.radians(23.5), 0))
    _lathe(bm, [(r * math.sin(a), -r * math.cos(a)) for a in (math.pi * k / 8 for k in range(9))], 12, tilt)
    ring = r + 0.008
    _tube(bm, [(-ring * math.sin(a), 0, -ring * math.cos(a)) for a in (math.pi * k / 10 for k in range(11))], 0.003, 6, m=tilt, hint=(0, 1, 0))
    _lathe(bm, [(0.004, 0.012), (0.004, zc - ring + 0.004)], 6)
    _lathe(bm, [(0.04, 0.0), (0.04, 0.008), (0.028, 0.014), (0.0, 0.014)], 12)


def _ornament_phone(bm):
    """Apps: a phone leaning back in a little desk stand, its screen to the room."""
    w, h, t = 0.072, 0.145, 0.009
    lean = _m((0, 0.004, 0.012), (math.radians(12), 0, 0))
    _prism(bm, _rrect(w, h, 0.011, 3, c=(0, h / 2)), t, lean @ Matrix.Translation((0, t / 2, 0)) @ XZ)
    _prism(bm, _rrect(w - 0.008, h - 0.022, 0.006, 2, c=(0, h / 2)), 0.001, lean @ Matrix.Translation((0, -t / 2, 0)) @ XZ)
    _lathe(bm, [(0.0028, 0.0), (0.0028, 0.001)], 8, lean @ _m((0, -t / 2 - 0.001, h - 0.007), (math.pi / 2, 0, 0)))
    _slab(bm, 0.085, 0.05, 0.0, 0.012, r=0.006, top=0.003)
    _box(bm, (0.085, 0.006, 0.02), (0, -0.022, 0.016))


def _ornament_computer(bm):
    """Desktop software: a little all-in-one computer, the old beige kind, with a keyboard lying in front of it."""
    w, h, d = 0.1, 0.125, 0.09
    _slab(bm, w, d, 0.0, h, r=0.006, segs=2, top=0.004, m=Matrix.Translation((0, 0.015, 0)))
    front = 0.015 - d / 2
    _prism(bm, _rrect(0.072, 0.056, 0.006, 2, c=(0, 0.082)), 0.002, Matrix.Translation((0, front, 0)) @ XZ)
    _box(bm, (0.034, 0.002, 0.004), (0.016, front - 0.001, 0.032))
    _slab(bm, 0.09, 0.03, 0.0, 0.008, r=0.003, top=0.002, m=Matrix.Translation((0, front - 0.02, 0)))
```

Every builder must keep its front to −y (the room). `_strip`, `_prism` and `XZ` stand a shape up the same way the old cog did. If a shape comes out facing +y or lying down, flip its matrix (`Matrix.Rotation(math.pi, 4, "Z")` or the sign of the y translation). Fix things by the knobs (sizes, `lean`, `tilt`); don't change helpers that other props use.

- [ ] **Step 4: Build, then look and measure**

```python
import shutil, runpy
shutil.copy(r"C:\dev\KasperSimonsen.dev\scripts\blender\office_props_next.py", r"C:\dev\KasperSimonsen.dev\scripts\blender\office_props.py")
runpy.run_path(r"C:\dev\KasperSimonsen.dev\scripts\blender\greybox_office.py", run_name="__main__")
```

Then check every ornament `o` in `hs_shelf__ornament_00..03`. The front check uses the face that carries the shape: the gear's face, the globe's ring side, the phone's screen plate and the computer's screen plate.
- Height from its evaluated bounds is 0.12–0.19 m, and its footprint is within 0.15 m wide × 0.12 m deep.
- It reads as what it is, in white line art on black, in a viewport render from `cam_focus_shelf`.
- Its front faces the room. Ray-cast from 1 m in front of the ornament along +y in the shelf's frame (back towards the ornament's centre). The first hit must be on that ornament, on its front.
- No two ornaments intersect each other or the board. Test pairwise BVH overlap with `mathutils.bvhtree.BVHTree.FromObject`.

- [ ] **Step 5: Retune the shelf cameras.** The four ornaments sit on the board, and the plaque goes beside a picked ornament on desktop and docks at the bottom on phones. Retune `FOCUS["shelf"]` in `greybox_office.py` so that:
- **`land` (16:10):** all four ornaments are in frame. The shelf's centre sits ~33% in from the left and its outer ornaments are at least 8% in from the left edge, which leaves the right ~40% for the plaque.
- **`portrait` (390×844):** the four ornaments span at least 70% of the width, centred, in the upper half (the plaque docks on the lower ~40%).
- Both eyes are ≥ 0.3 m from any mesh. Measure with BVH `find_nearest` against every mesh in `office_root`.

Update the comment above `"shelf"` in `FOCUS` to say why it's framed this way. Re-run `greybox_office.py` and render a check from both cameras.

- [ ] **Step 6: Export, build, check**

```python
import runpy
runpy.run_path(r"C:\dev\KasperSimonsen.dev\scripts\blender\greybox_office.py", run_name="__main__")
result = runpy.run_path(r"C:\dev\KasperSimonsen.dev\scripts\blender\export.py", run_name="__main__")["SUMMARY"]
```

Add `hs_shelf__ornament_00` … `hs_shelf__ornament_03` to `office.nodes` in `office/manifest.json`.

Run: `npm run build:models && npm run check:models && npx vitest run office/nodes.test.ts`
Expected: models OK (office under 2048 KB) and the test PASSES.

- [ ] **Step 7: Commit**

```bash
git add scripts/blender/office_props.py scripts/blender/greybox_office.py art/office.blend public/models/office.glb office/manifest.json office/nodes.test.ts
git commit -m "Stand the four services on the shelf as a gear, a globe, a phone and a little computer"
```

`office_props_next.py` is a scratch copy: delete it, don't commit it.

---

### Task 3: Topic layer, replace, four ornaments (pure)

**Files:**
- Modify: `office/scene/location.ts`, `office/scene/location.test.ts`, `office/history.ts`, `office/hotspots/registry.ts`, `office/hotspots/registry.test.ts`
- Create: `office/history.test.ts`

**Interfaces:**
- Consumes: `Topic`, `isTopic` (Task 1).
- Produces:
  - `type Layer = { focus: HotspotName | null; reading: boolean; topic: Topic | null }`; `NO_LAYER` includes `topic: null`.
  - `sceneFor(pathname, layer): { target: Hit | null; reading: boolean; topic: Topic | null }`.
  - `replaceLayer(layer: Layer, path?: string): void` (history.ts).
  - `ORNAMENTS = 4`.

- [ ] **Step 1: Write the failing tests.** In `office/scene/location.test.ts`, add `topic: null` to every expected `sceneFor` result and to the `layerOf` result `{ focus: "hs_drawer", reading: true }`. Then add:

```ts
describe("topic (the contact form over a service)", () => {
  it("keeps a known topic while reading", () =>
    expect(layerOf({ [LAYER_KEY]: { focus: "hs_shelf", reading: true, topic: "tools" } })).toEqual({ focus: "hs_shelf", reading: true, topic: "tools" }));
  it("drops an unknown topic", () =>
    expect(layerOf({ [LAYER_KEY]: { focus: "hs_shelf", reading: true, topic: "<script>" } }).topic).toBeNull());
  it("drops a topic with no panel open", () =>
    expect(layerOf({ [LAYER_KEY]: { focus: "hs_shelf", reading: false, topic: "tools" } }).topic).toBeNull());
  it("passes it through to the scene on a service", () =>
    expect(sceneFor("/services/apps", { focus: "hs_shelf", reading: true, topic: "platforms" })).toEqual({
      target: { hotspot: "hs_shelf", item: "apps" },
      reading: true,
      topic: "platforms",
    }));
  it("never opens a form with nothing in focus", () => expect(sceneFor("/", { focus: null, reading: true, topic: "tools" }).topic).toBeNull());
});
```

Create `office/history.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LAYER_KEY } from "./scene/location";
import { pushLayer, replaceLayer } from "./history";

const layer = { focus: "hs_shelf" as const, reading: false, topic: null };

beforeEach(() => {
  vi.stubGlobal("window", {
    location: { pathname: "/services/websites" },
    history: { pushState: vi.fn(), replaceState: vi.fn(), state: null },
    dispatchEvent: vi.fn(),
  });
});

describe("history bridge", () => {
  it("pushes a new entry for a new layer", () => {
    pushLayer(layer, "/services/apps");
    expect(window.history.pushState).toHaveBeenCalledWith({ [LAYER_KEY]: layer }, "", "/services/apps");
    expect(window.dispatchEvent).toHaveBeenCalled();
  });
  it("replaces the live entry when swapping what it shows (no new entry, so one Back still steps out)", () => {
    replaceLayer(layer, "/services/apps");
    expect(window.history.replaceState).toHaveBeenCalledWith({ [LAYER_KEY]: layer }, "", "/services/apps");
    expect(window.history.pushState).not.toHaveBeenCalled();
    expect(window.dispatchEvent).toHaveBeenCalled();
  });
  it("keeps the path when none is given", () => {
    replaceLayer(layer);
    expect(window.history.replaceState).toHaveBeenCalledWith({ [LAYER_KEY]: layer }, "", "/services/websites");
  });
});
```

In `office/hotspots/registry.test.ts`, change the `ORNAMENTS` check (line ~79) to:

```ts
    expect(ORNAMENTS).toBe(4);
    expect(services.length).toBe(ORNAMENTS); // every ornament carries a service
```

and add to the `itemAt` test: `expect(itemAt("hs_shelf", 3)).toBe(services[3].slug);` and `expect(itemAt("hs_shelf", 4)).toBeNull();`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run office/scene office/history.test.ts office/hotspots`
Expected: FAIL: no `topic`, no `replaceLayer`, and `ORNAMENTS` is 5.

- [ ] **Step 3: Implement.** In `office/scene/location.ts`:

```ts
import { isTopic, type Topic } from "@/content/contact";
import { HOTSPOTS, type Hit, type HotspotName } from "../hotspots/registry";
import { targetForPath } from "./targets";

/**
 * What the office keeps in history.state on top of the URL: a local object in focus, whether the panel is open, and
 * whether the contact form is open over it for an engagement model's topic.
 */
export type Layer = { focus: HotspotName | null; reading: boolean; topic: Topic | null };

export const NO_LAYER: Layer = { focus: null, reading: false, topic: null };

/** history.state key. Next.js copies its own keys in alongside it when we push (see history.ts). */
export const LAYER_KEY = "office";

/** The office layer in a history.state value; anything unexpected is no layer, and a topic counts only over an open panel. */
export function layerOf(state: unknown): Layer {
  const raw = (state as Record<string, unknown> | null | undefined)?.[LAYER_KEY] as Partial<Layer> | undefined;
  if (!raw || typeof raw !== "object") return NO_LAYER;
  const focus = typeof raw.focus === "string" && (HOTSPOTS as readonly string[]).includes(raw.focus) ? (raw.focus as HotspotName) : null;
  if (focus === null) return NO_LAYER; // the shared object: clearLayer checks identity
  const reading = raw.reading === true;
  return { focus, reading, topic: reading && isTopic(raw.topic) ? raw.topic : null };
}

/** What a location asks the scene to show: the path's target when it routes, else the local layer's object; the panel (and a form over it) only over something. */
export function sceneFor(pathname: string, layer: Layer): { target: Hit | null; reading: boolean; topic: Topic | null } {
  const routed = targetForPath(pathname);
  const target = routed ?? (layer.focus ? { hotspot: layer.focus, item: null } : null);
  if (!target) return { target: null, reading: false, topic: null };
  return { target, reading: layer.reading, topic: layer.reading ? layer.topic : null };
}
```

In `office/history.ts`, after `pushLayer`:

```ts
/** Swaps what the live entry shows for `layer` at `path`, adding no entry: picking another ornament while one is out. */
export function replaceLayer(layer: Layer, path?: string): void {
  window.history.replaceState({ [LAYER_KEY]: layer }, "", path ?? window.location.pathname);
  window.dispatchEvent(new Event(CHANGE));
}
```

In `office/hotspots/registry.ts`: `export const ORNAMENTS = 4;`.

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run office/scene office/history.test.ts office/hotspots`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: errors only at the `pushLayer({ focus, reading })` calls in `office/OfficeExperience.tsx` (no `topic`). Task 7 fixes those; leave them.

- [ ] **Step 5: Commit**

```bash
git add office/scene/location.ts office/scene/location.test.ts office/history.ts office/history.test.ts office/hotspots/registry.ts office/hotspots/registry.test.ts
git commit -m "Let a service panel open the contact form over it, and swap ornaments without a new history entry"
```

---

### Task 4: Shelf motion (pure)

**Files:**
- Create: `office/objects/shelf.ts`, `office/objects/shelf.test.ts`
- Modify: `office/objects/motion.ts`, `office/objects/motion.test.ts`

**Interfaces:**
- Consumes: `approach` (`./motion`), `easeInOutCubic`, `type Pose` (`@/office/camera/pose`).
- Produces:
  - `PRESENT_SECONDS = 0.6`, `PRESENT_FILL`, `PRESENT_AT`, `PRESENT_LIFT`.
  - `presentDistance(size: number, fovDeg: number, aspect: number): number`.
  - `presentedPlacement(camera: Pose, aspect: number, size: number, centre: Vector3, out: Placement): Placement`.
  - `type Placement = { position: Vector3; quaternion: Quaternion }`.
  - `type ShelfNodes = { ornaments: Object3D[]; restPosition: Vector3[]; restQuaternion: Quaternion[]; centre: Vector3[]; size: number[] }`; `findShelfNodes(ornaments: Object3D[]): ShelfNodes`.
  - `class ShelfMotion { get presented(): boolean; update(nodes: ShelfNodes, input: { presented: number | null; camera: Pose | null; aspect: number; reduced: boolean }, dt: number): void }`.

- [ ] **Step 1: Write the failing tests** (`office/objects/shelf.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from "three";
import { makePose } from "@/office/camera/pose";
import { findShelfNodes, presentDistance, presentedPlacement, PRESENT_AT, PRESENT_FILL, PRESENT_SECONDS, ShelfMotion } from "./shelf";

const half = Math.tan(Math.PI / 8); // a 45 degree fov
const placement = () => ({ position: new Vector3(), quaternion: new Quaternion() });
/** At the origin looking down -z, y up, 45 degree fov. */
const origin = () => Object.assign(makePose(), { fov: 45 });

/** A shelf somewhere in the room, turned a little, with four 0.1 x 0.16 x 0.08 ornaments standing on their bases. */
function shelf() {
  const parent = new Group();
  parent.position.set(1, 1.5, 4);
  parent.rotation.y = 0.4;
  const ornaments = [0, 1, 2, 3].map((i) => {
    const o = new Group();
    o.name = `hs_shelf__ornament_0${i}`;
    o.position.set(-0.3 + 0.2 * i, 0, -0.1);
    o.rotation.y = 0.12;
    o.add(new Mesh(new BoxGeometry(0.1, 0.16, 0.08).translate(0, 0.08, 0), new MeshBasicMaterial()));
    parent.add(o);
    return o;
  });
  parent.updateMatrixWorld(true);
  return { parent, ornaments, nodes: findShelfNodes(ornaments) };
}
/** The shelf's focus camera: 2.5 m out from it, looking at it. */
const shelfCam = () => {
  const p = makePose();
  p.position.set(1, 1.6, 6.5);
  p.fov = 45;
  return p;
};
const worldOf = (o: Group) => {
  o.parent?.updateMatrixWorld(true);
  return { position: o.getWorldPosition(new Vector3()), quaternion: o.getWorldQuaternion(new Quaternion()) };
};

describe("presentDistance", () => {
  it("fills PRESENT_FILL of the view's height on a landscape screen", () =>
    expect(presentDistance(0.2, 45, 1.6)).toBeCloseTo(0.2 / (PRESENT_FILL * 2 * half), 6));
  it("fills that share of the width on a portrait one", () =>
    expect(presentDistance(0.2, 45, 0.5)).toBeCloseTo(2 * presentDistance(0.2, 45, 1), 6));
});

describe("presentedPlacement", () => {
  it("puts it left of centre on a landscape screen, its front turned to the camera, upright", () => {
    const out = presentedPlacement(origin(), 1.6, 0.2, new Vector3(), placement());
    const d = presentDistance(0.2, 45, 1.6);
    expect(out.position.z).toBeCloseTo(-d, 6);
    expect(out.position.x / (d * half * 1.6)).toBeCloseTo(PRESENT_AT.land.x, 6);
    expect(out.position.y / (d * half)).toBeCloseTo(PRESENT_AT.land.y, 6);
    const front = new Vector3(0, 0, 1).applyQuaternion(out.quaternion);
    expect(front.dot(out.position.clone().negate().normalize())).toBeCloseTo(1, 6);
    expect(new Vector3(0, 1, 0).applyQuaternion(out.quaternion).y).toBeGreaterThan(0.9);
  });
  it("centres it above the docked plaque on a portrait screen", () => {
    const out = presentedPlacement(origin(), 0.46, 0.2, new Vector3(), placement());
    const d = presentDistance(0.2, 45, 0.46);
    expect(out.position.x / (d * half * 0.46)).toBeCloseTo(PRESENT_AT.portrait.x, 6);
    expect(out.position.y / (d * half)).toBeCloseTo(PRESENT_AT.portrait.y, 6);
  });
  it("puts its visual centre on the spot, not its base", () => {
    const spot = presentedPlacement(origin(), 1.6, 0.2, new Vector3(), placement()).position.clone();
    const centre = new Vector3(0, 0.1, 0);
    const out = presentedPlacement(origin(), 1.6, 0.2, centre, placement());
    const seen = out.position.clone().add(centre.clone().applyQuaternion(out.quaternion));
    expect(seen.distanceTo(spot)).toBeLessThan(1e-9);
  });
});

describe("findShelfNodes", () => {
  it("finds each ornament's size and visual centre, in its own axes", () => {
    const { nodes } = shelf();
    expect(nodes.size[0]).toBeCloseTo(0.16, 3);
    expect(nodes.centre[0].x).toBeCloseTo(0, 6);
    expect(nodes.centre[0].y).toBeCloseTo(0.08, 6);
    expect(nodes.centre[0].z).toBeCloseTo(0, 6);
  });
});

describe("ShelfMotion", () => {
  const input = (presented: number | null, extra: Partial<{ reduced: boolean; aspect: number; camera: ReturnType<typeof makePose> | null }> = {}) => ({
    presented,
    camera: shelfCam(),
    aspect: 1.6,
    reduced: false,
    ...extra,
  });

  it("floats the picked one out over PRESENT_SECONDS and turns it to face the camera", () => {
    const { ornaments, nodes } = shelf();
    const m = new ShelfMotion();
    m.update(nodes, input(1), PRESENT_SECONDS / 2);
    expect(m.presented).toBe(false);
    expect(ornaments[1].position.distanceTo(nodes.restPosition[1])).toBeGreaterThan(0.01);
    m.update(nodes, input(1), PRESENT_SECONDS);
    expect(m.presented).toBe(true);
    const want = presentedPlacement(shelfCam(), 1.6, nodes.size[1], nodes.centre[1], placement());
    const got = worldOf(ornaments[1]);
    expect(got.position.distanceTo(want.position)).toBeLessThan(1e-6);
    expect(got.quaternion.angleTo(want.quaternion)).toBeLessThan(1e-6);
  });

  it("leaves the others on the shelf, their height to the bob", () => {
    const { ornaments, nodes } = shelf();
    ornaments[0].position.y = 0.0123;
    new ShelfMotion().update(nodes, input(1), PRESENT_SECONDS);
    expect(ornaments[0].position.y).toBe(0.0123);
    expect(ornaments[0].position.x).toBe(nodes.restPosition[0].x);
    expect(ornaments[0].quaternion.equals(nodes.restQuaternion[0])).toBe(true);
  });

  it("goes back the way it came, from wherever it is", () => {
    const { ornaments, nodes } = shelf();
    const m = new ShelfMotion();
    m.update(nodes, input(2), PRESENT_SECONDS / 2);
    m.update(nodes, input(null), PRESENT_SECONDS / 4);
    expect(ornaments[2].position.distanceTo(nodes.restPosition[2])).toBeGreaterThan(0.01); // turned round, not snapped home
    expect(m.presented).toBe(false);
    m.update(nodes, input(null), PRESENT_SECONDS);
    expect(ornaments[2].position.equals(nodes.restPosition[2])).toBe(true);
    expect(ornaments[2].quaternion.equals(nodes.restQuaternion[2])).toBe(true);
  });

  it("a swap sends the old one home while the new one comes out", () => {
    const { ornaments, nodes } = shelf();
    const m = new ShelfMotion();
    m.update(nodes, input(0), PRESENT_SECONDS);
    m.update(nodes, input(3), PRESENT_SECONDS / 2);
    expect(m.presented).toBe(false);
    expect(ornaments[0].position.distanceTo(nodes.restPosition[0])).toBeGreaterThan(0.01);
    expect(ornaments[3].position.distanceTo(nodes.restPosition[3])).toBeGreaterThan(0.01);
    m.update(nodes, input(3), PRESENT_SECONDS);
    expect(m.presented).toBe(true);
    expect(ornaments[0].position.equals(nodes.restPosition[0])).toBe(true);
  });

  it("switches at once under reduced motion", () => {
    const { nodes } = shelf();
    const m = new ShelfMotion();
    m.update(nodes, input(1, { reduced: true }), 1 / 60);
    expect(m.presented).toBe(true);
  });

  it("waits on the shelf until the camera is known", () => {
    const { ornaments, nodes } = shelf();
    const m = new ShelfMotion();
    m.update(nodes, input(1, { camera: null }), PRESENT_SECONDS);
    expect(ornaments[1].position.x).toBe(nodes.restPosition[1].x);
    expect(m.presented).toBe(false);
  });
});
```

In `office/objects/motion.test.ts`, add (inside the describe that covers `ObjectMotion`, using its `scene()` and `step` helpers):

```ts
  it("holds the ornaments still while the shelf is open: the picked one floats, the rest wait", () => {
    const s = scene();
    const nodes = findMotionNodes(s.root);
    step(new ObjectMotion(), nodes, { open: "hs_shelf", hovered: "hs_shelf", reduced: false }, 0.5);
    nodes.ornaments.forEach((o, i) => expect(o.position.y).toBe(nodes.ornamentRest[i]));
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run office/objects`
Expected: FAIL. `./shelf` doesn't exist, and the ornaments bob while the shelf is open.

- [ ] **Step 3: Implement `office/objects/shelf.ts`**

```ts
import { Box3, Matrix4, Quaternion, Vector3, type Object3D } from "three";
import { easeInOutCubic, type Pose } from "@/office/camera/pose";
import { approach } from "./motion";

/** How long a picked ornament takes to float out to the camera, and back (interactions spec 4). */
export const PRESENT_SECONDS = 0.6;
/** The share of the view's shorter side a presented ornament's largest dimension fills. */
export const PRESENT_FILL = 0.38;
/**
 * Where a presented ornament's centre sits on screen, in normalised device coordinates (-1..1, y up). Landscape: left
 * of centre, leaving the right for its plaque. Portrait: centred, above the plaque docked at the bottom.
 */
export const PRESENT_AT = { land: { x: -0.4, y: 0.05 }, portrait: { x: 0, y: 0.3 } };
/** How far it rises at the middle of its float, metres: it lifts off the shelf rather than sliding. */
export const PRESENT_LIFT = 0.04;

export type Placement = { position: Vector3; quaternion: Quaternion };

/** How far in front of the camera an ornament of `size` metres fills PRESENT_FILL of the view's shorter side. */
export function presentDistance(size: number, fovDeg: number, aspect: number): number {
  const half = Math.tan((fovDeg * Math.PI) / 360);
  return size / (PRESENT_FILL * 2 * half * Math.min(1, aspect));
}

const spot = new Vector3();
const up = new Vector3();
const look = new Matrix4();

/**
 * Where a picked ornament goes, in world space: in front of `camera` (the shelf's focus pose, so it arrives where the
 * camera does), its visual centre at PRESENT_AT on screen, its front (local +z) turned to the camera, upright to the
 * camera's up. `centre` is its visual centre from its origin, in its own axes.
 */
export function presentedPlacement(camera: Pose, aspect: number, size: number, centre: Vector3, out: Placement): Placement {
  const d = presentDistance(size, camera.fov, aspect);
  const half = Math.tan((camera.fov * Math.PI) / 360);
  const at = aspect < 1 ? PRESENT_AT.portrait : PRESENT_AT.land;
  spot.set(at.x * d * half * aspect, at.y * d * half, -d).applyQuaternion(camera.quaternion).add(camera.position);
  up.set(0, 1, 0).applyQuaternion(camera.quaternion);
  look.lookAt(camera.position, spot, up); // its +z from the ornament toward the camera
  out.quaternion.setFromRotationMatrix(look);
  out.position.copy(centre).applyQuaternion(out.quaternion).negate().add(spot);
  return out;
}

export type ShelfNodes = { ornaments: Object3D[]; restPosition: Vector3[]; restQuaternion: Quaternion[]; centre: Vector3[]; size: number[] };

const box = new Box3();
const boxSize = new Vector3();

/** The shelf's ornaments (index order), where they rest (local to their parents), and each one's visual centre and size. */
export function findShelfNodes(ornaments: Object3D[]): ShelfNodes {
  return {
    ornaments,
    restPosition: ornaments.map((o) => o.position.clone()),
    restQuaternion: ornaments.map((o) => o.quaternion.clone()),
    centre: ornaments.map((o) => {
      o.updateWorldMatrix(true, true);
      return o.worldToLocal(box.setFromObject(o).getCenter(new Vector3()));
    }),
    size: ornaments.map((o) => {
      box.setFromObject(o).getSize(boxSize);
      return Math.max(boxSize.x, boxSize.y, boxSize.z);
    }),
  };
}

const target: Placement = { position: new Vector3(), quaternion: new Quaternion() };
const local: Placement = { position: new Vector3(), quaternion: new Quaternion() };
const world = new Matrix4();
const inverse = new Matrix4();
const unusedScale = new Vector3();
const ONE = new Vector3(1, 1, 1);

function toLocal(parent: Object3D, p: Placement, out: Placement): Placement {
  parent.updateWorldMatrix(true, false);
  world.compose(p.position, p.quaternion, ONE).premultiply(inverse.copy(parent.matrixWorld).invert());
  world.decompose(out.position, out.quaternion, unusedScale);
  return out;
}

/** Per-frame easing of a picked ornament out to the camera and back. Pure state: no React, no clocks. Runs after ObjectMotion (the bob). */
export class ShelfMotion {
  private t: number[] = [];
  private presentedIndex: number | null = null;

  /** True once the picked ornament has arrived in front of the camera (its plaque waits for it). */
  get presented(): boolean {
    return this.presentedIndex !== null && this.t[this.presentedIndex] === 1;
  }

  update(nodes: ShelfNodes, input: { presented: number | null; camera: Pose | null; aspect: number; reduced: boolean }, dt: number): void {
    this.presentedIndex = input.camera ? input.presented : null;
    nodes.ornaments.forEach((o, i) => {
      const was = (this.t[i] ?? 0) > 0;
      const out = this.presentedIndex === i;
      this.t[i] = approach(this.t[i] ?? 0, out ? 1 : 0, dt, input.reduced ? 0 : PRESENT_SECONDS);
      if (this.t[i] === 0 || !input.camera || !o.parent) {
        if (was) o.position.copy(nodes.restPosition[i]); // just home: all the way
        else {
          o.position.x = nodes.restPosition[i].x; // y is the bob's (ObjectMotion), left alone
          o.position.z = nodes.restPosition[i].z;
        }
        o.quaternion.copy(nodes.restQuaternion[i]);
        return;
      }
      toLocal(o.parent, presentedPlacement(input.camera, input.aspect, nodes.size[i], nodes.centre[i], target), local);
      const e = easeInOutCubic(this.t[i]);
      o.position.lerpVectors(nodes.restPosition[i], local.position, e);
      o.position.y += PRESENT_LIFT * Math.sin(Math.PI * e);
      o.quaternion.slerpQuaternions(nodes.restQuaternion[i], local.quaternion, e);
    });
  }
}
```

`easeInOutCubic(1)` must be exactly 1 (and `Math.sin(Math.PI)` is ~1e-16), so the arrived pose matches `presentedPlacement` to 1e-6. If the test shows the ornament off by more than that, check `easeInOutCubic` in `pose.ts` first.

In `office/objects/motion.ts`, change the ornament line in `ObjectMotion.update` to:

```ts
    // While the shelf is open the picked ornament floats (ShelfMotion) and the rest wait still for a pick.
    const bob = input.open === "hs_shelf" ? 0 : this.tease.hs_shelf;
    nodes.ornaments.forEach((o, i) => {
      o.position.y = nodes.ornamentRest[i] + ornamentBob(i, now, bob);
    });
```

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run office/objects`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add office/objects/shelf.ts office/objects/shelf.test.ts office/objects/motion.ts office/objects/motion.test.ts
git commit -m "Float a picked ornament out to the camera and back"
```

---

### Task 5: Service article, plaque, standalone page

**Files:**
- Create: `panels/ServiceArticle.tsx`, `panels/ServiceArticle.test.ts`, `office/cards/Plaque.tsx`, `app/(office)/services/[slug]/page.tsx`
- Modify: `office/OfficeErrorBoundary.tsx`, `app/sitemap.ts`

**Interfaces:**
- Consumes: `services`, `engagementModels`, `findService`, `Topic` (Task 1); `COPY.plaque`, `COPY.service`, `COPY.enter` (Task 1); `Card` (`office/cards/Card.tsx`, as built).
- Produces:
  - `ServiceArticle({ service, titleId, level: 1 | 2, onWrite?: (topic: Topic) => void })`. With `onWrite` its CTAs are buttons; without it they are links to `/contact?topic=<topic>`.
  - `Plaque({ service, titleId, cardRef: RefObject<HTMLElement | null>, onReadMore: () => void })`. Focuses its title when it mounts or its service changes.
  - The route `/services/<slug>`.

- [ ] **Step 1: Read the Next docs** for this route: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-static-params.md` (including `dynamicParams`), `generate-metadata.md`, and `not-found.md`. `params` is a Promise in this version (see `app/(main)/work/[slug]/page.tsx`).

- [ ] **Step 2: Write the failing test** (`panels/ServiceArticle.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { engagementModels, services } from "@/content/services";
import ServiceArticle from "./ServiceArticle";
import Plaque from "@/office/cards/Plaque";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

describe("ServiceArticle", () => {
  it("shows the service, then the two ways to work, under a heading the dialog is labelled by", () => {
    const out = renderToStaticMarkup(createElement(ServiceArticle, { service: services[0], titleId: "t", level: 2, onWrite: () => {} }));
    expect(out).toContain(`id="t"`);
    expect(out).toMatch(/<h2[^>]*id="t"/);
    for (const p of services[0].body) expect(out).toContain(esc(p));
    expect(out).toContain("Two ways to work with me");
    for (const m of engagementModels) {
      expect(out).toContain(esc(m.description));
      expect(out).toContain(esc(m.ctaLabel));
    }
    expect(out.indexOf(esc(services[0].body[0]))).toBeLessThan(out.indexOf("Two ways to work with me")); // the models close it
  });
  it("in the office its buttons open the form; standalone they link to it with the topic", () => {
    const office = renderToStaticMarkup(createElement(ServiceArticle, { service: services[1], titleId: "t", level: 2, onWrite: () => {} }));
    expect(office).not.toContain("/contact?topic=");
    const page = renderToStaticMarkup(createElement(ServiceArticle, { service: services[1], titleId: "t", level: 1 }));
    expect(page).toMatch(/<h1[^>]*id="t"/);
    for (const m of engagementModels) expect(page).toContain(`href="/contact?topic=${m.topic}"`);
  });
});

describe("Plaque", () => {
  it("shows the name, the summary and Read more", () => {
    const out = renderToStaticMarkup(createElement(Plaque, { service: services[2], titleId: "p", cardRef: { current: null }, onReadMore: () => {} }));
    for (const text of [services[2].name, services[2].summary, "Read more", services[2].number]) expect(out).toContain(esc(text));
    expect(out).toContain(`aria-labelledby="p"`);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run panels`
Expected: FAIL. The modules don't exist.

- [ ] **Step 4: Implement `panels/ServiceArticle.tsx`**

```tsx
"use client";

import { engagementModels, type Service } from "@/content/services";
import type { Topic } from "@/content/contact";
import { COPY } from "@/office/copy";

/**
 * A service in full: the Read more panel (level 2, its buttons open the contact form over it) and its standalone page
 * (level 1, links to /contact with the topic). It ends with the two ways to work with Kasper (interactions spec 3.4).
 */
export default function ServiceArticle({ service, titleId, level, onWrite }: { service: Service; titleId: string; level: 1 | 2; onWrite?: (topic: Topic) => void }) {
  const Title = level === 1 ? "h1" : "h2";
  const Ways = level === 1 ? "h2" : "h3";
  const Model = level === 1 ? "h3" : "h4";
  return (
    <article className="article">
      <p className="article-eyebrow">{COPY.service.eyebrow}</p>
      <Title id={titleId} className="article-title">
        {service.name}
      </Title>
      <p className="article-lede">{service.summary}</p>
      {service.body.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      <Ways>{COPY.service.ways}</Ways>
      {engagementModels.map((m) => (
        <section key={m.slug} className="article-model">
          <Model>{m.name}</Model>
          <p className="article-eyebrow">
            {m.meta} · {m.timeline}
          </p>
          <p>{m.description}</p>
          <p className="article-label">{m.fitsLabel}</p>
          <p>{m.fitsBody}</p>
          <p className="article-label">{m.requiresLabel}</p>
          <p>{m.requiresBody}</p>
          {onWrite ? (
            <button type="button" className="article-cta" onClick={() => onWrite(m.topic)}>
              {m.ctaLabel}
            </button>
          ) : (
            <a className="article-cta" href={`/contact?topic=${m.topic}`}>
              {m.ctaLabel}
            </a>
          )}
          <p className="article-hint">{m.replyHint}</p>
        </section>
      ))}
    </article>
  );
}
```

- [ ] **Step 5: Implement `office/cards/Plaque.tsx`**

```tsx
"use client";

import { useEffect, type RefObject } from "react";
import type { Service } from "@/content/services";
import { COPY } from "@/office/copy";
import Card from "./Card";

/** The plaque beside a picked ornament (interactions spec 3.4): name, two or three lines, Read more. Focus moves to its title as it shows. */
export default function Plaque({ service, titleId, cardRef, onReadMore }: { service: Service; titleId: string; cardRef: RefObject<HTMLElement | null>; onReadMore: () => void }) {
  useEffect(() => {
    document.getElementById(titleId)?.focus({ preventScroll: true });
  }, [titleId, service.slug]);
  return (
    <Card hotspot="hs_shelf" titleId={titleId} cardRef={cardRef}>
      <p className="office-card-eyebrow">{COPY.plaque.eyebrow(service.number)}</p>
      <h2 id={titleId} className="office-card-title" tabIndex={-1}>
        {service.name}
      </h2>
      <p className="office-card-text">{service.summary}</p>
      <button type="button" className="office-card-cta" onClick={onReadMore}>
        {COPY.plaque.readMore}
      </button>
    </Card>
  );
}
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `npx vitest run panels`
Expected: PASS.

- [ ] **Step 7: The standalone page** (`app/(office)/services/[slug]/page.tsx`). It sits in `(office)` for the fonts and `office.css`, and renders no office.

```tsx
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findService, services } from "@/content/services";
import ServiceArticle from "@/panels/ServiceArticle";
import { COPY } from "@/office/copy";
import { theme } from "@/office/theme";

type Params = Promise<{ slug: string }>;

/** Only the four services exist; anything else 404s. */
export const dynamicParams = false;

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const service = findService((await params).slug);
  return service ? { title: `${service.name} — Kasper Simonsen`, description: service.summary } : {};
}

/** A shared or refreshed service link (interactions spec 3.6): the whole service, and the way back into the office. */
export default async function ServicePage({ params }: { params: Params }) {
  const service = findService((await params).slug);
  if (!service) notFound();
  return (
    <main className="standalone" style={{ "--accent": theme.accents.hs_shelf } as CSSProperties}>
      <Link href="/" className="standalone-enter">
        {COPY.enter}
      </Link>
      <ServiceArticle service={service} titleId="service-title" level={1} />
    </main>
  );
}
```

If Step 1's docs say anything different about `dynamicParams` or `params` in 16.2, follow the docs and note it in the commit message.

- [ ] **Step 8: Services in the fallback and the sitemap.** In `office/OfficeErrorBoundary.tsx`, import `services` from `@/content/services` and render a second line of links under the existing ones:

```tsx
        <p>
          {services.map((s, i) => (
            <span key={s.slug}>
              {i > 0 && " · "}
              <a href={`/services/${s.slug}`}>{s.name}</a>
            </span>
          ))}
        </p>
```

In `app/sitemap.ts`, import `services` from `@/content/services` and add the service URLs to the returned array:

```ts
  const servicePages: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${base}/services/${s.slug}`,
    priority: 0.8,
    changeFrequency: "monthly" as const,
  }));

  return [...staticRoutes, ...caseStudies, ...servicePages];
```

- [ ] **Step 9: Check it builds and serves**

Run: `npx tsc --noEmit`
Expected: no new errors outside `office/OfficeExperience.tsx` (Task 7 wires that).

With the dev server running (`npm run dev`, port 3010), open `http://localhost:3010/services/websites` at 1440×900 and at 390×844. Check: the h1 reads "Websites", "Enter the office" is above it, the two models close the page with links to `/contact?topic=tools` and `/contact?topic=platforms`, the eyebrows are red (`#FF3B30`), and nothing scrolls sideways on the phone. `/services/nope` must 404.

- [ ] **Step 10: Commit**

```bash
git add panels/ServiceArticle.tsx panels/ServiceArticle.test.ts office/cards/Plaque.tsx "app/(office)/services/[slug]/page.tsx" office/OfficeErrorBoundary.tsx app/sitemap.ts
git commit -m "Give each service its Read more, a plaque and a page of its own"
```

---

### Task 6: The monitor's screen and its gag

**Files:**
- Modify: `office/cards/face.ts`, `office/cards/face.test.ts`, `office/cards/CardFace.tsx`
- Create: `office/cards/AgeGate.tsx`, `office/cards/AgeGate.test.ts`

**Interfaces:**
- Consumes: `COPY.monitor` (Task 1).
- Produces:
  - `screenFaceFor(points: Vector3[], widthPx: number, front?: Vector3, up?: Vector3): { position: [number, number, number]; rotation: [number, number, number]; distanceFactor: number; heightPx: number }`.
  - `CardFace` accepts `place="screen"`.
  - `AgeGate({ titleId })`; `SCREEN_WIDTH_PX = 640`.

- [ ] **Step 1: Write the failing test** (append to `office/cards/face.test.ts`, adding `screenFaceFor` to its import and `Euler, Quaternion, Vector3` from `three`):

```ts
describe("screenFaceFor", () => {
  // A 0.6 x 0.33 screen centred at (0, 1, 0.1), tilted back 5 degrees (its top away from the viewer at +z), corners in any order.
  const tilt = new Quaternion().setFromEuler(new Euler(-5 * (Math.PI / 180), 0, 0));
  const corners = [[0.3, 0.165], [-0.3, -0.165], [-0.3, 0.165], [0.3, -0.165]].map(([x, y]) =>
    new Vector3(x, y, 0).applyQuaternion(tilt).add(new Vector3(0, 1, 0.1)),
  );

  it("prints the given width across the screen, as tall as the screen is", () => {
    const f = screenFaceFor(corners, 640);
    expect(f.distanceFactor).toBeCloseTo((0.6 * 400) / 640, 6);
    expect(f.heightPx).toBeCloseTo((640 * 0.33) / 0.6, 4);
  });
  it("sits on the screen's centre, just in front of it, facing out of it and upright", () => {
    const f = screenFaceFor(corners, 640);
    const q = new Quaternion().setFromEuler(new Euler(...f.rotation));
    const normal = new Vector3(0, 0, 1).applyQuaternion(tilt);
    expect(new Vector3(0, 0, 1).applyQuaternion(q).dot(normal)).toBeCloseTo(1, 6);
    expect(new Vector3(1, 0, 0).applyQuaternion(q).x).toBeCloseTo(1, 6); // reads left to right
    const lift = new Vector3(...f.position).sub(new Vector3(0, 1, 0.1));
    expect(lift.length()).toBeGreaterThan(0);
    expect(lift.length()).toBeLessThan(0.001);
    expect(lift.normalize().dot(normal)).toBeCloseTo(1, 6);
  });
  it("faces the side `front` points to, whichever way the corners wind", () => {
    const f = screenFaceFor([...corners].reverse(), 640);
    const q = new Quaternion().setFromEuler(new Euler(...f.rotation));
    expect(new Vector3(0, 0, 1).applyQuaternion(q).z).toBeGreaterThan(0.99);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run office/cards`
Expected: FAIL. `screenFaceFor` is not exported.

- [ ] **Step 3: Implement `screenFaceFor`** (in `office/cards/face.ts`, after `backFaceFor`; add `import { Euler, Matrix4, Vector3, type Box3 } from "three";`):

```ts
/**
 * Where drei's `Html transform` goes to print `widthPx` of HTML across a flat screen, given its corners (any order, in
 * the mesh's own space): centred on it, just in front, facing out of the side `front` points to, its up as near `up`
 * as the screen's tilt allows. The monitor's screen leans back, so it isn't square to any axis.
 */
export function screenFaceFor(points: Vector3[], widthPx: number, front = new Vector3(0, 0, 1), up = new Vector3(0, 1, 0)) {
  const centre = points.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(points.length);
  // the normal from the widest triangle of corners, so near-duplicate points can't spoil it
  const a = points[0];
  const b = points.reduce((far, p) => (p.distanceToSquared(a) > far.distanceToSquared(a) ? p : far), a);
  let normal = new Vector3();
  for (const c of points) {
    const n = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
    if (n.lengthSq() > normal.lengthSq()) normal = n;
  }
  normal.normalize();
  if (normal.dot(front) < 0) normal.negate();
  const y = up.clone().addScaledVector(normal, -up.dot(normal)).normalize();
  const x = new Vector3().crossVectors(y, normal);
  const span = (axis: Vector3) => {
    const d = points.map((p) => p.dot(axis));
    return Math.max(...d) - Math.min(...d);
  };
  const width = span(x);
  const height = span(y);
  const rotation = new Euler().setFromRotationMatrix(new Matrix4().makeBasis(x, y, normal));
  return {
    position: centre.addScaledVector(normal, LIFT).toArray() as [number, number, number],
    rotation: [rotation.x, rotation.y, rotation.z] as [number, number, number],
    distanceFactor: (width * 400) / widthPx,
    heightPx: (widthPx * height) / width,
  };
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run office/cards`
Expected: PASS.

- [ ] **Step 5: `place="screen"` in `CardFace.tsx`.** Widen the prop to `place?: "top" | "back" | "screen"`, add `import { Vector3, type Mesh } from "three";` (replacing the type-only `Mesh` import), import `screenFaceFor`, and change the `face` memo and the class name:

```tsx
  const face = useMemo(() => {
    if (place === "screen") {
      const at = surface.geometry.getAttribute("position");
      return screenFaceFor(Array.from({ length: at.count }, (_, i) => new Vector3().fromBufferAttribute(at, i)), widthPx);
    }
    if (!surface.geometry.boundingBox) surface.geometry.computeBoundingBox();
    return (place === "back" ? backFaceFor : faceFor)(surface.geometry.boundingBox!, widthPx);
  }, [surface, place, widthPx]);
```

```tsx
        className={place === "back" ? "office-card-face office-sleeve-back" : place === "screen" ? "office-card-face office-screen" : "office-card-face"}
```

Update the component's doc comment to name the monitor's screen as a third surface.

- [ ] **Step 6: `office/cards/AgeGate.tsx`**

```tsx
"use client";

import { useState } from "react";
import { COPY } from "@/office/copy";

/** CSS px the screen is laid out at; it is then mapped onto the monitor's screen. */
export const SCREEN_WIDTH_PX = 640;

/**
 * What the monitor shows (interactions spec 3.5): a fake Australian age check. Both buttons get a punchline, and either
 * can be pressed after the other. No URL; Back or Esc leaves.
 */
export default function AgeGate({ titleId }: { titleId: string }) {
  const [answer, setAnswer] = useState<"over" | "under" | null>(null);
  return (
    <>
      <p className="office-card-eyebrow">{COPY.monitor.eyebrow}</p>
      <h2 id={titleId} className="office-card-title" tabIndex={-1}>
        {COPY.monitor.title}
      </h2>
      <p className="office-card-text">{COPY.monitor.text}</p>
      <div className="office-gate-buttons">
        {(["over", "under"] as const).map((a) => (
          <button key={a} type="button" className="office-card-cta" aria-pressed={answer === a} onClick={() => setAnswer(a)}>
            {COPY.monitor[a]}
          </button>
        ))}
      </div>
      <p className="office-gate-reply" role="status">
        {answer ? COPY.monitor.replies[answer] : ""}
      </p>
    </>
  );
}
```

Add a render test in a new `office/cards/AgeGate.test.ts` (the same `renderToStaticMarkup` pattern as `panels/CaseStudy.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { COPY } from "@/office/copy";
import AgeGate from "./AgeGate";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;");

describe("AgeGate", () => {
  it("asks, offers both answers, and has somewhere for the punchline to land", () => {
    const out = renderToStaticMarkup(createElement(AgeGate, { titleId: "g" }));
    for (const text of [COPY.monitor.title, COPY.monitor.over, COPY.monitor.under]) expect(out).toContain(esc(text));
    expect(out).toContain(`role="status"`);
    expect(out).not.toContain(esc(COPY.monitor.replies.over)); // not until a button's pressed
  });
});
```

Run: `npx vitest run office/cards`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add office/cards/face.ts office/cards/face.test.ts office/cards/CardFace.tsx office/cards/AgeGate.tsx office/cards/AgeGate.test.ts
git commit -m "Print an age check on the monitor's screen"
```

---

### Task 7: Wire the shelf and the monitor, end to end (lead)

**Files:**
- Modify: `office/OfficeCanvas.tsx`, `office/OfficeExperience.tsx`, `e2e/office-interaction.spec.ts`, `e2e/office.spec.ts`
- Create: `e2e/office-shelf.spec.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–6.
- Produces: `OfficeCanvasProps` gains `shelf: RefObject<{ presented: number | null }>`, `plaque: RefObject<HTMLElement | null>`, `monitorScreen: { titleId: string; content: ReactNode } | null` and `onPresented: (out: boolean) => void`. On `.office`: `data-presented` (slug or ""), and `data-shelf` ("in" | "out", written by the canvas).

- [ ] **Step 1: Write the failing e2e** (`e2e/office-shelf.spec.ts`):

```ts
import { test, expect, type Locator, type Page } from "@playwright/test";
import { engagementModels, services } from "../content/services";
import { subjectForTopic } from "../content/contact";
import { COPY } from "../office/copy";

/** See office-crate.spec.ts: software WebGL can stall for seconds at a time late in a run. */
const MOVE_WAIT = 30_000;

const office = (page: Page) => page.locator(".office");
const link = (page: Page, i: number) => page.getByRole("link", { name: services[i].name });
const plaque = (page: Page, i: number) => page.getByRole("region", { name: services[i].name });

async function standInOffice(page: Page) {
  await page.goto("/");
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
}

async function openShelf(page: Page) {
  const button = page.getByRole("button", { name: COPY.labels.hs_shelf });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_shelf", { timeout: MOVE_WAIT });
  await expect(link(page, 0)).toBeFocused();
  return button;
}

/** Rendered size in screen px of the printed text in `region`'s body (`selector`): its CSS size times the 3D print's scale. */
async function printedPx(region: Locator, selector: string) {
  return region.evaluate((el, sel) => {
    const scale = el.getBoundingClientRect().width / (el as HTMLElement).offsetWidth;
    return parseFloat(getComputedStyle(el.querySelector(sel)!).fontSize) * scale;
  }, selector);
}

test("the keyboard picks a service, reads it, writes from it, and steps back out one layer at a time", async ({ page }) => {
  await standInOffice(page);
  const button = await openShelf(page);
  await expect(page).toHaveURL(/\/$/); // browsing the shelf is local
  await page.keyboard.press("Tab");
  await expect(link(page, 1)).toBeFocused();
  await page.keyboard.press("Enter");

  const s = services[1];
  await expect(page).toHaveURL(new RegExp(`/services/${s.slug}$`));
  await expect(office(page)).toHaveAttribute("data-presented", s.slug);
  await expect(office(page)).toHaveAttribute("data-shelf", "out", { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_shelf"); // the ornament came to the camera, not the camera to it
  await expect(plaque(page, 1).getByRole("heading", { name: s.name })).toBeFocused();

  const more = plaque(page, 1).getByRole("button", { name: COPY.plaque.readMore });
  await more.click();
  const dialog = page.getByRole("dialog", { name: s.name });
  await expect(dialog.getByRole("heading", { name: COPY.service.ways })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/services/${s.slug}$`)); // Read more never changes the URL

  const cta = dialog.getByRole("button", { name: engagementModels[0].ctaLabel });
  await cta.click();
  const form = page.getByRole("dialog", { name: COPY.contact.title });
  await expect(form.getByLabel(COPY.contact.subject)).toHaveValue(subjectForTopic(engagementModels[0].topic));
  await expect(page).toHaveURL(new RegExp(`/services/${s.slug}$`));

  await page.keyboard.press("Escape");
  await expect(form).toBeHidden();
  await expect(dialog).toBeVisible(); // the service is still open under it
  await expect(cta).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(more).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/$/);
  await expect(office(page)).toHaveAttribute("data-shelf", "in", { timeout: MOVE_WAIT });
  await expect(link(page, 1)).toBeFocused(); // back on the one that was out
  await page.keyboard.press("Escape");
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
  await expect(button).toBeFocused();
});

test("picking another ornament swaps it without a new history entry", async ({ page }) => {
  await standInOffice(page);
  await openShelf(page);
  await page.keyboard.press("Enter");
  await expect(plaque(page, 0)).toBeVisible({ timeout: MOVE_WAIT });
  await link(page, 2).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/services/${services[2].slug}$`));
  await expect(plaque(page, 2)).toBeVisible({ timeout: MOVE_WAIT });
  await expect(plaque(page, 0)).toBeHidden();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_shelf"); // one Back: the shelf, not the first ornament
});

test("Forward onto a service from the standing spot brings its ornament out again", async ({ page }) => {
  await standInOffice(page);
  await openShelf(page);
  await link(page, 3).focus();
  await page.keyboard.press("Enter");
  await expect(plaque(page, 3)).toBeVisible({ timeout: MOVE_WAIT });
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
  await page.goForward();
  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`/services/${services[3].slug}$`));
  await expect(plaque(page, 3)).toBeVisible({ timeout: MOVE_WAIT });
});

test("a refreshed or shared service link is the standalone page", async ({ page }) => {
  await standInOffice(page);
  await openShelf(page);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/services/${services[0].slug}$`));
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: services[0].name })).toBeVisible();
  await expect(page.locator(".office")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: COPY.service.ways })).toBeVisible();
  for (const m of engagementModels) await expect(page.getByRole("link", { name: m.ctaLabel })).toHaveAttribute("href", `/contact?topic=${m.topic}`);
  await expect(page.getByRole("link", { name: COPY.enter })).toHaveAttribute("href", "/");
});

test("an unknown service is a 404", async ({ page }) => {
  const response = await page.goto("/services/tools-and-dashboards");
  expect(response?.status()).toBe(404);
});

test("the monitor asks your age, and both answers get a reply", async ({ page }) => {
  await standInOffice(page);
  const button = page.getByRole("button", { name: COPY.labels.hs_monitor });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_monitor", { timeout: MOVE_WAIT });
  const screen = page.getByRole("region", { name: COPY.monitor.title });
  await expect(screen.getByRole("heading", { name: COPY.monitor.title })).toBeFocused();
  await screen.getByRole("button", { name: COPY.monitor.over }).click();
  await expect(screen.getByRole("status")).toHaveText(COPY.monitor.replies.over);
  await screen.getByRole("button", { name: COPY.monitor.under }).click();
  await expect(screen.getByRole("status")).toHaveText(COPY.monitor.replies.under);
  expect(new URL(page.url()).pathname).toBe("/");
  await page.keyboard.press("Escape");
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
  await expect(button).toBeFocused();
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("the camera cuts to the shelf and the ornament is out at once", async ({ page }) => {
    await standInOffice(page);
    await page.evaluate(() => {
      const el = document.querySelector(".office")!;
      const seen: string[] = ((window as unknown as { __cams: string[] }).__cams = []);
      new MutationObserver(() => seen.push(el.getAttribute("data-camera") ?? "")).observe(el, { attributeFilter: ["data-camera"] });
    });
    await openShelf(page);
    await page.keyboard.press("Enter");
    await expect(office(page)).toHaveAttribute("data-shelf", "out", { timeout: 5_000 });
    expect(await page.evaluate(() => (window as unknown as { __cams: string[] }).__cams)).not.toContain("moving");
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("the plaque docks at the bottom of the screen", async ({ page }) => {
    await standInOffice(page);
    await openShelf(page);
    await page.keyboard.press("Enter");
    await expect(plaque(page, 0)).toBeVisible({ timeout: MOVE_WAIT });
    const box = (await plaque(page, 0).boundingBox())!;
    expect(box.x).toBeCloseTo(16, 0);
    expect(box.x + box.width).toBeCloseTo(390 - 16, 0);
    expect(box.y + box.height).toBeCloseTo(844 - 16, 0);
  });
  test("the age check is readable on the phone itself", async ({ page }) => {
    await standInOffice(page);
    await page.getByRole("button", { name: COPY.labels.hs_monitor }).focus();
    await page.keyboard.press("Enter");
    const screen = page.getByRole("region", { name: COPY.monitor.title });
    await expect(screen).toBeVisible({ timeout: MOVE_WAIT });
    expect(await printedPx(screen, ".office-card-text")).toBeGreaterThanOrEqual(12);
  });
});
```

In `e2e/office-interaction.spec.ts`, in "the crate, shelf and monitor focus locally with no URL change", replace the `into` line and its comment with:

```ts
    // each takes focus into itself: the crate's control (arrow keys flick), the shelf's first ornament, the monitor's screen
    const into =
      hotspot === "hs_crate"
        ? page.locator('[aria-roledescription="record crate"]')
        : hotspot === "hs_shelf"
          ? page.getByRole("link", { name: services[0].name })
          : page.getByRole("heading", { name: COPY.monitor.title });
```

with `import { services } from "../content/services";` and `import { COPY } from "../office/copy";` at the top.

In `e2e/office.spec.ts`'s fallback test, after the "Get in touch" assertion, add:

```ts
  for (const s of services) await expect(page.getByRole("link", { name: s.name })).toHaveAttribute("href", `/services/${s.slug}`);
```

with `import { services } from "../content/services";`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx playwright test e2e/office-shelf.spec.ts`
Expected: FAIL. There are no shelf links or plaque, and no screen print yet. The standalone and 404 tests may already pass after Task 5.

- [ ] **Step 3: Wire the canvas** (`office/OfficeCanvas.tsx`):

1. Imports: `focusPose` alongside `basePose`/`playerPose` (already imported from `./camera/basePose`); `SCREEN_NODE` alongside `CARD_NODE` from `./objects/motion`; `findShelfNodes, ShelfMotion` from `./objects/shelf`; `screenRect` from `./overlay/screenRect`; `placeCard` from `./overlay/place`; `SCREEN_WIDTH_PX` from `./cards/AgeGate`.
2. Add to `OfficeCanvasProps`:

```ts
  /** The shelf, read every frame: the ornament picked (index), or null. */
  shelf: RefObject<{ presented: number | null }>;
  /** The plaque card the canvas keeps beside the picked ornament (CSS docks it on narrow screens). */
  plaque: RefObject<HTMLElement | null>;
  /** What's printed on the monitor's screen while it's open, or null. */
  monitorScreen: { titleId: string; content: ReactNode } | null;
  /** The picked ornament finished floating out to the camera (true) or started back (false). */
  onPresented: (out: boolean) => void;
```

and add `"shelf" | "plaque" | "monitorScreen" | "onPresented"` to `OfficeProps`'s `Pick`, destructuring them in `Office`.
3. In `Office`, beside the crate's memos:

```ts
  const shelfNodes = useMemo(() => findShelfNodes(nodes.ornaments), [nodes]);
  const shelfMotion = useMemo(() => new ShelfMotion(), []);
  const shelfCam = useMemo(makePose, []);
  const shelfWasOut = useRef(false);
  const screen = useMemo(() => (office.scene.getObjectByName(SCREEN_NODE) as Mesh | undefined) ?? null, [office]);
```

4. In `Office`'s `useFrame`, after the crate block (`if (crateMotion.playDone !== sleeveWasOut.current) { … }`):

```ts
    // A picked ornament floats to where the shelf's camera ends up, so it arrives with the camera (or before it).
    const aspect = (camera as PerspectiveCamera).aspect;
    const cams = info.current?.focus.hs_shelf;
    shelfMotion.update(
      shelfNodes,
      { presented: shelf.current.presented, camera: cams ? focusPose(cams.land, cams.portrait, aspect, shelfCam) : null, aspect, reduced },
      dt,
    );
    if (shelfMotion.presented !== shelfWasOut.current) {
      shelfWasOut.current = shelfMotion.presented;
      onPresented(shelfMotion.presented);
      if (host.current) host.current.dataset.shelf = shelfMotion.presented ? "out" : "in";
    }
    // Its plaque goes beside it (desktop); on narrow screens CSS docks it and ignores this.
    const card = plaque.current;
    const picked = shelf.current.presented;
    if (card && picked !== null && shelfNodes.ornaments[picked]) {
      const r = screenRect(shelfNodes.ornaments[picked], camera, size);
      if (r) {
        const at = placeCard({ x: r.right, y: (r.top + r.bottom) / 2 }, { width: card.offsetWidth, height: card.offsetHeight }, size);
        card.style.left = `${at.left}px`;
        card.style.top = `${at.top}px`;
      }
    }
```

5. In `Office`'s JSX, after the sleeve's `CardFace`:

```tsx
      {monitorScreen && screen && (
        <CardFace surface={screen} place="screen" widthPx={SCREEN_WIDTH_PX} hotspot="hs_monitor" titleId={monitorScreen.titleId}>
          {monitorScreen.content}
        </CardFace>
      )}
```

- [ ] **Step 4: Wire the page** (`office/OfficeExperience.tsx`):

1. Imports: `replaceLayer` with `clearLayer, pushLayer`; `findService, services` from `@/content/services`; `type Topic` from `@/content/contact`; `Plaque` from `./cards/Plaque`; `AgeGate` from `./cards/AgeGate`; `ServiceArticle` from `@/panels/ServiceArticle`.
2. Every `pushLayer({ focus: …, reading: … })` call gains `topic: null`: the two in `activate` and `read`.
3. In `activate`, after `markUsed();` and before the `trigger` lines:

```ts
    // Another ornament while one is out: swap them in the same history entry, so one Back still returns to the shelf.
    if (now?.hotspot === "hs_shelf" && now.item && hit.hotspot === "hs_shelf" && hit.item) {
      replaceLayer({ focus: "hs_shelf", reading: false, topic: null }, pathForTarget(hit)!);
      return;
    }
```

4. Beside `read`:

```ts
  // An engagement model's button in a service's Read more: the contact form over it, its topic pre-filled (spec 3.4).
  const write = useCallback((topic: Topic) => {
    const { layer: l, scene: s } = live();
    if (s.target && l.reading && l.topic !== topic) pushLayer({ focus: s.target.hotspot, reading: true, topic });
  }, []);
```

5. After the crate's block of state (`const crateRef = …`):

```ts
  // The shelf (spec 3.4): browse it, pick an ornament (it floats to the camera, its plaque beside it), read it in the panel.
  const shelfSlug = scene.target?.hotspot === "hs_shelf" ? scene.target.item : null;
  const shelfIndex = shelfSlug ? services.findIndex((s) => s.slug === shelfSlug) : -1;
  const shelf = useRef({ presented: null as number | null });
  shelf.current = { presented: shelfIndex < 0 ? null : shelfIndex };
  const [ornamentOut, setOrnamentOut] = useState(false);
  const plaqueRef = useRef<HTMLElement | null>(null);
  const shelfOpen = focusedOn === "hs_shelf" && !scene.reading;
  const shelfBrowsing = shelfOpen && !shelfSlug;
  const shelfLinks = useRef<Partial<Record<string, HTMLAnchorElement | null>>>({});
  const lastShelf = useRef<string | null>(null);
  useEffect(() => {
    if (shelfSlug) lastShelf.current = shelfSlug;
  }, [shelfSlug]);
  // Browsing the shelf, an ornament's link has focus: the one that was just out, else the first.
  useEffect(() => {
    if (!shelfBrowsing) return;
    (shelfLinks.current[lastShelf.current ?? ""] ?? shelfLinks.current[services[0].slug])?.focus({ preventScroll: true });
  }, [shelfBrowsing]);
  useEffect(() => {
    if (state.kind === "idle") lastShelf.current = null;
  }, [state.kind]);
```

6. Remove the effect that gives focus to Back (`const hasCard = focusedOn === "hs_drawer";` and the `useEffect` after it). Every object now takes focus into itself: the drawer's card and the monitor's screen (CardFace), the crate's control, and the shelf's links or plaque.
7. On the root `<div className="office" …>` add `data-presented={shelfSlug ?? ""} data-shelf="in"`.
8. Pass the new props to `<OfficeCanvas>`:

```tsx
            shelf={shelf}
            plaque={plaqueRef}
            monitorScreen={focusedOn === "hs_monitor" ? { titleId: "gate-title", content: <AgeGate titleId="gate-title" /> } : null}
            onPresented={setOrnamentOut}
```

9. After the crate's `{browsing && (…)}` block:

```tsx
      {shelfOpen && (
        <ul className="office-shelf" aria-label={COPY.shelf.label}>
          {services.map((s) => (
            <li key={s.slug}>
              <a
                ref={(el) => {
                  shelfLinks.current[s.slug] = el;
                }}
                href={`/services/${s.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  activate({ hotspot: "hs_shelf", item: s.slug });
                }}
                {...navProps({ hotspot: "hs_shelf", item: s.slug })}
              >
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      )}
      {shelfBrowsing && (
        <p className="office-hint" aria-hidden="true">
          <span className="office-hint-pointer">{COPY.shelf.hint}</span>
          <span className="office-hint-touch">{COPY.shelf.hintTouch}</span>
        </p>
      )}
      {/* stays under the panel while reading, so closing it returns to the plaque and its Read more */}
      {focusedOn === "hs_shelf" && ornamentOut && shelfIndex >= 0 && (
        <Plaque service={services[shelfIndex]} titleId="plaque-title" cardRef={plaqueRef} onReadMore={read} />
      )}
```

10. After the case-study panel:

```tsx
      {scene.reading && shelfSlug && findService(shelfSlug) && (
        <Panel hotspot="hs_shelf" titleId="service-title" onClose={back}>
          <ServiceArticle service={findService(shelfSlug)!} titleId="service-title" level={2} onWrite={write} />
        </Panel>
      )}
      {/* over the service, so Esc closes just the form and focus goes back to the button that opened it */}
      {scene.reading && scene.topic && shelfSlug && (
        <Panel hotspot="hs_shelf" titleId="write-title" onClose={back}>
          <ContactForm topic={scene.topic} titleId="write-title" level={2} />
        </Panel>
      )}
```

- [ ] **Step 5: Type-check and unit tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no errors; all tests pass.

- [ ] **Step 6: Run the e2e**

Run: `npx playwright test`
Expected: all pass, including the new spec, the updated focus test and the fallback's service links. If "the crate, shelf and monitor focus locally" fails on the drawer or crate, the removed Back-focus effect was covering a case: restore it for that object only, and say why in a comment.

- [ ] **Step 7: Look at it.** Run `npm run dev` and check at 1440×900, 390×844 and 390×664. Use the Chrome tools with screenshots; follow Kasper's review setup memory if motion seems missing. Check:
  - The shelf: the four ornaments are clear, hover lights one in red with its name, and nothing bobs while the shelf is open.
  - A pick: the ornament lifts off and floats out in ~0.6 s, ends facing you left of centre (desktop) or centred above the docked plaque (phone), and the plaque fades in only then, to its right.
  - Swapping ornaments and Back: the ornament goes home the way it came.
  - The panel: the service, then "Two ways to work with me", and a button opening the form with the subject filled in.
  - The monitor: the age check is printed square on the screen and readable, and both punchlines land.

Fix framing only by the knobs (`PRESENT_FILL`, `PRESENT_AT`, `PRESENT_LIFT`, the CSS sizes, or Task 2's camera via the Blender agent).

- [ ] **Step 8: Commit**

```bash
git add office/OfficeCanvas.tsx office/OfficeExperience.tsx e2e/office-shelf.spec.ts e2e/office-interaction.spec.ts e2e/office.spec.ts
git commit -m "Wire the shelf and the monitor: pick a service, read it, write from it, and check your age"
```

---

### Task 8: Kasper clicks through

- [ ] Get a phone-viewable link (memory: `new.kaspersimonsen.dev` needs his Cloudflare CNAME; otherwise use a Vercel share link via `get_access_to_vercel_url`, **only after asking to push**), or have him run `localhost:3010`.
- [ ] Walk him through the shelf (pick, swap, Read more, write, Back) and the monitor on his phone.
- [ ] Put the copy drafts in front of him for approval: the four services (`content/services.ts`), shelf, plaque and service labels, and the monitor gag (`office/copy.ts`). Apply his edits verbatim.
- [ ] Record his review decisions in the spec (amend sections 3.4/3.5 as M1 and M2 did) and in an addendum to this plan if they need follow-up tasks.
- [ ] Update the project memory (`project_office_redesign.md`) with M3's status.
