import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { findWork } from "@/content/work";
import { slides } from "@/content/screens";
import { COPY } from "@/office/copy";
import ReelScreen from "./ReelScreen";
import LaptopScreen from "./LaptopScreen";
import { holdFor } from "@/office/monitor/useReel";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
const hold = { onPointerEnter: () => {}, onPointerLeave: () => {}, onFocus: () => {}, onBlur: () => {} };
const screen = (view: { monitor: number; laptop: number; moving: { slide: number; at: number } | null }) =>
  renderToStaticMarkup(createElement(ReelScreen, { titleId: "r", view, hold, onStep: () => {}, onShow: () => {}, onPlay: () => {} }));

describe("ReelScreen", () => {
  const hrefAt = slides.findIndex((s) => s.href);

  it("shows the slide on the monitor as a window: label on the title bar, screenshot, the project's headline, See the case study", () => {
    const out = screen({ monitor: 2, laptop: 3, moving: null });
    const s = slides[2];
    for (const text of [s.label, findWork(s.slug!)!.headline, COPY.reel.caseStudy, COPY.reel.title]) expect(out).toContain(esc(text));
    expect(out).toMatch(new RegExp(`<span class="reel-name">${esc(s.label)}</span>`));
    expect(out).toContain(`src="${s.shot.src}"`);
    expect(out).toContain(`alt="${esc(s.shot.alt)}"`);
    expect(out).toContain('data-slide="2"');
    expect(out).toMatch(/<h2[^>]*id="r"/);
    expect(out).not.toContain(COPY.reel.visit);
  });
  it("the slide that opens a page says Visit the site, with a line of its own for a strip", () => {
    const out = screen({ monitor: hrefAt, laptop: 0, moving: null });
    expect(out).toContain(esc(COPY.reel.visit));
    expect(out).toContain(esc(COPY.reel.site));
    expect(out).not.toContain(esc(COPY.reel.caseStudy));
    expect(out).toContain(`src="${slides[hrefAt].shot.src}"`);
  });
  it("has ‹ › and a dot per slide, each named for its slide", () => {
    const out = screen({ monitor: 0, laptop: 1, moving: null });
    expect(out).toContain(`aria-label="${esc(COPY.reel.prev)}"`);
    expect(out).toContain(`aria-label="${esc(COPY.reel.next)}"`);
    expect(out.match(/class="reel-dot"/g)).toHaveLength(slides.length);
    for (const s of slides) expect(out).toContain(`aria-label="${esc(COPY.reel.show(s.label))}"`);
    expect(out).toContain('aria-current="true"');
  });
  it("draws a window being dragged in, with the pointer on its title bar, hidden from screen readers", () => {
    const out = screen({ monitor: 0, laptop: 2, moving: { slide: 1, at: 0.5 } });
    expect(out).toMatch(/class="reel-moving reel-moving--monitor"[^>]*aria-hidden="true"/);
    expect(out).toContain('class="reel-pointer"');
  });
});

describe("LaptopScreen", () => {
  it("shows the next slide, all of it hidden from screen readers", () => {
    const out = renderToStaticMarkup(createElement(LaptopScreen, { view: { monitor: 0, laptop: 1, moving: null } }));
    expect(out).toContain(esc(slides[1].label));
    expect(out).toContain(`src="${slides[1].shot.src}"`);
    // React hoists the screenshot's preload <link> ahead of the markup
    expect(out).toMatch(/^(?:<link[^>]*>)*<div[^>]*aria-hidden="true"/);
    expect(out).toContain("data-reel");
  });
});

describe("holdFor", () => {
  const matching = (...selectors: string[]) => ({ matches: (s: string) => selectors.some((m) => s.includes(m)) }) as unknown as Element;
  it("a control focused by keyboard holds the reel; a clicked or tapped one, and the title the screen focuses on arrival, don't", () => {
    expect(holdFor(matching("button", ":focus-visible"))).toBe(true);
    expect(holdFor(matching("button"))).toBe(false);
    expect(holdFor(matching(":focus-visible"))).toBe(false);
    expect(holdFor(matching())).toBe(false);
    expect(holdFor(null)).toBe(false);
  });
});
