import { describe, it, expect } from "vitest";
import { addPoint, drawItems, ERASER_PX, STROKE_PX, type Ctx2D, type Stroke } from "./strokes";

/** Records every call and property set on a fake 2D context. */
function recorder() {
  const calls: string[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (_t, k: string) => (...args: unknown[]) => calls.push(`${k}(${args.join(",")})`),
    set: (_t, k: string, v) => (calls.push(`${k}=${v}`), true),
  }) as unknown as Ctx2D;
  return { ctx, calls };
}
const stroke = (erase = false): Stroke => ({ kind: "stroke", erase, color: "#C6FF3D", width: erase ? ERASER_PX : STROKE_PX, points: [{ x: 10, y: 10 }] });

describe("addPoint", () => {
  it("skips a point that hasn't moved far enough, so a still pointer doesn't pile up points", () => {
    const s = stroke();
    expect(addPoint(s, { x: 10.5, y: 10.5 })).toBe(false);
    expect(addPoint(s, { x: 20, y: 10 })).toBe(true);
    expect(s.points).toHaveLength(2);
  });
});

describe("drawItems", () => {
  it("draws a marker stroke with round caps and joins in its colour", () => {
    const { ctx, calls } = recorder();
    const s = stroke();
    addPoint(s, { x: 30, y: 10 });
    addPoint(s, { x: 50, y: 30 });
    drawItems(ctx, [s], "Inter");
    expect(calls).toContain("globalCompositeOperation=source-over");
    expect(calls).toContain("lineCap=round");
    expect(calls).toContain("lineJoin=round");
    expect(calls).toContain("strokeStyle=#C6FF3D");
    expect(calls).toContain(`lineWidth=${STROKE_PX}`);
    expect(calls.some((c) => c.startsWith("quadraticCurveTo("))).toBe(true); // smoothed through midpoints
  });
  it("rubs out with the eraser", () => {
    const { ctx, calls } = recorder();
    drawItems(ctx, [stroke(true)], "Inter");
    expect(calls).toContain("globalCompositeOperation=destination-out");
    expect(calls).toContain(`lineWidth=${ERASER_PX}`);
  });
  it("a single tap still leaves a dot", () => {
    const { ctx, calls } = recorder();
    drawItems(ctx, [stroke()], "Inter");
    expect(calls.some((c) => c.startsWith("lineTo(") || c.startsWith("arc("))).toBe(true);
  });
  it("writes text in the given font and colour", () => {
    const { ctx, calls } = recorder();
    drawItems(ctx, [{ kind: "text", text: "TODO: sleep", x: 40, y: 80, size: 64, color: "#e8e8e8" }], "Inter Tight");
    expect(calls).toContain("font=600 64px Inter Tight");
    expect(calls).toContain("fillText(TODO: sleep,40,80)");
  });
});
