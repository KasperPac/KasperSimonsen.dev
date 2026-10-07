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
  /** Seconds "Come in" takes to walk from the street into the office. */
  walkInAutoSeconds: 8,
} as const;
