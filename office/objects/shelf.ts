import { Box3, Matrix4, Quaternion, Vector3, type Object3D } from "three";
import { easeInOutCubic, type Pose } from "@/office/camera/pose";
import { approach } from "./motion";

/** How long a picked ornament takes to float out to the camera, and back (interactions spec 4). */
export const PRESENT_SECONDS = 0.6;
/** The share of the view's shorter side a presented ornament's largest dimension fills. */
export const PRESENT_FILL = 0.38;
/**
 * Where a presented ornament's centre sits on screen, in normalised device coordinates (-1..1, y up). Landscape: left
 * of centre, leaving the right for its plaque. Portrait: centred, above the plaque docked at the bottom.
 */
export const PRESENT_AT = { land: { x: -0.4, y: 0.05 }, portrait: { x: 0, y: 0.3 } };
/** How far it rises at the middle of its float, metres: it lifts off the shelf rather than sliding. */
export const PRESENT_LIFT = 0.04;

export type Placement = { position: Vector3; quaternion: Quaternion };

/** How far in front of the camera an ornament of `size` metres fills PRESENT_FILL of the view's shorter side. */
export function presentDistance(size: number, fovDeg: number, aspect: number): number {
  const half = Math.tan((fovDeg * Math.PI) / 360);
  return size / (PRESENT_FILL * 2 * half * Math.min(1, aspect));
}

const spot = new Vector3();
const up = new Vector3();
const look = new Matrix4();

/**
 * Where a picked ornament goes, in world space: in front of `camera` (the shelf's focus pose, so it arrives where the
 * camera does), its visual centre at PRESENT_AT on screen, its front (local +z) turned to the camera, upright to the
 * camera's up. `centre` is its visual centre from its origin, in its own axes.
 */
export function presentedPlacement(camera: Pose, aspect: number, size: number, centre: Vector3, out: Placement): Placement {
  const d = presentDistance(size, camera.fov, aspect);
  const half = Math.tan((camera.fov * Math.PI) / 360);
  const at = aspect < 1 ? PRESENT_AT.portrait : PRESENT_AT.land;
  spot.set(at.x * d * half * aspect, at.y * d * half, -d).applyQuaternion(camera.quaternion).add(camera.position);
  up.set(0, 1, 0).applyQuaternion(camera.quaternion);
  look.lookAt(camera.position, spot, up); // its +z from the ornament toward the camera
  out.quaternion.setFromRotationMatrix(look);
  out.position.copy(centre).applyQuaternion(out.quaternion).negate().add(spot);
  return out;
}

export type ShelfNodes = { ornaments: Object3D[]; restPosition: Vector3[]; restQuaternion: Quaternion[]; centre: Vector3[]; size: number[] };

const box = new Box3();
const boxSize = new Vector3();

/** The shelf's ornaments (index order), where they rest (local to their parents), and each one's visual centre and size. */
export function findShelfNodes(ornaments: Object3D[]): ShelfNodes {
  return {
    ornaments,
    restPosition: ornaments.map((o) => o.position.clone()),
    restQuaternion: ornaments.map((o) => o.quaternion.clone()),
    centre: ornaments.map((o) => {
      o.updateWorldMatrix(true, true);
      return o.worldToLocal(box.setFromObject(o).getCenter(new Vector3()));
    }),
    size: ornaments.map((o) => {
      box.setFromObject(o).getSize(boxSize);
      return Math.max(boxSize.x, boxSize.y, boxSize.z);
    }),
  };
}

const target: Placement = { position: new Vector3(), quaternion: new Quaternion() };
const local: Placement = { position: new Vector3(), quaternion: new Quaternion() };
const world = new Matrix4();
const inverse = new Matrix4();
const unusedScale = new Vector3();
const ONE = new Vector3(1, 1, 1);

function toLocal(parent: Object3D, p: Placement, out: Placement): Placement {
  parent.updateWorldMatrix(true, false);
  world.compose(p.position, p.quaternion, ONE).premultiply(inverse.copy(parent.matrixWorld).invert());
  world.decompose(out.position, out.quaternion, unusedScale);
  return out;
}

/** Per-frame easing of a picked ornament out to the camera and back. Pure state: no React, no clocks. Runs after ObjectMotion (the bob). */
export class ShelfMotion {
  private t: number[] = [];
  private presentedIndex: number | null = null;

  /** True once the picked ornament has arrived in front of the camera (its plaque waits for it). */
  get presented(): boolean {
    return this.presentedIndex !== null && this.t[this.presentedIndex] === 1;
  }

  update(nodes: ShelfNodes, input: { presented: number | null; camera: Pose | null; aspect: number; reduced: boolean }, dt: number): void {
    this.presentedIndex = input.camera ? input.presented : null;
    nodes.ornaments.forEach((o, i) => {
      const was = (this.t[i] ?? 0) > 0;
      const out = this.presentedIndex === i;
      this.t[i] = approach(this.t[i] ?? 0, out ? 1 : 0, dt, input.reduced ? 0 : PRESENT_SECONDS);
      if (this.t[i] === 0 || !input.camera || !o.parent) {
        if (was) o.position.copy(nodes.restPosition[i]); // just home: all the way
        else {
          o.position.x = nodes.restPosition[i].x; // y is the bob's (ObjectMotion), left alone
          o.position.z = nodes.restPosition[i].z;
        }
        o.quaternion.copy(nodes.restQuaternion[i]);
        return;
      }
      toLocal(o.parent, presentedPlacement(input.camera, input.aspect, nodes.size[i], nodes.centre[i], target), local);
      const e = easeInOutCubic(this.t[i]);
      o.position.lerpVectors(nodes.restPosition[i], local.position, e);
      o.position.y += PRESENT_LIFT * Math.sin(Math.PI * e);
      o.quaternion.slerpQuaternions(nodes.restQuaternion[i], local.quaternion, e);
    });
  }
}
