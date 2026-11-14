import { useSyncExternalStore } from "react";
import { getTheme, setTheme } from "../themeState";
import { FLICKER_S, type LightPower } from "./sequence";

/**
 * The office light: the switch and the bulb. On is light mode, off is dark mode. Switching on takes a flicker, and
 * the office changes theme when it ends; switching off, or switching on with reduced motion, changes straight away.
 * The theme (themeState.ts) stays the source of truth for the look and for what is remembered; this holds the
 * flicker in between. Timing is by the clock, not the frame loop, so it finishes even if frames are slow or stopped.
 */
let power: LightPower | null = null;
let startedAt = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

/** Off or on to begin with, from the theme the page opened in; dark on the server. */
export function getLight(): LightPower {
  if (power) return power;
  if (typeof window === "undefined") return "off";
  power = getTheme() === "light" ? "on" : "off";
  return power;
}

/** Milliseconds since the flicker began (0 when not flickering). */
export function flickerElapsedMs(now = performance.now()): number {
  return getLight() === "flickering" ? Math.max(0, now - startedAt) : 0;
}

function finish(): void {
  timer = null;
  if (power !== "flickering") return;
  power = "on";
  setTheme("light");
  emit();
}

/** The switch or the bulb was used. A press during the flicker is ignored. */
export function toggleLight(reduced: boolean, now = performance.now()): void {
  const was = getLight();
  if (was === "flickering") return;
  if (was === "on") {
    power = "off";
    setTheme("dark");
  } else if (reduced) {
    power = "on";
    setTheme("light");
  } else {
    power = "flickering";
    startedAt = now;
    timer = setTimeout(finish, FLICKER_S * 1000);
  }
  emit();
}

export function subscribeLight(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLight(): LightPower {
  return useSyncExternalStore(subscribeLight, getLight, () => "off");
}

/** Forgets the light (tests). */
export function resetLightState(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  power = null;
  startedAt = 0;
  listeners.clear();
}
