import { describe, it, expect } from "vitest";
import manifest from "./manifest.json";
import { WALKIN_CAMERA } from "./walkin/cameraPose";
import { PLATTER_NODE, SLEEVE_NODE } from "./idle/turntable";
import { POSE_NODE } from "./walkin/skippingGirl";
import { CARD_NODE, DRAWER_NODE, SCREEN_NODE } from "./objects/motion";
import { work } from "@/content/work";
import { services } from "@/content/services";

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
});
