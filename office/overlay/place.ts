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
