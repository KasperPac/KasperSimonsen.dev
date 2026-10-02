# KasperSimonsen.dev: 3D office redesign, design spec

- **Date:** 2026-10-01
- **Branch:** `redesign/office` (Vercel preview per push; current site stays live until switch-over)
- **Status:** design approved in brainstorming, awaiting spec review

> **2026-10-02:** sections 3.4 (hover/touch), 3.5 (interactive objects), 5.1 (routes), 5.2 (URL drives the scene)
> and delivery phases 3–4 are superseded by `2026-10-02-office-interactions-design.md` (content lives in the scene).

## 1. Goal

Replace the current site with a 3D, clean-edge wireframe experience. The visitor scrolls from an elevated view of
Kasper's real street in Cremorne, down to the door of his office, through it, and into a stylised developer's
office. Inside, the camera is fixed and the objects are the navigation: past jobs, contact, services, and a joke.

The site's job does not change: win freelance work. The office has to be memorable enough that people stay, and
must never stand between a visitor and the work or the contact details.

The current design system is not used anywhere in the new site. (Build *reports* about this project still use the
Kasper Simonsen Dev DS per the global rules; that is unrelated to the site's own look.)

## 2. Decisions taken in brainstorming

| Topic | Decision |
|---|---|
| Site shape | Office is the home page; every object has a real URL that renders a normal page on direct visit |
| Phones | Same office, adapted framing; flat fallback only for no-WebGL / low-power |
| Render style | **B · Clean edges**: black fill, real feature edges only, hidden lines removed |
| Walk-in | Elevated street view in Cremorne → camera descends to the door → door swings open → inside |
| Inside | Static camera. No walking, no free look. Scroll ends when the walk-in ends |
| Content | Short teaser on the 3D object; full detail in an HTML panel over the scene, with the URL changing |
| Stack | React Three Fiber + drei inside the existing Next 16 app; GSAP for scroll and camera choreography |
| Models | Built in Blender (via the Blender MCP), exported to glTF; Blender also authors the walk-in camera |

## 3. The experience

### 3.1 Location

The office is **The Commons, 10–20 Gwynne St, Cremorne VIC 3121**. The street scene is built from real
OpenStreetMap data (section 6.2), so street layout and building footprints are accurate.

Landmarks, measured from Gwynne St:

- **AAMI Park**: ~900 m at bearing ~293° (WNW), 30 m tall. Its triangulated bubble roof is modelled by hand.
  Shape only: no AAMI name, logos or signage.
- **Nylex Clock** on the Richmond Maltings silos: ~400 m at bearing ~249° (WSW). Included by default; it is the
  Cremorne landmark.
- **CBD skyline** beyond, to the west, as distant extruded towers.
- **MCG**: from OSM, its own landmark.

AAMI Park and the MCG are pulled in to **half their real distance**, on their real bearing, so they read in the
opening shot (Kasper, grey-box review 2026-10-01). Buildings under their new footprints are dropped. The Nylex
Clock, The Commons and the skyline stay where they really are.

Round 4 (Kasper): Melbourne's heritage signs join the opening shot. The **Pelaco** sign and the **Skipping Girl
Vinegar** sign really stand north-east of The Commons, behind the opening camera, so they are placed on rooftops in
frame (artistic licence). The Skipping Girl skips as the visitor scrolls: her neon poses swap with walk-in
progress (reduced motion: one pose). The Nylex sign is modelled in detail. On heritage signs the lettering is the
landmark and stays; AAMI Park's name is sponsorship branding and stays off. The buildings directly across Gwynne St
from The Commons are capped at one storey so the entrance stays in view on the way down.

The opening camera sits high to the east of The Commons looking west, so the building is in the foreground with
the Nylex sign, AAMI Park and the skyline behind it.

### 3.2 Loading

Black screen. The street draws itself in, line by line, as `street.glb` loads (load progress drives the line
reveal). Kasper's name and a "scroll" hint sit over it. A "skip intro" link is visible throughout the walk-in.

### 3.3 Walk-in

The page is exactly as tall as the walk-in. Scroll position maps to the camera animation authored in Blender
(smoothed). Approximate beats, tuned in phase 1 on the grey-box:

| Scroll | Camera |
|---|---|
| 0% | Elevated wide view over Cremorne, landmarks behind |
| 0–70% | Sweeps down and pushes in towards The Commons' door on Gwynne St |
| 70–90% | Door swings open; camera passes through into a short hallway and turns left into the office |
| 90–100% | Settles at the standing spot inside. Page ends; further scrolling does nothing |

The hallway is there so The Commons reads as a big building with an office in it, not a building that is one
small room (Kasper, grey-box review 2026-10-01).

The opening view looks down more steeply over Cremorne (Kasper, review round 2, pulled forward into phase 1).

**The route in is the real one** (Kasper, round 3): Kasper's office has no street door. The camera descends to The
Commons' real entrance, the glass lobby door by the concrete blade at the south end of the Gwynne St frontage. It
swings open; the camera crosses the lobby and goes along a corridor to the office door, which carries
**KASPER SIMONSEN.DEV** and swings open into the office. The Commons is hand-modelled from Kasper's photos (three
floors, woven corten screen, 5 m glazed lobby, roof deck). Both doors live in the street model so they share the
walk-in's single animation.

