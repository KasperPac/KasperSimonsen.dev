import { describe, it, expect } from "vitest";
import { BoxGeometry, Group, Mesh, Object3D, Quaternion, Vector3 } from "three";
import {
  clampDig,
  CrateMotion,
  findCrateNodes,
  FLIP_ANGLE,
  FLIP_SECONDS,
  FLIGHT,
  climbShare,
  flightPoint,
  flightTurn,
  PLAY_BACK_SECONDS,
  PLAY_SECONDS,
  playPhases,
  SLEEVE_M,
  type PlayerPoses,
} from "./crate";
import { PLAYER_MOVE } from "@/office/camera/rig";

function crate() {
  const root = new Group();
  root.position.set(1, 0, 0);
  const records = [0, 1, 2].map((i) => {
    const r = new Mesh(new BoxGeometry(SLEEVE_M, SLEEVE_M, 0.005));
    r.name = `hs_crate__record_0${i}`;
    r.position.set(0, 0.012, -0.03 * i);
    r.rotation.x = -0.14;
    // as office.glb has it: the disc's face is its own local +y, stood up +90° about x in its sleeve
    const v = new Mesh(new BoxGeometry(0.3, 0.002, 0.3));
    v.name = `${r.name}__vinyl`;
    v.position.y = 0.205;
    v.rotation.x = Math.PI / 2;
    r.add(v);
    root.add(r);
    return r;
  });
  root.updateMatrixWorld(true);
  return { root, nodes: findCrateNodes(records) };
}

function rigWithPlayer() {
  const { root, nodes } = crate();
  const platter = new Object3D(); // no geometry: its top is its origin
  platter.position.set(-2, 0.7, 0);
  const scene = new Group();
  scene.add(root, platter);
  scene.updateMatrixWorld(true);
  const player: PlayerPoses = { platter, stand: { position: new Vector3(-2.6, 0.9, 0), quaternion: new Quaternion() }, toward: new Vector3(0, 0, 1) };
  return { nodes, player, platter };
}

describe("clampDig", () => {
  it("stops at the last project", () => expect(clampDig(5, 3)).toBe(2));
  it("stops at the front", () => expect(clampDig(-1, 3)).toBe(0));
});

describe("CrateMotion", () => {
  it("flicks the records in front of the dig forward over FLIP_SECONDS, leaving the rest", () => {
    const { nodes } = crate();
    const m = new CrateMotion();
    m.update(nodes, { dig: 1, playing: null, player: null, reduced: false }, FLIP_SECONDS);
    expect(nodes.records[0].rotation.x).toBeCloseTo(-0.14 + FLIP_ANGLE);
    expect(nodes.records[1].rotation.x).toBeCloseTo(-0.14);
  });
  it("is part way through a flick half way through it", () => {
    const { nodes } = crate();
    const m = new CrateMotion();
    m.update(nodes, { dig: 1, playing: null, player: null, reduced: false }, FLIP_SECONDS / 2);
    expect(nodes.records[0].rotation.x).toBeGreaterThan(-0.14);
    expect(nodes.records[0].rotation.x).toBeLessThan(-0.14 + FLIP_ANGLE);
  });
  it("switches at once under reduced motion", () => {
    const { nodes } = crate();
    const m = new CrateMotion();
    m.update(nodes, { dig: 2, playing: null, player: null, reduced: true }, 0.001);
    expect(nodes.records[1].rotation.x).toBeCloseTo(-0.14 + FLIP_ANGLE);
  });
  it("keeps whatever height the tease gave a record that isn't lifted or playing", () => {
    const { nodes } = crate();
    const m = new CrateMotion();
    nodes.records[1].position.y = 0.05; // ObjectMotion's nudge, written earlier in the frame
    m.update(nodes, { dig: 0, playing: null, player: null, reduced: false }, 0.016);
    expect(nodes.records[1].position.y).toBe(0.05);
  });
});

describe("playPhases", () => {
  it("runs travel, slide out, lay, to the stand, then the turn, in order, each starting as the last ends", () => {
    expect(playPhases(0)).toEqual({ travel: 0, slideOut: 0, lay: 0, toStand: 0, turn: 0 });
    const steps = ["travel", "slideOut", "lay", "toStand", "turn"] as const;
    let previous = 0;
    for (const step of steps) {
      // find where this step finishes, and check the next one hasn't started before it
      let t = previous;
      while (t < 1 && playPhases(t)[step] < 1) t += 0.001;
      expect(t).toBeGreaterThan(previous);
      const next = steps[steps.indexOf(step) + 1];
      if (next) expect(playPhases(t - 0.002)[next]).toBe(0);
      previous = t;
    }
    expect(playPhases(1)).toEqual({ travel: 1, slideOut: 1, lay: 1, toStand: 1, turn: 1 });
  });
  it("flies the record over in step with the camera's move to the player, so they arrive together", () => {
    expect(playPhases(PLAYER_MOVE.seconds / PLAY_SECONDS).travel).toBeCloseTo(1, 6);
    expect(playPhases(PLAYER_MOVE.seconds / 2 / PLAY_SECONDS).travel).toBeCloseTo(0.5, 6);
    expect(playPhases(PLAYER_MOVE.seconds / PLAY_SECONDS).slideOut).toBe(0);
  });
  it("puts a record back by retracing it at the pace it came, never faster", () => expect(PLAY_BACK_SECONDS).toBe(PLAY_SECONDS));
});

