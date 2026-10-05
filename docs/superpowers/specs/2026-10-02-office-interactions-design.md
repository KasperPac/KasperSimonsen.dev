# KasperSimonsen.dev: office interactions, design spec

- **Date:** 2026-10-02
- **Branch:** `redesign/office`
- **Supersedes:** sections 3.4 (hover and touch), 3.5 (interactive objects), 5.1 (routes) and 5.2 (URL drives the scene) of
  `2026-10-01-office-redesign-design.md`, and phases 3 and 4 of its delivery list. Everything else in that spec
  still holds.
- **Status:** agreed in brainstorming with Kasper on 2026-10-02, awaiting his review of this document
- **Amended 2026-10-05** (Kasper, after the M3 preview): the monitor's age-check joke "reads like a part of the site that
  isn't working". The monitor now shows previews of the crate's projects (section 3.5), the sticky notes fall off it onto
  the desk while it's open, and the laptop beside it shows the next preview, dragged across onto the monitor.
- **Amended again 2026-10-05** (Kasper, after the whiteboard preview): the screenshot squeezed into a window on the
  monitor had the wrong aspect. The monitor's screen becomes 16:10 and shows the screenshot edge to edge; the words and
  controls move to the laptop (section 3.5).

## 1. Goal

The objects in the office are the site's navigation, and their content lives **in the scene**:
- records in the crate carry the case studies;
- a business card in the drawer carries the contact details;
- ornaments on the shelf carry the services;
- the monitor (and the laptop beside it) carries previews of the work.

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
| Monitor | A slideshow of the crate's projects as screenshots; "See the case study" plays that project's record. The notes fall off; the laptop shows the next slide and drags it across (amended 2026-10-05) |
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

Touch devices have no hover; the dots below show them what's usable, and a tap on an object or its dot opens it.

