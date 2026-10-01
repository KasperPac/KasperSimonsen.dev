// Validates public/models/*.glb against office/manifest.json. Fails the build on any problem.
import { readFile, stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createIO } from "./io.mjs";
import { inspectDocument } from "./inspect.mjs";

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

/** Problems with one model against its manifest entry. Empty means it's fine. */
export function checkModel(name, entry, report, bytes) {
  const problems = [];
  for (const node of entry.nodes) if (!report.nodes.includes(node)) problems.push(`${name}: missing node "${node}"`);
  for (const camera of entry.cameras) if (!report.cameras.includes(camera)) problems.push(`${name}: missing camera "${camera}"`);
  for (const node of entry.animated) if (!report.animated.includes(node)) problems.push(`${name}: "${node}" has no animation`);
  if (bytes > entry.maxBytes) problems.push(`${name}: ${kb(bytes)} is over the ${kb(entry.maxBytes)} budget`);
  return problems;
}

async function main() {
  const manifest = JSON.parse(await readFile("office/manifest.json", "utf8"));
  const io = await createIO();
  const problems = [];
  for (const [name, entry] of Object.entries(manifest)) {
    const file = `public${entry.url}`;
    try {
      const { size } = await stat(file);
      problems.push(...checkModel(name, entry, inspectDocument(await io.read(file)), size));
      console.log(`${name}: ${kb(size)} of ${kb(entry.maxBytes)}`);
    } catch (err) {
      problems.push(`${name}: can't read ${file} (${err.message})`);
    }
  }
  if (problems.length) {
    console.error(`Model check failed:\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  console.log("Models OK");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