describe("flightPoint (out of the crate, over the desk, under the shelf, never through anything)", () => {
  const from = new Vector3(0, 0.012, 0);
  const to = new Vector3(-2, 0.8, 0.3);
  const toward = new Vector3(0, 0, 1); // into the room, toward the standing spot
  const at = (t: number) => flightPoint(from, to, toward, t, new Vector3());
  it("starts and ends exactly where it should", () => {
    expect(at(0).toArray()).toEqual(from.toArray());
    expect(at(1).toArray().map((v) => +v.toFixed(9))).toEqual(to.toArray());
  });
  it("first rises straight up out of the crate, not turning or moving sideways", () => {
    const early = at(0.05);
    expect(early.x).toBe(from.x);
    expect(early.z).toBe(from.z);
    expect(early.y).toBeGreaterThan(from.y);
    expect(flightTurn(0.05, climbShare(from))).toBe(0);
  });
  it("is over the desk at cruising height in the middle", () => expect(at(0.5).y).toBeGreaterThan(FLIGHT.cruise * 0.8));
  it("comes in to the player from the room's side, under the shelf", () => {
    const late = at(0.9);
    expect(late.z - to.z).toBeGreaterThan(0); // on the room's side of the platter
    expect(late.y).toBeLessThan(FLIGHT.approach);
  });
  it("leaves the crate without a jolt: the climb runs into the arc at the same speed", () => {
    const s = climbShare(from);
    const before = at(s - 1e-4).distanceTo(at(s - 2e-4));
    const after = at(s + 2e-4).distanceTo(at(s + 1e-4));
    expect(after / before).toBeCloseTo(1, 1);
  });
});

describe("CrateMotion play", () => {
  it("flies a played record over in an arc, above the straight line", () => {
    const { nodes, player } = rigWithPlayer();
    const m = new CrateMotion();
    const start = nodes.records[0].getWorldPosition(new Vector3());
    m.update(nodes, { dig: 0, playing: 0, player, reduced: false }, (PLAYER_MOVE.seconds / 2));
    const mid = nodes.records[0].getWorldPosition(new Vector3());
    const end = player.platter.getWorldPosition(new Vector3());
    expect(mid.y).toBeGreaterThan(Math.max(start.y, end.y) + 0.3);
  });
  it("plays a record: its vinyl ends flat on the platter and its sleeve turned round on the stand", () => {
    const { nodes, player, platter } = rigWithPlayer();
    const m = new CrateMotion();
    m.update(nodes, { dig: 0, playing: 0, player, reduced: false }, PLAY_SECONDS);
    expect(m.playDone).toBe(true);
    const sleeve = nodes.records[0];
    expect(sleeve.getWorldPosition(new Vector3()).distanceTo(player.stand.position)).toBeLessThan(1e-6);
    const front = new Vector3(0, 0, 1).applyQuaternion(sleeve.getWorldQuaternion(new Quaternion()));
    expect(front.z).toBeCloseTo(-1); // turned round: the front faces away from where the stand's front faced (+z)
    const vinyl = nodes.vinyls[0]!;
    const normal = new Vector3(0, 1, 0).applyQuaternion(vinyl.getWorldQuaternion(new Quaternion())); // its face
    expect(Math.abs(normal.y)).toBeCloseTo(1); // lying flat
    const centre = vinyl.getWorldPosition(new Vector3());
    expect(Math.hypot(centre.x - platter.position.x, centre.z - platter.position.z)).toBeLessThan(1e-6);
    expect(centre.y).toBeGreaterThan(platter.position.y);
  });
  it("spins the vinyl with the platter", () => {
    const { nodes, player, platter } = rigWithPlayer();
    const m = new CrateMotion();
    m.update(nodes, { dig: 0, playing: 0, player, reduced: false }, PLAY_SECONDS);
    const before = nodes.vinyls[0]!.getWorldQuaternion(new Quaternion());
    platter.rotation.y = 1;
    platter.updateMatrixWorld(true);
    m.update(nodes, { dig: 0, playing: 0, player, reduced: false }, 0.016);
    expect(nodes.vinyls[0]!.getWorldQuaternion(new Quaternion()).angleTo(before)).toBeCloseTo(1, 5);
  });
  it("puts it all back from wherever it is (Back mid-flight), never jumping", () => {
    const { nodes, player } = rigWithPlayer();
    const m = new CrateMotion();
    m.update(nodes, { dig: 0, playing: 0, player, reduced: false }, PLAY_SECONDS * 0.3);
    const mid = nodes.records[0].getWorldPosition(new Vector3());
    m.update(nodes, { dig: 0, playing: null, player, reduced: false }, 0.016);
    expect(nodes.records[0].getWorldPosition(new Vector3()).distanceTo(mid)).toBeLessThan(0.1);
    m.update(nodes, { dig: 0, playing: null, player, reduced: false }, PLAY_BACK_SECONDS + FLIP_SECONDS);
    expect(nodes.records[0].position.toArray()).toEqual(nodes.restPosition[0].toArray());
    expect(nodes.vinyls[0]!.position.toArray()).toEqual(nodes.vinylRest[0].position.toArray());
  });
  it("switches straight to playing under reduced motion", () => {
    const { nodes, player } = rigWithPlayer();
    const m = new CrateMotion();
    m.update(nodes, { dig: 0, playing: 0, player, reduced: true }, 0.001);
    expect(m.playDone).toBe(true);
  });
});
