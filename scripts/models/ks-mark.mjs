// Blender reads the same geometry as the neon sign; no separate logo redraw.
import { K, S, headRing, rope } from "../../office/neon/mark.ts";

process.stdout.write(JSON.stringify({
  k: K.slice(0, -1),
  s: S.slice(0, -1),
  head: headRing().slice(0, -1),
  rope: rope(0, 24),
}));
