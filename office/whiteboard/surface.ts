import { boardItems } from "./board";
import { drawItems, drawStrokeTail, type Ctx2D, type Stroke } from "./strokes";

/** The canvas's bitmap is this many times its CSS size, so lines stay crisp when the camera comes in close. */
export const DENSITY = 2;

/**
 * The board's one canvas, for the whole visit (whiteboard spec 3.3): the 3D board shows it as a texture, from across the
 * room too, and the print lays it under the pointer to draw on while the board is open. It outlives the print, so it's
 * module state, made the first time it's asked for in the browser. Strokes are drawn into it as they're made; the
 * whole drawing is replayed from the store (board.ts) only when its size changes, when its font loads, and on a wipe.
 */
let canvas: HTMLCanvasElement | null = null;
let size = { widthPx: 0, heightPx: 0 };
let version = 0;

const font = () => getComputedStyle(document.body).fontFamily;
const context = () => canvas?.getContext("2d") ?? null;

/** The board's canvas (class `whiteboard-canvas`), or null on the server. */
export function boardCanvas(): HTMLCanvasElement | null {
  if (canvas || typeof document === "undefined") return canvas;
  canvas = document.createElement("canvas");
  canvas.className = "whiteboard-canvas";
  // Ask for the face the writing is drawn in (weight 600, the page's font) and redraw once it's in: a canvas's own
  // fillText doesn't wait for a font, and nothing else on the page may have asked for that weight yet.
  document.fonts
    ?.load(`600 64px ${font()}`)
    .then(() => redrawBoard())
    .catch(() => {});
  return canvas;
}

/** The drawing area's size in CSS px (0 × 0 until it's been sized). */
export function boardSize(): { widthPx: number; heightPx: number } {
  return size;
}

/** Bumped on every change to the canvas's pixels, so the 3D board knows to upload it again. */
export function boardVersion(): number {
  return version;
}

/** Sizes the drawing area (CSS px) and replays the drawing into it; nothing happens if it's that size already. */
export function sizeBoard(widthPx: number, heightPx: number): void {
  const c = boardCanvas();
  if (!c || (widthPx === size.widthPx && heightPx === size.heightPx)) return;
  size = { widthPx, heightPx };
  c.width = Math.round(widthPx * DENSITY); // this clears the bitmap
  c.height = Math.round(heightPx * DENSITY);
  c.style.width = `${widthPx}px`;
  c.style.height = `${heightPx}px`;
  redrawBoard();
}

/** Clears the canvas and draws the whole drawing again from the store. */
export function redrawBoard(): void {
  const c = canvas;
  const ctx = context();
  if (!c || !ctx || !size.widthPx) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.restore();
  ctx.save();
  ctx.setTransform(DENSITY, 0, 0, DENSITY, 0, 0);
  drawItems(ctx as unknown as Ctx2D, boardItems(), font());
  ctx.restore();
  version++;
}

/** Draws what the stroke in progress just gained (its first dot, or its newest point). */
export function inkStroke(stroke: Stroke): void {
  const ctx = context();
  if (!ctx || !size.widthPx) return;
  ctx.save();
  ctx.setTransform(DENSITY, 0, 0, DENSITY, 0, 0);
  drawStrokeTail(ctx as unknown as Ctx2D, stroke);
  ctx.restore();
  version++;
}
