import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { work, type WorkItem } from "@/content/work";
import CaseStudy from "./CaseStudy";
import SleeveBack from "@/office/cards/SleeveBack";

const html = (item: WorkItem) => renderToStaticMarkup(createElement(CaseStudy, { item, titleId: "t" }));
/** React escapes text; compare like with like. */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

describe("CaseStudy", () => {
  it("shows the whole case study under a heading the dialog is labelled by", () => {
    const out = html(work[0]);
    expect(out).toContain(`id="t"`);
    expect(out).toContain(esc(work[0].name));
    for (const s of work[0].sections) expect(out).toContain(esc(s.title));
  });
  it("still renders a project with no sections yet", () => expect(html({ ...work[0], sections: [], intro: [] })).toContain(esc(work[0].name)));
});

describe("SleeveBack", () => {
  it("prints the name, years, headline, stack and Read more", () => {
    const out = renderToStaticMarkup(createElement(SleeveBack, { item: work[1], titleId: "s", onReadMore: () => {} }));
    for (const text of [work[1].name, work[1].years, work[1].headline, work[1].stack[0], "Read more"]) expect(out).toContain(esc(text));
  });
});
