import { HOTSPOTS, type HotspotName } from "../hotspots/registry";

/** How long an object stays lit in its colour when it glints. */
export const GLINT_SECONDS = 1.1;
/** The wait between glints, in seconds: anywhere in this range, so they come now and then rather than on a beat. */
export const GLINT_GAP_SECONDS = [2.4, 4.4] as const;

/** The next object to glint, for a random number in [0, 1): any object but the one that just did. */
export function nextGlint(last: HotspotName | null, random: number): HotspotName {
  const pool = HOTSPOTS.filter((h) => h !== last);
  return pool[Math.min(pool.length - 1, Math.floor(random * pool.length))];
}

/** The wait before the next glint, for a random number in [0, 1). */
export function glintGap(random: number): number {
  const [min, max] = GLINT_GAP_SECONDS;
  return min + (max - min) * random;
}
