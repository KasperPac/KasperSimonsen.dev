import type { HotspotName } from "@/office/hotspots/registry";

/** The arrival tour (spec 3.1): each object lit with its label in turn, left to right from the standing spot. */
export const TOUR: HotspotName[] = ["hs_crate", "hs_drawer", "hs_monitor", "hs_shelf"];
export const TOUR_STEP_SECONDS = 0.8;
export const TOUR_SECONDS = TOUR.length * TOUR_STEP_SECONDS;

/** The object the tour shows `seconds` after it starts, or null before it and once it's over. */
export function tourAt(seconds: number): HotspotName | null {
  if (!(seconds >= 0)) return null;
  return TOUR[Math.floor(seconds / TOUR_STEP_SECONDS)] ?? null;
}
