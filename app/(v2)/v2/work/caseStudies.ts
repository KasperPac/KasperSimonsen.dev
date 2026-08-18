export type CaseSection = {
  title: string;
  paras: string[];
  image?: { src: string; caption: string };
};

export type CaseStudy = {
  slug: string;
  intro: string[];
  sections: CaseSection[];
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "pac-forge",
    intro: [
      "Forja turns requirements documents into TIA Portal projects — and runs the other way: point it at a legacy TIA project and it extracts a spec you can read. Eight AI agents do the work, and everything compiles against a real TIA Portal install via Openness, or you find out why it didn't.",
      "The symmetry is the point. Greenfield projects start as a description and end as a compiling TIA project. Legacy projects start as TIA code and end as an editable spec. Both meet in the middle at a structured machine model.",
    ],
    sections: [
      {
        title: "The problem",
        paras: [
          "PLC work eats engineering hours on tasks that look identical project to project but aren't. Translating functional descriptions into SCL, wiring IO lists, laying out HMI screens, hand-auditing inherited codebases. Every site has its own naming, hardware, and safety constraints — you can't template it, and you can't avoid it.",
          "Asking a general chatbot to write SCL doesn't work. PLC code has to compile against specific hardware, follow project-specific naming, and obey standards a general model has no reason to know. Forja is built for Siemens TIA Portal specifically, with every generated block compiled in the loop.",
        ],
      },
      {
        title: "Eight agents, one pipeline",
        paras: [
          "A Project Manager plans each run and delegates: a Code Architect writes SCL, a Standards Enforcer, IO Validator, and Safety Auditor review blocks against their own rules, a Pattern Librarian watches corrections, an HMI Designer lays out WinCC screens, and an HMI Tag Linker wires every element to the right PLC data block.",
          "They run as a pipeline, not a chorus. Reviewers send findings back for a rewrite pass; when two disagree, the PM surfaces the disagreement instead of silently picking a side. Every hand-off produces an artefact the engineer can edit, rewind, or regenerate.",
        ],
      },
      {
        title: "Spec from legacy, without hallucinating",
        paras: [
          "Pac-Audit points the platform at an existing project. The extraction rule is strict: anything computable from structured Openness data — block interfaces, call graphs, state machines, cross-references — goes through a deterministic extractor, no inference.",
          "Only the genuinely interpretive parts go through an AI: intent, fault-handling prose, non-standard patterns. Every AI-extracted fact carries an evidence citation and a confidence flag. If Pac-Audit can't find evidence, it says so instead of inventing plausible text.",
        ],
      },
      {
        title: "Every correction becomes a rule",
        paras: [
          "When a generation fails to compile, the error comes back through the bridge, a compile-fix agent proposes a correction, and if the fix holds, the diff gets classified and saved as a pattern. Every future run starts seeded with the approved library, across every agent and every project.",
          "When knowledge sources disagree, a seven-level priority hierarchy picks a winner — from platform rules down to prompt sections. The point is to encode the team's judgment and carry it into the next run.",
        ],
      },
      {
        title: "The TIA Openness bridge",
        paras: [
          "TIA Portal has no REST API — the only programmatic interface is TIA Openness, a COM-style .NET library. The bridge is a C# console app wrapping Openness behind HTTP and WebSocket: it opens the TIA project, imports artefacts in the right order, triggers a compile, and streams errors back live.",
          "Before anything gets near real hardware, the bridge runs PLCsim passes against the generated blocks. Supports V17 through V20; launches on demand and shuts down when idle.",
        ],
      },
      {
        title: "Where it stands",
        paras: [
          "Forja is in use on live projects — instrument registers become customer-ready specs, specs become compiling TIA projects, and inherited codebases become the same spec shape, ready to regenerate onto a current TIA version. A Conformance Reviewer is next: verifying every requirement traces to code, and every behaviour traces back to a requirement.",
        ],
      },
    ],
  },
  {
    slug: "manuva",
    intro: [
      "Manuva is manufacturing-operations software for Shopify-native product brands. Inventory, multi-level BOMs, production orders, purchasing, stocktake, reports, and capacity planning in one connected system — replacing the spreadsheets and bolted-together MRP those brands typically end up running.",
      "Supabase is the inventory source of truth; Shopify stays the sales channel. Every mutation in the system flows through one ledger.",
    ],
    sections: [
      {
        title: "One ledger, no side doors",
        paras: [
          "Every receipt, stocktake variance, manual adjustment, and reservation writes an append-only movement record and updates the derived balance for that component and location. If a balance ever changes without a movement behind it, the system is lying.",
          "There is one code path for inventory math. No side doors, no hidden writes, no Shopify-only updates leaking through. That invariant is what lets the app hold up under audit, reconciliation, and recovery.",
        ],
        image: {
          src: "/v2/manuva-live.jpg",
          caption: "manuva.app — live",
        },
      },
      {
        title: "BOMs that match the line",
        paras: [
          "Bills of material are multi-level and versioned — one active BOM per variant, full history behind it. Lines carry yield %, so the explosion that drives reservations and costing reflects what actually comes off the line, not the idealised recipe.",
          "Templates speed up the common case: a candle line sharing a wax base across thirty fragrances reuses one sub-assembly. Activating a new version doesn't break the past — old orders keep pointing at the BOM that priced and reserved them.",
        ],
      },
      {
        title: "Availability from live demand",
        paras: [
          "Orders sync in from Shopify and immediately drive component reservations through the active BOM. Availability stops being \"how many finished goods are left\" and becomes \"are the required components on hand once already-reserved stock is taken out.\"",
          "Cancellations release reservations, fulfilments consume them. Missing BOMs, weak component coverage, and over-reservation all surface before the floor feels them.",
        ],
      },
      {
        title: "The floor on the same ledger",
        paras: [
          "Stocktake sessions run by location — expected vs counted, approval states, variance applied back into the ledger atomically. Purchase orders and goods inwards use the same model: partial receipts line by line, bulk receipts when the dock fills up, supplier lead times tracked against reality.",
          "There's no side channel for warehouse ops. Receiving, counting, and corrections all land on the same balances and movement history.",
        ],
      },
      {
        title: "Tenants isolated from the schema up",
        paras: [
          "Every operational table carries a tenant key, every RLS policy enforces it, every RPC is written so an unauthenticated path can't bypass it. The Shopify webhook handler is idempotent and tenant-scoped — a replayed delivery for one shop can't touch another's inventory.",
          "An integrity audit runs continuously over live data: reconciliation drift, over-reservation, over-receipt, duplicate movements. Anything violating the invariant lights up before a customer or auditor finds it.",
        ],
      },
      {
        title: "Costing and capacity",
        paras: [
          "Open order lines generate frozen cost snapshots from the active BOM, labour routing, rates, and overhead — the estimate the job was quoted against. Actual time entries roll back into actual labour cost, margin, and department utilisation, tying demand, materials, and shop-floor capacity into one model where before they lived in three disconnected spreadsheets.",
        ],
      },
    ],
  },
  {
    slug: "silio",
    intro: [
      "Silio is full-stack batching management for food and feed manufacturers. It plugs into an existing ERP, drives weighing and blending through an industrial PLC, validates every ingredient that enters a batch, and writes every operator action to a SQL audit log — shipped as a complete bundle of PLC, load cells, NFC readers, HMI panels, rugged Android devices, and the software tying them together.",
      "An animal-nutrition feed facility in Beaudesert, Queensland has run on Silio since 2023 — four concurrent production zones that previously worked from handwritten work orders and end-of-shift signatures.",
    ],
    sections: [
      {
        title: "The problem",
        paras: [
          "A single batch can pull 20+ ingredients across hand-measured and bulk-bag workflows. Traditionally the operator works from a printed work order, writes weights down, and signs the sheet at the end. Handwritten weights drift, bag counts get off by one, and when an animal gets sick from a specific batch, the chain back through the paperwork is slow and fragile.",
          "The customer wanted the traceability the paper trail pretends to give — actually delivered, in real time, for every ingredient in every batch.",
        ],
        image: {
          src: "/silio-dashboard.png",
          caption: "Production dashboard — live PLC state, throughput, productive hours, room volume",
        },
      },
      {
        title: "Orders between ERP and the floor",
        paras: [
          "Tencia stays the system of record; Silio reads from it. The ingestion layer queues orders onto the PLC's 100-order working buffer, with up to 99 batches in flight. Rush orders jump the queue without disrupting what's in progress — slotted as the next thing up, never yanked out of an operator's hands.",
          "Mid-batch ingredient substitutions are first-class records: recorded against the batch with their own GIN and weight, reported back to Tencia so stock and recipe variance stay accurate. What was planned and what actually happened are never the same row overwritten twice.",
        ],
      },
      {
        title: "Weighing to tolerance, signed by NFC",
        paras: [
          "Four conditions have to agree for a sign-off to commit: the scale is in tolerance, the scanned GIN matches the ingredient the recipe expects next, the GIN is live stock in the ERP, and the operator's NFC tag is tapped. If any one fails, nothing hits SQL. The tag's UID is the operator's identity.",
          "Dosing is a profile, not a cutoff — full speed until close to target, then a slow trickle to land inside tolerance. The largest dry ingredients run loss-in-weight from silos on their own load cells. Different shape, same audit guarantee.",
        ],
        image: {
          src: "/silio-batch.png",
          caption: "Batch view — ingredient-by-ingredient sign-off state across a live order",
        },
      },
      {
        title: "An app for the bags you can't carry",
        paras: [
          "Bulk bags too awkward to bring to a fixed HMI get a rugged Android scanner instead. The operator carries it to the bag: scan the GIN barcode, validate against the recipe via the PLC, count bags, sign off with an NFC tap — the same discipline as the fixed station, portable.",
          "The app talks to the PLC directly over raw TCP: a fixed-field binary protocol framed by an STX byte and a length prefix. No HTTP, no middleware. The PLC's Structured Text UDTs mirror the TypeScript message definitions, so the app can't construct a message the PLC doesn't understand. Gloved operators get a single-screen, state-machine-driven UI with audio and vibration on every transition.",
        ],
      },
      {
        title: "A dashboard reading the floor's truth",
        paras: [
          "The audit log is append-only and events land atomically with every sign-off, so the office dashboard renders live throughput by operator, station, and product without guessing at mid-flight state. A floor manager can click any in-progress order and see every ingredient already signed off — by whom, at what weight, at what time.",
          "The dashboard isn't a separate truth. It's a projection of the one that already exists.",
        ],
      },
    ],
  },
];
