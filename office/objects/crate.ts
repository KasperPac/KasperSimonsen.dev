import { Matrix4, Quaternion, Vector3, type Mesh, type Object3D } from "three";
import { easeInOutCubic } from "@/office/camera/pose";
import { approach } from "./motion";

/** An LP sleeve's side, metres (office_props.SLEEVE). */
export const SLEEVE_M = 0.315;
/** How far a flicked record tips forward on its bottom edge, radians from rest: it leans on the crate's front wall (measured in Blender, plan Task 2). */
export const FLIP_ANGLE = 0.17;
export const FLIP_SECONDS = 0.35;
/** How far the front record rises while browsing, so its whole cover shows over the flicked records (measured in Blender, Task 8). */
export const LIFT_M = 0.2;
export const PLAY_SECONDS = 2.4;
export const PLAY_BACK_SECONDS = 1.2;
/** The sleeve hovers this far above the platter while its vinyl comes out. */
const PRESENT_ABOVE_M = 0.12;
/** A laid vinyl rests this far above the platter's top. */
const ON_PLATTER_M = 0.002;

/** The record at the front of the dig, kept to the records that have projects. */
export function clampDig(dig: number, count: number): number {
  return Math.max(0, Math.min(count - 1, Math.round(dig)));
}

const band = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));

/** Progress through each step of playing a record, from the overall progress `t`. */
export function playPhases(t: number) {
  return { travel: band(t, 0, 0.35), slideOut: band(t, 0.35, 0.5), lay: band(t, 0.5, 0.65), toStand: band(t, 0.65, 0.82), turn: band(t, 0.82, 1) };
}

type Phases = ReturnType<typeof playPhases>;
type Placement = { position: Vector3; quaternion: Quaternion };

export type PlayerPoses = { platter: Object3D; stand: Placement };

export type CrateNodes = { records: Object3D[]; vinyls: (Object3D | null)[]; restPosition: Vector3[]; restQuaternion: Quaternion[]; vinylRest: Placement[] };

/** The crate's records (index order), each one's vinyl (its child `<record>__vinyl`), and where they all rest, local to their parents. */
export function findCrateNodes(records: Object3D[]): CrateNodes {
  const vinyls = records.map((r) => r.children.find((c) => c.name === `${r.name}__vinyl`) ?? null);
  return {
    records,
    vinyls,
    restPosition: records.map((r) => r.position.clone()),
    restQuaternion: records.map((r) => r.quaternion.clone()),
    vinylRest: vinyls.map((v) => ({ position: v ? v.position.clone() : new Vector3(), quaternion: v ? v.quaternion.clone() : new Quaternion() })),
  };
}

const TAU = Math.PI * 2;
const X = new Vector3(1, 0, 0);
const Y = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);
const FLAT = new Quaternion().setFromAxisAngle(X, -Math.PI / 2);
const tip = new Quaternion();
const turn = new Quaternion();
const flat = new Quaternion();
const spin = new Quaternion();
const face = new Vector3();
const resting = { position: new Vector3(), quaternion: new Quaternion() };
const sleeveAt = { position: new Vector3(), quaternion: new Quaternion(), scale: new Vector3() };
const discAt = { position: new Vector3(), quaternion: new Quaternion(), scale: new Vector3() };
const hover = new Vector3();
const world = new Matrix4();
const parentInverse = new Matrix4();
const unusedScale = new Vector3();
/** The platter as of this frame: its top centre, its up, and the pose a disc lying on it takes. */
const deck = { top: new Vector3(), up: new Vector3(), quaternion: new Quaternion(), disc: { position: new Vector3(), quaternion: new Quaternion() } };

/** Height of the platter's top above its origin: its geometry's top if it is a mesh, else its origin. */
function platterHeight(platter: Object3D): number {
  const mesh = platter as Mesh;
  if (!mesh.isMesh) return 0;
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox!.max.y;
}

/** Reads the platter afresh, so a laid vinyl turns with it. */
function readDeck(platter: Object3D): void {
  platter.updateWorldMatrix(true, false);
  platter.matrixWorld.decompose(deck.top, deck.quaternion, unusedScale);
  deck.up.copy(Y).applyQuaternion(deck.quaternion);
  platter.localToWorld(deck.top.set(0, platterHeight(platter), 0));
  deck.disc.position.copy(deck.top).addScaledVector(deck.up, ON_PLATTER_M);
  deck.disc.quaternion.copy(deck.quaternion).multiply(FLAT); // the disc's face (local z) turned to the platter's up
}

/** Writes a world pose into `o`'s local position and quaternion, through its parent; its own scale is left alone. */
function setWorldPose(o: Object3D, parent: Object3D, position: Vector3, quaternion: Quaternion, worldScale: Vector3): void {
  world.compose(position, quaternion, worldScale).premultiply(parentInverse.copy(parent.matrixWorld).invert());
  world.decompose(o.position, o.quaternion, unusedScale);
  o.updateWorldMatrix(false, false);
}

/**
 * Places a sleeve part way through being played. From where it rests in the crate (S0) it flies to hover upright over
 * the platter, facing as the stand does (S1, `travel`), then goes to the stand (S2, `toStand`) and turns round on the
 * spot to show its back (S3, `turn`). The sleeve's origin is its bottom edge, its front is local +z.
 */
