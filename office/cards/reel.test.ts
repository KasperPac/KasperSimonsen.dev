import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { work } from "@/content/work";
import { screenFor } from "@/content/screens";
import { COPY } from "@/office/copy";
import ReelScreen from "./ReelScreen";
import LaptopScreen from "./LaptopScreen";
import { holdFor } from "@/office/monitor/useReel";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
const hold = { onPointerEnter: () => {}, onPointerLeave: () => {}, onFocus: () => {}, onBlur: () => {} };
const screen = (view: { monitor: number; laptop: number; moving: { slide: number; at: number } | null }) =>
  renderToStaticMarkup(createElement(ReelScreen, { titleId: "r", view, hold, onStep: () => {}, onShow: () => {}, onPlay: () => {} }));

describe("ReelScreen", () => {
  const withShot = work.findIndex((w) => screenFor(w.slug).shot);
  const withLogo = work.findIndex((w) => !screenFor(w.slug).shot);

  it("shows the project on the monitor as a window: name, screenshot, headline, See the case study", () => {
    const out = screen({ monitor: withShot, laptop: 0, moving: null });
    const w = work[withShot];
    for (const text of [w.name, w.headline, COPY.reel.caseStudy, COPY.reel.title]) expect(out).toContain(esc(text));
    expect(out).toContain(`src="${screenFor(w.slug).shot!.src}"`);
    expect(out).toContain(`alt="${esc(screenFor(w.slug).shot!.alt)}"`);
    expect(out).toContain(`data-slide="${withShot}"`);
    expect(out).toMatch(/<h2[^>]*id="r"/);
  });
  it("a project without a screenshot gets a card with its logo and name, not its headline (the strip has that)", () => {
    const out = screen({ monitor: withLogo, laptop: 0, moving: null });
    const card = out.match(/<div class="reel-card">.*?<\/div>/)![0];
    expect(card).toContain(`src="${screenFor(work[withLogo].slug).logo}"`);
    expect(card).toContain(`<p aria-hidden="true">${esc(work[withLogo].name)}</p>`);
    expect(card).not.toContain(esc(work[withLogo].headline));
  });
  it("has ‹ › and a dot per project", () => {
    const out = screen({ monitor: 0, laptop: 1, moving: null });
    expect(out).toContain(`aria-label="${esc(COPY.reel.prev)}"`);
    expect(out).toContain(`aria-label="${esc(COPY.reel.next)}"`);
    expect(out.match(/class="reel-dot"/g)).toHaveLength(work.length);
    expect(out).toContain('aria-current="true"');
  });
  it("draws a window being dragged in, with the pointer on its title bar, hidden from screen readers", () => {
    const out = screen({ monitor: 0, laptop: 2, moving: { slide: 1, at: 0.5 } });
    expect(out).toMatch(/class="reel-moving reel-moving--monitor"[^>]*aria-hidden="true"/);
    expect(out).toContain('class="reel-pointer"');
  });
});

describe("LaptopScreen", () => {
  it("shows the next project, all of it hidden from screen readers", () => {
    const out = renderToStaticMarkup(createElement(LaptopScreen, { view: { monitor: 0, laptop: 1, moving: null } }));
    expect(out).toContain(esc(work[1].name));
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
