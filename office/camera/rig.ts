import { blendPose, copyPose, easeInOutCubic, makePose, type Pose } from "./pose";

/** How long the camera takes to move to an object and back. */
export const FOCUS_SECONDS = 1.1;

/** "base" follows the walk-in (it can move every frame); "pose" holds a fixed camera. */
export type RigGoal = { kind: "base" } | { kind: "pose"; pose: Pose };

/** Eases the render camera from wherever it is to a goal. Retargeting mid-move starts from the current pose, so nothing jumps. */
export class CameraRig {
  private from = makePose();
  private goal: RigGoal = { kind: "base" };
  private t = 1;
  private duration = 0;

  /** Start moving from `current` to `goal` over `seconds`; 0 cuts there on the next advance. */
  moveTo(current: Pose, goal: RigGoal, seconds: number): void {
    copyPose(current, this.from);
    this.goal = goal;
    this.duration = Math.max(0, seconds);
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
    return this.t >= 1 ? copyPose(target, out) : blendPose(this.from, target, easeInOutCubic(this.t), out);
  }
}
