/** The first `sentences` sentences of an intro's first paragraph, cut back to whole sentences within `maxChars`. */
export function leadOf(intro: string[], sentences = 3, maxChars = 320): string {
  const parts = (intro[0] ?? "").match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [];
  let out = "";
  for (const s of parts.slice(0, sentences)) {
    const next = out ? `${out} ${s}` : s;
    if (next.length > maxChars) break;
    out = next;
  }
  return out;
}
