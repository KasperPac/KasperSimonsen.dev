import { Matrix4, Quaternion, Vector3, type Object3D } from "three";
import { easeInOutCubic } from "@/office/camera/pose";
import { PLAYER_MOVE } from "@/office/camera/rig";
import { approach } from "./motion";

/** An LP sleeve's side, metres (office_props.SLEEVE). */
export const SLEEVE_M = 0.315;
/** How far a flicked record tips forward on its bottom edge, radians from rest: it leans on the crate's front wall (measured in Blender, plan Task 2). */
export const FLIP_ANGLE = 0.17;
export const FLIP_SECONDS = 0.35;
/** The front record rises straight up this far first, clear of the flicked records' vinyls and the crate wall (measured in Blender). */
export const CLEAR_LIFT_M = 0.38;
/**
 * Where the front record is held while browsing, from its rest, in the crate's frame: forward (`slide`), up (`lift`),
 * its top tipped back (`tilt`, radians about its own x) so its cover faces the camera and the records behind stay in
 * sight to hover (measured in Blender). Like pulling a record forward in a shop.
 */
export const DISPLAY = { lift: 0.14, slide: 0.2, tilt: -0.35 };
export const LIFT_SECONDS = 0.6;

/** The front record's offset from rest at lift progress `t`: straight up to CLEAR_LIFT_M by halfway, then forward and down into DISPLAY. */
export function displayOffset(t: number): { lift: number; slide: number; tilt: number } {
  if (t <= 0.5) return { lift: CLEAR_LIFT_M * easeInOutCubic(t / 0.5), slide: 0, tilt: 0 };
  const e = easeInOutCubic((t - 0.5) / 0.5);
  return { lift: DISPLAY.lift * e + CLEAR_LIFT_M * (1 - e), slide: DISPLAY.slide * e, tilt: DISPLAY.tilt * e };
}

/**
 * How long each step of playing a record takes, in order. The flight over matches the camera's move to the player, so
 * the record and the camera arrive together; the vinyl and the sleeve then play out in front of the parked camera.
 */
const PLAY_STEPS = { travel: PLAYER_MOVE.seconds, slideOut: 0.35, lay: 0.35, toStand: 0.4, turn: 0.45 };
export const PLAY_SECONDS = Object.values(PLAY_STEPS).reduce((a, b) => a + b, 0);
/** Back retraces it at the same pace: the camera heads home first and the record follows it back into view. */
export const PLAY_BACK_SECONDS = PLAY_SECONDS;
/** The sleeve hovers this far above the platter while its vinyl comes out. */
const PRESENT_ABOVE_M = 0.12;
/** A laid vinyl rests this far above the platter's top. */
/** A laid disc's centre above the platter's origin: the mat's top plus half the disc (measured in Blender; the spindle stands higher). */
const ON_PLATTER_M = 0.021;

/** The record at the front of the dig, kept to the records that have projects. */
export function clampDig(dig: number, count: number): number {
  return Math.max(0, Math.min(count - 1, Math.round(dig)));
}

const band = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));

/** Progress through each step of playing a record, from the overall progress `t`. */
export function playPhases(t: number): Record<keyof typeof PLAY_STEPS, number> {
  let at = 0;
  const out = { travel: 0, slideOut: 0, lay: 0, toStand: 0, turn: 0 };
  for (const step of Object.keys(PLAY_STEPS) as (keyof typeof PLAY_STEPS)[]) {
    const from = at;
    at += PLAY_STEPS[step];
    out[step] = band(t, from / PLAY_SECONDS, at / PLAY_SECONDS);
  }
  return out;
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
/** A vinyl's face: its own local +y (office_props._vinyl, stood up +90° about x in its sleeve), so lying flat it takes the platter's orientation. */
const FACE = Y;
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
/** The platter as of this frame: its origin (`top`), its up, and the pose a disc lying on it takes. */
const deck = { top: new Vector3(), up: new Vector3(), quaternion: new Quaternion(), disc: { position: new Vector3(), quaternion: new Quaternion() } };

/** Reads the platter afresh, so a laid vinyl turns with it. */
function readDeck(platter: Object3D): void {
  platter.updateWorldMatrix(true, false);
  platter.matrixWorld.decompose(deck.top, deck.quaternion, unusedScale);
  deck.up.copy(Y).applyQuaternion(deck.quaternion);
  deck.disc.position.copy(deck.top).addScaledVector(deck.up, ON_PLATTER_M);
  deck.disc.quaternion.copy(deck.quaternion); // its face (local y) on the platter's up
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
  face.copy(FACE).applyQuaternion(discAt.quaternion);
  flat.setFromUnitVectors(face, deck.up).multiply(discAt.quaternion); // V1 tipped flat the short way
  spin.copy(flat).invert().multiply(deck.disc.quaternion); // flat → V2: a turn about the face (local y)
  const half = 2 * Math.atan2(spin.y, spin.w);
  const wrapped = Math.atan2(Math.sin(half), Math.cos(half));
  const turned = p.lay === 1 || Number.isNaN(twist) ? wrapped : wrapped + TAU * Math.round((twist - wrapped) / TAU);
  discAt.position.lerp(deck.disc.position, p.lay);
  discAt.quaternion.slerp(flat, p.lay).multiply(spin.setFromAxisAngle(FACE, turned * p.lay));
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
      this.lift[i] = approach(this.lift[i] ?? 0, input.lifted === i && input.playing === null ? 1 : 0, dt, input.reduced ? 0 : LIFT_SECONDS);
      const out = displayOffset(this.lift[i]);
      this.play[i] = approach(this.play[i] ?? 0, playing ? 1 : 0, dt, input.reduced ? 0 : playing ? PLAY_SECONDS : PLAY_BACK_SECONDS);

      // where it rests in the crate: tipped forward on its bottom edge if flicked, raised if it is the front one
      resting.position.copy(nodes.restPosition[i]);
      // up the crate and toward its front; untouched at rest, so it lands back exactly (adding 0 would turn -0 into +0)
      if (out.lift) resting.position.y += out.lift;
      if (out.slide) resting.position.z += out.slide;
      resting.quaternion
        .copy(nodes.restQuaternion[i])
        .multiply(tip.setFromAxisAngle(X, FLIP_ANGLE * easeInOutCubic(this.flip[i])))
        .multiply(tip.setFromAxisAngle(X, out.tilt)); // the front one held up, its cover to you
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
