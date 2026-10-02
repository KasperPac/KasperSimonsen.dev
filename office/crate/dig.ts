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

export const SWIPE_PX = 40;

/** A vertical swipe on a touch screen: up flicks forward, down flicks back, a tap is nothing. */
export function swipeStep(dy: number): -1 | 0 | 1 {
  return Math.abs(dy) < SWIPE_PX ? 0 : dy < 0 ? 1 : -1;
}
