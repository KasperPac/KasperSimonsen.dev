import { useSyncExternalStore } from "react";
import { LAYER_KEY, layerOf, NO_LAYER, type Layer } from "./scene/location";

const CHANGE = "office:history";

/**
 * Adds a history entry for `layer` at `path` (default: the current path). Only our key goes in: Next.js's patched
 * pushState copies its own state in, and skips syncing its router when the object already carries `__NA`.
 */
export function pushLayer(layer: Layer, path?: string): void {
  window.history.pushState({ [LAYER_KEY]: layer }, "", path ?? window.location.pathname);
  window.dispatchEvent(new Event(CHANGE));
}

/** Swaps what the live entry shows for `layer` at `path`, adding no entry: picking another ornament while one is out. */
export function replaceLayer(layer: Layer, path?: string): void {
  window.history.replaceState({ [LAYER_KEY]: layer }, "", path ?? window.location.pathname);
  window.dispatchEvent(new Event(CHANGE));
}

/** A reload keeps history.state, so a fresh office drops any layer it finds. */
export function clearLayer(): void {
  if (layerOf(window.history.state) === NO_LAYER) return;
  window.history.replaceState({ [LAYER_KEY]: NO_LAYER }, "", window.location.pathname);
  window.dispatchEvent(new Event(CHANGE));
}

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

const SERVER = `/|${JSON.stringify(NO_LAYER)}`;
const snapshot = () => `${window.location.pathname}|${JSON.stringify(layerOf(window.history.state))}`;

/** Path + layer, re-rendering on every history change (Back, Forward, our pushes). */
export function useOfficeLocation(): { pathname: string; layer: Layer } {
  const key = useSyncExternalStore(subscribe, snapshot, () => SERVER);
  const bar = key.indexOf("|");
  return { pathname: key.slice(0, bar), layer: JSON.parse(key.slice(bar + 1)) as Layer };
}
