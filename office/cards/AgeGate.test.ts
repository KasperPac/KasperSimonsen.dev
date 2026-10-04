import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { COPY } from "@/office/copy";
import AgeGate from "./AgeGate";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;");

describe("AgeGate", () => {
  it("asks, offers both answers, and lands the punchline in the question's place", () => {
    const out = renderToStaticMarkup(createElement(AgeGate, { titleId: "g" }));
    for (const text of [COPY.monitor.title, COPY.monitor.over, COPY.monitor.under]) expect(out).toContain(esc(text));
    // one slot, so the screen never has to fit the question and a reply at once
    expect(out).toMatch(new RegExp(`<p[^>]*role="status"[^>]*>${esc(COPY.monitor.text)}</p>`));
    for (const reply of Object.values(COPY.monitor.replies)) expect(out).not.toContain(esc(reply)); // not until a button's pressed
  });
});
