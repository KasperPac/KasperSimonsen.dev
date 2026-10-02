import { sameHit, type Hit, type HotspotName } from "../hotspots/registry";

/** Walk-in progress at or above this counts as standing in the office. */
export const IDLE_AT = 0.995;

export type DirectorState =
  | { kind: "walkIn" }
  | { kind: "idle" }
  | { kind: "focusing"; target: Hit; from: "walkIn" | "idle" | "focus" | "returning" }
  | { kind: "focused"; target: Hit }
  | { kind: "returning" };

export type DirectorEvent =
  | { type: "progress"; value: number }
  | { type: "focus"; target: Hit }
  | { type: "release" }
  | { type: "settled" };

export function initialDirector(): DirectorState {
  return { kind: "walkIn" };
}

/** The scene's state machine (spec 5.3). Pure: the canvas moves the camera, the page drives the URL. */
export function reduceDirector(state: DirectorState, event: DirectorEvent): DirectorState {
  switch (event.type) {
    case "progress":
      if (state.kind === "walkIn" && event.value >= IDLE_AT) return { kind: "idle" };
      if (state.kind === "idle" && event.value < IDLE_AT) return { kind: "walkIn" };
      return state;
    case "focus": {
      const target = event.target;
      if (state.kind === "focused" && state.target.hotspot === target.hotspot)
        return sameHit(state.target, target) ? state : { kind: "focused", target };
      if (state.kind === "focusing" && state.target.hotspot === target.hotspot)
        return sameHit(state.target, target) ? state : { ...state, target };
      const from = state.kind === "walkIn" || state.kind === "idle" || state.kind === "returning" ? state.kind : "focus";
      return { kind: "focusing", target, from };
    }
    case "release":
      return state.kind === "focusing" || state.kind === "focused" ? { kind: "returning" } : state;
    case "settled":
      if (state.kind === "focusing") return { kind: "focused", target: state.target };
      if (state.kind === "returning") return { kind: "idle" };
      return state;
  }
}

export function describeDirector(state: DirectorState): string {
  return state.kind === "focusing" || state.kind === "focused" ? `${state.kind}:${state.target.hotspot}` : state.kind;
}

export function focusedHotspot(state: DirectorState): HotspotName | null {
  return state.kind === "focusing" || state.kind === "focused" ? state.target.hotspot : null;
}

/** Scrolling would replay the walk-in under an open object, so it is locked from focusing until back at idle. */
export function isLocked(state: DirectorState): boolean {
  return state.kind === "focusing" || state.kind === "focused" || state.kind === "returning";
}
