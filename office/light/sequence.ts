/**
 * The bulb's timeline when the switch goes on: a stutter of short bursts, each dimmer than full, then steady on.
 * Pure: the caller keeps the time since the switch went. Off and on are steady (0 and 1); only `flickering` moves.
 */
export type LightPower = "off" | "flickering" | "on";

/** Seconds from the switch going on to the bulb staying on. */
export const FLICKER_S = 0.9;
/** The last stretch of the flicker is steady full light, so the stutter ends before the office changes. */
export const STEADY_S = 0.2;
/** Brightness between bursts: the filament still glows faintly. */
const DARK = 0.04;

export type Burst = { at: number; length: number; level: number };

/** mulberry32: a small seeded generator, so a seed always gives the same stutter. */
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

/** Three or four bursts, in order, none overlapping, all done before the steady stretch at the end. */
export function bursts(seed: number): Burst[] {
  const r = random(seed ^ 0x1f123bb5);
  const count = 3 + Math.floor(r() * 2);
  const out: Burst[] = [];
  let at = between(r, 0.05, 0.12);
  for (let i = 0; i < count; i++) {
    const room = FLICKER_S - STEADY_S - at;
    if (room <= 0.04) break;
    const length = Math.min(between(r, 0.04, 0.12), room);
    out.push({ at, length, level: between(r, 0.5, 1) });
    at += length + between(r, 0.04, 0.12);
  }
  return out;
}

/** The bulb's brightness, 0 to 1. `t` is the seconds since the switch went on (only read while flickering). */
export function lightBrightness(power: LightPower, t: number, seed: number, reduced: boolean): number {
  if (power === "off") return 0;
  if (power === "on" || reduced || t >= FLICKER_S - STEADY_S) return 1;
  if (t < 0) return DARK;
  const burst = bursts(seed).find((b) => t >= b.at && t < b.at + b.length);
  return burst ? burst.level : DARK;
}
