# KasperSimonsen.dev: the neon sign, design spec

- **Date:** 2026-10-07
- **Branch:** `redesign/office`
- **Builds on:** `2026-10-02-office-interactions-design.md` (the director, the standing spot and `LEAVE_AT`, the
  one-colour rule, the state attributes on `.office`). Everything there still holds; this adds a lit object that isn't
  a hotspot.
- **Status:** implemented and accepted by Kasper on 2026-10-12, including centred placement and the static door logo

## 1. Goal

The new KS mark hangs in the office as a neon sign, a nod to the Skipping Girl sign: the rope swings round the KS in
sequential neon frames, and the KS and its head hop as it passes under. It is decoration. It powers up as the visitor
arrives, stutters now and then like an old tube, and never competes with the four objects that are the way in.

The mark is concept 6 from the logo rounds (block KS, a circle for a head, a rope arc over it). The letters and circle
are neon outlines, following Kasper's final request. The existing block silhouettes supply the visible letter paths
directly; there is no separate centre-line redraw (section 6).

## 2. Decisions

| Topic | Decision |
|---|---|
| Where | Centred on the solid left-wall panel above the couch, seen at an angle like a bar sign. Kasper requested centring on 2026-10-12; the phone's left pan turns further to keep it visible (3.5) |
| Colour | White neon (warm white tubes: a dim opaque glow band under a bright core). Unlit tubes are faint grey. No section colour, so the one-colour rule holds |
| Motion | Steps, like the real sign: six rope positions, one lit at a time |
| On and off | Switches itself: off during the walk-in, powers up on arrival, off again on leaving. Nothing to click |
| Flicker | A stutter on power-up and an occasional bad tube while on |
| Interaction | None: no hover, label, dot, tour stop, glint or hidden-nav item. Not pickable |
| Build | Fat lines built in code from one module holding the mark's geometry; Blender only places an anchor |

## 3. Behaviour

### 3.1 States

`.office` carries `data-neon`:

- **`off`**: during the walk-in, and whenever the director is back in the walk-in (progress below
  `LEAVE_AT`, 0.97). All tubes show as unlit glass: faint grey, no glow.
- **`powering`**: when the director reaches the room (progress reaches `IDLE_AT`, 0.995, and it goes idle; it leaves
  the walk-in below `LEAVE_AT`, 0.97), ~0.6 s. Any director state but the walk-in counts, so a direct visit that
  opens an object powers it up too. The tubes stutter on unevenly: the letters and the head first, then the rope.
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

The sign is off to the left of the portrait standing view; a sideways drag brings it in. The left endpoint turns
0.3 radians, retaining the existing 1 m sideways travel, so the centred sign fits on screen. The right endpoint
keeps its 0.18-radian turn. A projection regression checks the full sign box with margins on 390 × 844 and
360 × 800 phone viewports.

## 4. Look

- **Lit tube:** a core line in warm white (`#FFF4E2`) ~2 px, over a wider (~8 px) line in the same colour at about a
  third of the brightness, for the glow. Both are opaque, and brightness is carried by their colour (a dimmed tube is a
  darker colour, off is hidden). No transparency, no additive blending, no post-processing.
- **Why opaque:** a fat line is drawn segment by segment, and the segments overlap at their round caps. A see-through
  line doubles up at every overlap, so the rope and the letters looked beaded. An opaque line looks the same however
  often it overlaps itself.
- **Draw order, not depth:** the sign's lines don't write depth; they test it only against the room. They are drawn in
  layers, back to front: the unlit glass, the back ropes, the letters, the gap a front rope cuts in them, the front
  ropes, the head; each glow before its core. The layers are millimetres apart, and on a wall seen this steeply a fat
  line's caps are out by centimetres, so depth can't order them.