**Arriving** (amended after Kasper's M2 review, and again 2026-10-03): the first time a visitor reaches the standing
spot, a short tour lights each object with its label in turn, left to right (crate, drawer, monitor, shelf; ~0.8 s
each). Then each object gets a dot in its own colour (a solid dot in a ring, still: white breathing rings read as more
line art, and the breath swung them about), on every device. Until the visitor opens something, an object lights up in
its colour now and then (a glint, ~1.1 s, one at a time, 2.4-4.4 s apart, never while the visitor is on something) and a
short hint line shows; after that the dots stay as the way round. Kasper picked colour and glints over name labels.
A dot is tappable. Standing holds through a small scroll back (progress down to 0.97, ~200 px), so a wheel notch or a
nudge on a phone doesn't walk the visitor out.

**Phones** (2026-10-03, Kasper: "meant for mobile, not cropped", then "pannable, there's a lot of negative space"):
the portrait standing view is in close on the desk, filling the tall screen, and a sideways drag pans it (slides and
turns a little) to the couch and crate one way and the record player, shelf and telly the other; vertical drags stay
the walk-in's scroll, and a drag never opens what it ends on. It is authored for a 0.64-wide screen; narrower phones
widen it. The arrival tour pans to each object it lights; glints only light what's on screen; the hint line says
"Drag sideways to look around." On the record player, phones play the record in a wider view with the platter in shot
and come in close once the sleeve has turned round. The crate's hint says swipe and tap on touch screens.

### 3.2 Crate (work)

1. **Click the crate:** the camera drops to it. This is local browsing with no URL change.
2. **Flip:** the pointer flicks through the crate (amended after Kasper's M2 review; the wheel no longer flicks, and
   nothing lifts out): how far back it is across the crate's opening picks the front record, and the records in front
   of that one tip forward on their bottom edges over the crate's low front, so its whole cover shows. The pointer has
   to go a little past each record's band before the next comes up, so it never flickers. Arrow keys and swipes flick
   one at a time; a screen reader hears each record's name. Only project records have a vinyl, and each project
   sleeve reads as an LP: the vinyl's edge peeks out of the
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

### 3.5 Monitor (previews of the work)

Amended 2026-10-05. The age-check joke built in M3 is removed: Kasper found it read like a broken part of the site.

1. **Click:** the camera pushes up to the screen (local, no URL, as before). As the move starts, the sticky notes peel off
   the bezel one after another (~0.1 s apart): each tips off its top edge, drops with a small sideways flutter and
   settles flat and slightly askew at its own landing spot on the desk. All are down within ~0.9 s, before the camera
   arrives (~1.1 s), so the whole screen is clear.
2. **The reel:** the monitor shows one screenshot at a time, **edge to edge**: no window, title bar or caption on it.
   Amended 2026-10-05 (Kasper): the monitor's screen is 16:10 like the screenshots (1280 x 800), so nothing is cropped
   or letterboxed. One slide per screenshot, not per project; a project can have several (Manuva's site and app). The
   order is Pac Hub, Manuva (site, bill of materials, components), Silio, Marianne's Hair, then the Pac Technologies
   site. Pac Hub's screenshot is blurred where it shows a customer, a job or people's names; Marianne's Hair's phone
   number is blurred.
3. **The laptop** beside the monitor carries the reel's words and controls, as real buttons: the slide's label (mono,
   like a title bar), its one-line headline, its action, and ‹, a dot per slide, ›. The action is **See the case study**
   for a crate project; **Visit the site** (a new tab) for work not yet in the crate that is live; nothing for a site not
   live yet (Marianne's Hair, until it has a record or a domain). Every ~5 s (or on ›) the next screenshot slides in over
   the monitor from the right, the laptop's side (~0.7 s, eased), and the laptop's words change to it as it lands. ‹
   plays it backwards: the screenshot slides out to the right and the previous one is underneath. The pointer that
   dragged windows across, and the laptop's preview of the next slide, are gone.
4. **Pausing:** the reel holds still while the pointer is over the monitor or the laptop, or keyboard focus is in the
   laptop's controls, and never moves on while the visitor is reading.
5. **See the case study** plays that project's record exactly as picking it in the crate does: the camera goes to the
   record player and the URL becomes `/work/<slug>`. Back returns to the monitor; Back again to the standing spot.
6. **Leaving** (Back, Esc, or See the case study): the notes lift off the desk and hop back to their places on the bezel,
   each reversing its own fall, finishing as the camera arrives where it's going. Leaving mid-fall, each note turns round
   from wherever it is.
7. **Phones:** the camera frames the monitor across the width. The laptop is mostly out of shot, so its words and
   controls are printed on a strip just under the monitor instead: a print in the screen's plane, below the bezel and in
   front of the stand, sized for fingers (every button at least 40 x 40 CSS px on screen). Only one of the two carries
   the controls at a time (the strip on portrait screens, the laptop otherwise), so the keyboard and screen readers meet
   them once. The next screenshot still slides in from the right-hand edge. The notes fall as on desktop.
8. **Reduced motion:** no fall, no slide, no auto-advance. The notes are on the desk while the monitor is open and back
   on the bezel otherwise; ‹ › switch the screenshot and the words at once.
9. **Accessibility:** the visually hidden heading that takes focus as the monitor opens is with the laptop's controls;
   each screenshot keeps its alt text, read with its label.
10. **Model:** the monitor's screen (and its bezel) is 16:10, keeping its width; the stand and the sticky notes' bezel
    spots move to suit. The focus cameras frame the monitor and the laptop on desktop, and the monitor across the width
    with room for the strip under it on phones.

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
  - playing a record ~3.2 s and back the same way: the flight over takes the camera's ~1.6 s move to the player, so
    they arrive together; it climbs straight out of the crate, arcs over the desk and comes in under the shelf, then
    the vinyl goes onto the platter and the sleeve hops to the stand, turning round on the way;
  - drawer ~0.5 s;
  - ornament ~0.6 s;
  - sticky notes falling off the monitor ~0.9 s in all (staggered ~0.1 s), and back the same way;
  - a slide dragged from the laptop onto the monitor ~0.7 s, every ~5 s while nothing holds it;
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
- **Monitor:** gets a flat screen surface named for its HTML. Its sticky notes become separate parts, each with a
  landing spot on clear desk space (amended 2026-10-05).
- **Laptop:** its lid gets a flat screen surface, like the monitor's, for the next slide (amended 2026-10-05).
- **Cameras:** focus cameras retuned so each object leaves room for its card on the right (desktop). The monitor's
  landscape camera also takes in the laptop's screen beside it (amended 2026-10-05).

**Routing:** `pushState` URLs are read back by `usePathname` (Next 14.1+ syncs native history calls). A refresh or a
shared link is an ordinary request for that path, so it renders the standalone page.

## 7. Content and copy

**Drafts for Kasper's approval:**
- the four service descriptions (short: 2–3 lines; long: the Read more);
- hover labels;
- card button labels;
- the monitor reel's labels (See the case study, the arrows);
- the business card's links.

Case-study text and the engagement-model copy are reused as they are.

**To confirm:** which links go on the card (GitHub, LinkedIn, anything else).

## 8. Testing

- **Vitest:**
  - director transitions and Back layering;
  - each object's motion functions (flip angle by index and time, pull-out, drawer, ornament, teases, reduced motion);
  - URL ↔ state;
  - history bridge semantics;
  - content integrity (four services, unique slugs, every project has a sleeve, every screenshot file exists);
  - the monitor reel: slide order, the laptop's next slide, pausing, the drag's timing, and the notes' fall (stagger,
    reversal mid-fall, reduced motion);
  - the card docking rule.
- **Playwright:**
  - keyboard path through each object;
  - URLs at each layer;
  - Back peeling layers;
  - the Read more focus trap and return;
  - refresh on a content URL gives the standalone page;
  - reduced motion: the camera cuts, never glides;
  - phone viewport: docked card;
  - the monitor: the laptop shows the next project, › brings it onto the monitor, See the case study plays its record at
    `/work/<slug>` and Back returns to the monitor; nothing overflows the screen on a phone;
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
4. **Monitor reel** (amended 2026-10-05, replaces M3's monitor gag): previews of the crate's projects on the monitor,
   the next one on the laptop dragged across, See the case study, and the notes falling off and going back on.
