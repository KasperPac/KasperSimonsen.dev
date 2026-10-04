/** Walk-in progress below which the visitor is still on the street, where the arrival cue shows. */
export const STREET_UNTIL = 0.02;

/** The most one frame moves the walk on: a hitch (a slow device, a shader compiling) pauses it rather than leaping ahead. */
export const MAX_FRAME_SECONDS = 0.1;

/** Keys that scroll the page, and Escape: pressing one mid-walk hands control back. */
const TAKEOVER_KEYS = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " ", "Escape"]);
/** Inputs that can mean the visitor wants to steer the walk themselves. */
const TAKEOVER_EVENTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

export function onStreet(progress: number): boolean {
  return progress < STREET_UNTIL;
}

/** How long walking `distance` of a page `range` long takes, when the whole of it takes `seconds`. */
export function walkSeconds(distance: number, range: number, seconds: number): number {
  if (distance <= 0 || range <= 0) return 0;
  return seconds * Math.min(1, distance / range);
}

/** Where the page is `t` seconds into a walk from `from` to `to`: eased in off the street and out into the office. */
export function walkAt(t: number, from: number, to: number, duration: number): number {
  if (duration <= 0 || t >= duration) return to;
  if (t <= 0) return from;
  return from + (to - from) * (1 - Math.cos((Math.PI * t) / duration)) / 2;
}

/** How far a frame `dt` seconds long moves the walk on. */
export function walkStep(dt: number): number {
  return Math.min(MAX_FRAME_SECONDS, Math.max(0, dt));
}

/** Does this input mean the visitor wants to steer? Never the walk's own scrolling. */
export function takesOver(type: string, key?: string): boolean {
  if (type === "keydown") return key !== undefined && TAKEOVER_KEYS.has(key);
  return (TAKEOVER_EVENTS as readonly string[]).includes(type);
}

/**
 * Scrolls the page to the bottom for the visitor, so the scroll-scrubbed walk-in plays exactly as if they'd scrolled
 * it (and scrolling back up still reverses it). The whole walk takes `seconds`. A wheel, touch, click or scrolling key
 * stops it where it is. `onEnd` runs once, however it ends; the returned function ends it early.
 */
export function startAutoWalk(seconds: number, onEnd: () => void): () => void {
  const from = window.scrollY;
  const to = document.documentElement.scrollHeight - window.innerHeight;
  const duration = walkSeconds(to - from, to, seconds);
  let frame = 0;
  let last: number | null = null;
  let t = 0;
  let ended = false;

  const end = () => {
    if (ended) return;
    ended = true;
    cancelAnimationFrame(frame);
    for (const type of TAKEOVER_EVENTS) window.removeEventListener(type, onInput, true);
    onEnd();
  };
  const onInput = (e: Event) => {
    if (takesOver(e.type, (e as KeyboardEvent).key)) end();
  };
  const step = (now: number) => {
    t += last === null ? 0 : walkStep((now - last) / 1000);
    last = now;
    window.scrollTo({ top: walkAt(t, from, to, duration), behavior: "instant" });
    if (t >= duration) end();
    else frame = requestAnimationFrame(step);
  };

  for (const type of TAKEOVER_EVENTS) window.addEventListener(type, onInput, { capture: true, passive: true });
  frame = requestAnimationFrame(step);
  return end;
}
