import { Euler, Matrix4, Quaternion, Vector3, type Object3D } from "three";
import { easeInOutCubic } from "@/office/camera/pose";
import { approach } from "@/office/objects/motion";
import type { Placement } from "@/office/objects/shelf";
import type { Pt } from "./strokes";

/** How far a held tool sits off the board when not drawing, how long it takes to and from the tray, how tightly it follows (whiteboard spec 4). */
export const LIFT_M = 0.004;
export const TOOL_SECONDS = 0.4;
export const FOLLOW_RATE = 18;

export type Face = { position: [number, number, number]; rotation: [number, number, number]; distanceFactor: number; heightPx: number };
export type ToolId = 0 | 1 | 2 | 3 | 4 | "eraser";

const basis = new Quaternion();
const axis = new Vector3();

/** Where a point on the board's canvas is on its surface, in the surface's own space (drei maps 1 px to distanceFactor / 400). */
export function boardPoint(face: Face, widthPx: number, pt: Pt, out: Vector3): Vector3 {
  const k = face.distanceFactor / 400;
  basis.setFromEuler(new Euler(...face.rotation));
  out.set((pt.x - widthPx / 2) * k, (face.heightPx / 2 - pt.y) * k, 0).applyQuaternion(basis);
  return out.add(axis.set(...face.position));
}

const normal = new Vector3();
const up = new Vector3();
const right = new Vector3();
const dir = new Vector3();
const Z = new Vector3(0, 0, 1);

/**
 * A held tool's world pose at `local` on the surface (its own space, +z out of the board): a marker's tip there,
 * its body tilted out and to the lower right like a pen in a right hand; the eraser flat to the board. Lifted LIFT_M
 * off the board unless pressing.
 */
export function handPlacement(surface: Object3D, local: Vector3, kind: "marker" | "eraser", pressing: boolean, out: Placement): Placement {
  surface.updateWorldMatrix(true, false);
  const q = surface.getWorldQuaternion(new Quaternion());
  normal.set(0, 0, 1).applyQuaternion(q);
  up.set(0, 1, 0).applyQuaternion(q);
  right.set(1, 0, 0).applyQuaternion(q);
  out.position.copy(local).applyMatrix4(surface.matrixWorld).addScaledVector(normal, pressing ? 0 : LIFT_M);
  dir.copy(normal).addScaledVector(right, kind === "marker" ? 0.45 : 0).addScaledVector(up, kind === "marker" ? -0.35 : 0).normalize();
  out.quaternion.setFromUnitVectors(Z, dir);
  return out;
}

export type ToolNodes = { tools: Map<ToolId, Object3D>; rest: Map<ToolId, Placement> };

/** The tray's five markers (00..04) and eraser under the whiteboard, and where each rests (local to its parent). */
export function findTools(root: Object3D): ToolNodes {
  const tools = new Map<ToolId, Object3D>();
  const rest = new Map<ToolId, Placement>();
  const add = (id: ToolId, o: Object3D | undefined) => {
    if (!o) return;
    tools.set(id, o);
    rest.set(id, { position: o.position.clone(), quaternion: o.quaternion.clone() });
  };
  for (let i = 0; i < 5; i++) add(i as ToolId, root.getObjectByName(`hs_whiteboard__marker_0${i}`));
  add("eraser", root.getObjectByName("hs_whiteboard__eraser"));
  return { tools, rest };
}

const local: Placement = { position: new Vector3(), quaternion: new Quaternion() };
const world = new Matrix4();
const inverse = new Matrix4();
const unusedScale = new Vector3();
const ONE = new Vector3(1, 1, 1);

/** Per-frame: the held tool comes from the tray to the hand and follows it; the rest go (or stay) home. Pure state. */
export class ToolMotion {
  private t = new Map<ToolId, number>();
  private followed = new Map<ToolId, Placement>();

  update(nodes: ToolNodes, input: { held: ToolId | null; hand: Placement | null; reduced: boolean; pressing: boolean }, dt: number): void {
    for (const [id, o] of nodes.tools) {
      const rest = nodes.rest.get(id)!;
      const holding = input.held === id && input.hand !== null;
      const t = approach(this.t.get(id) ?? 0, holding ? 1 : 0, dt, input.reduced ? 0 : TOOL_SECONDS);
      this.t.set(id, t);
      if (t === 0 || !o.parent) {
        o.position.copy(rest.position);
        o.quaternion.copy(rest.quaternion);
        this.followed.delete(id);
        continue;
      }
      // the hand, in the tool's parent's space, followed tightly (exactly under reduced motion, and while pressing, so the tip is never behind the ink)
      if (input.hand) {
        o.parent.updateWorldMatrix(true, false);
        world.compose(input.hand.position, input.hand.quaternion, ONE).premultiply(inverse.copy(o.parent.matrixWorld).invert());
        world.decompose(local.position, local.quaternion, unusedScale);
        let f = this.followed.get(id);
        if (!f || input.reduced) {
          f = { position: local.position.clone(), quaternion: local.quaternion.clone() };
          this.followed.set(id, f);
        } else {
          const k = 1 - Math.exp(-dt * FOLLOW_RATE);
          if (input.pressing) f.position.copy(local.position);
          else f.position.lerp(local.position, k);
          f.quaternion.slerp(local.quaternion, k);
        }
      }
      const f = this.followed.get(id);
      if (!f) continue;
      const e = easeInOutCubic(t);
      o.position.lerpVectors(rest.position, f.position, e);
      o.quaternion.slerpQuaternions(rest.quaternion, f.quaternion, e);
    }
  }
}
