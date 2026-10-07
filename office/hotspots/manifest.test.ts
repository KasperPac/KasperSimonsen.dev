import { describe, it, expect } from "vitest";
import manifest from "../manifest.json";
import { ALL_HOTSPOTS, FOCUS_CAMERA } from "./registry";

describe("manifest covers the hotspots", () => {
  it("requires every hotspot node", () => {
    for (const h of ALL_HOTSPOTS) expect(manifest.office.nodes).toContain(h);
  });
  it("requires every focus camera and its portrait variant", () => {
    for (const h of ALL_HOTSPOTS) {
      expect(manifest.office.cameras).toContain(FOCUS_CAMERA[h]);
      expect(manifest.office.cameras).toContain(`${FOCUS_CAMERA[h]}_portrait`);
    }
  });
});
