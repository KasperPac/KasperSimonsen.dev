import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { COPY } from "@/office/copy";
import AgeGate from "./AgeGate";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;");

describe("AgeGate", () => {
  it("asks, offers both answers, and has somewhere for the punchline to land", () => {
    const out = renderToStaticMarkup(createElement(AgeGate, { titleId: "g" }));
    for (const text of [COPY.monitor.title, COPY.monitor.over, COPY.monitor.under]) expect(out).toContain(esc(text));
    expect(out).toContain(`role="status"`);
    expect(out).not.toContain(esc(COPY.monitor.replies.over)); // not until a button's pressed
  });
});
