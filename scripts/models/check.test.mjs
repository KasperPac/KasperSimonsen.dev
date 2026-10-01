import { describe, it, expect } from "vitest";
import { inspectDocument } from "./inspect.mjs";
import { checkModel } from "./check.mjs";
import { sampleDocument } from "./test-fixtures.mjs";

const entry = {
  url: "/models/office.glb",
  maxBytes: 1000,
  nodes: ["office_root", "hs_drawer"],
  cameras: ["cam_walkin"],
  animated: ["cam_walkin"],
};

describe("inspectDocument", () => {
  it("lists nodes, camera nodes and animation targets", () => {
    expect(inspectDocument(sampleDocument())).toEqual({
      nodes: ["hs_drawer", "hs_shelf", "hs_monitor_pivot", "office_root", "cam_walkin"],
      cameras: ["cam_walkin"],
      animated: ["cam_walkin"],
    });
  });
});

describe("checkModel", () => {
  it("passes a model that matches its manifest entry", () => {
    expect(checkModel("office", entry, inspectDocument(sampleDocument()), 900)).toEqual([]);
  });

  it("names a node that was renamed in Blender", () => {
    const report = inspectDocument(sampleDocument());
    report.nodes = report.nodes.map((n) => (n === "hs_drawer" ? "hs_drawer.001" : n));
    expect(checkModel("office", entry, report, 900)).toEqual(['office: missing node "hs_drawer"']);
  });

  it("names a missing camera", () => {
    const report = { ...inspectDocument(sampleDocument()), cameras: [] };
    expect(checkModel("office", entry, report, 900)).toEqual(['office: missing camera "cam_walkin"']);
  });

  it("names a camera that lost its animation", () => {
    const report = inspectDocument(sampleDocument({ withAnimation: false }));
    expect(checkModel("office", entry, report, 900)).toEqual(['office: "cam_walkin" has no animation']);
  });

  it("names a model over budget", () => {
    expect(checkModel("office", entry, inspectDocument(sampleDocument()), 2048)).toEqual([
      "office: 2.0 KB is over the 1.0 KB budget",
    ]);
  });
});
