import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Slide } from "@/content/screens";
import { findWork } from "@/content/work";
import { COPY } from "@/office/copy";

/**
 * Every slide plays a crate record now, so reel.test.ts skips its paths for work outside the crate. The type still allows
 * them (a `line`, and an `href` to open or no button at all), so they're covered here with constructed slides.
 */
const shot = { src: "/reel/x.jpg", alt: "A screenshot of a site, described" };
const slides: Slide[] = [
  { slug: "manuva", label: "Crate slide", shot },
  { href: "https://example.com/page", label: "Live page", line: "A page of its own.", shot },
  { label: "Not live yet", line: "Nearly ready to open.", shot },
];

vi.mock("@/content/screens", () => ({ slides }));
// vi.mock is hoisted above the const; the factory runs on first import, after it's defined (dynamic imports below).
const { default: ReelControls, headlineFor } = await import("./ReelControls");

const hold = { onPointerEnter: () => {}, onPointerLeave: () => {}, onFocus: () => {}, onBlur: () => {} };
const controls = (i: number) =>
  renderToStaticMarkup(
    createElement(ReelControls, { titleId: "r", view: { monitor: i, moving: null, words: i }, hold, onStep: () => {}, onShow: () => {}, onPlay: () => {}, place: "laptop" }),
  );
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");

describe("ReelControls for work outside the crate", () => {
  it("a crate slide gives its record's headline and See the case study", () => {
    const out = controls(0);
    expect(out).toContain(esc(findWork("manuva")!.headline));
    expect(out).toContain(`>${esc(COPY.reel.caseStudy)}<`);
    expect(out).not.toContain(`>${esc(COPY.reel.visit)}<`);
  });
  it("a live page not in the crate gives its own line and Visit the site", () => {
    const out = controls(1);
    expect(out).toContain("A page of its own.");
    expect(out).toContain(`>${esc(COPY.reel.visit)}<`);
    expect(out).not.toContain(`>${esc(COPY.reel.caseStudy)}<`);
  });
  it("a site not live yet gives its own line and no button at all", () => {
    const out = controls(2);
    expect(out).toContain("Nearly ready to open.");
    expect(out).not.toContain("office-card-cta");
  });
  it("headlineFor: the record's headline for a crate slide, the slide's own line otherwise", () => {
    expect(headlineFor(slides[0])).toBe(findWork("manuva")!.headline);
    expect(headlineFor(slides[1])).toBe("A page of its own.");
    expect(headlineFor(slides[2])).toBe("Nearly ready to open.");
  });
});
