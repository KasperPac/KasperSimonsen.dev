import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { work } from "./work";
import CaseStudyContent from "@/app/(main)/work/[slug]/content/case-study";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");

// /work/[slug] has a long-form page of its own for the first three projects and falls back to this for the rest, so a new
// crate record never shows another project's write-up.
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
