/**
 * One slide of the monitor's reel (interactions spec 3.5): a screenshot in a little window, its label on the title bar.
 * A slide plays a crate project's record (`slug`, whose headline is the strip's line). Work with no record yet has its
 * own `line`, and opens its site (`href`) or, not live yet, has no button at all.
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
    shot: { src: "/reel/manuva-site.jpg", alt: "Manuva's home page: \"Less chaos. More crafting.\"" },
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
  // Not live yet: no button until it has a domain (then an href, Visit the site). DRAFT line and alt.
  {
    label: "Marianne's Hair · site",
    line: "A one-chair salon in West End. Its site's nearly ready to open.",
    shot: { src: "/reel/mariannes-hair-site.jpg", alt: "Marianne's Hair's home page: a line drawing of the salon's shopfront above the name, \"Love your Hair\"" },
  },
  // Not in the crate yet: it becomes a slug slide (See the case study) once it has a record.
  {
    href: "https://www.pac-technologies.com.au",
    label: "Pac Technologies · site",
    line: "Where Pac Technologies starts: the site I built for it.",
    shot: { src: "/reel/pac-tech-site.jpg", alt: "Pac Technologies' home page: \"The plant does not stop. Neither do we.\"" },
  },
];
