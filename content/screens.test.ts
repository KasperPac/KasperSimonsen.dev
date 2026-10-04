import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { work } from "./work";
import { screenFor } from "./screens";

const inPublic = (src: string) => existsSync(join(process.cwd(), "public", src));

describe("screens", () => {
  it("gives every crate project a screenshot or a logo for its card", () => {
    for (const w of work) {
      const s = screenFor(w.slug);
      expect(s.shot || s.logo, w.slug).toBeTruthy();
    }
  });
  it("points only at files that exist, each screenshot described", () => {
    for (const w of work) {
      const s = screenFor(w.slug);
      if (s.shot) {
        expect(inPublic(s.shot.src), s.shot.src).toBe(true);
        expect(s.shot.alt.length).toBeGreaterThan(10);
      }
      if (s.logo) expect(inPublic(s.logo), s.logo).toBe(true);
    }
  });
  it("shows Manuva's and Silio's real screens, and Pac-Hub's logo until Kasper sends screenshots", () => {
    expect(screenFor("manuva").shot?.src).toBe("/v2/manuva-live.jpg");
    expect(screenFor("silio").shot?.src).toBe("/silio-dashboard.png");
    expect(screenFor("pac-forge").shot).toBeUndefined();
    expect(screenFor("pac-forge").logo).toBe("/PacTechnologiesEdit_White.png");
  });
  it("has nothing for an unknown slug", () => expect(screenFor("nope")).toEqual({}));
});
