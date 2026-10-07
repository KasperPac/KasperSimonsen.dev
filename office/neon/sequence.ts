import { STEPS, TUBES, type TubeId } from "./mark";

/**
 * The neon sign's timeline (neon sign spec 3): off in the walk-in, a stuttering power-up on arrival, then the rope
 * stepping round with the occasional bad tube. Pure: the caller keeps the power state and the time spent in it.
 */
export type NeonPower = "off" | "powering" | "on";

export const STEP_S = 0.2;
export const POWER_UP_S = 0.6;
export const BAD_TUBE_GAP_S = [8, 20] as const;
export const BAD_TUBE_S = 0.3;
const DIP = 0.2; // a dipped tube's brightness

export type NeonFrame = { step: number; brightness: Record<TubeId, number>; hop: number };

export function nextPower(power: NeonPower, inRoom: boolean, t: number, reduced: boolean): NeonPower {
  if (!inRoom) return "off";
  if (power === "off") return reduced ? "on" : "powering";
  if (power === "powering" && (reduced || t >= POWER_UP_S)) return "on";
  return power;
}

/** mulberry32: a small seeded generator, so a seed always gives the same stutter and the same bad tubes. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (r: () => number, lo: number, hi: number) => lo + (hi - lo) * r();

/** Brightness within a window with two dips: [start, length] each, relative to the window. */
function dipped(at: number, dips: readonly (readonly [number, number])[]): number {
  return dips.some(([s, l]) => at >= s && at < s + l) ? DIP : 1;
}

type Dips = readonly (readonly [number, number])[];
type Plan = { on: number; dips: Dips };
type BadKind = "k" | "s" | "head" | "rope";
type BadTube = { at: number; tube: BadKind };

/** Each powered tube's stutter: it comes on at `on`, then dips twice, all done before POWER_UP_S. */
function buildPowerUp(seed: number): [TubeId, Plan][] {
  const r = random(seed ^ 0x9e3779b9);
  const plan = (lo: number, hi: number): Plan => {
    const on = between(r, lo, hi);
    const d1 = on + between(r, 0.04, 0.08);
    const d2 = d1 + between(r, 0.08, 0.12);
    return { on, dips: [[d1, between(r, 0.03, 0.05)], [d2, between(r, 0.03, 0.05)]] };
  };
  // the letters and the head first, then the rope
  return [["k", plan(0, 0.12)], ["s", plan(0, 0.12)], ["head", plan(0.02, 0.14)], ["rope0", plan(0.18, 0.3)]];
}

const KINDS: readonly BadKind[] = ["k", "s", "head", "rope"];

/**
 * What a seed has worked out so far. A seed's bad tubes and power-up plan never change, so they are made once and
 * kept: the events grow as time does, and nothing is regenerated from zero on a frame. `next` is the time of the
 * event after the last one in `events`, already drawn from `rand`, so extending carries on exactly where it stopped.
 */
type SeedCache = { rand: () => number; next: number; events: BadTube[]; powerUp?: [TubeId, Plan][] };
const MAX_SEEDS = 4; // one sign uses one seed; a few more cover a remount or a test
const caches = new Map<number, SeedCache>();
const stats = { events: 0, powerUps: 0 };

function cacheFor(seed: number): SeedCache {
  let c = caches.get(seed);
  if (!c) {
    if (caches.size >= MAX_SEEDS) caches.delete(caches.keys().next().value as number); // the oldest
    const rand = random(seed);
    c = { rand, next: between(rand, ...BAD_TUBE_GAP_S), events: [] };
    caches.set(seed, c);
  }
  return c;
}

/** Generate the seed's events up to `until`, in the same order of draws as always. */
function extend(c: SeedCache, until: number) {
  while (c.next <= until) {
    c.events.push({ at: c.next, tube: KINDS[Math.floor(c.rand() * KINDS.length) % KINDS.length] });
    c.next += between(c.rand, ...BAD_TUBE_GAP_S);
    stats.events++;
  }
}

/** How many of the (sorted) events are at or before `t`. */
function countUpTo(events: BadTube[], t: number): number {
  let lo = 0;
  let hi = events.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (events[mid].at <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function powerUp(seed: number): [TubeId, Plan][] {
  const c = cacheFor(seed);
  if (!c.powerUp) {
    c.powerUp = buildPowerUp(seed);
    stats.powerUps++;
  }
  return c.powerUp;
}

/** Every bad tube at or before `until`, the same list for the same seed. */
export function badTubes(seed: number, until: number): BadTube[] {
  const c = cacheFor(seed);
  extend(c, until);
  return c.events.slice(0, countUpTo(c.events, until));
}

/** For tests only: forget the per-seed caches, and what they have counted. */
export function __resetNeonCaches() {
  caches.clear();
  stats.events = 0;
  stats.powerUps = 0;
}
/** For tests only: how many bad tubes and power-up plans have been generated since the last reset. */
export function __neonCacheStats() {
  return { ...stats, seeds: caches.size };
}

const dark = (): Record<TubeId, number> => Object.fromEntries(TUBES.map((t) => [t, 0])) as Record<TubeId, number>;

export function neonFrame(power: NeonPower, t: number, seed: number, reduced: boolean): NeonFrame {
  const brightness = dark();
  if (power === "off") return { step: 0, brightness, hop: 0 };
  if (reduced) {
    for (const tube of ["k", "s", "head", "rope0"] as const) brightness[tube] = 1;
    return { step: 0, brightness, hop: 0 };
  }
  if (power === "powering") {
    for (const [tube, { on, dips }] of powerUp(seed)) {
      brightness[tube] = t < on ? 0 : dipped(t, dips);
    }
    return { step: 0, brightness, hop: 0 };
  }
  const step = Math.floor(t / STEP_S) % STEPS;
  for (const tube of ["k", "s", "head", `rope${step}`] as TubeId[]) brightness[tube] = 1;
  const c = cacheFor(seed);
  extend(c, t);
  const bad = c.events[countUpTo(c.events, t) - 1];
  if (bad && t < bad.at + BAD_TUBE_S) {
    const r = random(seed ^ Math.floor(bad.at * 1000));
    const d1 = between(r, 0.02, 0.08);
    const d2 = d1 + between(r, 0.1, 0.14);
    const tube: TubeId = bad.tube === "rope" ? (`rope${step}` as TubeId) : bad.tube;
    brightness[tube] = dipped(t - bad.at, [[d1, between(r, 0.03, 0.06)], [d2, between(r, 0.03, 0.06)]]);
  }
  return { step, brightness, hop: step === 3 ? 1 : 0 };
}
