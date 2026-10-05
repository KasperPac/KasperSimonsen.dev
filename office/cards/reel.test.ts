import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { findWork } from "@/content/work";
import { slides } from "@/content/screens";
import { COPY } from "@/office/copy";
import ReelScreen from "./ReelScreen";
import ReelWords, { headlineFor } from "./ReelWords";
import { holdFor } from "@/office/monitor/useReel";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
const hold = { onPointerEnter: () => {}, onPointerLeave: () => {}, onFocus: () => {}, onBlur: () => {} };

const view = (monitor: number, words = monitor, moving: { slide: number; at: number } | null = null) => ({ monitor, moving, words });
const monitor = (v: ReturnType<typeof view>) => renderToStaticMarkup(createElement(ReelScreen, { view: v, hold }));

const n = slides.length;
/** A slide in the middle of the reel when there is one, so its neighbours either side are other slides. */
const mid = Math.min(2, n - 1);

describe("ReelScreen", () => {
  it("is the screenshot edge to edge, its alt read with its label, and no words or controls", () => {
    const out = monitor(view(mid));
    const s = slides[mid];
    expect(out).toContain(`src="${s.shot.src}"`);
    expect(out).toContain(`alt="${esc(`${s.label}: ${s.shot.alt}`)}"`);
    expect(out).not.toContain("<button");
    expect(out).not.toContain("reel-bar");
    expect(out).toContain("data-reel");
  });
  it("has the next and the previous slides' screenshots in the page, hidden, so they're fetched before › or ‹ shows them", (ctx) => {
    if (n < 3) ctx.skip("needs three slides for a next and a previous that aren't the same");
    const preloaded = (out: string) => [...out.matchAll(/<img[^>]*class="reel-preload"[^>]*>/g)].map((m) => m[0]);
    const srcs = (out: string) => preloaded(out).map((img) => img.match(/src="([^"]*)"/)![1]);
    expect(srcs(monitor(view(mid)))).toEqual([slides[(mid + 1) % n].shot.src, slides[(mid - 1 + n) % n].shot.src]);
    for (const img of preloaded(monitor(view(mid)))) expect(img).toContain('aria-hidden="true"');
    // round the ends: the last slide's next is the first, the first's previous the last
    expect(srcs(monitor(view(n - 1)))[0]).toBe(slides[0].shot.src);
    expect(srcs(monitor(view(0)))[1]).toBe(slides[n - 1].shot.src);
  });
  it("draws the screenshot sliding in over it, hidden from screen readers", () => {
    const out = monitor(view(0, 0, { slide: 1 % n, at: 0.5 }));
    expect(out).toMatch(/class="reel-shot reel-moving"[^>]*aria-hidden="true"/);
    expect(out).toContain(`src="${slides[1 % n].shot.src}"`);
  });
});

describe("ReelWords", () => {
  const crate = slides.findIndex((s) => s.slug);
  const words = (i: number, place: "laptop" | "strip" = "laptop") =>
    renderToStaticMarkup(createElement(ReelWords, { view: { monitor: i, moving: null, words: i }, hold, onPlay: () => {}, place }));
  it("gives a crate slide its label, headline, description, details and See the case study, and no carousel controls", (ctx) => {
    if (crate < 0) return ctx.skip();
    const w = findWork(slides[crate].slug!)!;
    const out = words(crate);
    for (const text of [slides[crate].label, w.headline, w.description, w.details, COPY.reel.caseStudy]) expect(out).toContain(esc(text));
    expect(out).not.toContain(`aria-label="${esc(COPY.reel.prev)}"`);
    expect(out).not.toContain("reel-dot");
    expect(out).toContain(`data-slide="${crate}"`);
  });
  it("on the strip: the same words, description clamped by CSS", (ctx) => {
    if (crate < 0) return ctx.skip();
    expect(words(crate, "strip")).toContain("reel-words--strip");
  });
  it("shows the words of the slide it's on, not the one sliding in", () =>
    expect(renderToStaticMarkup(createElement(ReelWords, { view: view(0, 0, { slide: 1 % n, at: 0.4 }), hold, onPlay: () => {}, place: "laptop" }))).toContain(esc(slides[0].label)));
  it("headlineFor: a crate project's headline", (ctx) => {
    if (crate < 0) ctx.skip("no slide plays a crate record");
    expect(headlineFor(slides[crate])).toBe(findWork(slides[crate].slug!)!.headline);
  });
  it("headlineFor: the slide's own line for work not in the crate", (ctx) => {
    const own = slides.findIndex((s) => !s.slug);
    if (own < 0) ctx.skip("every slide plays a crate record");
    expect(headlineFor(slides[own])).toBe(slides[own].line);
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
