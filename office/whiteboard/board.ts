import { COPY } from "@/office/copy";
import { addPoint, ERASER_PX, STROKE_PX, type Item, type Pt, type Stroke } from "./strokes";

/** White, the office's line colour: what the board was written in. */
const INK = "#e8e8e8";

/** What the board starts with: TODO: sleep, its wavy underline and the note, where the old 3D board had them (in board CSS px). */
export function startItems(): Item[] {
  const wave: Pt[] = Array.from({ length: 9 }, (_, k) => ({ x: 40 + 37 * k, y: 104 + 5 * Math.sin(k * 1.9) }));
  return [
    { kind: "text", text: COPY.whiteboard.todo, x: 40, y: 86, size: 64, color: INK },
    { kind: "stroke", erase: false, color: INK, width: 5, points: wave },
    { kind: "text", text: COPY.whiteboard.note, x: 76, y: 160, size: 40, color: INK },
  ];
}

// The visit's drawing: module state, so it outlives the board's print (leave and come back) but not a reload.
let items: Item[] = startItems();
let open: Stroke | null = null;

export function boardItems(): Item[] {
  return items;
}

export function startStroke(erase: boolean, color: string, at: Pt): Stroke {
  open = { kind: "stroke", erase, color, width: erase ? ERASER_PX : STROKE_PX, points: [at] };
  items.push(open);
  return open;
}

/** Adds a point to the stroke being drawn; false when none is open or the point is too close to the last. */
export function extendStroke(at: Pt): boolean {
  return open ? addPoint(open, at) : false;
}

export function endStroke(): void {
  open = null;
}

export function wipe(): void {
  items = [];
  open = null;
}

/** Back to a fresh visit (tests). */
export function resetBoard(): void {
  items = startItems();
  open = null;
}
