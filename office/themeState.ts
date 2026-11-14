import { useSyncExternalStore } from "react";
import { palettes, type Palette, type ThemeMode } from "./theme";

/** localStorage key for the visitor's choice. */
export const THEME_KEY = "office-theme";

/** Dark unless the system says light. */
export function systemTheme(prefersLight: boolean): ThemeMode {
  return prefersLight ? "light" : "dark";
}

function isMode(value: unknown): value is ThemeMode {
  return value === "dark" || value === "light";
}

/** A stored choice wins; anything else in storage (missing, edited, old) is ignored and the system's setting is used. */
export function resolveTheme(stored: string | null, prefersLight: boolean): ThemeMode {
  return isMode(stored) ? stored : systemTheme(prefersLight);
}

function readStored(): string | null {
  try {
    return window.localStorage.getItem(THEME_KEY);
  } catch {
    return null; // storage blocked (private mode, policy): follow the system for this visit
  }
}

/**
 * Runs in the page head before first paint (layout.tsx), so the right theme is on <html> before anything is drawn.
 * It acts only on /office; elsewhere nothing is set and the pages stay dark. Self-contained, so keep it in step with
 * `resolveTheme`. The values are the key and the two modes.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=location.pathname;if(p!=="/office"&&p!=="/office/")return;var m=null;try{m=localStorage.getItem(${JSON.stringify(THEME_KEY)})}catch(e){}if(m!=="dark"&&m!=="light")m=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=m}catch(e){}})()`;

let current: ThemeMode | null = null;
const listeners = new Set<() => void>();

function applyToPage(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode;
}

/**
 * Puts the theme on <html> while the office is on screen, and takes it off when the visitor leaves for another page
 * (the layout is shared, so a client-side navigation would otherwise carry light mode with it). Returns the undo.
 */
export function showThemeOnPage(): () => void {
  applyToPage(getTheme());
  return () => {
    delete document.documentElement.dataset.theme;
  };
}

/** The theme now: the one the head script put on <html>, else the stored or system choice. Dark on the server. */
export function getTheme(): ThemeMode {
  if (current) return current;
  if (typeof window === "undefined") return "dark";
  const onPage = document.documentElement.dataset.theme;
  current = isMode(onPage) ? onPage : resolveTheme(readStored(), window.matchMedia("(prefers-color-scheme: light)").matches);
  return current;
}

/** Sets and remembers the visitor's choice; every consumer follows. */
export function setTheme(mode: ThemeMode): void {
  current = mode;
  try {
    window.localStorage.setItem(THEME_KEY, mode);
  } catch {
    // the choice holds for this visit only
  }
  applyToPage(mode);
  listeners.forEach((l) => l());
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Forgets the cached theme (tests). */
export function resetThemeState(): void {
  current = null;
  listeners.clear();
}

export function useTheme(): ThemeMode {
  return useSyncExternalStore(subscribeTheme, getTheme, () => "dark");
}

export function usePalette(): Palette {
  return palettes[useTheme()];
}
