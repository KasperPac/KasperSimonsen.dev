export type Project = {
  slug: string;
  // Work index
  statusLabel: string;
  statusType: "building" | "rebuilding" | "shipped";
  yearRange: string;
  year: string;
  category: string;
  headline: string;
  description: string;
  pills: string[];
  stackSummary: string;
  integration: string;
  statusNote: string;
  v1ShippedYear?: string;
  githubRepo: string;
  // Case study
  title: string;
  displayName: string;
  logo: string;
  liveUrl?: string;
  role: string;
  stack: string[];
  integrationPoints: string[];
  platforms?: string[];
  notableDetails: string[];
};

export const currently: Project[] = [
  {
    slug: "pac-forge",
    statusLabel: "BUILDING v0.4.2",
    statusType: "building",
    yearRange: "2025 → present",
    year: "2025",
    category: "LLM Systems",
    headline: "Code that stays in spec.",
    description:
      "Eight AI agents for Siemens TIA Portal projects — turning functional specs into compiling SCL and HMI, and turning legacy projects back into editable specs. Pattern library grows with every correction.",
    pills: ["React 19", "Claude API", ".NET 4.8", "Supabase"],
    stackSummary: "React 19 · Claude API · .NET 4.8",
    integration: "TIA Openness (V17–V20)",
    statusNote: "Primary focus",
    githubRepo: "pac-forge",
    title: "CODE THAT STAYS IN SPEC",
    displayName: "Forja",
    logo: "/forja.svg",
    role: "Sole engineer",
    stack: [
      "React 19 + Vite 7",
      "TypeScript 5.9",
      "Tailwind CSS 3",
      "Supabase (Postgres + Edge Functions + Auth)",
      "Claude API",
      ".NET Framework 4.8 / C#",
      "TIA Openness (V17–V20)",
      "PLCsim (in-loop testing)",
      "Zustand + TanStack Query",
      "Monaco Editor (custom SCL tokenisation)",
    ],
    integrationPoints: [
      "Claude API via Supabase Edge Functions",
      "TIA Portal V17–V20 via .NET Openness bridge",
      "PLCsim for pre-deployment testing",
      "WebSocket live status + Supabase Realtime",
      "Session-level agent leasing on Supabase",
    ],
    notableDetails: [
      "Eight-agent pipeline: PM + 7 specialists",
      "Pac-Audit: deterministic extract + AI only for inferential facts",
      "Compile-in-the-loop via .NET 4.8 Openness bridge",
      "Seven-level priority hierarchy for conflicting knowledge",
      "Bidirectional: FDS Builder + Pac-Audit converge on same spec shape",
      "Conformance Reviewer (in dev) for requirement↔code traceability",
    ],
  },
  // DRAFT for Kasper: Marianne's Hair. Facts are from C:\dev\Mariannes-Hair (its README, CLAUDE.md, package.json,
  // docs/superpowers/specs/2026-10-05-mariannes-website-design.md, src/, tests/ and git log); each is marked `// src:`.
  // Not live, so no `liveUrl`. No phone number, street address or hours: none of them belongs in a case study.
  {
    slug: "mariannes-hair",
    statusLabel: "BUILDING — PRE-LAUNCH", // src: README "Launching" (production build blocked until check:launch is clean); CLAUDE.md "Stage: not declared"
    statusType: "building",
    yearRange: "2026", // src: git first commit 2026-10-05, latest 2026-10-05 (37 commits)
    year: "2026",
    category: "Website",
    headline: "One place to change a price.",
    description:
      "A website for a one-chair hair salon in West End, Brisbane. One page built for an older audience: large type, high contrast, and booking always in reach. Services and prices are read from the salon's Square catalogue, so the owner changes a price in one place and the site follows.",
    // src: spec §1 Problem, §2 Goals, §4.2 Services data
    pills: ["Astro", "TypeScript", "Square", "Vercel"], // src: package.json (astro, @astrojs/vercel, typescript)
    stackSummary: "Astro · Square · Vercel",
    integration: "Square Catalog API · Square Appointments", // src: src/lib/square/client.ts; spec §4.2 (the Book link is the Appointments booking page)
    statusNote: "Pre-launch",
    githubRepo: "Mariannes-Hair", // src: README "Deployment" (github.com/KasperPac/Mariannes-Hair, private; owner differs from lib/github's GITHUB_USERNAME)
    title: "ONE PLACE TO CHANGE A PRICE",
    displayName: "Marianne's Hair",
    logo: "/mariannes-hair-mark.svg", // a white, mark-only SVG (no navy square), from Mariannes-Hair/public/favicon.svg
    role: "Sole engineer", // src: git shortlog, one author. [inferred] the mark itself comes from the designer's master (commit MHAIR-48), not from this repo's author
    stack: [
      "Astro 7, server-rendered on Vercel with CDN caching", // src: package.json; astro.config.ts; src/pages/index.astro (Cache-Control)
      "TypeScript 5.9", // src: package.json
      "Square Catalog API, read-only", // src: README "Square" (ITEMS_READ)
      "Square OAuth, refresh token swapped for a short-lived access token", // src: src/lib/square/token.ts, oauth.ts; spec §4.3
      "Fontsource: Instrument Serif, Newsreader, DM Mono", // src: package.json
      "Vitest unit tests, Playwright end-to-end tests with axe", // src: package.json; tests/
      "Lighthouse CI budget", // src: lighthouserc.json
      "GitHub Actions: CI on every push, hourly health check", // src: .github/workflows/ci.yml, health.yml; README
    ],
    integrationPoints: [
      "Square catalogue: bookable services and their prices", // src: spec §4.2; src/lib/square/mapService.ts
      "Square Appointments: the Book online link", // src: spec §4.2 step 5
      "Vercel: preview deployments per branch, production on main", // src: README "Deployment"
      "/api/health: reports whether Square returns bookable services", // src: src/pages/api/health.ts, health.ts
      "HairSalon structured data for local search", // src: src/lib/jsonLd.ts; spec §4.4
    ],
    notableDetails: [
      "Prices are read from Square; the last good list is committed as a fallback, shown as \"Prices as of …\"", // src: src/lib/services/getServices.ts; Services.astro
      "Square access is read-only, authorised once by the owner; revoking it falls back to the snapshot", // src: README "Revoking access later"
      "A production build refuses to deploy while anything is open: placeholder content, sample prices, a missing booking URL", // src: README "Launching"; src/lib/readiness.ts
      "Body text at least 19px, tap targets at least 44px, WCAG 2.2 AA checked with axe", // src: spec §2; tests/e2e/a11y.spec.ts
      "Lighthouse budget: LCP 2.5 s, CLS 0.05, 10 KB of script", // src: lighthouserc.json
      "The menu opens without JavaScript, using the HTML popover attribute", // src: src/components/Header.astro; commit MHAIR-23
      "Every animation is off under reduced motion, and no content waits on one", // src: spec §3.5
    ],
  },
  // DRAFT for Kasper: Pac Technologies website, from .superpowers/sdd/2026-10-02-office-interactions-m2/content-drafts.md §3.2,
  // verbatim. Open questions in that file (§1.5 rebuilt or built, §1.6 publishing the 45/100 baseline) are still yours to settle.
  {
    slug: "pac-technologies",
    statusLabel: "LIVE",
    statusType: "shipped",
    yearRange: "2026", // src: git first 2026-05-08, latest 2026-09-15
    year: "2026",
    category: "Marketing Site",
    headline: "Static pages, structured for search.",
    description:
      "The public website for Pac Technologies, an Australian industrial automation firm. Hand-written static HTML on the company design system, structured data across the site, an llms.txt for AI search, and a library of technical articles written for plant managers and controls engineers.",
    // src: CLAUDE.md; github.md; llms.txt; seo/audit/2026-05-17/HANDOVER.md
    pills: ["HTML", "CSS", "JSON-LD", "llms.txt"],
    stackSummary: "Static HTML · CSS · JSON-LD",
    integration: "Schema.org JSON-LD + IndexNow", // src: HANDOVER.md Sprint 2; root IndexNow key file
    statusNote: "Live",
    githubRepo: "pac-market-website", // src: remote github.com/kasperpac/pac-market-website
    title: "STATIC PAGES, STRUCTURED FOR SEARCH",
    displayName: "Pac Technologies",
    logo: "/PacTechnologiesEdit_White.png", // already in KasperSimonsen.dev/public; raster lockup
    liveUrl: "https://www.pac-technologies.com.au",
    role: "Sole engineer", // src: git shortlog
    stack: [
      "Hand-written static HTML, no framework or build step", // src: repo layout (no package.json)
      "Pac Technologies design system (pac.css + pac.js, vendored unchanged)", // src: CLAUDE.md; github.md
      "Page-pattern stylesheet in the design system's vocabulary", // src: github.md (pac-pages.css)
      "Schema.org JSON-LD: Organization, Service, Article, FAQPage, BreadcrumbList, SpeakableSpecification", // src: grep "@type" over tracked HTML
      "sitemap.xml, robots.txt, canonicals, Open Graph + Twitter meta", // src: HANDOVER.md Sprints 1–2
      "llms.txt + IndexNow", // src: llms.txt; HANDOVER.md
      "Python tooling: map generator, audit and batch-edit scripts", // src: tools/gen-world-map.py; seo/audit/2026-05-17/_apply_*.py
    ],
    integrationPoints: [
      "IndexNow ping for new URLs after deploy", // src: seo/audit/2026-05-17/_indexnow_ping.ps1; git 2026-05-19
      "Hosted form endpoint for partner enquiries", // src: partners.html; git 2026-05-23 "wire form submission"
      "Design system upgraded at source, copied in unchanged", // src: CLAUDE.md
      "Header sign-in to the company's project portal", // src: git PACWEB-5
    ],
    notableDetails: [
      "Baseline audit 45/100: no sitemap, robots.txt, canonicals or JSON-LD", // src: seo/audit/2026-05-17/FULL-AUDIT-REPORT.md
      "Two long-form guides and 16 cross-linked technical articles", // src: llms.txt; blog/ (17 files incl. index)
      "Payback calculator embedded in plain JavaScript", // src: llms.txt (ROI calculator); HANDOVER.md
      "Project map generated offline from Natural Earth data; renders without JavaScript", // src: tools/gen-world-map.py docstring
      "Hero video served poster-first: the LCP is the video's own first frame", // src: index.html:22, 118-126
      "Specific time and cost estimates removed site-wide; volatile figures rounded", // src: git 2026-05-19, 2026-05-17
    ],
  },
  {
    slug: "manuva",
    statusLabel: "REBUILDING — v2",
    statusType: "rebuilding",
    yearRange: "2024 → present",
    year: "2024",
    category: "Multi-tenant SaaS",
    headline: "Manufacturing operations, under the storefront.",
    description:
      "Manufacturing-operations software for Shopify-native product brands. Inventory, multi-level BOMs, production orders, purchasing, stocktake, reports, and capacity planning in one connected system — replacing the spreadsheets and bolted-together MRP those brands typically end up running.",
    pills: ["Next.js 16", "Supabase", "Shopify API", "Multi-tenant"],
    stackSummary: "Next.js 16 · Supabase · Shopify",
    integration: "Shopify OAuth + order webhooks",
    statusNote: "Rebuild in progress",
    v1ShippedYear: "2024",
    githubRepo: "assemblio",
    title: "MANUFACTURING OPERATIONS UNDER THE STOREFRONT",
    displayName: "Manuva",
    logo: "/manuva.png",
    liveUrl: "https://manuva.app",
    role: "Sole engineer",
    stack: [
      "Next.js 16 (App Router)",
      "TypeScript",
      "Supabase (Postgres + Auth + RPCs)",
      "Postgres RLS — tenant isolation from the schema up",
      "Shopify Admin API + OAuth + webhooks",
      "CSS Modules",
    ],
    integrationPoints: [
      "Shopify OAuth installation + custom-app pipeline",
      "Real-time webhook sync for products, variants, orders, locations",
      "Supabase RPCs for allocation, receiving, costing, and stocktake",
      "Built-in integrity audit (drift, over-reservation, over-receipt, duplicates)",
    ],
    platforms: [
      "Shopify",
      "WooCommerce",
      "Amazon",
      "Etsy",
      "eBay",
      "Xero",
      "MYOB",
      "QuickBooks",
    ],
    notableDetails: [
      "Append-only movement ledger + derived balance per location",
      "Multi-level, versioned BOMs with yield % per line",
      "Order-driven component reservations, release on cancel, consume on fulfil",
      "Stocktake lifecycle with atomic variance apply",
      "Partial / bulk PO receiving and goods inwards",
      "Capacity planning + departments + staffing + actual-time costing",
      "PO variance, lead-time accuracy, dead stock, integrity reports",
    ],
  },
];

