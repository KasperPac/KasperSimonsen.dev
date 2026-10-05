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
 * Screenshots taken at 2:1 before the monitor went 16:10, shown cropped at the sides until Kasper retakes them. Remove
 * each one as its 16:10 capture arrives; nothing new joins this list.
 */
const KNOWN_2_TO_1 = new Set(["/reel/pac-hub.jpg", "/reel/manuva-app-bom.jpg", "/reel/manuva-app-components.jpg"]);

describe("slides", () => {
  it("points only at screenshots that exist, each described", () => {
    for (const s of slides) {
      expect(inPublic(s.shot.src), s.shot.src).toBe(true);
      expect(s.shot.alt.length, s.shot.src).toBeGreaterThan(10);
    }
  });
  it("fills the monitor's 16:10 screen: every screenshot is 16:10 (1280 x 800), but for the known 2:1 ones", () => {
    for (const s of slides) {
      const [w, h] = imageSize(s.shot.src);
      if (KNOWN_2_TO_1.has(s.shot.src)) continue;
      expect(Math.abs(w / h - 1.6), `${s.shot.src} is ${w} x ${h}`).toBeLessThanOrEqual(0.01);
    }
  });
  it("still has each known 2:1 screenshot at 2:1 (once retaken at 16:10, take it off the list)", () => {
    for (const { shot: { src } } of slides.filter((s) => KNOWN_2_TO_1.has(s.shot.src))) {
      const [w, h] = imageSize(src);
      expect(Math.abs(w / h - 1.6), `${src} is ${w} x ${h}: 16:10 now, so remove it from KNOWN_2_TO_1`).toBeGreaterThan(0.01);
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
  it("opens the Pac Technologies site in a new tab from the last slide", () => {
    expect(slides.at(-1)?.href).toBe("https://www.pac-technologies.com.au");
  });
  it("runs Pac Hub, Manuva (site, then the app twice), Silio, Marianne's Hair, then the Pac Technologies site", () => {
    expect(slides.map((s) => [s.slug ?? (s.href ? "href" : "none"), s.label, s.shot.src])).toEqual([
      ["pac-forge", "Pac Hub", "/reel/pac-hub.jpg"],
      ["manuva", "Manuva · site", "/reel/manuva-site.jpg"],
      ["manuva", "Manuva · bill of materials", "/reel/manuva-app-bom.jpg"],
      ["manuva", "Manuva · components", "/reel/manuva-app-components.jpg"],
      ["silio", "Silio", "/reel/silio-dashboard.jpg"],
      ["none", "Marianne's Hair · site", "/reel/mariannes-hair-site.jpg"],
      ["href", "Pac Technologies · site", "/reel/pac-tech-site.jpg"],
    ]);
  });
});
