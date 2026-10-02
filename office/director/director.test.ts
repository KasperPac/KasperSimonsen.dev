import { describe, it, expect } from "vitest";
import { describeDirector, focusedHotspot, IDLE_AT, initialDirector, LEAVE_AT, isLocked, reduceDirector, type DirectorEvent, type DirectorState } from "./director";

const crate = { hotspot: "hs_crate", item: null } as const;
const manuva = { hotspot: "hs_crate", item: "manuva" } as const;
const drawer = { hotspot: "hs_drawer", item: null } as const;
const run = (s: DirectorState, ...events: DirectorEvent[]) => events.reduce(reduceDirector, s);

describe("walk-in and idle", () => {
  it("starts walking in", () => expect(initialDirector()).toEqual({ kind: "walkIn" }));
  it("becomes idle at the end of the walk-in and walks in again when scrolled back", () => {
    const idle = run(initialDirector(), { type: "progress", value: IDLE_AT });
    expect(idle).toEqual({ kind: "idle" });
    expect(run(idle, { type: "progress", value: 0.5 })).toEqual({ kind: "walkIn" });
  });
  it("stays in the office through a small scroll back (a wheel notch, a nudge on a phone)", () => {
    expect(run({ kind: "idle" }, { type: "progress", value: IDLE_AT - 0.01 })).toEqual({ kind: "idle" });
    expect(run({ kind: "idle" }, { type: "progress", value: LEAVE_AT })).toEqual({ kind: "idle" });
  });
  it("walks out again once scrolled back past the office's doorstep", () =>
    expect(run({ kind: "idle" }, { type: "progress", value: LEAVE_AT - 0.001 })).toEqual({ kind: "walkIn" }));
  it("only arrives at the very end of the walk-in, wherever it leaves", () =>
    expect(run(initialDirector(), { type: "progress", value: LEAVE_AT + 0.01 })).toEqual({ kind: "walkIn" }));
  it("ignores progress that changes nothing", () => {
    const s = initialDirector();
    expect(run(s, { type: "progress", value: 0.4 })).toBe(s);
  });
});

describe("focus", () => {
  it("idle → focusing → focused", () => {
    const focusing = run({ kind: "idle" }, { type: "focus", target: drawer });
    expect(focusing).toEqual({ kind: "focusing", target: drawer, from: "idle" });
    expect(run(focusing, { type: "settled" })).toEqual({ kind: "focused", target: drawer });
  });
  it("remembers a focus that interrupts the walk-in (the camera cuts instead of flying)", () =>
    expect(run(initialDirector(), { type: "focus", target: drawer })).toEqual({ kind: "focusing", target: drawer, from: "walkIn" }));
  it("switches item within the focused hotspot without moving the camera", () =>
    expect(run({ kind: "focused", target: crate }, { type: "focus", target: manuva })).toEqual({ kind: "focused", target: manuva }));
  it("retargets mid-move to another hotspot", () =>
    expect(run({ kind: "focusing", target: crate, from: "idle" }, { type: "focus", target: drawer })).toEqual({ kind: "focusing", target: drawer, from: "focus" }));
  it("moves on from a focused hotspot to another", () =>
    expect(run({ kind: "focused", target: crate }, { type: "focus", target: drawer })).toEqual({ kind: "focusing", target: drawer, from: "focus" }));
  it("refocuses while returning", () =>
    expect(run({ kind: "returning" }, { type: "focus", target: crate })).toEqual({ kind: "focusing", target: crate, from: "returning" }));
  it("re-asking for the same target changes nothing", () => {
    const s: DirectorState = { kind: "focused", target: drawer };
    expect(run(s, { type: "focus", target: { ...drawer } })).toBe(s);
  });
  it("ignores walk-in progress while focused (the scroll is locked)", () => {
    const s: DirectorState = { kind: "focused", target: drawer };
    expect(run(s, { type: "progress", value: 0.2 })).toBe(s);
  });
});

describe("release", () => {
  it("focused → returning → idle", () => {
    const back = run({ kind: "focused", target: drawer }, { type: "release" });
    expect(back).toEqual({ kind: "returning" });
    expect(run(back, { type: "settled" })).toEqual({ kind: "idle" });
  });
  it("releases mid-move too (Esc while the camera is flying in)", () =>
    expect(run({ kind: "focusing", target: drawer, from: "idle" }, { type: "release" })).toEqual({ kind: "returning" }));
  it("is a no-op when nothing is focused", () => {
    const s: DirectorState = { kind: "idle" };
    expect(run(s, { type: "release" })).toBe(s);
  });
  it("ignores a stray settled", () => {
    const s: DirectorState = { kind: "idle" };
    expect(run(s, { type: "settled" })).toBe(s);
  });
});

describe("helpers", () => {
  it("describes states for the DOM", () => {
    expect(describeDirector({ kind: "walkIn" })).toBe("walkIn");
    expect(describeDirector({ kind: "focusing", target: crate, from: "idle" })).toBe("focusing:hs_crate");
    expect(describeDirector({ kind: "focused", target: drawer })).toBe("focused:hs_drawer");
    expect(describeDirector({ kind: "returning" })).toBe("returning");
  });
  it("knows the focused hotspot", () => {
    expect(focusedHotspot({ kind: "focused", target: manuva })).toBe("hs_crate");
    expect(focusedHotspot({ kind: "idle" })).toBeNull();
  });
  it("locks the scroll from focusing until back at idle", () => {
    expect(isLocked({ kind: "walkIn" })).toBe(false);
    expect(isLocked({ kind: "idle" })).toBe(false);
    expect(isLocked({ kind: "focusing", target: crate, from: "idle" })).toBe(true);
    expect(isLocked({ kind: "focused", target: crate })).toBe(true);
    expect(isLocked({ kind: "returning" })).toBe(true);
  });
});
