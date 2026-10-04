import { describe, it, expect } from "vitest";
import { BufferGeometry, EdgesGeometry, Float32BufferAttribute } from "three";
import {
  cleanRing,
  clipLineOutside,
  closestPointOnSegment,
  extrudeFootprint,
  insetRing,
  ribbon,
  ringArea,
  stripWidth,
} from "./geometry.mjs";

/** Rounds every number to 6 places (and -0 to 0) so float results compare with toEqual. */
const round = (value) => JSON.parse(JSON.stringify(value, (_, v) => (typeof v === "number" ? Math.round(v * 1e6) / 1e6 : v)));

/** How many line segments the clean-edge renderer would draw for this mesh. */
function edgeSegments({ positions, indices }, thresholdDeg = 20) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return new EdgesGeometry(geometry, thresholdDeg).attributes.position.count / 2;
}

describe("cleanRing", () => {
  it("drops the closing duplicate and repeated points", () => {
    expect(cleanRing([[0, 0], [10, 0], [10, 0], [10, 10], [0, 10], [0, 0]])).toEqual([[0, 0], [10, 0], [10, 10], [0, 10]]);
  });
  it("drops collinear points", () => {
    expect(cleanRing([[0, 0], [5, 0], [10, 0], [10, 10], [0, 10]])).toEqual([[0, 0], [10, 0], [10, 10], [0, 10]]);
  });
  it("rejects fewer than 3 points", () => expect(cleanRing([[0, 0], [1, 0]])).toBeNull());
  it("rejects zero area", () => expect(cleanRing([[0, 0], [5, 0], [10, 0]])).toBeNull());
  it("rejects slivers under 1 m²", () => expect(cleanRing([[0, 0], [10, 0], [10, 0.05], [0, 0.05]])).toBeNull());
});

describe("ringArea", () => {
  it("is signed by winding", () => {
    expect(ringArea([[0, 0], [10, 0], [10, 10], [0, 10]])).toBe(100);
    expect(ringArea([[0, 0], [0, 10], [10, 10], [10, 0]])).toBe(-100);
  });
});

describe("extrudeFootprint", () => {
  it("builds walls and a roof at the given height", () => {
    const mesh = extrudeFootprint([[0, 0], [10, 0], [10, 10], [0, 10]], 5);
    const ys = mesh.positions.filter((_, i) => i % 3 === 1);
    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...ys)).toBe(5);
    expect(mesh.indices.length).toBe(4 * 6 + 2 * 3);
  });

  it("draws a box as exactly 12 edges", () => {
    expect(edgeSegments(extrudeFootprint([[0, 0], [10, 0], [10, 10], [0, 10]], 5))).toBe(12);
  });

  it("draws a concave L footprint as 18 edges", () => {
    const ring = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]];
    expect(edgeSegments(extrudeFootprint(ring, 6))).toBe(18);
  });

  it("hides the vertical line where a wall bends by less than the threshold", () => {
    const ring = [[0, 0], [5, 0.2], [10, 0], [10, 10], [0, 10]];   // ~4.6° bend at [5, 0.2]
    expect(edgeSegments(extrudeFootprint(ring, 5))).toBe(5 + 5 + 4);
  });

  it("works for either winding", () => {
    expect(edgeSegments(extrudeFootprint([[0, 0], [0, 10], [10, 10], [10, 0]], 5))).toBe(12);
  });
});

describe("ribbon", () => {
  it("is a rectangle for a straight two-point line", () => {
    const strip = ribbon([[0, 0], [10, 0]], 2);
    expect(strip.positions).toEqual([0, 0, 1, 0, 0, -1, 10, 0, 1, 10, 0, -1]);
    expect(edgeSegments(strip)).toBe(4);
  });

  it("mitres corners so the strip keeps its width", () => {
    const strip = ribbon([[0, 0], [10, 0], [10, 10]], 2);
    const corner = strip.positions.slice(6, 12);
    [9, 0, 1, 11, 0, -1].forEach((v, i) => expect(corner[i]).toBeCloseTo(v, 6));
  });

  it("survives a hairpin without NaN", () => {
    const strip = ribbon([[0, 0], [10, 0], [0, 0]], 2);
    expect(strip.positions.every(Number.isFinite)).toBe(true);
  });

  it("returns null for fewer than two distinct points", () => {
    expect(ribbon([[3, 3]], 4)).toBeNull();
    expect(ribbon([[3, 3], [3, 3]], 4)).toBeNull();
  });
});

describe("stripWidth", () => {
  it.each([
    [{ highway: "primary" }, 14],
    [{ highway: "residential" }, 8],
    [{ highway: "service", width: "3.5" }, 3.5],
    [{ railway: "tram" }, 2.5],
    [{ railway: "rail" }, 3],
    [{ highway: "bogus" }, 6],
  ])("%j → %d m", (tags, expected) => expect(stripWidth(tags)).toBe(expected));
});

describe("closestPointOnSegment", () => {
  it("projects onto the segment", () => expect(closestPointOnSegment([5, 3], [0, 0], [10, 0])).toEqual([5, 0]));
  it("clamps to the ends", () => expect(closestPointOnSegment([-4, 2], [0, 0], [10, 0])).toEqual([0, 0]));
  it("handles a zero-length segment", () => expect(closestPointOnSegment([1, 1], [2, 2], [2, 2])).toEqual([2, 2]));
});

describe("insetRing", () => {
  it.each([
    ["anticlockwise", [[0, 0], [10, 0], [10, 10], [0, 10]], [[1, 1], [9, 1], [9, 9], [1, 9]]],
    ["clockwise", [[0, 0], [0, 10], [10, 10], [10, 0]], [[1, 1], [1, 9], [9, 9], [9, 1]]],
  ])("shrinks a square wound %s by the distance", (_, ring, expected) => expect(round(insetRing(ring, 1))).toEqual(expected));
});

describe("clipLineOutside", () => {
  const box = [[0, 0], [10, 0], [10, 10], [0, 10]];

  it("keeps the parts outside and reports each crossing with the direction into the ring", () => {
    const { pieces, crossings } = clipLineOutside([[-5, 4], [15, 4]], box);
    expect(round(pieces)).toEqual([[[-5, 4], [0, 4]], [[10, 4], [15, 4]]]);
    expect(round(crossings)).toEqual([
      { point: [0, 4], direction: [1, 0] },
      { point: [10, 4], direction: [-1, 0] },
    ]);
  });

  it("cuts across a bend in the line", () => {
    const { pieces, crossings } = clipLineOutside([[-5, 4], [5, 4], [5, 15]], box);
    expect(round(pieces)).toEqual([[[-5, 4], [0, 4]], [[5, 10], [5, 15]]]);
    expect(round(crossings.map((c) => c.direction))).toEqual([[1, 0], [0, -1]]);
  });

  it("drops the end of a line that stops inside", () => {
    const { pieces, crossings } = clipLineOutside([[-5, 4], [5, 4]], box);
    expect(round(pieces)).toEqual([[[-5, 4], [0, 4]]]);
    expect(crossings).toHaveLength(1);
  });

  it("returns a line that stays outside unchanged", () => {
    const line = [[-5, 12], [15, 12]];
    expect(clipLineOutside(line, box)).toEqual({ pieces: [line], crossings: [] });
  });
});