- **The gap:** 12 px, wider than the glow, so a front rope shows a thin dark edge where it crosses a letter.
- **Unlit tube:** one ~1.5 px line in a dark grey (`#3A3A3A`), no glow.
- **Size:** ~0.85 m square on the wall (the mark's 160-unit box, section 6), 2 cm off the wall face.
- The sign's lines are not part of the edge pipeline: they don't fade with distance, don't take the hover highlight
  and aren't picked by the hotspot raycasts.

## 5. Accessibility

Decorative. The canvas already carries the scene's text alternative; the sign adds nothing to the DOM beyond the
`data-neon` attribute, and nothing to the keyboard order. The flicker is brief, low-contrast and well under three
flashes a second, and reduced motion removes it.

## 6. Architecture

- **`office/neon/mark.ts`:** the mark as pure geometry in its 240-unit design grid (the prototype's coordinates), y
  down:
  - **The letters' tubes** (`K_TUBES`, `S_TUBES`): the complete closed block outlines, sourced directly from `K` and
    `S`. Letter interiors remain hollow. Preserve every corner and the S's narrow slots; tune rendering rather than
    changing the letterforms if clarity needs improvement.
  - **The silhouettes** (`K`, `S`): the same closed polylines also hide a rope that passes behind the letters, so the
    back ropes are cut against them.
  - The head as a sampled circle, and `rope(step)` as a sampled polyline from hand to hand (hands at (56, 132) and
    (192, 132), control offset 72). Also the 160-unit box the sign's size maps to (44–204 on both axes).

  It is the one place the sign's letterforms live. Navigation and favicon adoption remain separate work.
- **`office/neon/sequence.ts`:** a pure timeline. `neonFrame(state, t, seed, reduced)` returns the lit rope step,
  each tube's brightness (0–1) and the hop height. `state` and `t` (seconds since entering it) come from the caller.
  No three.js, no React.
- **`office/neon/NeonSign.tsx`:** an R3F component. It finds the anchor node in the loaded office, builds one
  `Line2` pair (core and glow) per tube from `mark.ts` (letters, head, six ropes), scales the 160-unit box to the
  anchor's size, and each frame applies `neonFrame` (brightness to line colour, hop to the letters' and head's group). It reads only the
  director state that the experience already has (anything but the walk-in is in the room), and writes `data-neon`.
- **Blender:** `scripts/blender/greybox_office.py` places an empty, `prop_neon_sign`, in the room frame on the left
  wall's face: centre (x −2.25 + 0.02, y 4.2, z 1.78), facing into the room (+x), its scale giving the 0.85 m size.
  The solid wall panel spans y 3.3–5.1, from the window's back edge to the back wall. Its midpoint is also the
  couch's centre. The phone pan accommodates this placement (3.5). Re-export `office.glb` and validate the manifest
  contracts as for any scene change.

  The door's `prop_office_door__sign` mesh is a separate static decal, replacing the website lettering and plate.
  `scripts/models/ks-mark.mjs` supplies the same K/S, head and overhead rope geometry to the Blender builder. The
  mark is 0.4 m wide, centred on the corridor face at 1.55 m, and parented to the animated door. Its `flat_mark`
  extra tells the scene renderer to use a solid, unlit material in the line colour, without glow or edge lines.

## 7. Content and copy

None. The sign has no text beyond the mark.

## 8. Testing

- **Unit (`mark.test.ts`):** the K and S outlines close; the visible letter paths preserve all the block mark's edges;
  every rope starts and ends at the hands; the overhead rope clears the top of the head; the under-feet rope
  clears the letters' bottom with the hop applied; the back ropes stay out of the outlines.
- **Unit (`sign.test.ts`):** every line is opaque and doesn't write depth, layered in the order above; off leaves the
  unlit lines showing and hides the lit ones; a lit tube's core is the lit colour and its glow a third as bright.
- **Unit (`sequence.test.ts`):** `off` lights nothing; `powering` ends with every letter tube lit; `on` steps every
  ~0.2 s through all six positions in order; the hop is non-zero only on step 3; bad-tube events fall 8–20 s apart,
  last ~0.3 s and repeat for the same seed; reduced motion holds step 0, full brightness, no hop.
- **End-to-end (`e2e/office-neon.spec.ts`, run on its own, `--workers=1`):** it records every value `data-neon` takes.
  - Across arriving, leaving and returning the record is `["powering", "on", "off", "powering", "on"]`.
  - While an object opens from the standing spot nothing is recorded: it never leaves `on`.
  - A direct visit that opens an object starts at `off`, records `"powering"` first, never records `"off"`, and
    ends `on`.
  - With reduced motion the record is `["on"]`: no power-up.

## 9. Milestone

Done when the sign hangs over the couch, traces the block KS and head as hollow outlines, powers up on arrival,
steps and stutters as above, and the tests pass. Kasper reviews it on desktop and on his phone. Adoption of the
same mark in navigation and the favicon is separate work.

Kasper accepted the final neon placement and door logo on 2026-10-12: "looks good, I think this part is done".
This milestone is complete. Real-device Safari checks remain part of the broader site verification.
