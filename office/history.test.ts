import { describe, it, expect, vi, beforeEach } from "vitest";
import { LAYER_KEY } from "./scene/location";
import { pushLayer, replaceLayer } from "./history";

const layer = { focus: "hs_shelf" as const, reading: false, topic: null };

beforeEach(() => {
  vi.stubGlobal("window", {
    location: { pathname: "/services/websites" },
    history: { pushState: vi.fn(), replaceState: vi.fn(), state: null },
    dispatchEvent: vi.fn(),
  });
});

describe("history bridge", () => {
  it("pushes a new entry for a new layer", () => {
    pushLayer(layer, "/services/apps");
    expect(window.history.pushState).toHaveBeenCalledWith({ [LAYER_KEY]: layer }, "", "/services/apps");
    expect(window.dispatchEvent).toHaveBeenCalled();
  });
  it("replaces the live entry when swapping what it shows (no new entry, so one Back still steps out)", () => {
    replaceLayer(layer, "/services/apps");
    expect(window.history.replaceState).toHaveBeenCalledWith({ [LAYER_KEY]: layer }, "", "/services/apps");
    expect(window.history.pushState).not.toHaveBeenCalled();
    expect(window.dispatchEvent).toHaveBeenCalled();
  });
  it("keeps the path when none is given", () => {
    replaceLayer(layer);
    expect(window.history.replaceState).toHaveBeenCalledWith({ [LAYER_KEY]: layer }, "", "/services/websites");
  });
});
