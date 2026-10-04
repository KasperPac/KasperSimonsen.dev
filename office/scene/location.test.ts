import { describe, it, expect } from "vitest";
import { layerOf, LAYER_KEY, NO_LAYER, sceneFor } from "./location";

describe("layerOf", () => {
  it("reads the office layer out of history.state", () =>
    expect(layerOf({ [LAYER_KEY]: { focus: "hs_drawer", reading: true }, __NA: true })).toEqual({ focus: "hs_drawer", reading: true, topic: null }));
  it.each([[null], [undefined], [{}], [{ [LAYER_KEY]: "nope" }], [{ [LAYER_KEY]: { focus: "hs_sofa", reading: "yes" } }]])(
    "falls back to no layer for %j",
    (state) => expect(layerOf(state)).toEqual(NO_LAYER),
  );
  it("returns the shared NO_LAYER for a stored empty layer, so clearLayer can tell it's already clear", () =>
    expect(layerOf({ [LAYER_KEY]: { focus: null, reading: false }, __NA: true })).toBe(NO_LAYER));
});

describe("sceneFor", () => {
  it("the standing spot", () => expect(sceneFor("/", NO_LAYER)).toEqual({ target: null, reading: false, topic: null }));
  it("a local layer focuses its object on /", () =>
    expect(sceneFor("/", { focus: "hs_monitor", reading: false, topic: null })).toEqual({ target: { hotspot: "hs_monitor", item: null }, reading: false, topic: null }));
  it("a routed path focuses its object whatever the layer says", () =>
    expect(sceneFor("/contact", NO_LAYER)).toEqual({ target: { hotspot: "hs_drawer", item: null }, reading: false, topic: null }));
  it("the panel opens on top of the drawer", () =>
    expect(sceneFor("/contact", { focus: "hs_drawer", reading: true, topic: null })).toEqual({ target: { hotspot: "hs_drawer", item: null }, reading: true, topic: null }));
  it("a record out keeps its item", () =>
    expect(sceneFor("/work/manuva", { focus: "hs_crate", reading: false, topic: null }).target).toEqual({ hotspot: "hs_crate", item: "manuva" }));
  it("never opens a panel with nothing in focus", () => expect(sceneFor("/", { focus: null, reading: true, topic: null })).toEqual({ target: null, reading: false, topic: null }));
  it("unknown paths are the standing spot", () => expect(sceneFor("/admin", NO_LAYER).target).toBeNull());
});

describe("topic (the contact form over a service)", () => {
  it("keeps a known topic while reading", () =>
    expect(layerOf({ [LAYER_KEY]: { focus: "hs_shelf", reading: true, topic: "tools" } })).toEqual({ focus: "hs_shelf", reading: true, topic: "tools" }));
  it("drops an unknown topic", () =>
    expect(layerOf({ [LAYER_KEY]: { focus: "hs_shelf", reading: true, topic: "<script>" } }).topic).toBeNull());
  it("drops a topic with no panel open", () =>
    expect(layerOf({ [LAYER_KEY]: { focus: "hs_shelf", reading: false, topic: "tools" } }).topic).toBeNull());
  it("passes it through to the scene on a service", () =>
    expect(sceneFor("/services/apps", { focus: "hs_shelf", reading: true, topic: "platforms" })).toEqual({
      target: { hotspot: "hs_shelf", item: "apps" },
      reading: true,
      topic: "platforms",
    }));
  it("never opens a form with nothing in focus", () => expect(sceneFor("/", { focus: null, reading: true, topic: "tools" }).topic).toBeNull());
});
