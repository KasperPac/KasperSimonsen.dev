import { describe, it, expect } from "vitest";
import { Group, Object3D, Quaternion, Vector3 } from "three";
import { easeInOutCubic } from "@/office/camera/pose";
import { fallPlacement, findNotesNodes, noteProgress, NotesMotion, notesSeconds, NOTE_FALL_SECONDS, NOTE_FLUTTER_M, NOTE_STAGGER_SECONDS } from "./notes";

/** hs_monitor__notes with `count` notes up on the bezel and their rest_ empties lower down on the desk. */
function rig(count = 4) {
  const root = new Group();
  root.name = "hs_monitor__notes";
  for (let i = 0; i < count; i++) {
    const n = new Group();
    n.name = `hs_monitor__notes__note_0${i}`;
    n.position.set(-0.2 + 0.13 * i, 0.4, 0);
    n.rotation.y = 0.1 * i;
    const r = new Object3D();
    r.name = `hs_monitor__notes__rest_0${i}`;
    r.position.set(-0.3 + 0.2 * i, 0.002, 0.25);
    r.rotation.set(-Math.PI / 2, 0, 0.3 * (i % 2 ? 1 : -1));
    root.add(n, r);
  }
  return { root, nodes: findNotesNodes(root) };
}
const place = () => ({ position: new Vector3(), quaternion: new Quaternion() });

describe("timing", () => {
  it("all four are down within ~0.9 s", () => expect(notesSeconds(4)).toBeCloseTo(NOTE_FALL_SECONDS + 3 * NOTE_STAGGER_SECONDS));
  it("one after another, NOTE_STAGGER_SECONDS apart", () => {
    expect(noteProgress(0, NOTE_STAGGER_SECONDS)).toBeGreaterThan(0);
    expect(noteProgress(1, NOTE_STAGGER_SECONDS)).toBe(0);
    expect(noteProgress(3, notesSeconds(4))).toBe(1);
  });
});

describe("fallPlacement", () => {
  const { nodes } = rig(1);
  it("starts on the bezel and ends exactly on its spot", () => {
    const a = fallPlacement(nodes.stuck[0], nodes.rest[0], 0, place());
    expect(a.position.distanceTo(nodes.stuck[0].position)).toBeLessThan(1e-9);
    const b = fallPlacement(nodes.stuck[0], nodes.rest[0], 1, place());
    expect(b.position.distanceTo(nodes.rest[0].position)).toBeLessThan(1e-9);
    expect(b.quaternion.angleTo(nodes.rest[0].quaternion)).toBeLessThan(1e-6);
  });
  it("falls: it drops slowly at first and fastest at the end", () => {
    const y = (t: number) => fallPlacement(nodes.stuck[0], nodes.rest[0], t, place()).position.y;
    expect(y(0) - y(0.25)).toBeLessThan(y(0.75) - y(1));
  });
  it("flutters sideways on the way down", () => {
    const mid = fallPlacement(nodes.stuck[0], nodes.rest[0], 0.25, place()).position;
    const { stuck, rest } = { stuck: nodes.stuck[0].position, rest: nodes.rest[0].position };
    const baseline = stuck.x + (rest.x - stuck.x) * easeInOutCubic(0.25);
    expect(mid.x - baseline).toBeCloseTo(NOTE_FLUTTER_M * Math.sin(2 * Math.PI * 0.25) * 0.75, 9);
  });
});

describe("findNotesNodes", () => {
  it("finds the notes in order with their spots, and skips a note without one", () => {
    const { root, nodes } = rig(3);
    root.remove(root.getObjectByName("hs_monitor__notes__rest_02")!);
    const again = findNotesNodes(root);
    expect(nodes.notes.map((n) => n.name)).toEqual(["hs_monitor__notes__note_00", "hs_monitor__notes__note_01", "hs_monitor__notes__note_02"]);
    expect(again.notes).toHaveLength(2);
  });
});

describe("NotesMotion", () => {
  it("all down within notesSeconds of opening, then `down`", () => {
    const { nodes } = rig();
    const m = new NotesMotion();
    m.update(nodes, { open: true, reduced: false }, notesSeconds(4) - 0.05);
    expect(m.down).toBe(false);
    m.update(nodes, { open: true, reduced: false }, 0.1);
    expect(m.down).toBe(true);
    nodes.notes.forEach((n, i) => expect(n.position.distanceTo(nodes.rest[i].position)).toBeLessThan(1e-9));
  });
  it("back on the bezel the same way when it closes", () => {
    const { nodes } = rig();
    const m = new NotesMotion();
    m.update(nodes, { open: true, reduced: false }, 5);
    m.update(nodes, { open: false, reduced: false }, 5);
    expect(m.down).toBe(false);
    nodes.notes.forEach((n, i) => {
      expect(n.position.distanceTo(nodes.stuck[i].position)).toBeLessThan(1e-9);
      expect(n.quaternion.angleTo(nodes.stuck[i].quaternion)).toBeLessThan(1e-6);
    });
  });
  it("turns round mid-fall from wherever each note is", () => {
    const { nodes } = rig();
    const m = new NotesMotion();
    m.update(nodes, { open: true, reduced: false }, 0.4);
    const at = nodes.notes[0].position.clone();
    m.update(nodes, { open: false, reduced: false }, 0.05);
    expect(nodes.notes[0].position.distanceTo(at)).toBeLessThan(0.1); // no snap home
    expect(nodes.notes[0].position.distanceTo(nodes.stuck[0].position)).toBeGreaterThan(1e-4);
    expect(nodes.notes[0].position.distanceTo(nodes.stuck[0].position)).toBeLessThan(at.distanceTo(nodes.stuck[0].position)); // towards the bezel
  });
  it("switches at once under reduced motion", () => {
    const { nodes } = rig();
    const m = new NotesMotion();
    m.update(nodes, { open: true, reduced: true }, 1 / 60);
    expect(m.down).toBe(true);
    m.update(nodes, { open: false, reduced: true }, 1 / 60);
    expect(nodes.notes[2].position.distanceTo(nodes.stuck[2].position)).toBeLessThan(1e-9);
  });
});
