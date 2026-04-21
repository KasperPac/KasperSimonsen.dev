"use client";

import { useEffect, useState } from "react";

const INTER =
  "var(--font-inter), 'Helvetica Neue', Helvetica, Arial, sans-serif";

// ── Geometry (SVG user units) ──
const VB_W = 400;
const VB_H = 180;

// ── Logo proportions lifted from Nav's KSLogo ──
// Nav logo: 200×200 square, text baseline at y=155 with fontSize 180 and
// letter-spacing -75. That gives:
//   • cap-height ≈ 131 → square is 1.525× text height
//   • text left inset 18/200 = 9%
//   • text baseline inset 155/200 = 77.5% from top
//   • K→S x-advance = 120 − 75 = 45 at fontSize 180, i.e. 0.25 × fontSize
const LOGO_HEIGHT_RATIO = 200 / 131;   // square is this × cap-height
const LOGO_X_INSET = 18 / 200;         // text left inset / square width
const LOGO_Y_INSET = 155 / 200;        // text baseline inset / square height
const LOGO_KS_ADVANCE = 0.42;          // K→S offset / fontSize (a touch looser than the tiny nav logo)

const FONT_SIZE = 40;
const CAP_HEIGHT = FONT_SIZE * 0.728;  // Inter Black cap height
const LETTER_SPACING = "-2px";

// K stays put throughout. S starts tight-packed next to K inside the logo
// (logo-style tight spacing), then travels to line 2 below K.
const K_POS = { x: 182, y: 86 };
const S_LOGO_POS = {
  x: K_POS.x + FONT_SIZE * LOGO_KS_ADVANCE, // ≈ 192 — overlaps K, like the logo
  y: K_POS.y,
};

// Line 2 baseline — tiny (~2px) overlap: line-2 cap-top sits just above line-1 baseline.
const LINE_2_Y = K_POS.y + CAP_HEIGHT - 2; // ≈ 113
const S_FINAL_POS = { x: K_POS.x, y: LINE_2_Y };

const LINE_1_Y = K_POS.y;
const EXTRAS_X = 206; // natural KASPER / SIMONSEN flow after K / S

// ── Orange tile — matches nav logo proportions in both states ──
// Initial: 45×45 square wrapping K+S (cap-height × 1.525 ≈ 44.5, rounded).
const ORANGE_W_INITIAL = Math.round(CAP_HEIGHT * LOGO_HEIGHT_RATIO);
const ORANGE_INITIAL = {
  x: Math.round(K_POS.x - ORANGE_W_INITIAL * LOGO_X_INSET),
  y: Math.round(K_POS.y - ORANGE_W_INITIAL * LOGO_Y_INSET),
  w: ORANGE_W_INITIAL,
  h: ORANGE_W_INITIAL,
};

// Final: same 1.525× ratio applied to the 2-line text block height.
const TEXT_BLOCK_H = LINE_2_Y - (K_POS.y - CAP_HEIGHT); // cap-top L1 → baseline L2
const ORANGE_W_FINAL = Math.round(TEXT_BLOCK_H * LOGO_HEIGHT_RATIO);
const TEXT_BLOCK_CAP_TOP = K_POS.y - CAP_HEIGHT;
const ORANGE_FINAL = {
  // 8px gap left of K
  x: K_POS.x - 8 - ORANGE_W_FINAL,
  // Same asymmetric vertical inset the logo uses (24/200 above the cap top).
  y: Math.round(TEXT_BLOCK_CAP_TOP - ORANGE_W_FINAL * (24 / 200)),
  w: ORANGE_W_FINAL,
  h: ORANGE_W_FINAL,
};

const SCROLL_RANGE = 220;

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

  const pMove = clamp01(p / 0.7);
  const pColor = clamp01((p - 0.35) / 0.25);
  const pFade = clamp01((p - 0.6) / 0.4);

  const orangeX = lerp(ORANGE_INITIAL.x, ORANGE_FINAL.x, p);
  const orangeY = lerp(ORANGE_INITIAL.y, ORANGE_FINAL.y, p);
  const orangeW = lerp(ORANGE_INITIAL.w, ORANGE_FINAL.w, p);
  const orangeH = lerp(ORANGE_INITIAL.h, ORANGE_FINAL.h, p);

  const sX = lerp(S_LOGO_POS.x, S_FINAL_POS.x, pMove);
  const sY = lerp(S_LOGO_POS.y, S_FINAL_POS.y, pMove);

  // K / S fill goes from #0B0B0B (dark on orange, matches nav logo)
  // to #FAFAFA (light on dark bg, matches wordmark).
  const ch = Math.round(lerp(11, 250, pColor));
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
