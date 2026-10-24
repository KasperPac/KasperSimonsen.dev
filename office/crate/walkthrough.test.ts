import { describe, expect, it } from "vitest";
import { CrateWalkthrough } from "./walkthrough";

const visit = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
};

describe("crate browsing walkthrough", () => {
  it("demonstrates forward and backward browsing, then restores the front record", () => {
    const demo = new CrateWalkthrough();
    expect(demo.begin(5, false, 10)).toBe(true);
    expect([10, 10.5, 11, 11.4, 11.9, 12.3].map(t => demo.sample(t).dig)).toEqual([0, 1, 2, 1, 0, 0]);
    expect(demo.active).toBe(false);
    expect(demo.sample(13).dig).toBeNull();
  });

  it("does not replay after the visitor returns to the crate", () => {
    const demo = new CrateWalkthrough();
    demo.begin(5, false, 0);
    demo.sample(3);
    expect(demo.begin(5, false, 10)).toBe(false);
  });

  it("stays seen when navigation rebuilds the office during the same visit", () => {
    const storage = visit();
    expect(new CrateWalkthrough().begin(5, false, 0, storage)).toBe(true);
    expect(new CrateWalkthrough().begin(5, false, 3, storage)).toBe(false);
  });

  it("plays again in a new browser visit", () => {
    expect(new CrateWalkthrough().begin(5, false, 0, visit())).toBe(true);
    expect(new CrateWalkthrough().begin(5, false, 3, visit())).toBe(true);
  });

  it("remembers reduced motion across navigation in the same visit", () => {
    const storage = visit();
    expect(new CrateWalkthrough().begin(5, true, 0, storage)).toBe(false);
    expect(new CrateWalkthrough().begin(5, false, 3, storage)).toBe(false);
  });

  it("still runs once when browser storage is unavailable", () => {
    const demo = new CrateWalkthrough();
    const storage = {
      getItem: () => { throw new Error("Storage disabled"); },
      setItem: () => { throw new Error("Storage disabled"); },
    };
    expect(demo.begin(5, false, 0, storage)).toBe(true);
    demo.cancel();
    expect(demo.begin(5, false, 3, storage)).toBe(false);
  });

  it("yields immediately to input without resetting the visitor's current record", () => {
    const demo = new CrateWalkthrough();
    demo.begin(5, false, 0);
    expect(demo.sample(1).dig).toBe(2);
    demo.cancel();
    expect(demo.active).toBe(false);
    expect(demo.sample(1.1).dig).toBeNull();
    expect(demo.begin(5, false, 2)).toBe(false);
  });

  it("skips animation for reduced motion and keeps it skipped on later openings", () => {
    const demo = new CrateWalkthrough();
    expect(demo.begin(5, true, 0)).toBe(false);
    expect(demo.sample(1).dig).toBeNull();
    expect(demo.begin(5, false, 2)).toBe(false);
  });

  it.each([0, 1])("does not animate a crate with %i records", count => {
    const demo = new CrateWalkthrough();
    expect(demo.begin(count, false, 0)).toBe(false);
    expect(demo.sample(1).dig).toBeNull();
  });

  it("keeps the demonstration within the available records", () => {
    const demo = new CrateWalkthrough();
    demo.begin(2, false, 0);
    expect([0, 0.5, 1, 1.4, 1.9].map(t => demo.sample(t).dig)).toEqual([0, 1, 1, 1, 0]);
  });

  it("moves the gesture cue up and back to its resting position", () => {
    const demo = new CrateWalkthrough();
    demo.begin(5, false, 0);
    expect(demo.sample(0).offset).toBeCloseTo(0);
    expect(demo.sample(1.1).offset).toBeLessThan(-60);
    expect(demo.sample(2.3).offset).toBe(0);
  });
});
