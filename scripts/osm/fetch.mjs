// Fetches the Cremorne extract from Overpass into art/osm/cremorne.json. Run rarely: the JSON is the source.
import { mkdir, writeFile } from "node:fs/promises";
import { AAMI_PARK_WAY_ID } from "./meshes.mjs";

const LAT = -37.8283; // Gwynne Street, Cremorne
const LON = 144.9932;
// AAMI Park is fetched by id: OSM tags it leisure=stadium, so the building filters miss it.
const QUERY = `[out:json][timeout:180];
(
  way(${AAMI_PARK_WAY_ID});
  way["building"](around:600,${LAT},${LON});
  way["building"]["height"](around:1300,${LAT},${LON});
  way["building"]["building:levels"](around:1300,${LAT},${LON});
  way["building"]["height"](around:4500,${LAT},${LON})(if: number(t["height"]) >= 60);
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street|service|pedestrian)$"](around:700,${LAT},${LON});
  way["railway"~"^(rail|tram)$"](around:700,${LAT},${LON});
  node["name"="Nylex Clock"](around:800,${LAT},${LON});
);
out geom;`;
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

for (const url of ENDPOINTS) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "User-Agent": "kaspersimonsen.dev-osm-import", "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(QUERY)}`,
      signal: AbortSignal.timeout(200_000),
    });
    const text = await res.text();
    if (!res.ok || !text.startsWith("{")) throw new Error(`${res.status} ${text.slice(0, 160)}`);
    const { elements } = JSON.parse(text);
    await mkdir("art/osm", { recursive: true });
    await writeFile(
      "art/osm/cremorne.json",
      JSON.stringify({ attribution: "© OpenStreetMap contributors, ODbL 1.0", fetchedAt: new Date().toISOString(), endpoint: url, query: QUERY, elements }),
    );
    console.log(`Saved ${elements.length} elements from ${url}`);
    process.exit(0);
  } catch (err) {
    console.warn(`${url} failed: ${err.message}`);
  }
}
console.error("Every Overpass endpoint failed. Try again in a few minutes.");
process.exit(1);
