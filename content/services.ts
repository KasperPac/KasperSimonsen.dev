import type { Topic } from "./contact";

/** A service on the shelf: one ornament each. Plaques, service panels and /services/<slug> pages read this. DRAFT copy, Kasper approves. */
export type Service = {
  slug: string;
  number: string;
  name: string;
  /** Its ornament in the model; independent of the order the services are displayed. */
  ornament: "gear" | "globe" | "phone" | "computer";
  /** Two or three lines on the plaque. */
  summary: string;
  /** Introduction to the full service. */
  body: string[];
  /** Service-specific scope, approach and handover, before the engagement models. */
  sections: { title: string; paragraphs: string[]; items?: string[] }[];
};

export const services: Service[] = [
  {
    slug: "websites",
    number: "01",
    name: "Websites",
    ornament: "globe",
    summary: "Business websites and online stores that explain what you do, bring in enquiries, and let you update your own content.",
    body: [
      "Someone visiting your site should be able to work out what you do, whether it's right for them, and how to get in touch. That's where I start.",
      "I design and build new sites, replace ones that have become difficult to use, and add the bits a business needs as it grows. You'll deal with me from the first conversation through to launch.",
    ],
    sections: [
      {
        title: "What I build",
        paragraphs: [],
        items: [
          "Business and service websites with clear pages for your work, services and enquiries.",
          "Online stores, including product catalogues and the connections needed to manage orders.",
          "Booking and enquiry forms that send information to the people who need it.",
          "Content editing for things you change regularly, such as services, articles and project photos.",
        ],
      },
      {
        title: "From first draft to launch",
        paragraphs: [
          "We work out who the site is for and what they need to do there. Then I plan the pages, work through the content with you, and build a version you can try on your own phone and computer.",
          "I check page speed, keyboard access, mobile layouts and the basics that help search engines understand your pages. Forms and any connections to other systems get tested before launch.",
        ],
      },
      {
        title: "A site you can look after",
        paragraphs: [
          "Handover covers editing your content, access to the site and hosting, and how everything is connected. We agree which updates you want to handle yourself and what you'd like me to look after. Ongoing work is scoped separately so you know what you're paying for.",
        ],
      },
    ],
  },
  {
    slug: "apps",
    number: "02",
    name: "Apps",
    ornament: "phone",
    summary: "Web, iPhone and Android apps for running a business or building a product. Jobs, stock, customer portals, and the workflows in between.",
    body: [
      "A lot of app projects start with the same problem: the business has outgrown its spreadsheets, and people are spending too much of the day copying information between systems.",
      "I build apps for that work, and products that customers use directly. We choose web, mobile or both around where people will use it and what they need access to.",
    ],
    sections: [
      {
        title: "What I build",
        paragraphs: [],
        items: [
          "Internal tools for jobs, quoting, inventory, scheduling and reporting.",
          "Customer portals where people can submit requests, follow progress or manage their account.",
          "iPhone and Android apps for work away from a desk, including tablets and warehouse scanners.",
          "Subscription products with accounts, access permissions and separate data for each customer.",
        ],
      },
      {
        title: "Built around the actual job",
        paragraphs: [
          "I start by walking through the work with the people doing it. We pick a useful first version, then build in chunks you can try as we go. Awkward steps are much easier to fix while they're still small.",
          "Connections to existing systems, moving old data, and who can see or change what are part of the scope. If the app needs to work with patchy reception, we plan what it stores on the device and how it catches up when the connection returns.",
        ],
      },
      {
        title: "Getting it into use",
        paragraphs: [
          "Delivery includes testing the agreed workflows, setting up the live app and documenting how to run it. For phone apps, we agree the distribution route, including any app store submission work. You'll have access to the code and accounts, with support and further features agreed separately.",
        ],
      },
    ],
  },
  {
    slug: "desktop-software",
    number: "03",
    name: "Desktop software",
    ornament: "computer",
    summary: "Windows software for when a browser won't do: talking to hardware, running offline on a plant PC, or chewing through files locally.",
    body: [
      "Some jobs don't belong in a browser. The PC's bolted to a machine, the network comes and goes, or the files are too big to upload anywhere.",
      "I build Windows tools for those situations. Sometimes it's a small utility that saves someone hours every week. Sometimes it's the interface an operator uses for a whole shift.",
    ],
    sections: [
      {
        title: "What I build",
        paragraphs: [],
        items: [
          "Utilities for importing, checking, converting and exporting files in bulk.",
          "Software that talks to serial devices, PLCs, scanners and label printers.",
          "Local data collection, reporting and operator tools for plant PCs.",
          "Replacements for ageing utilities and macros that have become difficult to maintain.",
        ],
      },
      {
        title: "Made for the PC it runs on",
        paragraphs: [
          "I check the Windows version, hardware connections, file formats and IT restrictions before choosing how to build it. An application tested on my laptop still needs to work on the machine where you'll use it.",
          "We agree what must work offline, where data is kept, and what should happen if a device disconnects or a file is incomplete. I test against representative files and available hardware, with any site checks included in the scope.",
        ],
      },
      {
        title: "Installation and handover",
        paragraphs: [
          "You get the application, an agreed installation process, and notes covering setup, settings and common faults. I document its dependencies and how to recover or move its data. Updates and ongoing support are agreed around how the PC is managed.",
        ],
      },
    ],
  },
  {
    slug: "industrial-automation",
    number: "04",
    name: "Industrial automation",
    ornament: "gear",
    summary: "PLC and HMI programming, upgrades to existing machinery, and production data connected to the rest of the business. Mostly Siemens and Omron.",
    body: [
      "Machines don't care how nice your dashboard looks. They care whether the code is right, and whether someone can fault-find it at 2 am without ringing me.",
      "I write and change PLC and HMI code, work on existing production lines, and build the software around them. Brownfield work means understanding what's already running before changing it.",
    ],
    sections: [
      {
        title: "Where I can help",
        paragraphs: [],
        items: [
          "PLC programming and fault-finding, mostly on Siemens and Omron systems.",
          "HMI screens, alarms and diagnostics that help operators understand what the machine is doing.",
          "Changes to existing sequences and interlocks, including control changes within a scoped safety upgrade.",
          "Production tracking, reporting and getting machine data into the systems the office already uses.",
        ],
      },
      {
        title: "Changing a running machine",
        paragraphs: [
          "I start with the existing code, drawings and a conversation about how the line actually runs. We agree the change, the available downtime, the checks needed and how to get back to the previous version if something isn't right.",
          "Safety-related work needs an agreed scope and validation responsibilities. Testing, commissioning and sign-off are planned around the machine and the people responsible for it.",
        ],
      },
      {
        title: "Leaving a useful record",
        paragraphs: [
          "Handover includes the agreed source files and backups, a record of what changed, and the test results and operator notes relevant to the work. The next person looking after the line should be able to understand what was done.",
        ],
      },
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
