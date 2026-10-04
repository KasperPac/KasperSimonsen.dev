import type { Topic } from "./contact";

/** A service on the shelf: one ornament each. Plaques, service panels and /services/<slug> pages read this. DRAFT copy, Kasper approves. */
export type Service = {
  slug: string;
  number: string;
  name: string;
  /** The ornament it stands as on the shelf (office_props.py builds them in this order). */
  ornament: "gear" | "globe" | "phone" | "computer";
  /** Two or three lines on the plaque. */
  summary: string;
  /** The Read more, a paragraph each. */
  body: string[];
};

export const services: Service[] = [
  {
    slug: "industrial-automation",
    number: "01",
    name: "Industrial automation",
    ornament: "gear",
    summary: "PLC and HMI work, mostly Siemens and Omron, and the software that joins the machines up to the rest of the business.",
    body: [
      "Machines don't care how nice your dashboard looks. They care whether the code is right, and whether someone can fault-find it at 2 am without ringing me.",
      "I write and change PLC and HMI code, do safety upgrades on lines that are already running, and build the software around them: production tracking, reporting, and getting machine data into the systems the office already uses.",
      "Brownfield's fine. Most of the job is changing something that works, carefully, and writing down what changed.",
    ],
  },
  {
    slug: "websites",
    number: "02",
    name: "Websites",
    ornament: "globe",
    summary: "Sites that load fast, say plainly what you do, and that you can update yourself without ringing me. Next.js mostly.",
    body: [
      "Most business sites need less than they're sold: a clear page about what you do, and an easy way to get hold of you.",
      "I build them in Next.js on Vercel, with the words and pictures somewhere you can edit them yourself. Shopify when you're selling things.",
      "If the site has to do something odd behind the scenes, that's where I'm most useful.",
    ],
  },
  {
    slug: "apps",
    number: "03",
    name: "Apps",
    ornament: "phone",
    summary: "Web apps, and iPhone and Android apps. Built for the people who'll actually use them, gloves and patchy wifi included.",
    body: [
      "An app is usually a spreadsheet that's outgrown itself. Inventory, production, jobs, quotes: whatever the business runs on that's held together by one person's macros.",
      "I build web apps in Next.js and phone apps in React Native, so one codebase covers iPhone and Android. Warehouse scanners and plant-floor tablets too.",
      "It keeps working when the wifi drops, keeps each customer's data to itself, and doesn't fall over the week after launch.",
    ],
  },
  {
    slug: "desktop-software",
    number: "04",
    name: "Desktop software",
    ornament: "computer",
    summary: "Windows software for when a browser won't do: talking to hardware, running offline on a plant PC, or chewing through files locally.",
    body: [
      "Some jobs don't belong in a browser. The PC's bolted to a machine, the network comes and goes, or the files are too big to upload anywhere.",
      "I write desktop tools that talk to serial devices, PLCs and label printers, run without an internet connection, and install without a fight with IT.",
      "Usually it's a small utility someone's been wishing existed for years. Sometimes it's the whole operator station.",
    ],
  },
];

export function findService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

/** The two ways to work with Kasper. Every service's Read more ends with them (existing site copy, verbatim). */
export type EngagementModel = {
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
  topic: Topic;
};

export const engagementModels: EngagementModel[] = [
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
