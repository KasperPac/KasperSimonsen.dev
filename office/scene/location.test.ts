import { describe, it, expect } from "vitest";
import { layerOf, LAYER_KEY, NO_LAYER, sceneFor } from "./location";

describe("layerOf", () => {
  it("reads the office layer out of history.state", () =>
    expect(layerOf({ [LAYER_KEY]: { focus: "hs_drawer", reading: true }, __NA: true })).toEqual({ focus: "hs_drawer", reading: true }));
  it.each([[null], [undefined], [{}], [{ [LAYER_KEY]: "nope" }], [{ [LAYER_KEY]: { focus: "hs_sofa", reading: "yes" } }]])(
    "falls back to no layer for %j",
    (state) => expect(layerOf(state)).toEqual(NO_LAYER),
  );
  it("returns the shared NO_LAYER for a stored empty layer, so clearLayer can tell it's already clear", () =>
    expect(layerOf({ [LAYER_KEY]: { focus: null, reading: false }, __NA: true })).toBe(NO_LAYER));
});

describe("sceneFor", () => {
  it("the standing spot", () => expect(sceneFor("/", NO_LAYER)).toEqual({ target: null, reading: false }));
  it("a local layer focuses its object on /", () =>
    expect(sceneFor("/", { focus: "hs_monitor", reading: false })).toEqual({ target: { hotspot: "hs_monitor", item: null }, reading: false }));
  it("a routed path focuses its object whatever the layer says", () =>
    expect(sceneFor("/contact", NO_LAYER)).toEqual({ target: { hotspot: "hs_drawer", item: null }, reading: false }));
  it("the panel opens on top of the drawer", () =>
    expect(sceneFor("/contact", { focus: "hs_drawer", reading: true })).toEqual({ target: { hotspot: "hs_drawer", item: null }, reading: true }));
  it("a record out keeps its item", () =>
    expect(sceneFor("/work/manuva", { focus: "hs_crate", reading: false }).target).toEqual({ hotspot: "hs_crate", item: "manuva" }));
  it("never opens a panel with nothing in focus", () => expect(sceneFor("/", { focus: null, reading: true })).toEqual({ target: null, reading: false }));
  it("unknown paths are the standing spot", () => expect(sceneFor("/admin", NO_LAYER).target).toBeNull());
});
