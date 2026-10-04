import { describe, it, expect } from "vitest";
import { createIO } from "./io.mjs";
import { inspectDocument } from "./inspect.mjs";
import { optimise } from "./build.mjs";
import { sampleDocument } from "./test-fixtures.mjs";

async function roundTrip(doc) {
  const io = await createIO();
  return io.readBinary(await io.writeBinary(await optimise(doc)));
}

describe("optimise", () => {
  it("keeps every node, camera and animation target the runtime looks up by name", async () => {
    const before = inspectDocument(sampleDocument());
    const after = inspectDocument(await roundTrip(sampleDocument()));
    expect(after.nodes.sort()).toEqual(before.nodes.sort());
    expect(after.cameras).toEqual(before.cameras);
    expect(after.animated).toEqual(before.animated);
  });

  it("keeps empty pivot nodes (prune would drop leaves by default)", async () => {
    const after = await roundTrip(sampleDocument());
    expect(after.getRoot().listNodes().some((n) => n.getName() === "hs_monitor_pivot")).toBe(true);
  });

  it("never rewrites node transforms, so Blender animations and pivots stay put", async () => {
    const after = await roundTrip(sampleDocument());
    const drawer = after.getRoot().listNodes().find((n) => n.getName() === "hs_drawer");
    expect(drawer.getTranslation()).toEqual([0.5, 0.3, 6.5]);
    expect(drawer.getScale()).toEqual([1, 1, 1]);
  });

  it("compresses with meshopt", async () => {
    const after = await roundTrip(sampleDocument());
    expect(after.getRoot().listExtensionsUsed().map((e) => e.extensionName)).toContain("EXT_meshopt_compression");
  });

  it("keeps node extras, including on nodes that share a mesh", async () => {
    const doc = sampleDocument();
    const nodes = Object.fromEntries(doc.getRoot().listNodes().map((n) => [n.getName(), n]));
    expect(nodes.hs_drawer.getMesh()).toBe(nodes.hs_shelf.getMesh());
    nodes.hs_drawer.setExtras({ edge_threshold_deg: 1 });
    nodes.hs_shelf.setExtras({ edge_threshold_deg: 5 });
    const after = await roundTrip(doc);
    const byName = Object.fromEntries(after.getRoot().listNodes().map((n) => [n.getName(), n]));
    expect(byName.hs_drawer.getExtras()).toEqual({ edge_threshold_deg: 1 });
    expect(byName.hs_shelf.getExtras()).toEqual({ edge_threshold_deg: 5 });
  });
});