Scrolling back up plays the walk-in in reverse. "Skip intro" jumps to 100%.

`office.glb` streams in the background during the walk-in. If it is not ready by 70%, the door holds shut with a
small loading indicator until it is.

### 3.4 The office

One fixed view that takes in every interactive object. Composition (finalised on the grey-box):

- **Desk** facing the camera: monitor, keyboard, mouse, coffee mug, chip packet.
- **Drawer pedestal** under the right side of the desk.
- **Record crate** on the floor, left of the desk.
- **Ornament shelf** on the wall, right of the desk.
- Non-interactive dressing (`prop_*`): chair, plant, cables, sticky notes, posters, a window back to Gwynne St.

Review round 2 (Kasper, pulled forward into phase 1): a smaller, modern one-person office, lived-in and a bit messy
rather than bare. A proper ergonomic chair; plants; records on show; a laptop beside the monitor; books; a corny
"Hang in there" poster; a Melbourne Victory poster (crest-free: club colours, a V and the name, no badge, same rule as
AAMI Park's signage); a couch and an old CRT TV. The tone is tongue-in-cheek: a sleep-deprived developer's office
(energy-can pyramid, abandoned mugs, pizza box, pillow and blanket on the couch, rubber duck, clock at 3:47, a
wilted plant). Any words on props (sticky notes, mug, whiteboard) are visitor-facing copy in Kasper's voice and
need his approval, like the monitor gag.

Idle life: steam off the mug, a blinking cursor on the monitor, and a small camera sway following the mouse
(desktop only). The record player is playing (platter at 33⅓ rpm) and a "now playing" stand next to it swaps
between four sleeves every few seconds: Pink Floyd *The Dark Side of the Moon*, Polaris *Fatalism*, Led Zeppelin
*IV*, Mac Miller *Swimming* (Kasper, round 3; pulled forward into phase 1). Sleeves carry the artist and title
plus a simple nod, never the album artwork. Reduced motion: no spin, sleeve 0 static.

Hover (desktop): the object's lines switch to its section's colour (section 4) and a label appears. Whether hover also flips the
object to its triangle-mesh look (style A) is decided in phase 3 look-dev.

Touch: small pulsing markers on interactive objects, since there is no hover. Tap opens directly.

### 3.5 Interactive objects

Every open moves the camera to a focus pose. Esc, an on-screen back control, or browser Back returns it to the
standing spot.

| Object | 3D teaser | Panel / URL |
|---|---|---|
| **Record crate** | Camera drops to the crate; records flip forward one by one (crate digging). Each sleeve shows job name, client and year. Clicking a record slides it out of the crate | Case study panel at `/work/<slug>` |
| **Desk drawer** | Drawer slides open; camera dips in. Inside: a business card with email and links | Contact panel with the existing contact form at `/contact` |
| **Monitor** | Camera pushes up to the screen, which shows a fake Australian age-verification gate in Kasper's voice. Both buttons get a punchline | None. Joke only, no URL. No adult imagery |
| **Ornament shelf** | Camera pans across the shelf; one ornament per service | Service panel at `/services/<slug>` |

Content today: 3 case studies (Pac Forge, Manuva, Silio) and 2 services (Tools & Dashboards, Platforms &
Systems). The crate pads out with blank, non-interactive sleeves; the shelf takes any number of ornaments.

Adding an object later = model it in Blender following section 6.3 + one entry in the hotspot registry.

### 3.6 Phones

Same experience. The standing spot has a separate portrait camera pose, pulled back with a taller field of view
so all objects fit. No tilt-sway (iOS gates motion sensors behind a permission prompt). Focus poses get portrait
variants where the desktop framing doesn't fit.

### 3.7 Reduced motion

With `prefers-reduced-motion: reduce`: no scroll-scrubbed flight. The office fades in at the standing spot and the
page doesn't scroll. Objects open panels with a short fade and no camera move.

## 4. Visual style

- **Scene:** near-black background; each mesh drawn as a black fill (depth-writing, polygon offset) plus its
  feature edges (`EdgesGeometry`, angle threshold ~20°, tuned per scene) as screen-space fat lines
  (`LineSegments2`, ~1.3 px). Lines fade with distance so the far city doesn't clutter. **One colour per section**
  for interactive states (Kasper, phase 1 look-dev): work (crate) lime `#C6FF3D`, services (shelf) red `#FF3B30`,
  contact (drawer) cyan `#2EF2FF`, the monitor gag amber `#FFB224`. Only the hovered or focused object is
  coloured, so one colour shows at a time. Touch markers stay white.
- **UI (panels, standalone pages):** new minimal style derived from the office: black, white hairlines, each
  section's panels and pages in that section's colour, white for everything that isn't a section (nav, skip intro,
  fallback). Type: Inter Tight for UI, IBM Plex Mono for labels (phase 1 look-dev). Nothing from the old design
  system.