function placeSleeve(sleeve: Object3D, parent: Object3D, stand: Placement, p: Phases): void {
  parent.updateWorldMatrix(true, false);
  world.compose(resting.position, resting.quaternion, sleeve.scale).premultiply(parent.matrixWorld);
  world.decompose(sleeveAt.position, sleeveAt.quaternion, sleeveAt.scale);
  hover.copy(deck.top).addScaledVector(deck.up, PRESENT_ABOVE_M);
  sleeveAt.position.lerp(hover, p.travel);
  sleeveAt.quaternion.slerp(stand.quaternion, p.travel);
  sleeveAt.position.lerp(stand.position, p.toStand);
  sleeveAt.quaternion.slerp(stand.quaternion, p.toStand);
  sleeveAt.quaternion.multiply(turn.setFromAxisAngle(Y, Math.PI * p.turn));
  setWorldPose(sleeve, parent, sleeveAt.position, sleeveAt.quaternion, sleeveAt.scale);
}

/**
 * Places a vinyl part way through being played. It rides in its sleeve (V0) until the sleeve hovers over the platter,
 * slides a sleeve's length out of the top (V1, `slideOut`), then lies down flat on the platter (V2, `lay`). V2 is read
 * every frame, so once laid the vinyl stays on the platter, and turns with it, while the sleeve goes to the stand.
 *
 * Lying down tips the disc over the short way and turns it about its face by `twist` alongside. A plain slerp to V2
 * would not do: V2 turns with the platter, and the short way to it swaps sides as it does, flipping the disc mid-lay.
 * `twist` follows on from the previous frame's while laying (NaN when there is none) and is returned for the next.
 */
function placeVinyl(vinyl: Object3D, sleeve: Object3D, rest: Placement, p: Phases, twist: number): number {
  vinyl.position.copy(rest.position).addScaledVector(Y, SLEEVE_M * p.slideOut);
  vinyl.quaternion.copy(rest.quaternion);
  if (p.lay === 0) return Number.NaN;
  world.compose(vinyl.position, vinyl.quaternion, vinyl.scale).premultiply(sleeve.matrixWorld);
  world.decompose(discAt.position, discAt.quaternion, discAt.scale);
  face.copy(Z).applyQuaternion(discAt.quaternion);
  flat.setFromUnitVectors(face, deck.up).multiply(discAt.quaternion); // V1 tipped flat the short way
  spin.copy(flat).invert().multiply(deck.disc.quaternion); // flat → V2: a turn about the face (local z)
  const half = 2 * Math.atan2(spin.z, spin.w);
  const wrapped = Math.atan2(Math.sin(half), Math.cos(half));
  const turned = p.lay === 1 || Number.isNaN(twist) ? wrapped : wrapped + TAU * Math.round((twist - wrapped) / TAU);
  discAt.position.lerp(deck.disc.position, p.lay);
  discAt.quaternion.slerp(flat, p.lay).multiply(spin.setFromAxisAngle(Z, turned * p.lay));
  setWorldPose(vinyl, sleeve, discAt.position, discAt.quaternion, discAt.scale);
  return turned;
}

const eased = (p: Phases): Phases => ({
  travel: easeInOutCubic(p.travel),
  slideOut: easeInOutCubic(p.slideOut),
  lay: easeInOutCubic(p.lay),
  toStand: easeInOutCubic(p.toStand),
  turn: easeInOutCubic(p.turn),
});

/** Per-frame easing of the flicks, the front record's lift and playing a record. Pure state: no React, no clocks. Runs after ObjectMotion (the tease). */
export class CrateMotion {
  private flip: number[] = [];
  private lift: number[] = [];
  private play: number[] = [];
  private twist: number[] = [];
  private playingIndex: number | null = null;

  /** True once the playing record's vinyl is on the platter and its sleeve turned round on the stand (its details wait for it). */
  get playDone(): boolean {
    return this.playingIndex !== null && this.play[this.playingIndex] === 1;
  }

  update(
    nodes: CrateNodes,
    input: { dig: number; lifted: number | null; playing: number | null; player: PlayerPoses | null; reduced: boolean },
    dt: number,
  ): void {
    this.playingIndex = input.playing;
    if (input.player) readDeck(input.player.platter);
    nodes.records.forEach((r, i) => {
      const wasPlaying = (this.play[i] ?? 0) > 0;
      const playing = input.playing === i;
      this.flip[i] = approach(this.flip[i] ?? 0, i < input.dig ? 1 : 0, dt, input.reduced ? 0 : FLIP_SECONDS);
      this.lift[i] = approach(this.lift[i] ?? 0, input.lifted === i && input.playing === null ? 1 : 0, dt, input.reduced ? 0 : FLIP_SECONDS);
      this.play[i] = approach(this.play[i] ?? 0, playing ? 1 : 0, dt, input.reduced ? 0 : playing ? PLAY_SECONDS : PLAY_BACK_SECONDS);

      // where it rests in the crate: tipped forward on its bottom edge if flicked, raised if it is the front one
      resting.position.copy(nodes.restPosition[i]);
      resting.position.y += LIFT_M * easeInOutCubic(this.lift[i]); // up the crate; x and z stay exactly at rest
      resting.quaternion.copy(nodes.restQuaternion[i]).multiply(tip.setFromAxisAngle(X, FLIP_ANGLE * easeInOutCubic(this.flip[i])));
      const vinyl = nodes.vinyls[i];
      if (this.play[i] === 0 || !input.player || !r.parent) {
        if (this.lift[i] > 0 || wasPlaying) r.position.copy(resting.position); // lifted, or just put back: all the way home
        else {
          r.position.x = resting.position.x; // y is the tease's (ObjectMotion), left alone
          r.position.z = resting.position.z;
        }
        r.quaternion.copy(resting.quaternion);
        vinyl?.position.copy(nodes.vinylRest[i].position);
        vinyl?.quaternion.copy(nodes.vinylRest[i].quaternion);
        return;
      }
      const p = eased(playPhases(this.play[i]));
      placeSleeve(r, r.parent, input.player.stand, p);
      if (vinyl) this.twist[i] = placeVinyl(vinyl, r, nodes.vinylRest[i], p, this.twist[i] ?? Number.NaN);
    });
  }
}
