# KasperSimonsen.dev: office interactions, design spec

- **Date:** 2026-10-02
- **Branch:** `redesign/office`
- **Supersedes:** sections 3.4 (hover and touch), 3.5 (interactive objects), 5.1 (routes) and 5.2 (URL drives the scene) of
  `2026-10-01-office-redesign-design.md`, and phases 3 and 4 of its delivery list. Everything else in that spec
  still holds.
- **Status:** agreed in brainstorming with Kasper on 2026-10-02, awaiting his review of this document

## 1. Goal

The objects in the office are the site's navigation, and their content lives **in the scene**:
- records in the crate carry the case studies;
- a business card in the drawer carries the contact details;
- ornaments on the shelf carry the services;
- the monitor carries a joke.

A short summary sits on or beside the object. "Read more" opens a panel for the long read. The office has to stay
memorable without ever standing between a visitor and the work or the contact details.

## 2. Decisions

| Topic | Decision |
|---|---|
| Where content shows | In the scene: a summary card on or beside the object; "Read more" opens a panel for the full text |
| Sleeve content | Name, years, one-line headline, 2–3 sentences, stack, Read more |
| URL timing | Changes when an object's content is shown (record out, drawer open, ornament picked); Read more never changes it |
| Hover (desktop) | Section colour + label + a small tease (lift, peek, flicker, bob) |
| Crate | Dig: records flip forward one at a time; the front one pulls out |
| Drawer | Business card with email and links, plus "Write to me", which opens the contact form panel |
| Shelf | Four services, one ornament each; the two engagement models close every service's Read more |
| Content in 3D | Real HTML. The business card's details are printed on the card in the drawer (drei `Html` in transform mode, on its top face; amended after Kasper's M1 review). Other cards are pinned beside their object (a DOM overlay positioned by projecting the object each frame; they face the camera, so no CSS 3D transform is needed). Static labels stay line geometry |
| Phones | Cards beside an object dock at the bottom of the screen instead of floating in the scene; the business card and a pulled sleeve stay printed on the object, which is framed across most of the width |
| Routing | `window.history.pushState`, synced with the Next router; no intercepting or parallel routes |

## 3. The flow

### 3.1 Standing in the office

Hover (or keyboard focus) lights an object's lines in its section colour (spec section 4 colours), shows a small mono
label above it, and plays a tease:

| Object | Tease |
|---|---|
| Crate | The front records nudge up a few centimetres |
| Drawer | The drawer peeks open ~3 cm |
| Monitor | The screen flickers once |
| Shelf | The ornaments bob slightly |

Touch devices get white pulsing markers instead (no hover); a tap opens directly.