- **Copy voice:** case-study bodies keep their current professional register. Everything that explains what
  Kasper does (intro, services, contact, drawer card, monitor gag, labels) is in his voice per the voice profile in
  memory: conversational, dry, contractions, no marketing language. The monitor copy is drafted and shown to Kasper
  for approval before it ships.

The style is one renderer switch over shared geometry. Restyling (e.g. to shaded or textured) does not need a
rebuild of the models.

## 5. Architecture

### 5.1 Routes

| Route | Soft navigation from the office | Direct visit / refresh |
|---|---|---|
| `/` | n/a | Office (walk-in) with SEO text content in the DOM |
| `/work/[slug]` | Case study panel over the office (intercepting route) | Standalone case study page |
| `/contact` | Contact panel over the office | Standalone contact page |
| `/services/[slug]` | Service panel over the office | Standalone service page |
| `/work`, `/services` | n/a | Standalone index pages (for links and SEO) |
| `/admin/*`, `/api/*` | Unchanged | Unchanged |

Implementation uses Next's parallel routes (`@panel` slot with `default.tsx` returning `null`) and intercepting
routes (`(.)work/[slug]` etc.), per `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`
`intercepting-routes.md` and `parallel-routes.md`. The office layout that hosts the canvas stays mounted across
these navigations so the scene never reloads.

Standalone pages carry an "Enter the office" link to `/`.

`(main)` and `(v2)` are retired in phase 5. `/admin` moves into its own route group so it keeps its layout and
keeps working.

### 5.2 URL drives the scene

The URL is the single source of truth for what the scene shows:

| URL | Scene state |
|---|---|
| `/` | Standing spot (or walk-in, depending on scroll) |
| `/work/manuva` | Focus: crate, Manuva record pulled out |
| `/contact` | Focus: drawer open |
| `/services/<slug>` | Focus: shelf, that ornament highlighted |

Back, forward, shared links (via soft nav) and refresh all fall out of this. Two states are local only, with no
URL: browsing the crate before a record is picked, and the monitor gag.

### 5.3 Modules

