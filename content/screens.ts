/**
 * One slide of the monitor's reel (interactions spec 3.5): a screenshot filling the monitor edge to edge (16:9, 1280 x
 * 720), with its label and a line printed beside it, on the laptop or on the strip under the monitor. A slide plays a
 * crate project's record (`slug`, whose headline is its line), and every slide does today. The type keeps `href` and
 * `line` for work with no record: that has its own `line`, and opens its site (`href`) or, not live yet, has no button at
 * all. Adding a project is its record in the crate, a slide here and its screenshot in public/reel.
 */
export type Slide = { label: string; shot: { src: string; alt: string }; slug?: string; href?: string; line?: string };

/** Paths are under /public. Pac Hub's screenshot is blurred (customer, job and people), and Marianne's Hair's phone number; both must stay that way. */
export const slides: Slide[] = [
  {
    slug: "pac-forge",
    label: "Pac Hub",
    shot: { src: "/reel/pac-hub.jpg", alt: "Pac Hub's project home: the job's sources, workspaces, revisions, builds and documents" },
  },
  {
    slug: "manuva",
    label: "Manuva · site",
    shot: { src: "/reel/manuva-site.jpg", alt: "Manuva's home page: \"Less chaos. More making.\"" },
  },
  {
    slug: "manuva",
    label: "Manuva · bill of materials",
    shot: { src: "/reel/manuva-app-bom.jpg", alt: "Manuva's bill of materials for a product variant" },
  },
  {
    slug: "manuva",
    label: "Manuva · components",
    shot: { src: "/reel/manuva-app-components.jpg", alt: "Picking components for a bill of materials in Manuva" },
  },
  {
    slug: "silio",
    label: "Silio",
    shot: { src: "/reel/silio-dashboard.jpg", alt: "Silio's dashboard: throughput, orders and hours at a glance" },
  },
  // Not live yet, so its record has no liveUrl and its button is See the case study only.
  {
    slug: "mariannes-hair",
    label: "Marianne's Hair · site",
    shot: { src: "/reel/mariannes-hair-site.jpg", alt: "Marianne's Hair's home page: a line drawing of the salon's shopfront above its name in script" },
  },
  {
    slug: "pac-technologies",
    label: "Pac Technologies · site",
    shot: { src: "/reel/pac-tech-site.jpg", alt: "Pac Technologies' home page: \"The plant does not stop. Neither do we.\"" },
  },
];
