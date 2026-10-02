import type { Box3 } from "three";

/** Lift off the card's top, in metres, so the print never shares a plane with the card's outline. */
const LIFT = 0.0003;

/**
 * Where drei's `Html transform` goes to print `widthPx` of HTML across a card lying flat (y up, its long edge along
 * x): on the top face, facing up, the text's up pointing along -z (into the drawer, away from whoever opened it).
 */
export function faceFor(box: Box3, widthPx: number) {
  const width = box.max.x - box.min.x;
  const depth = box.max.z - box.min.z;
  return {
    position: [(box.min.x + box.max.x) / 2, box.max.y + LIFT, (box.min.z + box.max.z) / 2] as [number, number, number],
    rotation: [-Math.PI / 2, 0, 0] as [number, number, number],
    // drei maps 1 CSS px to distanceFactor / 400 world units in transform mode
    distanceFactor: (width * 400) / widthPx,
    heightPx: (widthPx * depth) / width,
  };
}
