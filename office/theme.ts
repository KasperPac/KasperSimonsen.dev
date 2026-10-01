/** Office scene look. Accent and UI typefaces are added by the phase 1 look-dev task. */
export const theme = {
  background: "#0b0b0b",
  line: "#e8e8e8",
  /** CSS pixels */
  lineWidth: 1.3,
  /** Only edges between faces meeting at more than this angle are drawn. */
  edgeThresholdDeg: 20,
  /** Linear fog to the background colour, in metres: fades the far city instead of cluttering it. */
  fogNear: 250,
  fogFar: 4000,
  /** Scroll track height in viewport heights; the walk-in spans it. */
  walkInScreens: 6,
} as const;
