import { describe, it, expect, beforeEach } from "vitest";
import { boardItems, endStroke, extendStroke, resetBoard, startItems, startStroke, wipe } from "./board";
import { COPY } from "@/office/copy";

beforeEach(resetBoard);

describe("the visit's drawing", () => {
  it("starts with TODO: sleep and the note, as the old board had them", () => {
    const texts = startItems().filter((i) => i.kind === "text").map((i) => (i as { text: string }).text);
    expect(texts).toEqual([COPY.whiteboard.todo, COPY.whiteboard.note]);
    expect(boardItems()).toEqual(startItems());
  });
  it("keeps strokes as they're drawn, and between reads (leaving and coming back)", () => {
    startStroke(false, "#FF3B30", { x: 10, y: 10 });
    expect(extendStroke({ x: 40, y: 10 })).toBe(true);
    endStroke();
    expect(boardItems()).toHaveLength(startItems().length + 1);
    expect(boardItems()).toHaveLength(startItems().length + 1);
  });
  it("ends a stroke safely twice, and the next drag starts a new one", () => {
    startStroke(false, "#FF3B30", { x: 10, y: 10 });
    endStroke();
    endStroke();
    expect(extendStroke({ x: 50, y: 50 })).toBe(false); // no stroke open: nothing added
    startStroke(true, "", { x: 60, y: 60 });
    expect(boardItems()).toHaveLength(startItems().length + 2);
  });
  it("wipes everything, TODO: sleep included", () => {
    startStroke(false, "#FF3B30", { x: 10, y: 10 });
    wipe();
    expect(boardItems()).toEqual([]);
  });
});
