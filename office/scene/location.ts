import { isTopic, type Topic } from "@/content/contact";
import { ALL_HOTSPOTS, type Hit, type HotspotName } from "../hotspots/registry";
import { targetForPath } from "./targets";

/**
 * What the office keeps in history.state on top of the URL: a local object in focus, whether the panel is open, and
 * whether the contact form is open over it for an engagement model's topic.
 */
export type Layer = { focus: HotspotName | null; reading: boolean; topic: Topic | null };

export const NO_LAYER: Layer = { focus: null, reading: false, topic: null };

/** history.state key. Next.js copies its own keys in alongside it when we push (see history.ts). */
export const LAYER_KEY = "office";

/** The office layer in a history.state value; anything unexpected is no layer, and a topic counts only over an open panel. */
export function layerOf(state: unknown): Layer {
  const raw = (state as Record<string, unknown> | null | undefined)?.[LAYER_KEY] as Partial<Layer> | undefined;
  if (!raw || typeof raw !== "object") return NO_LAYER;
  const focus = typeof raw.focus === "string" && (ALL_HOTSPOTS as readonly string[]).includes(raw.focus) ? (raw.focus as HotspotName) : null;
  if (focus === null) return NO_LAYER; // the shared object: clearLayer checks identity
  const reading = raw.reading === true;
  return { focus, reading, topic: reading && isTopic(raw.topic) ? raw.topic : null };
}

/** What a location asks the scene to show: the path's target when it routes, else the local layer's object; the panel (and a form over it) only over something. */
export function sceneFor(pathname: string, layer: Layer): { target: Hit | null; reading: boolean; topic: Topic | null } {
  const routed = targetForPath(pathname);
  const target = routed ?? (layer.focus ? { hotspot: layer.focus, item: null } : null);
  if (!target) return { target: null, reading: false, topic: null };
  return { target, reading: layer.reading, topic: layer.reading ? layer.topic : null };
}
