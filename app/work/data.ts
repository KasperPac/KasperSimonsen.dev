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
  role: string;
  stack: string[];
  integrationPoints: string[];
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
  {
    slug: "assemblio",
    statusLabel: "REBUILDING — v2",
    statusType: "rebuilding",
    yearRange: "2024 → present",
    year: "2024",
    category: "Multi-tenant SaaS",
    headline: "Operations under the storefront.",
    description:
      "A Shopify-connected BOM, inventory, purchasing, stocktake, goods-inwards, costing, and capacity system for assembly teams. Tenant-scoped, audit-friendly, and built around a movement ledger.",
    pills: ["Next.js 16", "Supabase", "Shopify API", "Postgres"],
    stackSummary: "Next.js 16 · Supabase · Shopify",
    integration: "Shopify OAuth + order webhooks",
    statusNote: "Rebuild in progress",
    v1ShippedYear: "2024",
    githubRepo: "assemblio",
    title: "OPERATIONS UNDER THE STOREFRONT",
    displayName: "Assemblio",
    logo: "/Assemblio_crop.png",
    role: "Sole engineer",
    stack: [
      "Next.js 16 (App Router)",
      "TypeScript",
      "Supabase (Postgres + Auth + RPCs)",
      "Postgres RLS",
      "Shopify Admin API + OAuth + webhooks",
      "CSS Modules",
    ],
    integrationPoints: [
      "Shopify OAuth installation flow",
      "Shopify webhooks for orders and lifecycle updates",
      "Supabase RPCs for receiving, costing, and inventory operations",
    ],
    notableDetails: [
      "Inventory movement + balance invariant",
      "Order-driven component reservations",
      "Stocktake lifecycle with variance apply",
      "Partial PO receiving and goods inwards",
      "Frozen planned cost snapshots + actual rollups",
      "Department capacity and utilisation reporting",
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
      "The software running Rabar's feed production facility — Tencia ERP orders in, Omron PLC on the floor, NFC-signed weighing, bulk-bag Android scanner, SQL audit log, live dashboard.",
    pills: ["Omron PLC", "SQL", "React Native", "React"],
    stackSummary: "Omron PLC · SQL · React Native · React",
    integration: "Tencia ERP + Omron PLC",
    statusNote: "In production",
    githubRepo: "silio",
    title: "EVERY GRAM, SIGNED FOR",
    displayName: "Silio",
    logo: "/silio.svg",
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
