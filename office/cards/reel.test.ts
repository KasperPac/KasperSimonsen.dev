import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { findWork } from "@/content/work";
import { slides } from "@/content/screens";
import { COPY } from "@/office/copy";
import ReelScreen from "./ReelScreen";
import ReelControls, { headlineFor } from "./ReelControls";
import { holdFor } from "@/office/monitor/useReel";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
const hold = { onPointerEnter: () => {}, onPointerLeave: () => {}, onFocus: () => {}, onBlur: () => {} };

const view = (monitor: number, words = monitor, moving: { slide: number; at: number } | null = null) => ({ monitor, moving, words });
const controls = (v: ReturnType<typeof view>, place: "laptop" | "strip" = "laptop") =>
  renderToStaticMarkup(createElement(ReelControls, { titleId: "r", view: v, hold, onStep: () => {}, onShow: () => {}, onPlay: () => {}, place }));
const monitor = (v: ReturnType<typeof view>) => renderToStaticMarkup(createElement(ReelScreen, { view: v, hold }));

describe("ReelScreen", () => {
  it("is the screenshot edge to edge, its alt read with its label, and no words or controls", () => {
    const out = monitor(view(2));
    const s = slides[2];
    expect(out).toContain(`src="${s.shot.src}"`);
    expect(out).toContain(`alt="${esc(`${s.label}: ${s.shot.alt}`)}"`);
    expect(out).not.toContain("<button");
    expect(out).not.toContain("reel-bar");
    expect(out).toContain("data-reel");
  });
  it("has the next slide's screenshot in the page, hidden, so it's fetched before it slides in", () => {
    const out = monitor(view(2));
    expect(out).toMatch(new RegExp(`<img[^>]*class="reel-preload"[^>]*src="${slides[3 % slides.length].shot.src}"|<img[^>]*src="${slides[3 % slides.length].shot.src}"[^>]*class="reel-preload"`));
    expect(out).toMatch(/class="reel-preload"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*class="reel-preload"/);
    expect(monitor(view(slides.length - 1))).toContain(`src="${slides[0].shot.src}"`);
  });
  it("draws the screenshot sliding in over it, hidden from screen readers", () => {
    const out = monitor(view(0, 0, { slide: 1, at: 0.5 }));
    expect(out).toMatch(/class="reel-shot reel-moving"[^>]*aria-hidden="true"/);
    expect(out).toContain(`src="${slides[1].shot.src}"`);
  });
});

describe("ReelControls", () => {
  const crate = slides.findIndex((s) => s.slug);
  const page = slides.findIndex((s) => !s.slug && s.href);
  const notLive = slides.findIndex((s) => !s.slug && !s.href);
  it("names the slide, gives its headline and See the case study, with the hidden heading to take focus", () => {
    const out = controls(view(crate));
    const s = slides[crate];
    expect(out).toContain(`<p class="reel-label">${esc(s.label)}</p>`);
    expect(out).toContain(esc(findWork(s.slug!)!.headline));
    expect(out).toContain(`>${esc(COPY.reel.caseStudy)}<`);
    expect(out).toMatch(/<h2[^>]*id="r"[^>]*class="visually-hidden"/);
    expect(out).toContain(`data-slide="${crate}"`);
  });
  it("says Visit the site for a live page not in the crate, and has no button for a site not live yet", () => {
    expect(controls(view(page))).toContain(`>${esc(COPY.reel.visit)}<`);
    const out = controls(view(notLive));
    expect(out).toContain(esc(slides[notLive].line!));
    expect(out).not.toContain("office-card-cta");
  });
  it("shows the words of the slide it's on, not the one sliding in", () =>
    expect(controls(view(0, 0, { slide: 1, at: 0.4 }))).toContain(esc(slides[0].label)));
  it("on the laptop: ‹, a dot per slide named for it, ›", () => {
    const out = controls(view(0));
    expect(out).toContain(`aria-label="${esc(COPY.reel.prev)}"`);
    expect(out).toContain(`aria-label="${esc(COPY.reel.next)}"`);
    expect(out.match(/class="reel-dot"/g)).toHaveLength(slides.length);
    for (const s of slides) expect(out).toContain(`aria-label="${esc(COPY.reel.show(s.label))}"`);
    expect(out).toContain('aria-current="true"');
  });
  it("on the strip: ‹ › and a read-out of where it is, no dots (too many to tap)", () => {
    const out = controls(view(2), "strip");
    expect(out).not.toContain("reel-dot");
    expect(out).toMatch(new RegExp(`<span class="reel-count" aria-hidden="true">3 / ${slides.length}</span>`));
    expect(out).toContain("reel-words--strip");
  });
  it("headlineFor: a crate project's headline, or the slide's own line", () => {
    expect(headlineFor(slides[crate])).toBe(findWork(slides[crate].slug!)!.headline);
    expect(headlineFor(slides[notLive])).toBe(slides[notLive].line);
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
