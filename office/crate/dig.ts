// office/crate/dig.ts
import { work } from "@/content/work";
import type { HotspotName } from "@/office/hotspots/registry";

/** A pulled record is at the front of the dig: the records in front of it are flicked forward. */
export function digFor(dig: number, pulledSlug: string | null): number {
  const i = pulledSlug ? work.findIndex((w) => w.slug === pulledSlug) : -1;
  return i < 0 ? dig : i;
}

/** A record can be pulled while browsing the crate with none out. */
export function canPull(focused: HotspotName | null, pulledSlug: string | null): boolean {
  return focused === "hs_crate" && pulledSlug === null;
}

export type Wheel = { acc: number; quietUntil: number };
/** Pixels of wheel travel per flick, and the pause before the same gesture can flick again. */
export const WHEEL_STEP = 60;
export const WHEEL_COOLDOWN_MS = 350;

/**
 * One flick per wheel gesture: travel accumulates to WHEEL_STEP, then the gesture is spent until the wheel has been
 * quiet for WHEEL_COOLDOWN_MS (a trackpad keeps firing for a second after the fingers lift).
 */
export function wheelStep(w: Wheel, deltaY: number, now: number): { w: Wheel; step: -1 | 0 | 1 } {
  if (now < w.quietUntil) return { w: { acc: 0, quietUntil: now + WHEEL_COOLDOWN_MS }, step: 0 };
  const acc = w.acc + deltaY;
  if (Math.abs(acc) < WHEEL_STEP) return { w: { acc, quietUntil: 0 }, step: 0 };
  return { w: { acc: 0, quietUntil: now + WHEEL_COOLDOWN_MS }, step: acc > 0 ? 1 : -1 };
}

export const SWIPE_PX = 40;

/** A vertical swipe on a touch screen: up flicks forward, down flicks back, a tap is nothing. */
export function swipeStep(dy: number): -1 | 0 | 1 {
  return Math.abs(dy) < SWIPE_PX ? 0 : dy < 0 ? 1 : -1;
}
