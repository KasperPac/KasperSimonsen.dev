import { describe, it, expect } from "vitest";
import { CARD_GAP, EDGE, placeCard } from "./place";

const card = { width: 320, height: 240 };
const screen = { width: 1440, height: 900 };

describe("placeCard", () => {
  it("sits to the right of the anchor, vertically centred on it", () =>
    expect(placeCard({ x: 500, y: 450 }, card, screen)).toEqual({ left: 500 + CARD_GAP, top: 450 - 120 }));
  it("never runs off the right edge", () => {
    const p = placeCard({ x: 1300, y: 450 }, card, screen);
    expect(p.left + card.width).toBeLessThanOrEqual(screen.width - EDGE);
  });
  it("never runs off the top or bottom", () => {
    expect(placeCard({ x: 500, y: 20 }, card, screen).top).toBe(EDGE);
    expect(placeCard({ x: 500, y: 890 }, card, screen).top).toBe(screen.height - EDGE - card.height);
  });
  it("keeps a too-tall card pinned to the top edge", () =>
    expect(placeCard({ x: 500, y: 450 }, { width: 320, height: 2000 }, screen).top).toBe(EDGE));
  it("survives an anchor behind the camera (NaN)", () =>
    expect(placeCard({ x: Number.NaN, y: Number.NaN }, card, screen)).toEqual({ left: EDGE, top: EDGE }));
});
