const EARTH_RADIUS = 6378137;
const DEG = Math.PI / 180;

export const LEVEL_HEIGHT = 3.2;
export const DEFAULT_HEIGHT = 7;

/** Local tangent-plane projection in metres from `origin`: +x east, -z north (glTF/three axes). */
export function makeProjector(origin) {
  const k = EARTH_RADIUS * DEG;
  const cosLat = Math.cos(origin.lat * DEG);
  return (lat, lon) => [(lon - origin.lon) * k * cosLat, -(lat - origin.lat) * k];
}

/** OSM length tag → metres. Takes the first of `;`-separated values. Null for anything unusable. */
export function parseMetres(value) {
  if (typeof value !== "string") return null;
  const n = parseFloat(value.split(";")[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Extrusion height for a building: height tag, else levels × 3.2 m, else 7 m. Clamped to 3–400 m. */
export function buildingHeight(tags = {}) {
  let height = parseMetres(tags.height);
  if (height === null) {
    const levels = parseMetres(tags["building:levels"]);
    height = levels === null ? DEFAULT_HEIGHT : levels * LEVEL_HEIGHT;
  }
  return Math.min(400, Math.max(3, height));
}
