import { Matrix4, Quaternion, Vector3, type Object3D } from "three";
import { easeInOutCubic } from "@/office/camera/pose";
import { approach } from "./motion";

/** An LP sleeve's side, metres (office_props.SLEEVE). */
export const SLEEVE_M = 0.315;
/** How far a flicked record tips forward on its bottom edge, radians from rest: it leans on the crate's front wall (measured in Blender, plan Task 2). */
export const FLIP_ANGLE = 0.3;
export const FLIP_SECONDS = 0.35;
export const PULL_SECONDS = 0.6;
/** A pulled sleeve fills at most this share of the screen's height and width. */
export const PULL_FILL = { height: 0.62, width: 0.86 };

/** The record at the front of the dig, kept to the records that have projects. */
export function clampDig(dig: number, count: number): number {
  return Math.max(0, Math.min(count - 1, Math.round(dig)));
}

/** How far ahead of a `fovDeg` x `aspect` camera a pulled sleeve hangs so it fills PULL_FILL of the view. */
export function pullDistance(fovDeg: number, aspect: number): number {
  const t = Math.tan((fovDeg * Math.PI) / 360);
  return Math.max(SLEEVE_M / (PULL_FILL.height * 2 * t), SLEEVE_M / (PULL_FILL.width * 2 * t * aspect));
}

const TURN = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);
const ahead = new Vector3();
const up = new Vector3();

/**
 * World pose of a pulled sleeve: its centre straight ahead of the camera at `distance`, upright with the camera and
 * turned round, so its back faces the camera. The sleeve's origin is its bottom edge, its front is local +z.
 */
export function pulledPose(camPosition: Vector3, camQuaternion: Quaternion, distance: number, out: { position: Vector3; quaternion: Quaternion }) {
  ahead.set(0, 0, -1).applyQuaternion(camQuaternion);
  up.set(0, 1, 0).applyQuaternion(camQuaternion);
  out.quaternion.copy(camQuaternion).multiply(TURN);
  out.position.copy(camPosition).addScaledVector(ahead, distance).addScaledVector(up, -SLEEVE_M / 2);
  return out;
}

export type CrateNodes = { records: Object3D[]; restPosition: Vector3[]; restQuaternion: Quaternion[] };

/** The crate's records (index order) and where they rest, local to the crate. */
export function findCrateNodes(records: Object3D[]): CrateNodes {
  return { records, restPosition: records.map((r) => r.position.clone()), restQuaternion: records.map((r) => r.quaternion.clone()) };
}

const tip = new Quaternion();
const X = new Vector3(1, 0, 0);
const target = { position: new Vector3(), quaternion: new Quaternion() };
const world = new Matrix4();
const parentInverse = new Matrix4();
const restWorld = { position: new Vector3(), quaternion: new Quaternion(), scale: new Vector3() };
const blendQ = new Quaternion();
const blendP = new Vector3();

/** Per-frame easing of the flicks and the pull-out. Pure state: no React, no clocks. Runs after ObjectMotion (the tease). */
export class CrateMotion {
  private flip: number[] = [];
  private pull: number[] = [];
  private pulledIndex: number | null = null;

  /** True once the pulled record has arrived in front of the camera (its print waits for it). */
  get pulledDone(): boolean {
    return this.pulledIndex !== null && this.pull[this.pulledIndex] === 1;
  }

  update(
    nodes: CrateNodes,
    input: { dig: number; pulled: number | null; camera: { position: Vector3; quaternion: Quaternion; fov: number }; aspect: number; reduced: boolean },
    dt: number,
  ): void {
    this.pulledIndex = input.pulled;
    const distance = pullDistance(input.camera.fov, input.aspect);
    pulledPose(input.camera.position, input.camera.quaternion, distance, target);
    nodes.records.forEach((r, i) => {
      const wasOut = (this.pull[i] ?? 0) > 0;
      this.flip[i] = approach(this.flip[i] ?? 0, i < input.dig ? 1 : 0, dt, input.reduced ? 0 : FLIP_SECONDS);
      this.pull[i] = approach(this.pull[i] ?? 0, input.pulled === i ? 1 : 0, dt, input.reduced ? 0 : PULL_SECONDS);
      tip.setFromAxisAngle(X, FLIP_ANGLE * easeInOutCubic(this.flip[i]));
      r.quaternion.copy(nodes.restQuaternion[i]).multiply(tip);
      const p = this.pull[i];
      if (p === 0) {
        if (wasOut) r.position.copy(nodes.restPosition[i]); // just put back: all the way home
        else {
          r.position.x = nodes.restPosition[i].x; // y is the tease's (ObjectMotion), left alone
          r.position.z = nodes.restPosition[i].z;
        }
        return;
      }
      // blend from where it stands (in world space) to the pulled pose, then back into the crate's space
      const parent = r.parent;
      if (!parent) return;
      parent.updateWorldMatrix(true, false);
      world.compose(nodes.restPosition[i], r.quaternion, r.scale).premultiply(parent.matrixWorld);
      world.decompose(restWorld.position, restWorld.quaternion, restWorld.scale);
      const e = easeInOutCubic(p);
      blendP.lerpVectors(restWorld.position, target.position, e);
      blendQ.slerpQuaternions(restWorld.quaternion, target.quaternion, e);
      world.compose(blendP, blendQ, restWorld.scale).premultiply(parentInverse.copy(parent.matrixWorld).invert());
      world.decompose(r.position, r.quaternion, restWorld.scale);
    });
  }
}
