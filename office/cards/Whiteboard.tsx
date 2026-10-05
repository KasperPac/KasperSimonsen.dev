"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { COPY } from "@/office/copy";
import { theme } from "@/office/theme";
import { boardItems, endStroke, extendStroke, startStroke, wipe } from "@/office/whiteboard/board";
import { drawItems, type Ctx2D, type Pt } from "@/office/whiteboard/strokes";
import type { ToolId } from "@/office/whiteboard/marker";

/** CSS px the board's print is laid out at (whiteboard spec): mapped onto hs_whiteboard__surface. */
export const WHITEBOARD_WIDTH_PX = 800;
/**
 * Height of the tool strip along the board's bottom edge, in CSS px, until it's measured: phones see the print at under
 * half size, so office.css makes the strip taller there for fingers, and the canvas takes what's left.
 */
const STRIP_PX = 96;
/** The canvas's bitmap is this many times its CSS size, so lines stay crisp when the camera comes in close. */
const DENSITY = 2;

export const TOOLS: { id: Exclude<ToolId, "eraser">; color: string; label: string }[] = [
  { id: 0, color: theme.line, label: COPY.whiteboard.tools.white },
  { id: 1, color: theme.accents.hs_crate, label: COPY.whiteboard.tools.lime },
  { id: 2, color: theme.accents.hs_shelf, label: COPY.whiteboard.tools.red },
  { id: 3, color: theme.accents.hs_drawer, label: COPY.whiteboard.tools.cyan },
  { id: 4, color: theme.accents.hs_monitor, label: COPY.whiteboard.tools.amber },
];

/** Where the pointer is on the board and whether it's drawing: read by the canvas each frame to move the held marker. */
export type BoardPointer = { pt: Pt | null; pressing: boolean };

/** What's printed on the whiteboard: a canvas drawn on with the held tool, and the tool strip along the bottom. */
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
  const canvas = useRef<HTMLCanvasElement>(null);
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
  const font = () => getComputedStyle(document.body).fontFamily;
  const redraw = () => {
    const c = canvas.current;
    // Kept on the CPU from the first draw: Chrome moves a canvas off the GPU the first time its pixels are read back,
    // and the two anti-alias a line differently, so the same drawing would come back a few pixels different.
    const ctx = c?.getContext("2d", { willReadFrequently: true });
    if (!c || !ctx) return;
    ctx.setTransform(DENSITY, 0, 0, DENSITY, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    drawItems(ctx as unknown as Ctx2D, boardItems(), font());
  };
  const drawHeight = heightPx - stripPx;
  // Changing the canvas's height attribute clears its bitmap, so redraw whenever its height changes.
  // Redraw again once web fonts have loaded, so the printed text leaves the fallback face.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(redraw, [drawHeight]);
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => {
      if (live) redraw();
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /** The one pointer that is drawing, so a second finger or another button can't start, extend or end its stroke. */
  const drawing = useRef<number | null>(null);

  const at = (e: React.PointerEvent<HTMLCanvasElement>): Pt => ({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
  const colour = tool === "eraser" ? "" : TOOLS[tool].color;

  return (
    <div className="office-whiteboard">
      <h2 id={titleId} className="visually-hidden" tabIndex={-1}>
        {COPY.whiteboard.title}
      </h2>
      <canvas
        ref={canvas}
        className="whiteboard-canvas"
        width={WHITEBOARD_WIDTH_PX * DENSITY}
        height={drawHeight * DENSITY}
        style={{ width: WHITEBOARD_WIDTH_PX, height: drawHeight }}
        onPointerDown={(e) => {
          if (!e.isPrimary || e.button !== 0) return;
          drawing.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = at(e);
          startStroke(tool === "eraser", colour, p);
          pointer.current = { pt: p, pressing: true };
          redraw();
        }}
        onPointerMove={(e) => {
          if (!e.isPrimary) return;
          const p = at(e);
          pointer.current = { pt: p, pressing: pointer.current.pressing };
          if (drawing.current === e.pointerId && extendStroke(p)) redraw();
        }}
        onPointerUp={(e) => {
          if (drawing.current !== e.pointerId) return;
          drawing.current = null;
          endStroke();
          pointer.current = { ...pointer.current, pressing: false };
        }}
        onPointerCancel={(e) => {
          if (drawing.current !== e.pointerId) return;
          drawing.current = null;
          endStroke();
          pointer.current = { ...pointer.current, pressing: false };
        }}
        onPointerLeave={() => {
          if (!pointer.current.pressing) pointer.current = { pt: pointer.current.pt, pressing: false };
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
            redraw();
          }}
        >
          {COPY.whiteboard.wipe}
        </button>
      </div>
    </div>
  );
}
