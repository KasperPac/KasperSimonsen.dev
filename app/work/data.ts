export type Project = {
  slug: string;
  // Work index
  statusLabel: string;
  statusType: "building" | "rebuilding";
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
    headline: "Teaching seven agents to write PLC code.",
    description:
      "A multi-agent pipeline generates Siemens SCL, compiles it in TIA Portal via a .NET Openness bridge, and learns from every compile failure and engineer correction.",
    pills: ["React 19", "Claude API", ".NET 4.8", "Supabase"],
    stackSummary: "React 19 · Claude API · .NET 4.8",
    integration: "TIA Openness",
    statusNote: "Primary focus",
    githubRepo: "pac-forge",
    title: "TEACHING SEVEN AGENTS TO WRITE PLC CODE",
    displayName: "Pac-Forge",
    logo: "/PacTechnologiesEdit_White.png",
    role: "Sole engineer",
    stack: [
      "React 19 + Vite 7",
      "TypeScript 5.9",
      "Tailwind CSS 3",
      "Supabase (Postgres + Edge Functions + Auth)",
      "Claude API",
      ".NET Framework 4.8 / C#",
      "TIA Openness",
      "Zustand",
      "TanStack Query",
      "Monaco Editor",
    ],
    integrationPoints: [
      "Claude API via Supabase Edge Functions",
      "TIA Portal (via .NET Openness bridge)",
      "WebSocket job streaming",
      "Supabase Realtime",
    ],
    notableDetails: [
      "Bridge runs on port 5102, Windows-only",
      "Lease TTL: 90s with keepalive renewal",
      "Pattern library: WRONG/CORRECT pairs",
      "Topological sort for agent ordering",
      "RLS across all Supabase tables",
    ],
  },
  {
    slug: "assemblio",
    statusLabel: "REBUILDING — v2",
    statusType: "rebuilding",
    yearRange: "2024 → present",
    year: "2024",
    category: "Multi-tenant SaaS",
    headline: "Inventory that doesn't drift.",
    description:
      "A Shopify-connected BOM and component inventory system. Append-only movement ledger, tenant-scoped from the schema up, reconciliation audits baked in.",
    pills: ["Next.js 16", "Supabase", "Shopify API", "Postgres"],
    stackSummary: "Next.js 16 · Supabase · Shopify",
    integration: "Shopify OAuth, webhooks",
    statusNote: "Rebuild in progress",
    v1ShippedYear: "2024",
    githubRepo: "assemblio",
    title: "INVENTORY THAT DOESN'T DRIFT",
    displayName: "Assemblio",
    logo: "/Assemblio_crop.png",
    role: "Sole engineer",
    stack: [
      "Next.js 16 (App Router)",
      "TypeScript",
      "Supabase (Postgres + Auth + Edge Functions)",
      "Postgres RLS",
      "Shopify API + OAuth",
      "Tailwind CSS",
    ],
    integrationPoints: [
      "Shopify OAuth (installation flow)",
      "Shopify webhooks (orders, inventory)",
      "Supabase Realtime",
    ],
    notableDetails: [
      "Append-only movement ledger",
      "Postgres RLS tenant isolation",
      "Recursive CTE for BOM explosion",
      "Idempotent webhook handling",
      "Materialized views for availability",
    ],
  },
];

export const previously: Project[] = [];
