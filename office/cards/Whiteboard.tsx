"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { COPY } from "@/office/copy";
import { theme } from "@/office/theme";
import { endStroke, extendStroke, startStroke, wipe } from "@/office/whiteboard/board";
import { boardCanvas, inkStroke, redrawBoard, sizeBoard } from "@/office/whiteboard/surface";
import type { Pt, Stroke } from "@/office/whiteboard/strokes";
import type { ToolId } from "@/office/whiteboard/marker";

/** CSS px the board's print is laid out at (whiteboard spec): mapped onto hs_whiteboard__surface. */
export const WHITEBOARD_WIDTH_PX = 800;
/**
 * Height of the tool strip along the board's bottom edge, in CSS px, until it's measured: phones see the print at under
 * half size, so office.css makes the strip taller there for fingers, and the canvas takes what's left.
 */
export const STRIP_PX = 96;

export const TOOLS: { id: Exclude<ToolId, "eraser">; color: string; label: string }[] = [
  { id: 0, color: theme.line, label: COPY.whiteboard.tools.white },
  { id: 1, color: theme.accents.hs_crate, label: COPY.whiteboard.tools.lime },
  { id: 2, color: theme.accents.hs_shelf, label: COPY.whiteboard.tools.red },
  { id: 3, color: theme.accents.hs_drawer, label: COPY.whiteboard.tools.cyan },
  { id: 4, color: theme.accents.hs_monitor, label: COPY.whiteboard.tools.amber },
];

/** Where the pointer is on the board and whether it's drawing: read by the canvas each frame to move the held marker. */
export type BoardPointer = { pt: Pt | null; pressing: boolean };

/**
 * What's printed on the whiteboard: the board's canvas to draw on with the held tool, and the tool strip along the bottom.
 * The canvas is the visit's one board canvas (surface.ts), laid in here under the pointer; the ink you see is the 3D
 * board's, which shows the same canvas, so here it's see-through (office.css) and the held marker is drawn over the ink.
 */
export default function Whiteboard({
  titleId,
  heightPx,
  tool,
  onTool,
  pointer,
}: {
  titleId: string;
  heightPx: number;
  tool: ToolId;
  onTool: (t: ToolId) => void;
  pointer: { current: BoardPointer };
}) {
  const ink = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [stripPx, setStripPx] = useState(STRIP_PX);
  // The strip's laid-out height (CSS px; the print's 3D transform doesn't change it), again if the media query flips.
  useLayoutEffect(() => {
    const el = strip.current;
    if (!el) return;
    const measure = () => setStripPx(el.offsetHeight || STRIP_PX);
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  const drawHeight = heightPx - stripPx;
  // The board's canvas is laid in under the pointer while the print shows (it outlives the print), sized to what the
  // strip leaves; resizing it replays the drawing.
  useLayoutEffect(() => {
    const c = boardCanvas();
    if (!c || !ink.current) return;
    ink.current.replaceChildren(c);
    return () => c.remove();
  }, []);
  useLayoutEffect(() => sizeBoard(WHITEBOARD_WIDTH_PX, drawHeight), [drawHeight]);
  /** The one pointer that is drawing, so a second finger or another button can't start, extend or end its stroke. */
  const drawing = useRef<number | null>(null);
  const stroke = useRef<Stroke | null>(null);
  const finish = () => {
    drawing.current = null;
    stroke.current = null;
    endStroke();
    pointer.current = { ...pointer.current, pressing: false };
  };
  // Leaving mid-stroke: nothing here can extend it again (the next print starts fresh).
  useEffect(
    () => () => {
      if (drawing.current !== null) endStroke();
    },
    [],
  );

  // offsetX/Y are in the canvas's own CSS px, through the print's 3D transform (the canvas sits at the wrapper's corner).
  const at = (e: React.PointerEvent<HTMLDivElement>): Pt => ({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
  const colour = tool === "eraser" ? "" : TOOLS[tool].color;

  return (
    <div className="office-whiteboard">
      <h2 id={titleId} className="visually-hidden" tabIndex={-1}>
        {COPY.whiteboard.title}
      </h2>
      <div
        ref={ink}
        className="whiteboard-ink"
        style={{ width: WHITEBOARD_WIDTH_PX, height: drawHeight }}
        onPointerDown={(e) => {
          if (!e.isPrimary || e.button !== 0) return;
          drawing.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = at(e);
          stroke.current = startStroke(tool === "eraser", colour, p);
          inkStroke(stroke.current);
          pointer.current = { pt: p, pressing: true };
        }}
        onPointerMove={(e) => {
          if (!e.isPrimary) return;
          const p = at(e);
          pointer.current = { pt: p, pressing: pointer.current.pressing };
          if (drawing.current === e.pointerId && stroke.current && extendStroke(p)) inkStroke(stroke.current);
        }}
        onPointerUp={(e) => {
          if (drawing.current === e.pointerId) finish();
        }}
        onPointerCancel={(e) => {
          if (drawing.current === e.pointerId) finish();
        }}
      />
      <div ref={strip} className="whiteboard-tools">
        {TOOLS.map((t) => (
          <button key={t.id} type="button" className="whiteboard-swatch" aria-label={t.label} aria-pressed={tool === t.id} style={{ ["--swatch" as string]: t.color }} onClick={() => onTool(t.id)} />
        ))}
        <button type="button" className="whiteboard-eraser" aria-label={COPY.whiteboard.eraser} aria-pressed={tool === "eraser"} onClick={() => onTool("eraser")} />
        <button
          type="button"
          className="whiteboard-wipe"
          onClick={() => {
            wipe();
            redrawBoard();
          }}
        >
          {COPY.whiteboard.wipe}
        </button>
      </div>
    </div>
  );
}
