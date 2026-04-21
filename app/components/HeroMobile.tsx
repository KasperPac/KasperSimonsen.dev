"use client";

import { useEffect, useState } from "react";

const INTER =
  "var(--font-inter), 'Helvetica Neue', Helvetica, Arial, sans-serif";

// ── Geometry (SVG user units) ──
const VB_W = 400;
const VB_H = 180;

// ── Logo proportions lifted from Nav's KSLogo ──
// Nav logo: 200×200 square, text baseline at y=155 with fontSize 180 and
// letter-spacing -45. That gives:
//   • cap-height ≈ 131 → square is 1.525× text height
//   • text left inset 18/200 = 9%
//   • text baseline inset 155/200 = 77.5% from top
const LOGO_HEIGHT_RATIO = 200 / 131;   // square is this × cap-height
const LOGO_X_INSET = 18 / 200;         // text left inset / square width
const LOGO_Y_INSET = 155 / 200;        // text baseline inset / square height
const LOGO_KS_ADVANCE = 0.42;          // K→S offset / fontSize

const FONT_SIZE = 40;
const CAP_HEIGHT = FONT_SIZE * 0.728;  // Inter Black cap height
const LETTER_SPACING = "-2px";

// K stays put throughout. S travels between its two states:
//  • wordmark (scroll=0) — directly below K on line 2
//  • monogram (scroll=1) — tight-packed next to K inside the orange
const K_POS = { x: 182, y: 86 };
const S_MONOGRAM_POS = {
  x: K_POS.x + FONT_SIZE * LOGO_KS_ADVANCE, // ≈ 199 — next to K inside the logo
  y: K_POS.y,
};

// Line 2 baseline — tiny (~2px) overlap: line-2 cap-top sits just above line-1 baseline.
const LINE_2_Y = K_POS.y + CAP_HEIGHT - 2;
const S_WORDMARK_POS = { x: K_POS.x, y: LINE_2_Y };

const LINE_1_Y = K_POS.y;
const EXTRAS_X = 206; // KASPER / SIMONSEN flow after K / S

// ── Orange tile — two states, morphs position + size ──
// Monogram (scroll=1): 45×45 wrapping K+S, positioned around K using the
// nav logo's inset ratios so it reads as the same monogram.
const ORANGE_W_MONOGRAM = Math.round(CAP_HEIGHT * LOGO_HEIGHT_RATIO);
const ORANGE_MONOGRAM = {
  x: Math.round(K_POS.x - ORANGE_W_MONOGRAM * LOGO_X_INSET),
  y: Math.round(K_POS.y - ORANGE_W_MONOGRAM * LOGO_Y_INSET),
  w: ORANGE_W_MONOGRAM,
  h: ORANGE_W_MONOGRAM,
};

// Wordmark (scroll=0): same 1.525× ratio applied to the 2-line text block height.
// Sits 8px left of K with the same asymmetric vertical inset as the logo.
const TEXT_BLOCK_H = LINE_2_Y - (K_POS.y - CAP_HEIGHT);
const ORANGE_W_WORDMARK = Math.round(TEXT_BLOCK_H * LOGO_HEIGHT_RATIO);
const TEXT_BLOCK_CAP_TOP = K_POS.y - CAP_HEIGHT;
const ORANGE_WORDMARK = {
  x: K_POS.x - 8 - ORANGE_W_WORDMARK,
  y: Math.round(TEXT_BLOCK_CAP_TOP - ORANGE_W_WORDMARK * (24 / 200)),
  w: ORANGE_W_WORDMARK,
  h: ORANGE_W_WORDMARK,
};

const SCROLL_RANGE = 150;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function HeroMobile() {
  const [p, setP] = useState(0);

  useEffect(() => {
    const handler = () => setP(clamp01(window.scrollY / SCROLL_RANGE));
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Trailing letters are visible at rest (scroll=0) and fade out early in the scroll.
  const pFade = 1 - clamp01(p / 0.4);
  // S holds on line 2, then travels up to join K inside the logo in the back half.
  const pMove = clamp01((p - 0.3) / 0.7);
  // K/S colour flips light → dark mid-scroll, as the orange arrives behind them.
  const pColor = clamp01((p - 0.5) / 0.25);

  const orangeX = lerp(ORANGE_WORDMARK.x, ORANGE_MONOGRAM.x, p);
  const orangeY = lerp(ORANGE_WORDMARK.y, ORANGE_MONOGRAM.y, p);
  const orangeW = lerp(ORANGE_WORDMARK.w, ORANGE_MONOGRAM.w, p);
  const orangeH = lerp(ORANGE_WORDMARK.h, ORANGE_MONOGRAM.h, p);

  const sX = lerp(S_WORDMARK_POS.x, S_MONOGRAM_POS.x, pMove);
  const sY = lerp(S_WORDMARK_POS.y, S_MONOGRAM_POS.y, pMove);

  // #FAFAFA (wordmark on dark bg) → #0B0B0B (dark-on-orange, matches nav logo)
  const ch = Math.round(lerp(250, 11, pColor));
  const keyColor = `rgb(${ch},${ch},${ch})`;

  const fontStyle = { fontFamily: INTER, letterSpacing: LETTER_SPACING };

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", display: "block" }}
      aria-label="Kasper Simonsen"
    >
      <rect
        x={orangeX}
        y={orangeY}
        width={orangeW}
        height={orangeH}
        fill="var(--accent)"
      />

      <text
        x={EXTRAS_X}
        y={LINE_1_Y}
        fontSize={FONT_SIZE}
        fontWeight="900"
        fill="var(--text-primary)"
        opacity={pFade}
        style={fontStyle}
      >
        ASPER
      </text>
      <text
        x={EXTRAS_X}
        y={LINE_2_Y}
        fontSize={FONT_SIZE}
        fontWeight="900"
        fill="var(--text-primary)"
        opacity={pFade}
        style={fontStyle}
      >
        IMONSEN
      </text>

      <text
        x={K_POS.x}
        y={K_POS.y}
        fontSize={FONT_SIZE}
        fontWeight="900"
        fill={keyColor}
        style={fontStyle}
      >
        K
      </text>
      <text
        x={sX}
        y={sY}
        fontSize={FONT_SIZE}
        fontWeight="900"
        fill={keyColor}
        style={fontStyle}
      >
        S
      </text>
    </svg>
  );
}