| Module | Responsibility | Depends on |
|---|---|---|
| `office/OfficeCanvas` | R3F `<Canvas>`; loads both GLBs; hosts the renderer, director and hotspots. Client-only, dynamically imported | R3F, drei |
| `office/style/CleanEdges` | Turns a loaded glTF scene into fill meshes + fat edge lines; owns line materials and the accent/hover state | three |
| `office/director` | State machine: `walkIn(progress)` → `idle` → `focusing(target)` → `focused(target)` → `returning` → `idle`. Pure logic, unit-tested; emits camera targets | — |
| `office/camera` | Plays the Blender walk-in clip at a time set by scroll; tweens between focus poses with GSAP | GSAP, director |
| `office/scroll` | Scroll spacer + GSAP ScrollTrigger (scrub with smoothing) → walk-in progress. Replaces Lenis | GSAP |
| `office/hotspots` | Registry mapping Blender names to label, route, focus pose, open/close animation; pointer + keyboard focus handling | director, content |
| `office/objects/*` | One module per interactive object (crate, drawer, monitor, shelf): its teaser animation and 3D text | hotspots, content |
| `panels/Panel` | Accessible dialog shell over the scene (focus trap, Esc, focus return) | — |
| `content/*` | Projects, services, contact data, shared by 3D labels, panels and standalone pages | — |

3D text (record sleeves, ornament labels, business card) uses drei `<Text>` fed from `content/*`, so labels and
pages can't drift apart.

`lib/gsap.ts` currently registers every GSAP plugin. Phase 1 trims it to what the build uses (expected:
ScrollTrigger, CustomEase, SplitText, ScrambleText).

### 5.4 Dependencies to add

`three`, `@react-three/fiber` (v9, React 19), `@react-three/drei`; dev: `@gltf-transform/cli`, `vitest`,
`@playwright/test`. Already present: `gsap`, `@gsap/react`. `lenis` is removed with `(v2)`.

## 6. 3D asset pipeline

### 6.1 Source files

- `art/office.blend`: single source file, tracked with Git LFS (set up in phase 1).
- Exported with Blender's glTF exporter to `art/export/*.glb`, then optimised by `npm run build:models`
  (gltf-transform: prune, dedupe, weld, meshopt compression) into `public/models/street.glb` and
  `public/models/office.glb`.

### 6.2 Street from OpenStreetMap

- Extract via the Overpass API: building footprints and tags, roads, tram tracks, kerbs, around The Commons, plus
  a corridor west to cover the Nylex silos, AAMI Park and the CBD skyline. Script: `scripts/osm-import.py`, run inside
  Blender.
- Buildings are extruded from `height`, else `building:levels` × 3.2 m, else a 7 m default. Coverage near
  Gwynne St (measured 2026-10-01): 1,071 buildings within 450 m, ~24% with a height tag. Footprints exist for
  10–12, 14–18 and 20 Gwynne St (The Commons).
- **Near field** (~150 m around The Commons): The Commons' facade and its door are hand-modelled from photo
  reference. Neighbours get simple facade detail (windows, awnings) so the descent reads.
- **Mid field:** plain extruded OSM blocks.
- **Far field:** AAMI Park and the Nylex silos are hand-modelled; CBD towers are OSM extrusions. AAMI Park's
  triangulated bubble roof is pulled forward into phase 1 (Kasper, 2026-10-01).
- OSM data is © OpenStreetMap contributors under ODbL. The site shows the attribution in the street view and on the
  flat home page. Whether the exported street GLB counts as a produced work or a derivative database under ODbL is
  checked before launch.

### 6.3 Blender conventions

| Prefix | Meaning | Rules |
|---|---|---|
| `hs_<name>` | Interactive object (e.g. `hs_crate`, `hs_drawer`, `hs_monitor`, `hs_shelf`) | Origin at the hinge or pivot; children may be named `hs_<name>__<part>` |
| `cam_<name>` | Camera pose (e.g. `cam_stand`, `cam_stand_portrait`, `cam_focus_crate`) | Exported as cameras |
| `cam_walkin` | The walk-in camera | Animated along the path; one action, frame range = scroll range |
| `anim_<name>` | Blender-authored actions (door swing, drawer slide) | Hand-tuned motion lives here; repeated per-item motion (record flips) is done in code |
| `prop_<name>` | Set dressing | Never interactive |

Modelling: low-poly, quads, no unnecessary subdivision. Every edge that should draw is a real edge; clean geometry
is what makes clean lines.

### 6.4 Model check

`npm run check:models` validates the exported GLBs: every hotspot in the registry and every required `cam_*`
exists, `cam_walkin` has an animation, and files are within the budgets in section 7. Runs as part of
`npm run build` (so a Vercel deploy fails on a broken model) and before every export is committed.

