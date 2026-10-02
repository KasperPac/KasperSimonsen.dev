import { HOTSPOTS, type Hit, type HotspotName } from "../hotspots/registry";
import { targetForPath } from "./targets";

/** What the office keeps in history.state on top of the URL: a local object in focus, and whether the panel is open. */
export type Layer = { focus: HotspotName | null; reading: boolean };

export const NO_LAYER: Layer = { focus: null, reading: false };

/** history.state key. Next.js copies its own keys in alongside it when we push (see history.ts). */
export const LAYER_KEY = "office";

/** The office layer in a history.state value; anything unexpected is no layer. */
export function layerOf(state: unknown): Layer {
  const raw = (state as Record<string, unknown> | null | undefined)?.[LAYER_KEY] as Partial<Layer> | undefined;
  if (!raw || typeof raw !== "object") return NO_LAYER;
  const focus = typeof raw.focus === "string" && (HOTSPOTS as readonly string[]).includes(raw.focus) ? (raw.focus as HotspotName) : null;
  if (focus === null) return NO_LAYER; // the shared object: clearLayer checks identity
  return { focus, reading: raw.reading === true };
}

/** What a location asks the scene to show: the path's target when it routes, else the local layer's object; the panel only over something. */
export function sceneFor(pathname: string, layer: Layer): { target: Hit | null; reading: boolean } {
  const routed = targetForPath(pathname);
  if (routed) return { target: routed, reading: layer.reading };
  if (layer.focus) return { target: { hotspot: layer.focus, item: null }, reading: layer.reading };
  return { target: null, reading: false };
}
