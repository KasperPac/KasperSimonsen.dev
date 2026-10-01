// art/osm/cremorne.json → art/osm/cremorne-osm.glb (imported into Blender) + cremorne-meta.json.
import { readFile, writeFile } from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { meshesToDocument, osmToMeshes } from "./meshes.mjs";

const source = JSON.parse(await readFile("art/osm/cremorne.json", "utf8"));
const { origin, meshes, skipped, displaced, merged, landmarks, frontage, nylex } = osmToMeshes(source.elements);
await new NodeIO().write("art/osm/cremorne-osm.glb", meshesToDocument(meshes));

const meta = {
  source: "art/osm/cremorne.json",
  attribution: source.attribution,
  fetchedAt: source.fetchedAt,
  origin,
  axes: "+x east, +y up, -z north, metres; Blender (x, y) = (x, -z)",
  door: frontage.door,
  normal: frontage.normal,
  streetPoint: frontage.streetPoint,
  nylex,
  landmarks,
  skipped: skipped.length,
  displaced,
  merged,
  triangles: Object.fromEntries(Object.entries(meshes).map(([name, m]) => [name, m.indices.length / 3])),
};
await writeFile("art/osm/cremorne-meta.json", `${JSON.stringify(meta, null, 2)}\n`);
console.log(meta);
