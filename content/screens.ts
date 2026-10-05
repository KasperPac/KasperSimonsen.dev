/**
 * One slide of the monitor's reel (interactions spec 3.5): a screenshot in a little window, its label on the title bar.
 * A slide plays a crate project's record (`slug`) or, for work with no record yet, opens a page (`href`): exactly one of the two.
 */
export type Slide = { label: string; shot: { src: string; alt: string }; slug?: string; href?: string };

/** Paths are under /public. Pac Hub's screenshot is blurred (customer, job and people), and must stay that way. */
export const slides: Slide[] = [
  {
    slug: "pac-forge",
    label: "Pac Hub",
    shot: { src: "/reel/pac-hub.jpg", alt: "Pac Hub's project home: the job's sources, workspaces, revisions, builds and documents" },
  },
  {
    slug: "manuva",
    label: "Manuva · site",
    shot: { src: "/reel/manuva-site.jpg", alt: "Manuva's home page: \"Less chaos. More crafting.\"" },
  },
  {
    slug: "manuva",
    label: "Manuva · app",
    shot: { src: "/reel/manuva-app-bom.jpg", alt: "Manuva's bill of materials for a product variant" },
  },
  {
    slug: "manuva",
    label: "Manuva · app",
    shot: { src: "/reel/manuva-app-components.jpg", alt: "Picking components for a bill of materials in Manuva" },
  },
  {
    slug: "silio",
    label: "Silio",
    shot: { src: "/reel/silio-dashboard.jpg", alt: "Silio's dashboard: throughput, orders and hours at a glance" },
  },
  // Not in the crate yet: it becomes a slug slide (See the case study) once it has a record.
  {
    href: "https://www.pac-technologies.com.au",
    label: "Pac Technologies · site",
    shot: { src: "/reel/pac-tech-site.jpg", alt: "Pac Technologies' home page: \"The plant does not stop. Neither do we.\"" },
  },
];