**Arriving** (amended after Kasper's M2 review): the first time a visitor reaches the standing spot, a short tour lights
each object with its label in turn, left to right (crate, drawer, monitor, shelf; ~0.8 s each). Then white pulsing dots
stay on the four objects, on every device, with a short hint line, until the visitor hovers, focuses or clicks one.

### 3.2 Crate (work)

1. **Click the crate:** the camera drops to it. This is local browsing with no URL change.
2. **Flip:** hovering a record brings it to the front (amended after Kasper's M2 review; the wheel no longer flicks):
   the records in front of it tip forward on their bottom edges and it lifts part way out of the crate, so its whole
   front shows. Arrow keys and swipes flick one at a time. Each sleeve reads as an LP: the vinyl's edge peeks out of the
   top, and the project's logo is centred as cover art in white line geometry inside a thin border (the Pac Tech
   logomark stands in where a project has no logo of its own, with the project's name under it). Kasper's projects sit
   at the front, and flipping stops at the last of them. The blank sleeves behind never come up.
3. **Play:** click, tap or Enter on the front record, or a second click on the crate, puts it on the record player
   (amended after Kasper's M2 review). The camera glides over to the player; the vinyl comes out of the sleeve onto the
   platter and spins; the sleeve stands on the now-playing stand (its covers make way) and turns round. The URL becomes
   `/work/<slug>`. The sleeve's back carries name, years, headline, 2–3 intro sentences, stack and **Read more**,
   printed on it like liner notes (real HTML, like the business card).
4. **Read more** opens the full case study in the panel. The URL is unchanged.
5. **Back and Esc step out one layer at a time:** close the panel, then put the record back (URL `/`, browsing the
   crate again), then return to the standing spot.

### 3.3 Drawer (contact)

1. Click: the URL becomes `/contact`. The drawer slides open ~30 cm and the camera zooms into it until the business
   card fills about half the screen (most of a phone's width). Kasper's name, email (a `mailto:` link) and his links
   are printed on the card itself.
2. **Write to me** opens the contact form in the panel. It's the existing `/api/contact` form, in the office style, and
   it pre-fills the subject from a topic when one is passed (section 3.4).
3. Back: close the panel, then close the drawer and return to the standing spot.

### 3.4 Shelf (services)

1. Click the shelf: the camera pans to it (local, no URL). Four ornaments, one per service:

   | Service | Ornament |
   |---|---|
   | Industrial automation | Gear |
   | Web design and development (sites) | Globe |
   | App design and development (web apps, Android, iOS) | Phone |
   | PC software development (desktop) | Desktop computer |

2. Click an ornament: it floats forward and turns to face the camera. The URL becomes `/services/<slug>`. A plaque card
   shows the name, 2–3 lines and **Read more**.
3. **Read more** opens the full service in the panel. It ends with **Two ways to work with me**, the existing Tools &
   Dashboards and Platforms & Systems copy, each with a button that opens the contact form with its topic pre-filled.
4. Back peels the layers as for the crate.

### 3.5 Monitor (the joke)

Click: the camera pushes up to the screen, which shows a fake Australian age-verification gate in Kasper's voice. Both
buttons get a punchline. There is no URL; Back or Esc returns to the standing spot. No adult imagery. Kasper approves
the copy before it ships.

### 3.6 Direct visits

`/work/<slug>`, `/services/<slug>` and `/contact`, shared or refreshed, render normal standalone pages with the full
content and an **Enter the office** link to `/`. `/work/<slug>` and `/contact` stay on the current `(main)` pages
until the standalone restyle (old phase 5). `/services/<slug>` is new, in the office style.

## 4. Look and motion

- **Cards** (sleeve summary, business card, plaque):
  - **Look:** black, with a 1 px white hairline. The section colour goes on the eyebrow and the button only. Inter
    Tight for text, IBM Plex Mono for labels.
  - **Placement:** beside the object, facing the camera. The business card and the sleeves are the exceptions:
    printed on the card, and on a pulled sleeve's back.
  - **Timing:** they fade in once the object's move has finished.
  - **Desktop framing:** the object sits left of centre and the card to its right. The monitor and the drawer are the
    exceptions: their content sits on the screen and on the business card, centred in frame.
- **Panel:** slides in from the right on desktop (~40% wide) and is full-screen on phones. Closing it returns to the
  card.
- **Motion** is short, eased and reversible, so Back plays it backwards:
  - record flip ~0.35 s;
  - playing a record ~2.4 s (back ~1.2 s), the camera's move between the crate and the player ~1.6 s;
  - drawer ~0.5 s;
  - ornament ~0.6 s;
  - teases ≤ 0.3 s;
  - camera moves as now (`FOCUS_SECONDS`).
- **Movers:** picking a record or an ornament moves the object to the camera, not the camera again.
- **Reduced motion:** no teases, flips, glides or slides. Objects switch state, the camera cuts to the object, and
  cards and the panel fade.

## 5. Accessibility

- Every object is a real, keyboard-reachable control. Tabbing to one shows its label and tease; Enter opens it.
- Inside the crate, the arrow keys flip and Enter pulls. Card links and buttons are ordinary tab stops.
- Esc backs out one layer at a time.
- Cards are real DOM, so screen readers read them as they are.
- The panel is a dialog: it traps focus, Esc closes it, and focus returns to the control that opened it.
- When the 3D fails, the fallback page lists the work, services and contact as plain links (spec 7.1).

## 6. Architecture

| Unit | Responsibility |
|---|---|
| `content/work.ts` | Case studies (as built) |
| `content/services.ts` | Four services (new copy, Kasper approves) + the two engagement models (existing copy) |
| `content/contact.ts` | Email, links, topic → subject |
| `office/director` | State machine: walk-in, idle, focusing, focused, returning, extended with an object's content stage and the panel, and one-layer-at-a-time release |
| `office/scene/targets.ts` | URL ↔ scene state (as built, with the shelf's four services) |
| `office/history.ts` | `pushState`/`popstate` bridge: local layers (crate browsing, shelf browsing, monitor, panel open) get history entries without changing the path |
| `office/objects/{crate,drawer,shelf,monitor}` | Each object's motion as pure, tested functions of its state and time, plus its card |
| `office/cards/Card.tsx` | HTML card pinned beside its object (projected each frame), or docked at the bottom on narrow screens |
| `panels/Panel.tsx` | Read-more dialog (client only, no route) |
| `office/camera/*`, `office/style/cleanEdges.ts` | Camera rig and hover highlight (as built) |

**Blender:**
- **Ornaments:** the shelf's four service ornaments are remodelled (gear, globe, phone, desktop computer).
- **Sleeves:** every record has its vinyl inside, peeking out of the top; each project sleeve carries its logo (from
  the project's design-system SVG) as centred cover art in line geometry, inside a thin border.
- **Record player:** focus cameras that frame the platter and the now-playing stand; the stand rotates Pink Floyd
  (The Dark Side of the Moon), Polaris (Fatalism), Pearl Jam (Black) and The Butterfly Effect (Begins Here).
- **Drawer:** gets a business card.
- **Monitor:** gets a flat screen surface named for its HTML.
- **Cameras:** focus cameras retuned so each object leaves room for its card on the right (desktop).

**Routing:** `pushState` URLs are read back by `usePathname` (Next 14.1+ syncs native history calls). A refresh or a
shared link is an ordinary request for that path, so it renders the standalone page.

## 7. Content and copy

**Drafts for Kasper's approval:**
- the four service descriptions (short: 2–3 lines; long: the Read more);
- hover labels;
- card button labels;
- the monitor gag;
- the business card's links.

Case-study text and the engagement-model copy are reused as they are.

**To confirm:** which links go on the card (GitHub, LinkedIn, anything else).

## 8. Testing

- **Vitest:**
  - director transitions and Back layering;
  - each object's motion functions (flip angle by index and time, pull-out, drawer, ornament, teases, reduced motion);
  - URL ↔ state;
  - history bridge semantics;
  - content integrity (four services, unique slugs, every project has a sleeve);
  - the card docking rule.
- **Playwright:**
  - keyboard path through each object;
  - URLs at each layer;
  - Back peeling layers;
  - the Read more focus trap and return;
  - refresh on a content URL gives the standalone page;
  - reduced motion: the camera cuts, never glides;
  - phone viewport: docked card;
  - the fallback still lists links.
- **Visual review** with Kasper at each milestone.

## 9. Milestones

Each one ends with something Kasper can click through at `localhost:3010`:

1. **Framework + drawer:** hover (colour, label, tease), keyboard nav, focus camera moves for all four objects, Back
   layering, history bridge, card and panel components, and the drawer end to end (business card, Write to me,
   contact form).
2. **Crate:** sleeve labels, flipping, pull-out, sleeve card, case-study panel, `/work/<slug>`.
3. **Shelf + monitor:** new ornaments, service content, plaque cards, service panels with the engagement models,
   standalone `/services/<slug>`, and the monitor gag with approved copy.
