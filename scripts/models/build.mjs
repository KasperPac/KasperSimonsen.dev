// art/export/*.glb (Blender exports) → public/models/*.glb (what the site loads).
import { mkdir, stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { EXTMeshoptCompression } from "@gltf-transform/extensions";
import { dedup, prune, reorder, weld } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import { createIO } from "./io.mjs";

const MODELS = ["street", "office"];

/**
 * Size optimisation that never touches names, hierarchy or node transforms. Deliberately absent:
 * join/flatten/instance (they merge or rename the nodes hotspots are looked up by), simplify (it eats
 * the edges we draw) and quantize (it rewrites node transforms, which fights Blender animations).
 */
export async function optimise(doc) {
  await MeshoptEncoder.ready;
  await doc.transform(prune({ keepLeaves: true }), dedup(), weld(), reorder({ encoder: MeshoptEncoder }));
  doc
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  return doc;
}

async function main() {
  const io = await createIO();
  await mkdir("public/models", { recursive: true });
  for (const name of MODELS) {
    const from = `art/export/${name}.glb`;
    const to = `public/models/${name}.glb`;
    await io.write(to, await optimise(await io.read(from)));
    const [a, b] = await Promise.all([stat(from), stat(to)]);
    console.log(`${name}: ${(a.size / 1024).toFixed(0)} KB → ${(b.size / 1024).toFixed(0)} KB`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
