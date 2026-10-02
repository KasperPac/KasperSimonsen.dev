import { describe, it, expect } from "vitest";
import { BoxGeometry, Group, Mesh, type MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { applyCleanEdges } from "@/office/style/cleanEdges";
import { addHitProxies } from "./proxies";
import { hitFor } from "./registry";

/** A shelf seen face on: two ornaments 0.4 m apart, nothing between them. */
function shelf() {
  const root = new Group();
  const hs = new Group();
  hs.name = "hs_shelf";
  hs.position.set(1, 0, 0);
  root.add(hs);
  for (const x of [-0.2, 0.2]) {
    const m = new Mesh(new BoxGeometry(0.05, 0.1, 0.05));
    m.position.x = x;
    hs.add(m);
  }
  root.updateMatrixWorld(true);
  return root;
}

/** Straight down -z through world x. */
const pointAt = (root: Group, x: number) => new Raycaster(new Vector3(x, 0, 5), new Vector3(0, 0, -1)).intersectObject(root, true);

describe("addHitProxies", () => {
  it("makes the gap between a hotspot's parts part of the hotspot", () => {
    const root = shelf();
    expect(pointAt(root, 1)).toHaveLength(0);
    addHitProxies(root, () => true);
    expect(hitFor(pointAt(root, 1)[0]?.object ?? null, null)).toEqual({ hotspot: "hs_shelf", item: null });
  });
  it("stops at the hotspot's outline", () => {
    const root = shelf();
    addHitProxies(root, () => true);
    expect(pointAt(root, 1.5)).toHaveLength(0);
  });
  it("takes no pointer while disabled, so a focused object's own parts answer", () => {
    const root = shelf();
    addHitProxies(root, () => false);
    expect(pointAt(root, 1)).toHaveLength(0);
  });
  it("is never drawn, even when clean edges run after it", () => {
    const root = shelf();
    const [proxy] = addHitProxies(root, () => true);
    applyCleanEdges(root, { background: "#000000", line: "#ffffff", lineWidth: 1.5, thresholdDeg: 20 });
    expect(proxy.children).toHaveLength(0);
    expect((proxy.material as MeshBasicMaterial).visible).toBe(false);
  });
});
