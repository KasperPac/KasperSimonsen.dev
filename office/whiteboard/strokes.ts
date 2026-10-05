/** A point on the board's canvas, in CSS px from its top left. */
export type Pt = { x: number; y: number };
export type Stroke = { kind: "stroke"; erase: boolean; color: string; width: number; points: Pt[] };
export type Writing = { kind: "text"; text: string; x: number; y: number; size: number; color: string };
export type Item = Stroke | Writing;

/** Marker and eraser widths at the board's print scale (whiteboard spec 4), and the least a pointer must move to add a point. */
export const STROKE_PX = 6;
export const ERASER_PX = 24;
export const MIN_STEP_PX = 1.5;

/** The parts of a 2D canvas context this draws with (a recorder stands in for it in tests). */
export type Ctx2D = Pick<
  CanvasRenderingContext2D,
  "beginPath" | "moveTo" | "lineTo" | "quadraticCurveTo" | "stroke" | "fillText" | "save" | "restore"
> & { globalCompositeOperation: string; lineCap: string; lineJoin: string; strokeStyle: string; fillStyle: string; lineWidth: number; font: string; textBaseline: string };

/** Adds `pt` to the stroke unless it's within MIN_STEP_PX of the last point. True if added. */
export function addPoint(stroke: Stroke, pt: Pt): boolean {
  const last = stroke.points[stroke.points.length - 1];
  if (last && Math.hypot(pt.x - last.x, pt.y - last.y) < MIN_STEP_PX) return false;
  stroke.points.push(pt);
  return true;
}

/** Draws the board's items in order: writing filled, strokes smoothed through their midpoints, the eraser cutting out. */
export function drawItems(ctx: Ctx2D, items: Item[], font: string): void {
  for (const item of items) {
    ctx.save();
    if (item.kind === "text") {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = item.color;
      ctx.font = `600 ${item.size}px ${font}`;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(item.text, item.x, item.y);
    } else {
      ctx.globalCompositeOperation = item.erase ? "destination-out" : "source-over";
      ctx.strokeStyle = item.erase ? "#000" : item.color;
      ctx.lineWidth = item.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const p = item.points;
      ctx.beginPath();
      ctx.moveTo(p[0].x, p[0].y);
      if (p.length === 1) ctx.lineTo(p[0].x + 0.01, p[0].y); // a tap leaves a dot
      for (let i = 1; i < p.length - 1; i++) ctx.quadraticCurveTo(p[i].x, p[i].y, (p[i].x + p[i + 1].x) / 2, (p[i].y + p[i + 1].y) / 2);
      if (p.length > 1) ctx.lineTo(p[p.length - 1].x, p[p.length - 1].y);
      ctx.stroke();
    }
    ctx.restore();
  }
}
