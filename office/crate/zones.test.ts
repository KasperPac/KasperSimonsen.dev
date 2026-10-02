// office/crate/zones.test.ts
import { describe, it, expect } from "vitest";
import { BoxGeometry, Group, Mesh, Raycaster, Vector3 } from "three";
import { hitFor } from "@/office/hotspots/registry";
import { work } from "@/content/work";
import { addCrateZones, zoneName } from "./zones";

function crate() {
  const root = new Group();
  root.name = "hs_crate";
  const records = [0, 1, 2, 3].map((i) => {
    const r = new Mesh(new BoxGeometry(0.315, 0.315, 0.005).translate(0, 0.1575, 0));
    r.name = `hs_crate__record_0${i}`;
    r.position.z = -0.03 * i;
    root.add(r);
    return r;
  });
  root.updateMatrixWorld(true);
  return { root, records };
}
const down = (x: number, y: number) => new Raycaster(new Vector3(x, y, 5), new Vector3(0, 0, -1));

describe("addCrateZones", () => {
  it("adds one zone per project record where it rests, beside the records", () => {
    const { root, records } = crate();
    const zones = addCrateZones(records, 2, () => true);
    expect(zones.map((z) => z.name)).toEqual([zoneName(0), zoneName(1)]);
    expect(zones.every((z) => z.parent === root)).toBe(true);
  });
  it("stays where the record rested when the record moves", () => {
    const { root, records } = crate();
    addCrateZones(records, 2, () => true);
    records[0].position.y = 0.3; // lifted out
    root.updateMatrixWorld(true);
    const hits = down(0, 0.1).intersectObject(root, true).filter((h) => h.object.name.includes("zone"));
    expect(hits[0].object.name).toBe(zoneName(0));
  });
  it("reads as its record, so hovering it means that project", () => {
    const { records } = crate();
    const [zone] = addCrateZones(records, 1, () => true);
    expect(hitFor(zone, "hs_crate")).toEqual({ hotspot: "hs_crate", item: work[0].slug });
  });
  it("takes no pointer while disabled", () => {
    const { root, records } = crate();
    addCrateZones(records, 2, () => false);
    expect(down(0, 0.1).intersectObject(root, true).some((h) => h.object.name.includes("zone"))).toBe(false);
  });
});
