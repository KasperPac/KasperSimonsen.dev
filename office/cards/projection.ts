import type { Matrix4 } from "three";

/**
 * Project a centred 3D face directly into one CSS plane. Keeping the camera's perspective out of nested DOM
 * transforms avoids WebKit's placement/hit-testing differences. Normalize w to 1 so small world-unit scales
 * cannot collapse the print in Safari. The remaining x/y perspective terms preserve the face's actual tilt.
 */
export function projectFace(
  clip: Matrix4,
  { widthPx, heightPx, unitsPerPx: k }: { widthPx: number; heightPx: number; unitsPerPx: number },
  viewport: { width: number; height: number },
): string | null {
  const e = clip.elements;
  // CSS starts at the top left; the face is centred, with its y axis pointing up.
  const x = e[12] - e[0] * k * widthPx / 2 + e[4] * k * heightPx / 2;
  const y = e[13] - e[1] * k * widthPx / 2 + e[5] * k * heightPx / 2;
  const w = e[15] - e[3] * k * widthPx / 2 + e[7] * k * heightPx / 2;
  const wx = e[3] * k;
  const wy = -e[7] * k;
  if ([w, w + wx * widthPx, w + wy * heightPx, w + wx * widthPx + wy * heightPx].some(v => !Number.isFinite(v) || v <= 0)) return null;
  const sx = viewport.width / (2 * w);
  const sy = viewport.height / (2 * w);
  return `matrix3d(${[
    (e[0] * k + wx) * sx, (wx - e[1] * k) * sy, 0, wx / w,
    (-e[4] * k + wy) * sx, (wy + e[5] * k) * sy, 0, wy / w,
    0, 0, 1, 0,
    (x + w) * sx, (w - y) * sy, 0, 1,
  ].join(",")})`;
}
