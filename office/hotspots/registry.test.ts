import { describe, it, expect } from "vitest";
import { Group, Mesh } from "three";
import { work } from "@/content/work";
import { services } from "@/content/services";
import { ALL_HOTSPOTS, EXTRAS, HOTSPOTS, TOOL_NODE, hitFor, highlightFor, highlightKey, itemAt, itemNode, labelFor, ORNAMENTS, pickHit, RECORDS, sameHit } from "./registry";

/** office_root › hs_crate › (hs_crate__body mesh, record_00 › mesh, record_05 › mesh), hs_shelf › ornament_01 › mesh, hs_drawer › mesh, prop_chair mesh */
function scene() {
  const node = (name: string, ...children: Array<Group | Mesh>) => {
    const g = new Group();
    g.name = name;
    children.forEach((c) => g.add(c));
    return g;
  };
  const mesh = (name: string) => Object.assign(new Mesh(), { name });
  const body = mesh("hs_crate__body");
  const rec0 = mesh("rec0_mesh");
  const rec5 = mesh("rec5_mesh");
  const orn1 = mesh("orn1_mesh");
  const drawer = mesh("hs_drawer__drawer");
  const chair = mesh("prop_chair");
  node(
    "office_root",
    node("hs_crate", body, node("hs_crate__record_00", rec0), node("hs_crate__record_05", rec5)),
    node("hs_shelf", node("hs_shelf__ornament_01", orn1)),
    node("hs_drawer", drawer),
    chair,
  );
  return { body, rec0, rec5, orn1, drawer, chair };
}

describe("hitFor", () => {
  const s = scene();
  it("idle: any part of a hotspot is the whole hotspot", () => {
    expect(hitFor(s.rec0, null)).toEqual({ hotspot: "hs_crate", item: null });
    expect(hitFor(s.body, null)).toEqual({ hotspot: "hs_crate", item: null });
    expect(hitFor(s.drawer, null)).toEqual({ hotspot: "hs_drawer", item: null });
  });
  it("idle: set dressing is nothing", () => expect(hitFor(s.chair, null)).toBeNull());
  it("focused on the crate: a record with content is that case study", () =>
    expect(hitFor(s.rec0, "hs_crate")).toEqual({ hotspot: "hs_crate", item: work[0].slug }));
  it("focused on the crate: blank sleeves and the crate body are nothing", () => {
    expect(hitFor(s.rec5, "hs_crate")).toBeNull();
    expect(hitFor(s.body, "hs_crate")).toBeNull();
  });
  it("focused on the crate: other hotspots are nothing", () => expect(hitFor(s.drawer, "hs_crate")).toBeNull());
  it("focused on the shelf: an ornament with content is that service", () =>
    expect(hitFor(s.orn1, "hs_shelf")).toEqual({ hotspot: "hs_shelf", item: services[1].slug }));
  it("nothing under the pointer is nothing", () => expect(hitFor(null, null)).toBeNull());
});

describe("pickHit (everything under the pointer, nearest first)", () => {
  const s = scene();
  it("idle: set dressing in front of a hotspot doesn't hide it", () =>
    expect(pickHit([s.chair, s.body], null)).toEqual({ hotspot: "hs_crate", item: null }));
  it("idle: nothing but set dressing is nothing", () => expect(pickHit([s.chair], null)).toBeNull());
  it("focused: only the nearest object counts", () => {
    expect(pickHit([s.chair, s.rec0], "hs_crate")).toBeNull();
    expect(pickHit([s.rec0, s.chair], "hs_crate")).toEqual({ hotspot: "hs_crate", item: work[0].slug });
  });
  it("nothing under the pointer is nothing", () => expect(pickHit([], null)).toBeNull());
});

