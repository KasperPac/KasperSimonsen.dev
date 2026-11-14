export type ThemeMode = "dark" | "light";

type HotspotAccents = { hs_crate: string; hs_shelf: string; hs_drawer: string; hs_monitor: string; hs_whiteboard: string };

/** The colours that change with the theme. */
export type Palette = { background: string; line: string; accents: HotspotAccents };

/** Office scene look. Section accents picked by Kasper in phase 1 look-dev. */
export const theme = {
  background: "#0b0b0b",
  line: "#e8e8e8",
  /** One colour per section, keyed by hotspot: hover lines, labels and that section's panels. Everything else stays `line`. */
  accents: {
    hs_crate: "#C6FF3D", // work
    hs_shelf: "#FF3B30", // services
    hs_drawer: "#2EF2FF", // contact
    hs_monitor: "#FFB224", // the monitor's reel
    hs_whiteboard: "#e8e8e8", // hidden extras light white (the line colour)
  },
  /** CSS pixels */
  lineWidth: 1.3,
  /** Only edges between faces meeting at more than this angle are drawn. */
  edgeThresholdDeg: 20,
  /** Linear fog to the background colour, in metres: fades the far city instead of cluttering it. */
  fogNear: 250,
  fogFar: 4000,
  /** Scroll track height in viewport heights; the walk-in spans it. */
  walkInScreens: 9,
  /** Base seconds for "Come in"; the lobby adds a slower section. */
  walkInAutoSeconds: 8,
} as const;

/** Today's look. */
const dark: Palette = { background: theme.background, line: theme.line, accents: theme.accents };

/** The office with the lights on: dark lines on a light wall, and each section colour darkened only as far as it needs to read there (3:1 or better, checked in theme.test.ts). */
const light: Palette = {
  background: "#f4f3ef",
  line: "#161616",
  accents: {
    hs_crate: "#4a7300", // work
    hs_shelf: "#d1251b", // services
    hs_drawer: "#007582", // contact
    hs_monitor: "#a85f00", // the monitor's reel
    hs_whiteboard: "#161616", // the line colour
  },
};

export const palettes: Record<ThemeMode, Palette> = { dark, light };

/**
 * Colours are stored (the whiteboard's strokes) as the dark palette's, so a drawing can change theme: this is the same
 * colour in `mode`'s palette, or `color` unchanged when it isn't one of the palette's.
 */
export function inkFor(color: string, mode: ThemeMode): string {
  const wanted = color.toLowerCase();
  if (wanted === dark.line.toLowerCase()) return palettes[mode].line;
  const key = (Object.keys(dark.accents) as (keyof HotspotAccents)[]).find((k) => dark.accents[k].toLowerCase() === wanted);
  return key ? palettes[mode].accents[key] : color;
}

/** A section's colour as a CSS variable (office.css), for markup that follows the theme without re-rendering. */
export function accentVar(hotspot: keyof HotspotAccents): string {
  return `var(--accent-${hotspot})`;
}
