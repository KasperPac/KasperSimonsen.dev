import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { COPY } from "@/office/copy";
import Whiteboard, { TOOLS } from "./Whiteboard";

const html = (tool: (typeof TOOLS)[number]["id"] = 0) =>
  renderToStaticMarkup(createElement(Whiteboard, { titleId: "w", heightPx: 590, tool, onTool: () => {}, pointer: { current: { pt: null, pressing: false } } }));

describe("Whiteboard", () => {
  it("has a canvas to draw on and a hidden heading to take focus", () => {
    const out = html();
    expect(out).toContain("<canvas");
    expect(out).toMatch(/<h2[^>]*id="w"[^>]*class="visually-hidden"|<h2[^>]*class="visually-hidden"[^>]*id="w"/);
  });
  it("prints five swatches, the eraser and Wipe it as buttons, the held one pressed", () => {
    const out = html(2);
    for (const t of TOOLS) expect(out).toContain(`aria-label="${t.label}"`);
    expect(out).toContain(`>${COPY.whiteboard.wipe}<`);
    expect(out).toContain(`aria-label="${COPY.whiteboard.eraser}"`);
    expect(out.match(/aria-pressed="true"/g)).toHaveLength(1);
  });
  it("uses the office's five colours, white first", () =>
    expect(TOOLS.map((t) => t.color)).toEqual(["#e8e8e8", "#C6FF3D", "#FF3B30", "#2EF2FF", "#FFB224"]));
});
