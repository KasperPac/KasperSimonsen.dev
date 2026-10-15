/** A deliberate rightward swipe goes back; vertical record flicks stay separate. */
export function isBackSwipe(dx: number, dy: number, elapsed: number): boolean {
  return dx >= 72 && dx > Math.abs(dy) * 1.5 && elapsed <= 900;
}

/** Fingers closing together mean zoom out. Require both a relative and absolute change. */
export function isZoomOut(start: number, distance: number): boolean {
  return start - distance >= 32 && distance <= start * 0.75;
}

/** Trackpad zoom-out uses Ctrl+wheel down; scrolling back up also steps out of an object. */
export function backWheelDelta(deltaX: number, deltaY: number, mode: number, ctrl: boolean): number {
  if (Math.abs(deltaX) >= Math.abs(deltaY)) return 0;
  const amount = deltaY * (mode === 1 ? 16 : mode === 2 ? 800 : 1);
  return ctrl ? Math.max(0, amount) : Math.max(0, -amount);
}
