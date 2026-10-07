# KasperSimonsen.dev: the whiteboard (a hidden extra), design spec

- **Date:** 2026-10-05
- **Branch:** `redesign/office`
- **Builds on:** `2026-10-02-office-interactions-design.md` (the director, history layers, focus cameras, `CardFace`
  prints, hover highlight). Everything there still holds; this adds a kind of object it didn't have.
- **Status:** agreed in brainstorming with Kasper on 2026-10-05, awaiting his review of this document

## 1. Goal

Just for fun: the whiteboard on the back wall can be drawn on. A visitor who pokes around finds it, picks up a marker
and draws. It is the first **hidden extra**: something in the office that isn't signposted, for people who explore.
The TV's games come later as the next one, so "hidden extra" is a general idea, not a one-off.

The four signposted objects (work, contact, services, past work on the monitor) stay the way in. An extra never
competes with them.

## 2. Decisions

| Topic | Decision |
|---|---|
| Drawings | The visitor's own, in memory for the visit: still there if they leave and come back, gone on reload. No storage, no backend, nothing shared |
| Signposting | Hidden: no dot, no tour stop, no glint. White hover highlight and a small label. One in-world hint that hidden things exist |
| Keyboard | A last item in the hidden nav, so it isn't mouse-only |
| URL | None (a local layer, like the monitor) |
| Pen | The chosen 3D marker lifts off the tray and follows the pointer or finger, its tip on the board |
| Colours | The tray's five markers: white (the line colour) and the four section colours |
| Tools | Five swatches, an eraser and **Wipe it**, printed along the bottom of the board |
| "TODO: sleep" | Part of the drawing, so it can be rubbed out; it's back on the next visit |

## 3. The flow

### 3.1 Finding it

- Standing in the office, hovering the whiteboard lights its lines **white** (`theme.line`) and shows a small mono
  label, **Have a go** (draft). It has no dot, isn't in the arrival tour and never glints.
- Click or tap opens it. Keyboard users find it as the last item of the hidden nav: **The whiteboard (just for fun)**
  (draft).
- **The hint:** the sticky note beside the whiteboard (today "(next sprint)") becomes an in-world nudge, e.g.
  "some things in here do more than they look" (draft). After the arrival tour, the hint line also says it once,
  e.g. "Have a look around. Some things do more than they look." (draft). Kasper rewrites both.

### 3.2 At the board

1. The camera comes square on to the board, which fills most of the screen (portrait-framed on phones). No URL change.
2. The **white** marker lifts off the tray and comes to the board. While the pointer (or finger) is over the board,
   the marker sits with its tip at the pointer, tilted like a held pen: pressed onto the board while drawing, lifted a
   few millimetres while not. Dragging draws in the marker's colour.
3. **The tool strip**, printed along the bottom edge of the board: five colour swatches (white, lime `#C6FF3D`, red
   `#FF3B30`, cyan `#2EF2FF`, amber `#FFB224`), an eraser, and **Wipe it**. Choosing a swatch puts the held marker back
   and lifts that colour's marker; choosing the eraser lifts the eraser, which rubs out under the pointer.
   **Wipe it** clears the board (including "TODO: sleep"). The strip is real buttons: the keyboard path, and the easy
   one on a phone.
4. The board starts with "TODO: sleep" written on it in white, as part of the drawing.

### 3.3 Leaving

Back or Esc: the held marker goes back to the tray, the camera returns to the standing spot. The drawing stays on the
board for the rest of the visit (seen from across the room too). A reload starts it fresh, with "TODO: sleep" again.

### 3.4 Phones

Finger drawing on the board. The sideways pan only happens standing in the room (not at the board), and the walk-in
scroll is locked while the board is open, so neither clashes with drawing. The tool strip is sized for fingers.

### 3.5 Reduced motion

The marker jumps to the pointer and back to the tray instead of gliding; the camera cuts. Drawing works the same.

## 4. Look and motion