describe("items", () => {
  it("maps records to work and ornaments to services, in order", () => {
    expect(itemAt("hs_crate", 0)).toBe(work[0].slug);
    expect(itemAt("hs_crate", work.length)).toBeNull();
    expect(itemAt("hs_shelf", 1)).toBe(services[1].slug);
    expect(itemAt("hs_shelf", services.length)).toBeNull();
    expect(itemAt("hs_drawer", 0)).toBeNull();
  });
  it("finds the node behind a slug", () => {
    expect(itemNode("hs_crate", work[2].slug)).toBe("hs_crate__record_02");
    expect(itemNode("hs_shelf", services[0].slug)).toBe("hs_shelf__ornament_00");
    expect(itemNode("hs_crate", "nope")).toBeNull();
  });
  it("has room in the crate and on the shelf for all the content", () => {
    expect(ORNAMENTS).toBe(4);
    expect(services.length).toBe(ORNAMENTS); // every ornament carries a service
    expect(work.length).toBeLessThanOrEqual(RECORDS);
    expect(itemAt("hs_shelf", 3)).toBe(services[3].slug);
    expect(itemAt("hs_shelf", 4)).toBeNull();
  });
});

describe("highlighting", () => {
  const s = scene();
  it("keys a mesh by its record or ornament, else its hotspot", () => {
    expect(highlightKey(s.rec0)).toBe("hs_crate__record_00");
    expect(highlightKey(s.body)).toBe("hs_crate");
    expect(highlightKey(s.orn1)).toBe("hs_shelf__ornament_01");
    expect(highlightKey(s.drawer)).toBe("hs_drawer");
    expect(highlightKey(s.chair)).toBeNull();
  });
  it("highlights an item's node, or the whole hotspot", () => {
    expect(highlightFor({ hotspot: "hs_crate", item: work[1].slug })).toBe("hs_crate__record_01");
    expect(highlightFor({ hotspot: "hs_drawer", item: null })).toBe("hs_drawer");
  });
  it("compares hits by value", () => {
    expect(sameHit({ hotspot: "hs_crate", item: null }, { hotspot: "hs_crate", item: null })).toBe(true);
    expect(sameHit({ hotspot: "hs_crate", item: null }, { hotspot: "hs_crate", item: "manuva" })).toBe(false);
    expect(sameHit(null, null)).toBe(true);
    expect(sameHit(null, { hotspot: "hs_drawer", item: null })).toBe(false);
  });
  it("labels an item by its content name, else by the hotspot label", () => {
    const labels = { hs_crate: "C", hs_drawer: "D", hs_monitor: "M", hs_shelf: "S", hs_whiteboard: "W" };
    expect(labelFor({ hotspot: "hs_crate", item: "manuva" }, labels)).toBe("Manuva");
    expect(labelFor({ hotspot: "hs_shelf", item: services[0].slug }, labels)).toBe(services[0].name);
    expect(labelFor({ hotspot: "hs_drawer", item: null }, labels)).toBe("D");
  });
});

describe("hidden extras", () => {
  const node = (name: string, ...children: Array<Group | Mesh>) => {
    const g = new Group();
    g.name = name;
    children.forEach((c) => g.add(c));
    return g;
  };
  it("keeps the signposted four as they are, and the whiteboard apart", () => {
    expect(HOTSPOTS).toEqual(["hs_crate", "hs_drawer", "hs_monitor", "hs_shelf"]);
    expect(EXTRAS).toEqual(["hs_whiteboard"]);
    expect(ALL_HOTSPOTS).toEqual([...HOTSPOTS, ...EXTRAS]);
  });
  it("hits the whiteboard like any object while nothing's focused", () => {
    const mesh = new Mesh();
    node("hs_whiteboard", node("hs_whiteboard__board", mesh));
    expect(hitFor(mesh, null)).toEqual({ hotspot: "hs_whiteboard", item: null });
  });
  it("gives each tray tool its own highlight group, and knows the tool nodes", () => {
    const marker = new Mesh();
    node("hs_whiteboard", node("hs_whiteboard__marker_02", marker));
    expect(highlightKey(marker)).toBe("hs_whiteboard__marker_02");
    expect(TOOL_NODE.test("hs_whiteboard__eraser")).toBe(true);
    expect(TOOL_NODE.test("hs_whiteboard__board")).toBe(false);
  });
});
