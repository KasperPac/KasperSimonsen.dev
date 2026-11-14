import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { accentVar, inkFor, palettes, theme, type ThemeMode } from "./theme";

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
const luminance = (c: string) => {
  const [r, g, b] = hex(c).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("palettes", () => {
  it("keeps dark exactly as the office has always been", () => {
    expect(palettes.dark.background).toBe("#0b0b0b");
    expect(palettes.dark.line).toBe("#e8e8e8");
    expect(palettes.dark.accents).toEqual({
      hs_crate: "#C6FF3D",
      hs_shelf: "#FF3B30",
      hs_drawer: "#2EF2FF",
      hs_monitor: "#FFB224",
      hs_whiteboard: "#e8e8e8",
    });
    expect(palettes.dark.background).toBe(theme.background);
  });

  it.each(["dark", "light"] as ThemeMode[])("%s: lines and every section colour read on the background (3:1 or better)", (mode) => {
    const p = palettes[mode];
    expect(contrast(p.line, p.background)).toBeGreaterThanOrEqual(7);
    for (const colour of Object.values(p.accents)) expect(contrast(colour, p.background)).toBeGreaterThanOrEqual(3);
  });

  it("light is a light background with dark lines", () => {
    expect(luminance(palettes.light.background)).toBeGreaterThan(0.7);
    expect(luminance(palettes.light.line)).toBeLessThan(0.05);
  });

  it("matches the CSS variables in office.css, for both themes", () => {
    const css = readFileSync(new URL("../app/(office)/office.css", import.meta.url), "utf8");
    const block = (selector: string) => css.slice(css.indexOf(selector), css.indexOf("}", css.indexOf(selector)));
    for (const [mode, selector] of [["dark", ":root {"], ["light", ':root[data-theme="light"] {']] as const) {
      const b = block(selector).toLowerCase();
      const p = palettes[mode];
      expect(b).toContain(`--office-bg: ${p.background};`);
      expect(b).toContain(`--office-fg: ${p.line};`);
      for (const [k, v] of Object.entries(p.accents)) expect(b).toContain(`--accent-${k}: ${v.toLowerCase()};`);
    }
  });
});

describe("inkFor", () => {
  it("maps the dark palette's colours to the theme's", () => {
    expect(inkFor("#e8e8e8", "light")).toBe(palettes.light.line);
    expect(inkFor("#C6FF3D", "light")).toBe(palettes.light.accents.hs_crate);
    expect(inkFor("#c6ff3d", "light")).toBe(palettes.light.accents.hs_crate);
    expect(inkFor("#FFB224", "dark")).toBe("#FFB224");
  });
  it("leaves other colours and the eraser's empty colour alone", () => {
    expect(inkFor("#123456", "light")).toBe("#123456");
    expect(inkFor("", "light")).toBe("");
  });
});

describe("accentVar", () => {
  it("names the section's CSS variable", () => {
    expect(accentVar("hs_shelf")).toBe("var(--accent-hs_shelf)");
  });
});
