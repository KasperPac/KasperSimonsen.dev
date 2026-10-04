import { Vector3 } from "three";
import type { HotspotName } from "@/office/hotspots/registry";
import { blendPose, copyPose, easeInOutCubic, makePose, type Pose } from "./pose";

/** How long the camera takes to move to an object and back, unless the object says otherwise. */
export const FOCUS_SECONDS = 1.1;

/** A move that bows off the straight line: up by `lift` and sideways by `swing` (metres) at its middle. */
export type Arc = { lift: number; swing: number };

/** How the camera travels to each object and back. The drawer rises and swoops down into it, slower. */
export const FOCUS_MOVES: Record<HotspotName, { seconds: number; arc: Arc | null }> = {
  hs_crate: { seconds: FOCUS_SECONDS, arc: null },
  hs_drawer: { seconds: 2.4, arc: { lift: 0.6, swing: 0.3 } },
  hs_monitor: { seconds: FOCUS_SECONDS, arc: null },
  hs_shelf: { seconds: FOCUS_SECONDS, arc: null },
};

/** Between the crate and the record player (playing a record, or putting it back): across the room, over the desk. */
export const PLAYER_MOVE: { seconds: number; arc: Arc | null } = { seconds: 1.6, arc: { lift: 0.3, swing: 0 } };

const UP = new Vector3(0, 1, 0);
const side = new Vector3();

/** "base" follows the walk-in (it can move every frame); "pose" holds a fixed camera. */
export type RigGoal = { kind: "base" } | { kind: "pose"; pose: Pose };

/** Eases the render camera from wherever it is to a goal. Retargeting mid-move starts from the current pose, so nothing jumps. */
export class CameraRig {
  private from = makePose();
  private goal: RigGoal = { kind: "base" };
  private t = 1;
  private duration = 0;
  private arc: Arc | null = null;

  /** Start moving from `current` to `goal` over `seconds`, on `arc` if given; 0 seconds cuts there on the next advance. */
  moveTo(current: Pose, goal: RigGoal, seconds: number, arc: Arc | null = null): void {
    copyPose(current, this.from);
    this.goal = goal;
    this.duration = Math.max(0, seconds);
    this.arc = arc;
    this.t = 0;
  }

  /** Step by `dt` seconds. True only on the frame a move completes. */
  advance(dt: number): boolean {
    if (this.t >= 1) return false;
    this.t = this.duration > 0 ? Math.min(1, this.t + dt / this.duration) : 1;
    return this.t >= 1;
  }

  get moving(): boolean {
    return this.t < 1;
  }

  get goalKind(): "base" | "pose" {
    return this.goal.kind;
  }

  /** The camera this frame, given the walk-in's `base` pose. */
  pose(base: Pose, out: Pose): Pose {
    const target = this.goal.kind === "base" ? base : this.goal.pose;
    if (this.t >= 1) return copyPose(target, out);
    const e = easeInOutCubic(this.t);
    blendPose(this.from, target, e, out);
    if (this.arc) {
      const bow = Math.sin(Math.PI * e);
      side.subVectors(target.position, this.from.position).setY(0).cross(UP);
      if (side.lengthSq() > 1e-12) side.normalize();
      out.position.addScaledVector(UP, this.arc.lift * bow).addScaledVector(side, this.arc.swing * bow);
    }
    return out;
  }
}
