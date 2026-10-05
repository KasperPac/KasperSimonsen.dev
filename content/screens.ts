/** What a crate project shows on the monitor (interactions spec 3.5): a screenshot, or its logo on a card until there is one. */
export type Screen = { shot?: { src: string; alt: string }; logo?: string };

/** Paths are under /public. Adding Pac-Hub's screenshots later is a `shot` here plus the file. */
const SCREENS: Record<string, Screen> = {
  "pac-forge": { logo: "/PacTechnologiesEdit_White.png" },
  manuva: { shot: { src: "/v2/manuva-live.jpg", alt: "Manuva's site: a manufacturing app's home page" } },
  silio: { shot: { src: "/silio-dashboard.png", alt: "Silio's dashboard: throughput, orders and hours at a glance" } },
};

export function screenFor(slug: string): Screen {
  return SCREENS[slug] ?? {};
}
