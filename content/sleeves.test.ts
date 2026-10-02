import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { work } from "./work";
import { RECORDS } from "@/office/hotspots/registry";
import sleeves from "@/art/sleeves.json";

describe("sleeves (art/sleeves.json)", () => {
  it("has one sleeve per project, in crate order", () => expect(sleeves.map((s) => s.slug)).toEqual(work.map((w) => w.slug)));
  it("fits in the crate", () => expect(sleeves.length).toBeLessThanOrEqual(RECORDS));
  it("points at logo files that exist and are outlined (Blender's SVG import drops live text)", () => {
    for (const s of sleeves) {
      expect(s.logos.length).toBeGreaterThan(0);
      for (const f of s.logos) {
        expect(existsSync(f), f).toBe(true);
        expect(readFileSync(f, "utf8"), f).not.toMatch(/<text[\s>]/);
      }
    }
  });
});
