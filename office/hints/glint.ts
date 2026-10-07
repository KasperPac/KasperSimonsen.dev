import { HOTSPOTS, type SignpostName } from "../hotspots/registry";

/** How long an object stays lit in its colour when it glints. */
export const GLINT_SECONDS = 1.1;
/** The wait between glints, in seconds: anywhere in this range, so they come now and then rather than on a beat. */
export const GLINT_GAP_SECONDS = [2.4, 4.4] as const;

/** The next object to glint, for a random number in [0, 1): one of `among` (all of them by default), not the last if it can. */
export function nextGlint(last: SignpostName | null, random: number, among: readonly SignpostName[] = HOTSPOTS): SignpostName {
  const others = among.filter((h) => h !== last);
  const pool = others.length ? others : among;
  return pool[Math.min(pool.length - 1, Math.floor(random * pool.length))];
}

/** The wait before the next glint, for a random number in [0, 1). */
export function glintGap(random: number): number {
  const [min, max] = GLINT_GAP_SECONDS;
  return min + (max - min) * random;
}
