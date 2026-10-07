/**
 * The KS mark as neon tubes (neon sign spec 6): concept 6, the block KS with a dot for a head and a skipping rope, in
 * its 240-unit design grid with y down, as the logo prototypes drew it. This is the one place its letterforms live:
 * the finished drawing replaces K, S and HEAD here, and the site's logo can read them later.
 */
export type Pt = readonly [number, number];
export type Polyline = Pt[];

const closed = (pts: Pt[]): Polyline => [...pts, pts[0]];

export const K: Polyline = closed([
  [66, 116], [86, 116], [86, 140], [106, 116], [128, 116], [102, 146], [128, 182], [105, 182], [88, 158], [86, 160], [86, 182], [66, 182],
]);
export const S: Polyline = closed([
  [132, 116], [182, 116], [182, 134], [150, 134], [150, 140], [182, 140], [182, 182], [132, 182], [132, 164], [164, 164], [164, 158], [132, 158],
]);
export const HEAD = { cx: 129, cy: 98, r: 8 } as const;
/** Where the rope is held: it turns about the line through these. */
export const HANDS = { left: [56, 132] as Pt, right: [192, 132] as Pt };
/** The rope's Bézier control offset from the hands' line: overhead it clears the head by about a stroke. */
export const ROPE_OFFSET = 72;
export const STEPS = 6;
/** The square the sign's size maps to: 160 units = the anchor's 0.85 m. */
export const BOX = { min: 44, max: 204 } as const;
/** How far the letters and the head hop as the rope passes under, in mark units (~3 cm at 0.85 m). */
export const HOP = 6;

export function headRing(segments = 32): Polyline {
  return closed(Array.from({ length: segments }, (_, i) => {
    const a = (i / segments) * Math.PI * 2;
    return [HEAD.cx + HEAD.r * Math.cos(a), HEAD.cy + HEAD.r * Math.sin(a)] as Pt;
  }));
}

/**
 * The rope at `step` of STEPS, as seen from the front: theta = step x 60 degrees about the hands' line, 0 overhead, 180
 * under the feet. Its middle sits at hands height - ROPE_OFFSET cos(theta), as a cubic from hand to hand.
 */
export function rope(step: number, samples = 96): Polyline {
  const theta = ((((step % STEPS) + STEPS) % STEPS) * 2 * Math.PI) / STEPS;
  const [lx, hy] = HANDS.left;
  const [rx] = HANDS.right;
  const cy = hy - ROPE_OFFSET * Math.cos(theta);
  return Array.from({ length: samples + 1 }, (_, i) => {
    const t = i / samples;
    const a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t ** 2, d = t ** 3;
    return [a * lx + b * lx + c * rx + d * rx, a * hy + b * cy + c * cy + d * hy] as Pt;
  });
}

/** In front of the letters on the way down (60, 120 degrees); everywhere else it goes round behind them. */
export function ropeSide(step: number): "front" | "back" {
  return Math.sin(((step % STEPS) * 2 * Math.PI) / STEPS) > 0.25 ? "front" : "back";
}

/** Even-odd point in polygon (closed polyline). */
export function inside([x, y]: Pt, poly: Polyline): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** The runs of `line` (two points or more) whose points lie outside every shape. */
export function clipOutside(line: Polyline, shapes: Polyline[]): Polyline[] {
  const runs: Polyline[] = [];
  let run: Polyline = [];
  for (const p of line) {
    if (shapes.some((s) => inside(p, s))) {
      if (run.length >= 2) runs.push(run);
      run = [];
    } else run.push(p);
  }
  if (run.length >= 2) runs.push(run);
  return runs;
}

export type TubeId = "k" | "s" | "head" | "rope0" | "rope1" | "rope2" | "rope3" | "rope4" | "rope5";
export const TUBES: readonly TubeId[] = ["k", "s", "head", "rope0", "rope1", "rope2", "rope3", "rope4", "rope5"];

/**
 * What a tube draws. A rope behind the letters is cut where they'd hide it. The under-the-feet rope is cut against the
 * letters as they are mid-hop, HOP higher. A front rope stays whole: the sign cuts a gap in the letters instead (sign.ts).
 */
export function tubeLines(tube: TubeId): Polyline[] {
  if (tube === "k") return [K];
  if (tube === "s") return [S];
  if (tube === "head") return [headRing()];
  const step = Number(tube.slice(4));
  if (ropeSide(step) === "front") return [rope(step)];
  const lift = step === 3 ? HOP : 0;
  const up = (s: Polyline): Polyline => s.map(([x, y]) => [x, y - lift] as Pt);
  return clipOutside(rope(step), [up(K), up(S), up(headRing())]);
}
