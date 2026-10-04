import type { Object3D } from "three";
import { findWork, work } from "@/content/work";
import { findService, services } from "@/content/services";

export const HOTSPOTS = ["hs_crate", "hs_drawer", "hs_monitor", "hs_shelf"] as const;
export type HotspotName = (typeof HOTSPOTS)[number];

/** What a pointer or a keyboard focus points at: a hotspot, and optionally one piece of its content. */
export type Hit = { hotspot: HotspotName; item: string | null };

/** The Blender camera each hotspot focuses with. `<name>_portrait` is used below a 1:1 aspect when it exists. */
export const FOCUS_CAMERA: Record<HotspotName, string> = {
  hs_crate: "cam_focus_crate",
  hs_drawer: "cam_focus_drawer",
  hs_monitor: "cam_focus_monitor",
  hs_shelf: "cam_focus_shelf",
};

/** Records in the crate and ornaments on the shelf (four, one per service), as modelled (office_props.py). */
export const RECORDS = 9;
export const ORNAMENTS = 4;

const ITEM = /^(hs_crate)__record_(\d\d)$|^(hs_shelf)__ornament_(\d\d)$/;

function isHotspot(name: string): name is HotspotName {
  return (HOTSPOTS as readonly string[]).includes(name);
}

/** Content slug behind a record or ornament index; null for blank sleeves and other hotspots. */
export function itemAt(hotspot: HotspotName, index: number): string | null {
  if (hotspot === "hs_crate") return work[index]?.slug ?? null;
  if (hotspot === "hs_shelf") return services[index]?.slug ?? null;
  return null;
}

/** Node name of the record or ornament carrying `slug`. */
export function itemNode(hotspot: HotspotName, slug: string): string | null {
  const pad = (i: number) => String(i).padStart(2, "0");
  if (hotspot === "hs_crate") {
    const i = work.findIndex((w) => w.slug === slug);
    return i < 0 ? null : `hs_crate__record_${pad(i)}`;
  }
  if (hotspot === "hs_shelf") {
    const i = services.findIndex((s) => s.slug === slug);
    return i < 0 ? null : `hs_shelf__ornament_${pad(i)}`;
  }
  return null;
}

/**
 * What a pointer over `object` means. With nothing focused it is the whole hotspot. Focused on a hotspot,
 * only that hotspot's records or ornaments that carry content count; everything else is null.
 */
export function hitFor(object: Object3D | null, focused: HotspotName | null): Hit | null {
  let item: { hotspot: HotspotName; index: number } | null = null;
  for (let o: Object3D | null = object; o; o = o.parent) {
    const m = ITEM.exec(o.name);
    if (m && !item) item = { hotspot: (m[1] ?? m[3]) as HotspotName, index: Number(m[2] ?? m[4]) };
    if (isHotspot(o.name)) {
      if (focused === null) return { hotspot: o.name, item: null };
      if (focused !== o.name || !item) return null;
      const slug = itemAt(o.name, item.index);
      return slug ? { hotspot: o.name, item: slug } : null;
    }
  }
  return null;
}

/**
 * What the pointer means, given everything under it nearest first. Idle, set dressing in front of a hotspot (the chair
 * before the crate) doesn't hide it. Focused, only the nearest object counts: the records and ornaments are close up.
 */
export function pickHit(objects: Object3D[], focused: HotspotName | null): Hit | null {
  if (focused !== null) return hitFor(objects[0] ?? null, focused);
  for (const o of objects) {
    const hit = hitFor(o, null);
    if (hit) return hit;
  }
  return null;
}

/** Edge-highlight group of a mesh: its record or ornament, else its hotspot, else none. */
export function highlightKey(object: Object3D): string | null {
  for (let o: Object3D | null = object; o; o = o.parent) {
    if (ITEM.test(o.name) || isHotspot(o.name)) return o.name;
  }
  return null;
}

/** Highlight prefix for a hit: the item's node when it has one, else the whole hotspot. */
export function highlightFor(hit: Hit): string {
  return (hit.item && itemNode(hit.hotspot, hit.item)) || hit.hotspot;
}

export function sameHit(a: Hit | null, b: Hit | null): boolean {
  return a === b || (!!a && !!b && a.hotspot === b.hotspot && a.item === b.item);
}

/** Text for the hover label: the content's own name for an item, else the hotspot's label. */
export function labelFor(hit: Hit, labels: Record<HotspotName, string>): string {
  if (hit.item && hit.hotspot === "hs_crate") return findWork(hit.item)?.name ?? labels.hs_crate;
  if (hit.item && hit.hotspot === "hs_shelf") return findService(hit.item)?.name ?? labels.hs_shelf;
  return labels[hit.hotspot];
}
