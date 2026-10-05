import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { slides } from "@/content/screens";
import { COPY } from "@/office/copy";
import ReelViewer from "./ReelViewer";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
const html = (i: number) => renderToStaticMarkup(createElement(ReelViewer, { index: i, titleId: "v", returnTo: "r", onStep: () => {}, onClose: () => {} }));

describe("ReelViewer", () => {
  it("is a modal dialog named for the slide, its screenshot uncropped, with ‹ › and close", () => {
    const out = html(1);
    expect(out).toMatch(/role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="v"|aria-labelledby="v"[^>]*role="dialog"/);
    expect(out).toContain(`id="v"`);
    expect(out).toContain(esc(slides[1].label));
    expect(out).toContain(`src="${slides[1].shot.src}"`);
    expect(out).toContain(`alt="${esc(slides[1].shot.alt)}"`);
    for (const name of [COPY.reel.prev, COPY.reel.next]) expect(out).toContain(`aria-label="${esc(name)}"`);
    expect(out).toContain(`>${esc(COPY.close)}<`);
  });
  it("is described by where the reel is, read as Slide n of N", () => {
    const out = html(1);
    expect(out).toMatch(/aria-describedby="v-position"/);
    expect(out).toMatch(new RegExp(`id="v-position"[^>]*>${esc(COPY.reel.position(2, slides.length))}<`));
  });
});
