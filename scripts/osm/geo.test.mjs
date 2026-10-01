import { describe, it, expect } from "vitest";
import { makeProjector, parseMetres, buildingHeight, LEVEL_HEIGHT } from "./geo.mjs";

describe("makeProjector", () => {
  const project = makeProjector({ lat: -37.8283, lon: 144.9932 });

  it("maps the origin to 0,0", () => {
    const [x, z] = project(-37.8283, 144.9932);
    expect(x).toBeCloseTo(0, 9);
    expect(z).toBeCloseTo(0, 9);
  });

  it("puts east on +x and north on -z", () => {
    expect(project(-37.8283, 144.9942)[0]).toBeGreaterThan(0);
    expect(project(-37.8273, 144.9932)[1]).toBeLessThan(0);
  });

  it("uses metres: 0.001° of latitude ≈ 111.32 m, of longitude ≈ 87.93 m here", () => {
    expect(-project(-37.8273, 144.9932)[1]).toBeCloseTo(111.32, 1);
    expect(project(-37.8283, 144.9942)[0]).toBeCloseTo(87.93, 1);
  });
});

describe("parseMetres", () => {
  it.each([
    ["30", 30],
    ["30 m", 30],
    ["12.5m", 12.5],
    ["12;15", 12],
  ])("parses %j", (input, expected) => expect(parseMetres(input)).toBe(expected));

  it.each([["abc"], [""], ["-3"], ["0"], [undefined], [null], [42]])("rejects %j", (input) =>
    expect(parseMetres(input)).toBeNull(),
  );
});

describe("buildingHeight", () => {
  it("prefers the height tag", () => expect(buildingHeight({ height: "30", "building:levels": "2" })).toBe(30));
  it("falls back to levels × 3.2 m", () => expect(buildingHeight({ "building:levels": "4" })).toBeCloseTo(4 * LEVEL_HEIGHT));
  it("ignores a garbage height and uses levels", () =>
    expect(buildingHeight({ height: "tall", "building:levels": "4" })).toBeCloseTo(12.8));
  it("defaults to 7 m", () => expect(buildingHeight({})).toBe(7));
  it("defaults when called without tags", () => expect(buildingHeight()).toBe(7));
  it("clamps silly values", () => {
    expect(buildingHeight({ height: "1000" })).toBe(400);
    expect(buildingHeight({ height: "1" })).toBe(3);
  });
});
