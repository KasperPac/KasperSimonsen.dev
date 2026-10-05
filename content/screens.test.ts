import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { findWork, work } from "./work";
import { slides } from "./screens";

const inPublic = (src: string) => existsSync(join(process.cwd(), "public", src));

describe("slides", () => {
  it("points only at screenshots that exist, each described", () => {
    for (const s of slides) {
      expect(inPublic(s.shot.src), s.shot.src).toBe(true);
      expect(s.shot.alt.length, s.shot.src).toBeGreaterThan(10);
    }
  });
  it("plays a crate record or opens a page, never both and never neither", () => {
    for (const s of slides) expect(!!s.slug !== !!s.href, s.label).toBe(true);
  });
  it("plays only records that are in the crate, and every crate project has a slide", () => {
    for (const s of slides) if (s.slug) expect(findWork(s.slug), s.slug).toBeDefined();
    for (const w of work) expect(slides.some((s) => s.slug === w.slug), w.slug).toBe(true);
  });
  it("opens the Pac Technologies site in a new tab from the last slide", () => {
    expect(slides.at(-1)?.href).toBe("https://www.pac-technologies.com.au");
  });
  it("runs Pac Hub, Manuva (site, then the app twice), Silio, then the Pac Technologies site", () => {
    expect(slides.map((s) => [s.slug ?? "href", s.label, s.shot.src])).toEqual([
      ["pac-forge", "Pac Hub", "/reel/pac-hub.jpg"],
      ["manuva", "Manuva · site", "/reel/manuva-site.jpg"],
      ["manuva", "Manuva · app", "/reel/manuva-app-bom.jpg"],
      ["manuva", "Manuva · app", "/reel/manuva-app-components.jpg"],
      ["silio", "Silio", "/reel/silio-dashboard.jpg"],
      ["href", "Pac Technologies · site", "/reel/pac-tech-site.jpg"],
    ]);
  });
});
