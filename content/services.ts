/** What Kasper offers. The shelf's ornaments, service panels and /services/<slug> pages all read this. */
export type Service = {
  slug: string;
  number: string;
  name: string;
  meta: string;
  timeline: string;
  description: string;
  fitsLabel: string;
  fitsBody: string;
  requiresLabel: string;
  requiresBody: string;
  replyHint: string;
  ctaLabel: string;
  /** `?topic=` for the contact form, which pre-fills the subject. */
  topic: "tools" | "platforms";
};

export const services: Service[] = [
  {
    slug: "tools-and-dashboards",
    number: "01",
    name: "Tools & Dashboards",
    meta: "Fixed Scope",
    timeline: "1–3 Weeks",
    description:
      "Small builds for teams that need something specific done properly. One problem, one interface, and whatever has to happen underneath it. Priced per project. Delivered in weeks, not months.",
    fitsLabel: "Typically fits",
    fitsBody:
      "Internal tools only your team uses. Workflow apps you can't buy off the shelf. Custom reporting views. Client portals. Small Shopify add-ons. Making two systems that don't speak to each other start speaking.",
    requiresLabel: "What I need from you",
    requiresBody:
      "A clear description of what it should do. Access to any existing systems it has to talk to. Someone who can answer questions as they come up — ideally not by committee.",
    replyHint: "— I reply within 24 hours. Usually faster.",
    ctaLabel: "Start a small build",
    topic: "tools",
  },
  {
    slug: "platforms-and-systems",
    number: "02",
    name: "Platforms & Systems",
    meta: "Per Project",
    timeline: "6–16 Weeks",
    description:
      "Longer builds. The whole thing — how it's put together, where the data lives, what users interact with, what operators interact with. Usually something that doesn't exist yet, for a business that needs it to. Priced per project after we've talked it through.",
    fitsLabel: "Typically fits",
    fitsBody:
      "Apps that serve many companies at once and absolutely can't leak data between them. AI-powered tools that do real work, not a wrapper around ChatGPT. Shopify stores with something unusual going on behind them. Software running a factory floor, a warehouse, or a production plant. Anything where the numbers have to reconcile and the audit trail has to hold up.",
    requiresLabel: "How it usually goes",
    requiresBody:
      "A short scoping call first. Then a written proposal with scope, milestones, timeline, and price. I build in weekly visible chunks — you see real progress every week, not a demo at the end after months of silence.",
    replyHint: "— expect a scoping call within the week",
    ctaLabel: "Start a platform",
    topic: "platforms",
  },
];

export function findService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}
