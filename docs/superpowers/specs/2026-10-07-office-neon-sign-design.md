# KasperSimonsen.dev: the neon sign, design spec

- **Date:** 2026-10-07
- **Branch:** `redesign/office`
- **Builds on:** `2026-10-02-office-interactions-design.md` (the director, the standing spot and `LEAVE_AT`, the
  one-colour rule, the state attributes on `.office`). Everything there still holds; this adds a lit object that isn't
  a hotspot.
- **Status:** agreed in brainstorming with Kasper on 2026-10-07, awaiting his review of this document

## 1. Goal

The new KS mark hangs in the office as a neon sign, a nod to the Skipping Girl sign: the rope swings round the KS in
sequential neon frames, and the KS and its head hop as it passes under. It is decoration. It powers up as the visitor
arrives, stutters now and then like an old tube, and never competes with the four objects that are the way in.

The mark is concept 6 from the logo rounds (block KS, a dot for a head, a rope arc over it). Its letterforms are still
the prototype redraw; the finished drawing replaces them later in one file (section 6).

## 2. Decisions

| Topic | Decision |
|---|---|
| Where | The left wall, centred over the couch, seen at an angle like a bar sign (Kasper picked spot C of three mocked on the real standing view) |
| Colour | White neon (warm white tubes, soft glow). Unlit tubes are faint grey. No section colour, so the one-colour rule holds |
| Motion | Steps, like the real sign: six rope positions, one lit at a time |
| On and off | Switches itself: off during the walk-in, powers up on arrival, off again on leaving. Nothing to click |
| Flicker | A stutter on power-up and an occasional bad tube while on |
| Interaction | None: no hover, label, dot, tour stop, glint or hidden-nav item. Not pickable |
| Build | Fat lines built in code from one module holding the mark's geometry; Blender only places an anchor |

## 3. Behaviour

### 3.1 States

`.office` carries `data-neon`:

- **`off`**: during the walk-in, and whenever the visitor is out of the standing spot (walk-in progress below
  `LEAVE_AT`, 0.97). All tubes show as unlit glass: faint grey, no glow.
- **`powering`**: on arrival at the standing spot (progress reaches 1 and the director is idle), ~0.6 s. The tubes
  stutter on unevenly: the letters and the head first, then the rope.
- **`on`**: the rope steps round; the occasional bad tube.

Leaving (progress below `LEAVE_AT`) switches it straight to `off`; coming back powers it up again. Opening an object
(crate, drawer, monitor, shelf, whiteboard) does not switch it off: the camera has left the standing spot but the
visitor hasn't left the room.

### 3.2 The rope

- Six positions, `theta = step × 60°`, about the line through the hands: 0° overhead, 60° and 120° down the front
  (crossing the letters), 180° under the feet, 240° and 300° behind.
- One position is lit at a time, ~0.2 s each, so one turn takes ~1.2 s. The other five stay as unlit tubes.
- **The hop:** the letters and the head rise ~3 cm while the rope is under the feet (step 3) and drop back after it.
- Front positions (60°, 120°) draw over the letters; the letters keep a thin dark gap round the lit rope where it
  crosses them, so it reads as passing in front. The head always draws over the rope.

### 3.3 The bad tube

While `on`, every 8–20 s (random), one tube (a letter, the head or the lit rope) flutters for ~0.3 s: a few uneven
dips in brightness, then steady. One at a time. The timing comes from a seeded random sequence, so tests can pin it.

### 3.4 Reduced motion

No stutter, no stepping, no hop, no flicker. On arrival it is simply `on`, holding the overhead frame (step 0), which
is concept 6. Leaving still switches it `off`.

### 3.5 Phones

Nothing special. The sign is off to the left of the portrait standing view; a sideways drag brings it in.

## 4. Look

- **Lit tube:** a core line in warm white (`#FFF4E2`) ~2 px, over a wider (~8 px), low-opacity line of the same colour
  for the glow. Additive blending; no post-processing.
- **Unlit tube:** one ~1.5 px line in a dark grey (`#3A3A3A`), no glow.
- **Size:** ~0.85 m square on the wall (the mark's 160-unit box, section 6), 2 cm off the wall face.
- The sign's lines are not part of the edge pipeline: they don't fade with distance, don't take the hover highlight
  and aren't picked by the hotspot raycasts.

## 5. Accessibility

Decorative. The canvas already carries the scene's text alternative; the sign adds nothing to the DOM beyond the
`data-neon` attribute, and nothing to the keyboard order. The flicker is brief, low-contrast and well under three
flashes a second, and reduced motion removes it.

## 6. Architecture

- **`office/neon/mark.ts`:** the mark as pure geometry in its 240-unit design grid (the prototype's coordinates): the
  K and S outlines as closed polylines, the head as a sampled circle, and `rope(step)` as a sampled polyline from hand
  to hand (hands at (56, 132) and (192, 132), control offset 72). Also the 160-unit box the sign's size maps to
  (44–204 on both axes). It is the one place the letterforms live; the finished drawing replaces them here, and the
  site's logo can read it later.
- **`office/neon/sequence.ts`:** a pure timeline. `neonFrame(state, t, seed, reduced)` returns the lit rope step,
  each tube's brightness (0–1) and the hop height. `state` and `t` (seconds since entering it) come from the caller.
  No three.js, no React.
- **`office/neon/NeonSign.tsx`:** an R3F component. It finds the anchor node in the loaded office, builds one
  `Line2` pair (core and glow) per tube from `mark.ts` (letters, head, six ropes), scales the 160-unit box to the
  anchor's size, and each frame applies `neonFrame` (brightness to material opacity, hop to the letters' and head's
  group). It reads walk-in progress and the director state that the experience already has, and writes `data-neon`.
- **Blender:** `scripts/blender/greybox_office.py` places an empty, `prop_neon_sign`, in the room frame on the left
  wall's face: centre (x −2.25 + 0.02, y 4.2, z 1.78), facing into the room (+x), its scale giving the 0.85 m size.
  Re-export `office.glb` and update `office/manifest.json` as for any scene change.

## 7. Content and copy

None. The sign has no text beyond the mark.

## 8. Testing

- **Unit (`mark.test.ts`):** the K and S outlines close; every rope starts and ends at the hands; the overhead rope
  clears the top of the head; the under-feet rope clears the letters' bottom with the hop applied.
- **Unit (`sequence.test.ts`):** `off` lights nothing; `powering` ends with every letter tube lit; `on` steps every
  ~0.2 s through all six positions in order; the hop is non-zero only on step 3; bad-tube events fall 8–20 s apart,
  last ~0.3 s and repeat for the same seed; reduced motion holds step 0, full brightness, no hop.
- **End-to-end (`e2e/office-neon.spec.ts`, run on its own, `--workers=1`):** `data-neon` is `off` during the walk-in,
  becomes `on` after arriving, goes `off` after scrolling back past `LEAVE_AT`, and is `on` again on return; with
  reduced motion it goes straight to `on`. Opening the drawer leaves it `on`.

## 9. Milestone

Done when the sign hangs over the couch, powers up on arrival, steps and stutters as above, and the tests pass. Kasper
reviews it on desktop and on his phone. Swapping in the finished letterforms is a separate, later change to
`mark.ts`.
