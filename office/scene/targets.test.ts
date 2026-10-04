import { describe, it, expect } from "vitest";
import { work } from "@/content/work";
import { services } from "@/content/services";
import { pathForTarget, targetForPath } from "./targets";

describe("targetForPath", () => {
  it.each([
    ["/", null],
    ["/contact", { hotspot: "hs_drawer", item: null }],
    ["/contact/", { hotspot: "hs_drawer", item: null }],
    ["/work/manuva", { hotspot: "hs_crate", item: "manuva" }],
    ["/work/nope", null],
    ["/work", null],
    ["/services/websites", { hotspot: "hs_shelf", item: "websites" }],
    ["/services/apps", { hotspot: "hs_shelf", item: "apps" }],
    ["/services/nope", null],
    ["/services/websites/extra", null],
    ["/services/tools-and-dashboards", null],
    ["/admin", null],
  ])("%s", (path, target) => expect(targetForPath(path)).toEqual(target));
});

describe("pathForTarget", () => {
  it("routes the drawer, a record and an ornament", () => {
    expect(pathForTarget({ hotspot: "hs_drawer", item: null })).toBe("/contact");
    expect(pathForTarget({ hotspot: "hs_crate", item: "silio" })).toBe("/work/silio");
    expect(pathForTarget({ hotspot: "hs_shelf", item: "websites" })).toBe("/services/websites");
  });
  it("keeps browsing and the monitor local (no URL)", () => {
    expect(pathForTarget({ hotspot: "hs_crate", item: null })).toBeNull();
    expect(pathForTarget({ hotspot: "hs_shelf", item: null })).toBeNull();
    expect(pathForTarget({ hotspot: "hs_monitor", item: null })).toBeNull();
  });
  it("round-trips every piece of content", () => {
    for (const w of work) expect(targetForPath(pathForTarget({ hotspot: "hs_crate", item: w.slug })!)).toEqual({ hotspot: "hs_crate", item: w.slug });
    for (const s of services) expect(targetForPath(pathForTarget({ hotspot: "hs_shelf", item: s.slug })!)).toEqual({ hotspot: "hs_shelf", item: s.slug });
  });
});
