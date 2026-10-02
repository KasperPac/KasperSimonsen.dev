import { describe, it, expect } from "vitest";
import { cameraKey } from "./key";

describe("cameraKey (a change starts a camera move)", () => {
  it("changes when the director moves on, or onto another object", () => {
    expect(cameraKey("focusing", "hs_crate", false, true)).not.toBe(cameraKey("focused", "hs_crate", false, true));
    expect(cameraKey("focused", "hs_crate", false, true)).not.toBe(cameraKey("focused", "hs_shelf", false, true));
  });
  it("changes when a record goes onto the player (the crate's other view)", () =>
    expect(cameraKey("focused", "hs_crate", true, true)).not.toBe(cameraKey("focused", "hs_crate", false, true)));
  it("changes when the object's cameras arrive with the model, so an early click still gets its move", () =>
    expect(cameraKey("focused", "hs_drawer", false, true)).not.toBe(cameraKey("focused", "hs_drawer", false, false)));
});
