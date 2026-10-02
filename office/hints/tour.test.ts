import { describe, it, expect } from "vitest";
import { TOUR, TOUR_SECONDS, TOUR_STEP_SECONDS, tourAt } from "./tour";

describe("tourAt", () => {
  it("names each object in turn, left to right", () => {
    expect(TOUR).toEqual(["hs_crate", "hs_drawer", "hs_monitor", "hs_shelf"]);
    TOUR.forEach((h, i) => expect(tourAt(i * TOUR_STEP_SECONDS + 0.01)).toBe(h));
  });
  it("is over after the last one", () => expect(tourAt(TOUR_SECONDS)).toBeNull());
  it("hasn't started before zero, or with no clock", () => {
    expect(tourAt(-1)).toBeNull();
    expect(tourAt(Number.NaN)).toBeNull();
  });
});
