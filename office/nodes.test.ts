import { describe, it, expect } from "vitest";
import manifest from "./manifest.json";
import { WALKIN_CAMERA } from "./walkin/cameraPose";
import { PLATTER_NODE, SLEEVE_NODE } from "./idle/turntable";
import { POSE_NODE } from "./walkin/skippingGirl";
import { CARD_NODE, DRAWER_NODE, SCREEN_NODE } from "./objects/motion";
import { work } from "@/content/work";
import { services } from "@/content/services";
import sleeves from "@/art/sleeves.json";
// plain NodeIO can't read the shipped GLB: it is meshopt-compressed (EXT_meshopt_compression is required)
import { createIO } from "../scripts/models/io.mjs";

// The runtime finds these nodes by name. check:models enforces the manifest, so the manifest must name
// them too, or a rename in Blender leaves the build green while the animation silently stops.
describe("runtime node names are required by the manifest", () => {
  const numbered = (names: string[], pattern: RegExp) =>
    names.map((n) => pattern.exec(n)?.[1]).filter((n): n is string => n !== undefined).map(Number).sort((a, b) => a - b);

  it("the walk-in camera exists and is animated", () => {
    expect(manifest.street.cameras).toContain(WALKIN_CAMERA);
    expect(manifest.street.animated).toContain(WALKIN_CAMERA);
  });

  it("the turntable platter exists", () => expect(manifest.office.nodes).toContain(PLATTER_NODE));

  it("the now-playing sleeves exist, numbered from 00 without gaps", () => {
    const sleeves = numbered(manifest.office.nodes, SLEEVE_NODE);
    expect(sleeves.length).toBeGreaterThanOrEqual(2);
    expect(sleeves).toEqual(sleeves.map((_, i) => i));
  });

  it("the Skipping Girl poses exist, numbered from 00 without gaps", () => {
    const poses = numbered(manifest.street.nodes, POSE_NODE);
    expect(poses.length).toBeGreaterThanOrEqual(2);
    expect(poses).toEqual(poses.map((_, i) => i));
  });

  it("the drawer, its business card and the monitor screen exist", () => {
    for (const n of [DRAWER_NODE, CARD_NODE, SCREEN_NODE]) expect(manifest.office.nodes).toContain(n);
  });

  it("every project's record has its logo on the front", () => {
    work.forEach((_, i) => expect(manifest.office.nodes).toContain(`hs_crate__record_${String(i).padStart(2, "0")}__art`));
  });

  it("every row of art/sleeves.json is a record in the crate with its cover and its vinyl", () => {
    sleeves.forEach((s, i) => {
      const record = `hs_crate__record_${String(i).padStart(2, "0")}`;
      for (const n of [`${record}__art`, `${record}__vinyl`]) expect(manifest.office.nodes, s.slug).toContain(n);
    });
  });

  it("only the project records hold a vinyl (the blanks behind can't be picked), and the player has its focus cameras", () => {
    work.forEach((_, i) => expect(manifest.office.nodes).toContain(`hs_crate__record_${String(i).padStart(2, "0")}__vinyl`));
    expect(manifest.office.nodes).not.toContain(`hs_crate__record_${String(work.length).padStart(2, "0")}__vinyl`);
    expect(manifest.office.cameras).toContain("cam_focus_player");
    expect(manifest.office.cameras).toContain("cam_focus_player_portrait");
  });

  it("the shelf has one ornament per service, and no more", () => {
    services.forEach((_, i) => expect(manifest.office.nodes).toContain(`hs_shelf__ornament_${String(i).padStart(2, "0")}`));
    expect(manifest.office.nodes).not.toContain(`hs_shelf__ornament_${String(services.length).padStart(2, "0")}`);
  });

  it("the monitor's notes come off one by one, each with a landing spot, and the laptop has a screen", () => {
    const notes = numbered(manifest.office.nodes, /^hs_monitor__notes__note_(\d\d)$/);
    expect(notes.length).toBeGreaterThanOrEqual(1);
    expect(notes).toEqual(notes.map((_, i) => i));
    notes.forEach((i) => expect(manifest.office.nodes).toContain(`hs_monitor__notes__rest_${String(i).padStart(2, "0")}`));
    expect(manifest.office.nodes).toContain("prop_laptop__screen");
  });

  it("the whiteboard is a hidden extra with a surface to draw on, five markers and an eraser, and its cameras", () => {
    for (const n of ["hs_whiteboard", "hs_whiteboard__surface", "hs_whiteboard__eraser"]) expect(manifest.office.nodes).toContain(n);
    for (let i = 0; i < 5; i++) expect(manifest.office.nodes).toContain(`hs_whiteboard__marker_0${i}`);
    expect(manifest.office.cameras).toContain("cam_focus_whiteboard");
    expect(manifest.office.cameras).toContain("cam_focus_whiteboard_portrait");
  });

  it("the monitor's screen is 16:9, like the reel's full-screen captures (spec 3.5)", async () => {
    const doc = await (await createIO()).read("public/models/office.glb");
    const node = doc.getRoot().listNodes().find((n) => n.getName() === "hs_monitor__screen")!;
    const pos = node.getMesh()!.listPrimitives()[0].getAttribute("POSITION")!;
    const pts = Array.from({ length: pos.getCount() }, (_, i) => pos.getElement(i, [0, 0, 0]));
    const span = (k: number) => Math.max(...pts.map((p) => p[k])) - Math.min(...pts.map((p) => p[k]));
    // the screen leans back about x, so its height lies in the y-z plane
    expect(span(0) / Math.hypot(span(1), span(2))).toBeCloseTo(1.7778, 2);
  });

  it("the neon sign's anchor hangs on the left wall over the couch, facing into the room (neon sign spec 6)", async () => {
    expect(manifest.office.nodes).toContain("prop_neon_sign");
    const doc = await (await createIO()).read("public/models/office.glb");
    const nodes = doc.getRoot().listNodes();
    const sign = nodes.find((n) => n.getName() === "prop_neon_sign")!;
    const stand = nodes.find((n) => n.getName() === "cam_stand")!;
    const couch = nodes.find((n) => n.getName() === "prop_couch")!;
    const m = sign.getWorldMatrix(); // column-major 4x4
    const axis = (c: number) => [m[c * 4], m[c * 4 + 1], m[c * 4 + 2]];
    const len = (v: number[]) => Math.hypot(...v);
    const unit = (v: number[]) => v.map((x) => x / len(v));
    const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
    const at = sign.getWorldTranslation();
    const toStand = unit(stand.getWorldTranslation().map((x, i) => x - at[i]));
    // ~0.85 m, uniform
    for (const c of [0, 1, 2]) expect(len(axis(c))).toBeCloseTo(0.85, 2);
    // up is up, and it faces the room: the standing spot is in front of it, not behind or edge-on
    expect(dot(unit(axis(1)), [0, 1, 0])).toBeGreaterThan(0.999);
    expect(dot(unit(axis(2)), toStand)).toBeGreaterThan(0.3);
    // over the couch: within the couch's footprint along the wall, ~1.78 m up
    const c = couch.getWorldTranslation();
    expect(Math.hypot(at[0] - c[0], at[2] - c[2])).toBeLessThan(1.0);
    expect(at[1]).toBeCloseTo(1.78, 1);
  });
});
