import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { work } from "./work";
import CaseStudyContent from "@/app/(main)/work/[slug]/content/case-study";
import { contentBySlug, contentFor } from "@/app/(main)/work/[slug]/content/by-slug";
import PacForgeContent from "@/app/(main)/work/[slug]/content/pac-forge";
import ManuvaContent from "@/app/(main)/work/[slug]/content/manuva";
import SilioContent from "@/app/(main)/work/[slug]/content/silio";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");

// /work/[slug] has a long-form page of its own for Pac Hub (pac-forge), Manuva and Silio, and falls back to the project's
// case study for the rest, so a crate record never shows another project's write-up (it once fell back to Forja's).
describe("the body of /work/[slug]", () => {
  it("is the hand-written page for pac-forge, manuva and silio", () => {
    expect(contentFor("pac-forge").type).toBe(PacForgeContent);
    expect(contentFor("manuva").type).toBe(ManuvaContent);
    expect(contentFor("silio").type).toBe(SilioContent);
  });
  it("falls through to the generic case study, for that slug, for every other crate project", () => {
    for (const w of work.filter((x) => !(x.slug in contentBySlug))) {
      const el = contentFor(w.slug);
      expect(el.type, w.slug).toBe(CaseStudyContent);
      expect(el.props, w.slug).toEqual({ slug: w.slug });
    }
    expect(work.filter((x) => !(x.slug in contentBySlug)).map((x) => x.slug)).toEqual(["mariannes-hair", "pac-technologies"]);
  });
});

describe("the generic case-study body", () => {
  for (const slug of ["mariannes-hair", "pac-technologies"]) {
    it(`${slug}: prints its own intro and every section, and nothing of another project`, () => {
      const w = work.find((x) => x.slug === slug)!;
      const out = renderToStaticMarkup(createElement(CaseStudyContent, { slug }));
      for (const p of w.intro) expect(out).toContain(esc(p));
      for (const s of w.sections) {
        expect(out).toContain(esc(s.title));
        for (const p of s.paras) expect(out).toContain(esc(p));
      }
      expect(out).not.toMatch(/Forja|Pac-Audit|Tencia|Shopify/);
    });
  }
  it("prints nothing for a slug with no case study", () => expect(renderToStaticMarkup(createElement(CaseStudyContent, { slug: "nope" }))).toBe(""));
});

describe("the logos", () => {
  // The work pages print every logo through brightness(0) invert(1), which turns anything filled to white: a mark on a filled box is a white box.
  it("Marianne's Hair's mark is the mark alone, on no background", () => {
    const svg = readFileSync(join(process.cwd(), "public", "mariannes-hair-mark.svg"), "utf8");
    expect(svg).not.toMatch(/<rect[\s>]/);
    expect(svg).toMatch(/<path /);
  });
});
