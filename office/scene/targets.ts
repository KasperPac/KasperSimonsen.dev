import { findWork } from "@/content/work";
import { findService } from "@/content/services";
import type { Hit } from "../hotspots/registry";

/** What a URL asks the scene to show; null means the standing spot. Unknown slugs are null (the page 404s). */
export function targetForPath(pathname: string): Hit | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 1 && parts[0] === "contact") return { hotspot: "hs_drawer", item: null };
  if (parts.length === 2 && parts[0] === "work" && findWork(parts[1])) return { hotspot: "hs_crate", item: parts[1] };
  if (parts.length === 2 && parts[0] === "services" && findService(parts[1])) return { hotspot: "hs_shelf", item: parts[1] };
  return null;
}

/** The URL for a target, or null for the local-only states: browsing the crate or the shelf, and the monitor. */
export function pathForTarget(target: Hit): string | null {
  if (target.hotspot === "hs_drawer") return "/contact";
  if (target.hotspot === "hs_crate" && target.item) return `/work/${target.item}`;
  if (target.hotspot === "hs_shelf" && target.item) return `/services/${target.item}`;
  return null;
}
