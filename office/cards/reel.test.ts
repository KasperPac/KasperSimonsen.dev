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

describe("ReelControls", () => {
  const crate = slides.findIndex((s) => s.slug);
  const page = slides.findIndex((s) => !s.slug && s.href);
  const notLive = slides.findIndex((s) => !s.slug && !s.href);
  it("names the slide on one line, gives its headline and See the case study, with the hidden heading to take focus", (ctx) => {
    if (crate < 0) ctx.skip("no slide plays a crate record");
    const out = controls(view(crate));
    const s = slides[crate];
    // the label's text in a span of its own, which CSS keeps to one line (ellipsis), clear of the dots drawn before it
    expect(out).toContain(`<p class="reel-label"><span>${esc(s.label)}</span></p>`);
    expect(out).toContain(esc(findWork(s.slug!)!.headline));
    expect(out).toContain(`>${esc(COPY.reel.caseStudy)}<`);
    expect(out).toMatch(/<h2[^>]*id="r"[^>]*class="visually-hidden"/);
    expect(out).toContain(`data-slide="${crate}"`);
  });
  it("says Visit the site for a live page not in the crate", (ctx) => {
    if (page < 0) ctx.skip("no slide is a live site outside the crate");
    expect(controls(view(page))).toContain(`>${esc(COPY.reel.visit)}<`);
  });
  it("has no button for a site not live yet", (ctx) => {
    if (notLive < 0) ctx.skip("no slide is a site not live yet");
    const out = controls(view(notLive));
    expect(out).toContain(esc(slides[notLive].line!));
    expect(out).not.toContain("office-card-cta");
  });
  it("shows the words of the slide it's on, not the one sliding in", () =>
    expect(controls(view(0, 0, { slide: 1 % n, at: 0.4 }))).toContain(esc(slides[0].label)));
  it("on the laptop: ‹, a dot per slide named for it in a row of their own, ›", () => {
    const out = controls(view(0));
    expect(out).toContain(`aria-label="${esc(COPY.reel.prev)}"`);
    expect(out).toContain(`aria-label="${esc(COPY.reel.next)}"`);
    expect(out.match(/class="reel-dot"/g)).toHaveLength(n);
    // ‹, then every dot inside the row, then ›: the arrows bracket the dots however many rows they wrap to
    expect(out).toMatch(new RegExp(`aria-label="${esc(COPY.reel.prev)}"[^]*<div class="reel-dots">(<button[^>]*class="reel-dot"[^>]*></button>){${n}}</div><button[^>]*aria-label="${esc(COPY.reel.next)}"`));
    for (const s of slides) expect(out).toContain(`aria-label="${esc(COPY.reel.show(s.label))}"`);
    expect(out).toContain('aria-current="true"');
  });
  it("on the strip: ‹ › and a read-out of where it is, shown as 3 / 7 and read as Slide 3 of 7, no dots (too many to tap)", () => {
    const out = controls(view(mid), "strip");
    expect(out).not.toContain("reel-dot");
    expect(out).toContain(
      `<span class="reel-count"><span aria-hidden="true">${mid + 1} / ${n}</span><span class="visually-hidden">${esc(COPY.reel.position(mid + 1, n))}</span></span>`,
    );
    expect(COPY.reel.position(3, 7)).toBe("Slide 3 of 7");
    expect(out).toContain("reel-words--strip");
  });
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
