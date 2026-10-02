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
    ["/services/tools-and-dashboards", { hotspot: "hs_shelf", item: "tools-and-dashboards" }],
    ["/services/nope", null],
    ["/services/tools-and-dashboards/extra", null],
    ["/admin", null],
  ])("%s", (path, target) => expect(targetForPath(path)).toEqual(target));
});

describe("pathForTarget", () => {
  it("routes the drawer, a record and an ornament", () => {
    expect(pathForTarget({ hotspot: "hs_drawer", item: null })).toBe("/contact");
    expect(pathForTarget({ hotspot: "hs_crate", item: "silio" })).toBe("/work/silio");
    expect(pathForTarget({ hotspot: "hs_shelf", item: "platforms-and-systems" })).toBe("/services/platforms-and-systems");
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