## 7. Fallbacks, SEO, accessibility, performance

### 7.1 Fallback tiers

1. Full 3D.
2. No WebGL, WebGL context lost, a model fails to load, or sustained low frame rate on the standing view → flat home
   page with the same content (name, intro, work, services, contact).
3. JavaScript off → the same flat page, server-rendered.

Nobody gets a blank screen.

### 7.2 SEO

- `/` server-renders real content (h1, intro, links to each job, service and contact) in the DOM; it doubles as tier
  2/3 fallback.
- Standalone pages are fully server-rendered with their own metadata and OG images.
- Sitemap adds `/services/*`. `SITE_TITLE` and `SITE_DESCRIPTION` carry over (description rewritten in Kasper's
  voice).
- 3D code is only loaded on the office routes; standalone pages ship no three.js.

### 7.3 Accessibility

- Each hotspot has a matching real link in the DOM (a button for the monitor, which has no URL): visually hidden,
  keyboard-focusable. Tabbing highlights the object in 3D; Enter opens it.
- Panels are dialogs: focus trap, Esc closes, focus returns to the trigger.
- Reduced motion per 3.7. "Skip intro" is keyboard-reachable first.

### 7.4 Performance budgets

| Item | Budget |
|---|---|
| First lines drawing on a mid-range phone over 4G | ≤ 2.5 s |
| `street.glb` (compressed) | ≤ 800 KB |
| `office.glb` (compressed) | ≤ 2 MB |
| Office-route JS (three + R3F + drei + GSAP + app) | ≤ 350 KB gzipped |

Adaptive pixel ratio on weak devices (drei `PerformanceMonitor`); rendering pauses when the tab is hidden or the
canvas is off-screen.

### 7.5 Error handling

- GLB load failure → tier-2 fallback, error logged.
- `office.glb` late → door holds shut with loading indicator (3.3).
- WebGL context lost → tier-2 fallback; no automatic retry loop.
- Unknown `/work/<slug>` or `/services/<slug>` → standard 404 page.

## 8. Testing

The repo has no tests today. This adds:

- **Vitest (unit):** director state machine transitions; URL ↔ scene-state mapping; hotspot registry integrity
  against content data.
- **Playwright (end-to-end):** every route renders on direct visit; clicking a hotspot's DOM link opens the panel
  and changes the URL; browser Back closes it; direct visit to `/work/<slug>` renders the standalone page; Chromium
  with WebGL disabled shows the flat fallback; reduced-motion emulation skips the flight; `/admin` still loads.
- **`npm run check:models`** (6.4).
- **Visual review:** screenshots at desktop and phone sizes at the end of each phase, shown to Kasper.

## 9. Delivery phases

Each phase gets its own implementation plan and ends with something viewable on the preview URL.

1. **Foundation:** dependencies; Git LFS; `CleanEdges` renderer; Blender conventions; export + `build:models` +
   `check:models`; OSM import script; grey-box street (real footprints) and grey-box office; walk-in camera driven by
   scroll; look-dev of accent colour and UI typefaces; trim `lib/gsap.ts`.
   *Viewable:* a scrollable grey-box walk-in on the real street to judge pacing and framing.
2. **Street:** detailed near field and The Commons' facade and door; AAMI Park; Nylex silos; skyline; tram tracks;
   line draw-in loading; skip intro; reduced motion; OSM attribution.
3. **Office and director:** office model and dressing; standing poses (desktop, portrait); hover, keyboard focus,
   labels and touch markers; focus camera moves; `@panel` intercepting routes and `Panel`; URL-driven state.
4. **The four objects:** crate and records, drawer and contact, monitor gag (copy approved by Kasper), shelf and
   services; `content/*` consolidated.
5. **Pages and fallbacks:** standalone pages in the new style; flat fallback; SEO and sitemap; accessibility pass;
   retire `(main)` and `(v2)`; `/admin` in its own group.
6. **Polish and launch:** idle animation, mouse sway, real-phone performance pass against the budgets, ODbL
   check, merge to `master`.

## 10. Out of scope for v1

- Sound.
- Free movement or free look inside the office.
- Changes to `/admin` or the API routes beyond moving the admin route group.
- New case-study content (the crate shows the existing three).
- Custom analytics events.
