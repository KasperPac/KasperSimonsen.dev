import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findWork, work } from "./work";
import { slides } from "./screens";

const inPublic = (src: string) => existsSync(join(process.cwd(), "public", src));

/** An image's width and height from its header: a PNG's IHDR, or a JPEG's start-of-frame segment. */
function imageSize(src: string): [number, number] {
  const b = readFileSync(join(process.cwd(), "public", src));
  if (b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b[0] !== 0xff || b[1] !== 0xd8) throw new Error(`${src}: neither a PNG nor a JPEG`);
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) throw new Error(`${src}: lost the JPEG's segments at byte ${i}`);
    const marker = b[i + 1];
    if (marker === 0xff) {
      i++; // padding
      continue;
    }
    // SOF0-SOF15, except DHT (c4), JPG (c8) and DAC (cc): height then width, after the length and the precision
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error(`${src}: no JPEG frame header`);
}

/**
 * Screenshots taken before the monitor went 16:9, shown cropped (the 2:1 ones at the sides, the 16:10 one top and bottom)
 * until Kasper sends full-screen captures. Remove each one as its 16:9 capture arrives; nothing new joins this list.
 */
const KNOWN_NOT_16_9 = new Set(["/reel/pac-hub.jpg", "/reel/manuva-app-bom.jpg", "/reel/manuva-app-components.jpg", "/reel/silio-dashboard.jpg"]);
const RATIO = 16 / 9;

describe("slides", () => {
  it("points only at screenshots that exist, each described", () => {
    for (const s of slides) {
      expect(inPublic(s.shot.src), s.shot.src).toBe(true);
      expect(s.shot.alt.length, s.shot.src).toBeGreaterThan(10);
    }
  });
  it("fills the monitor's 16:9 screen: every screenshot is 16:9 (1280 x 720), but for the known others", () => {
    for (const s of slides) {
      const [w, h] = imageSize(s.shot.src);
      if (KNOWN_NOT_16_9.has(s.shot.src)) continue;
      expect(Math.abs(w / h - RATIO), `${s.shot.src} is ${w} x ${h}`).toBeLessThanOrEqual(0.01);
    }
  });
  it("still has each known exception off 16:9 (once retaken at 16:9, take it off the list)", () => {
    for (const { shot: { src } } of slides.filter((s) => KNOWN_NOT_16_9.has(s.shot.src))) {
      const [w, h] = imageSize(src);
      expect(Math.abs(w / h - RATIO), `${src} is ${w} x ${h}: 16:9 now, so remove it from KNOWN_NOT_16_9`).toBeGreaterThan(0.01);
    }
  });
  it("plays a crate record, or has its own line (and maybe a page to open), never both", () => {
    for (const s of slides) {
      expect(!!s.slug !== !!s.line, s.label).toBe(true);
      if (s.slug) expect(s.href, s.label).toBeUndefined();
    }
  });
  it("plays only records that are in the crate, and every crate project has a slide", () => {
    for (const s of slides) if (s.slug) expect(findWork(s.slug), s.slug).toBeDefined();
    for (const w of work) expect(slides.some((s) => s.slug === w.slug), w.slug).toBe(true);
  });
  it("plays Marianne's Hair and Pac Technologies from the crate: their headline comes from the record, and there's no page or line of their own", () => {
    for (const slug of ["mariannes-hair", "pac-technologies"]) {
      const s = slides.find((x) => x.slug === slug)!;
      expect(s, slug).toBeDefined();
      expect(s.href, slug).toBeUndefined();
      expect(s.line, slug).toBeUndefined();
    }
    expect(slides.at(-1)?.slug).toBe("pac-technologies");
  });
  it("runs Pac Hub, Manuva (site, then the app twice), Silio, Marianne's Hair, then the Pac Technologies site", () => {
    expect(slides.map((s) => [s.slug ?? (s.href ? "href" : "none"), s.label, s.shot.src])).toEqual([
      ["pac-forge", "Pac Hub", "/reel/pac-hub.jpg"],
      ["manuva", "Manuva · site", "/reel/manuva-site.jpg"],
      ["manuva", "Manuva · bill of materials", "/reel/manuva-app-bom.jpg"],
      ["manuva", "Manuva · components", "/reel/manuva-app-components.jpg"],
      ["silio", "Silio", "/reel/silio-dashboard.jpg"],
      ["mariannes-hair", "Marianne's Hair · site", "/reel/mariannes-hair-site.jpg"],
      ["pac-technologies", "Pac Technologies · site", "/reel/pac-tech-site.jpg"],
    ]);
  });
});