- Strokes: round caps and joins, ~6 px at the board's print scale, smoothed so a quick scribble reads as marker, not
  a polyline. The eraser is ~4× a stroke's width.
- The board is drawn on with the same line colours as the office: strokes read as more line art.
- The tray's markers are tinted in their colours (their outlines), so the tray reads as a set of colours.
- Marker lift from the tray and return: ~0.4 s, eased. Following the pointer: tight (an exponential follow, as the
  phone pan does), never laggy enough to feel detached from the line.

## 5. Accessibility

- The whiteboard is reachable by keyboard (the nav item). Its print has a focus target (a visually hidden heading)
  that takes focus as it opens, then the tool strip's buttons are ordinary tab stops.
- Drawing itself is pointer-only; the board is a toy, so nothing else depends on it.
- Esc and Back leave, as everywhere else.
- The fallback page (no 3D) doesn't mention it.

## 6. Architecture

| Unit | Responsibility |
|---|---|
| `office/hotspots/registry.ts` | Adds `EXTRAS` (`hs_whiteboard`) beside the four signposted `HOTSPOTS`; hit-testing, highlight keys and layer validation cover both; dots, tour, glints and the visible nav use the signposted list only |
| `office/theme.ts` | `hs_whiteboard`'s hover colour is `theme.line` |
| `office/camera/rig.ts`, focus cameras | A focus move and `cam_focus_whiteboard` (+ `_portrait`) |
| `office/whiteboard/strokes.ts` | Pure: the stroke list, smoothing, erasing, wiping, and redrawing it onto a 2D canvas context |
| `office/whiteboard/marker.ts` | Pure: the held marker's pose from the pointer's spot on the board and whether it's pressing; the lift from and return to the tray |
| `office/whiteboard/board.ts` | The visit's drawing kept in memory (module state, survives leaving and returning, not a reload) |
| `office/cards/Whiteboard.tsx` | What's printed on the board: the canvas (pointer drawing) and the tool strip |
| `office/style/cleanEdges.ts` | A fixed per-object line tint (the tray's markers) |
| `office/OfficeCanvas.tsx`, `office/OfficeExperience.tsx` | Wiring: the board print, the held marker each frame, the nav item, the hint |

**Blender:**
- The whiteboard becomes `hs_whiteboard`, with a flat drawing surface `hs_whiteboard__surface` (like the monitor's
  screen: a quad, its local +z out of the board, +y up).
- The tray's markers become separate parts `hs_whiteboard__marker_00`..`_04` (white, lime, red, cyan, amber order)
  and `hs_whiteboard__eraser`, each with its origin at its tip (markers) or its working face (eraser).
- The 3D "TODO: sleep" text comes off the model (it's drawn on the canvas instead). The note beside the board gets the
  hint text.
- Focus cameras `cam_focus_whiteboard` and `cam_focus_whiteboard_portrait`: square on, the board across most of the
  width, the tray in shot.

## 7. Content and copy

Drafts for Kasper's approval: the hover label (**Have a go**), the nav item (**The whiteboard (just for fun)**), the
note's hint, the hint line's addition, the tool strip's labels (**Wipe it**, the eraser and swatch names for screen
readers).

## 8. Testing

- **Vitest:** stroke smoothing and erasing (pure), wiping, the marker's pose (tip on the pointer, pressing vs lifted,
  tray return), the registry (the whiteboard is hit-testable but not in the dots, tour, glints or visible nav), layer
  validation accepts it.
- **Playwright:** open it from the nav item (focus lands on the board), drag across the board and see pixels on the
  canvas, change colour and draw again, **Wipe it** clears it, Esc leaves and coming back keeps the drawing, a reload
  starts fresh, the phone layout fits, reduced motion cuts.
- **Visual review** with Kasper: the marker in the hand, the line weight, the hint.

## 9. Milestone

One milestone, **Whiteboard**: everything above, ending with something Kasper can draw on at `localhost:3010` and on
his phone.