export const previously: Project[] = [
  {
    slug: "silio",
    statusLabel: "SHIPPED · RUNNING",
    statusType: "shipped",
    yearRange: "2023",
    year: "2023",
    category: "Industrial Automation",
    headline: "Every gram, signed for.",
    description:
      "Full-stack batching for food and feed manufacturers — ERP orders in, Omron PLC on the floor, NFC-signed weighing, bulk-bag Android scanner, SQL audit log, live dashboard. Case study: a feed plant running on Silio since 2023.",
    pills: ["Omron PLC", "SQL", "React Native", "React"],
    stackSummary: "Omron PLC · SQL · React Native · React",
    integration: "Tencia ERP + Omron PLC",
    statusNote: "In production",
    githubRepo: "silio",
    title: "EVERY GRAM, SIGNED FOR",
    displayName: "Silio",
    logo: "/silio.svg",
    liveUrl: "https://pac-technologies.com.au/products/silio",
    role: "Sole engineer (software)",
    stack: [
      "Omron Sysmac NJ/NX PLC (plant control layer)",
      "SQL database (audit log + Tencia integration)",
      "React Native Android app (bulk bag scanner)",
      "React dashboard (office live view)",
      "Order ingestion service (Tencia ↔ PLC)",
      "Native Kotlin bridge (hardware scanner intents)",
      "react-native-nfc-manager, react-native-tcp-socket, Vision Camera + MLKit",
    ],
    integrationPoints: [
      "Tencia ERP ↔ Silio ingestion (order in, completion data out)",
      "Silio ↔ Omron PLC (order buffer + SQL telemetry)",
      "Android app ↔ PLC (raw binary TCP)",
      "NFC tap as the sign-off primitive across all interfaces",
      "Dashboard ↔ SQL (live reads)",
    ],
    notableDetails: [
      "100-order working buffer on the PLC",
      "Rush-order priority from office to plant floor",
      "Atomic sign-off: scale tolerance + GIN validation + NFC tap",
      "Fixed-field binary protocol between app and PLC (STX + length-prefix)",
      "NFC tag UID is the operator ID",
      "Up to 5 GINs per ingredient, up to 5 bags per GIN",
      "Glove-friendly single-screen app UI",
      "Replaces paper + isolated Tencia workflow",
    ],
  },
];
