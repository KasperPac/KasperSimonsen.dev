// office/crate/dig.test.ts
import { describe, it, expect } from "vitest";
import { work } from "@/content/work";
import { canPull, digFor, swipeStep } from "./dig";

describe("digFor", () => {
  it("brings a pulled record to the front, wherever the dig was", () => expect(digFor(0, work[work.length - 1].slug)).toBe(work.length - 1));
  it("keeps the dig while nothing is pulled", () => expect(digFor(1, null)).toBe(1));
  it("ignores an unknown slug", () => expect(digFor(1, "nope")).toBe(1));
});

describe("canPull", () => {
  it("pulls while browsing the crate", () => expect(canPull("hs_crate", null)).toBe(true));
  it("doesn't pull a second record while one is out", () => expect(canPull("hs_crate", work[0].slug)).toBe(false));
  it("doesn't pull from anywhere else", () => expect(canPull("hs_shelf", null)).toBe(false));
});

describe("swipeStep", () => {
  it("flicks forward on a swipe up", () => expect(swipeStep(-80)).toBe(1));
  it("flicks back on a swipe down", () => expect(swipeStep(80)).toBe(-1));
  it("ignores a tap", () => expect(swipeStep(5)).toBe(0));
});
