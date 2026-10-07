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
  // DRAFT for Kasper: Marianne's Hair. Professional case-study tone, like the others. Sources are in data.ts and listed
  // in the report; every claim here is read from C:\dev\Mariannes-Hair (`// src:`). No phone number, address or hours.
  {
    slug: "mariannes-hair",
    intro: [
      // src: spec §1 Problem; README line 1
      "Marianne's Hair is a website for a one-chair hair salon in West End, Brisbane, that is opening soon. The site has three jobs: let a client book or call from any screen, show the services and their prices up front, and stay easy to read for an older audience. It is one page, built so that Services and the salon's story can become pages of their own without a rewrite.",
      // src: spec §2 Goals and non-goals, §4.2; README "Square"
      "Prices are the part that has to stay right. They are not typed into the site: they are read from the salon's Square catalogue, so the owner changes a price where she already works and the site follows. Booking stays with Square Appointments, which handles the booking itself, payment and reminders.",
    ],
    sections: [
      {
        title: "Built to be read",
        paras: [
          // src: spec §1 Problem, §2 Goals, §3.3 Type; tests/e2e/a11y.spec.ts ("body copy is at least 19px"), tests/e2e/ (390 x 844 and 1440 x 900 projects); playwright.config.ts
          "The design is built for easy reading. Body text is never smaller than 19 pixels, every tap target is at least 44 pixels, and contrast is checked rather than assumed: the palette's pairs are recorded with their ratios, and gold is used for lines and never for text. The accessibility target is WCAG 2.2 AA, enforced by an axe run in the end-to-end suite, with further tests at 150 and 200 per cent text size.",
          // src: spec §3.4 (mobile action bar, opening); commit MHAIR-49 ("Book online is the only call to action"); spec §3.5 Motion
          "Booking is never more than a tap away. Book online is the page's one call to action, and on a phone a bar fixed to the foot of the screen holds it alone. The motion is quiet: sections fade in as they scroll into view, the opening's gold frame draws itself once, and every animation switches off under the reduced-motion setting, with no content ever waiting for one.",
        ],
      },
      {
        title: "Prices that stay current",
        paras: [
          // src: spec §4.2; src/lib/square/client.ts (read-only Catalog calls, 3 s timeout); src/lib/square/mapService.ts; src/lib/services/format.ts ('Ask Marianne', 'From')
          "The services list is built from the salon's Square catalogue at request time. Each bookable item becomes a name, a plain-English description and duration, and a price shown as fixed, as \"From\" when an item has several price points, or as \"Ask Marianne\" when it has none. The list follows the order of her Square categories.",
          // src: src/pages/index.astro (Cache-Control s-maxage=600 live, 60 snapshot); src/lib/services/getServices.ts; src/components/Services.astro; src/lib/health.ts; .github/workflows/health.yml; README "Square"
          "The page is cached at the edge for ten minutes, so a visitor never waits on Square and a price change appears shortly after it is made. If Square is slow, unreachable or returns nothing bookable, the page falls back to the last good list, which is committed with the site and labelled \"Prices as of\" its date. A health endpoint reports whether Square is returning bookable services, and a scheduled workflow checks it every hour, so a revoked connection or a changed catalogue is noticed by the developer before a client could be affected.",
        ],
      },
      {
        title: "Least access, handed over in person",
        paras: [
          // src: README "Square" (production access is read-only, ITEMS_READ); src/lib/square/token.ts; spec §4.3
          "The site only ever reads. In production it holds read-only access to the salon's catalogue, through an OAuth connection the owner authorises with a single permission, and it exchanges the stored refresh token for a short-lived access token that it keeps in memory. If she revokes it from her Square dashboard, the site falls back to the committed list without breaking.",
          // src: README "Connecting Marianne's Square account (production)" steps 4-8; "Secrets live only in the 1Password Environment"
          "The one-time connection is written as a runbook with a dry run, because the token is shown only once. It is made sitting together, in a private window on the developer's machine, with the token going straight into the password manager and never through a chat, an email or a screenshot. Afterwards the temporary setup key, preview variables and redirect URL are removed, and production is never given the setup key.",
        ],
      },
      {
        title: "A launch gate that cannot be waved through",
        paras: [
          // src: README "Launching"; src/lib/readiness.ts; astro.config.ts; scripts/launch-check.ts; src/data/site.ts (placeholder flags)
          "The site is built ahead of the facts it needs: opening hours, contact details, the booking page, the owner's own words and real photographs. Rather than track those on a list, the build tracks them. Every placeholder in the content is flagged in code, and a production build on Vercel runs a launch check and refuses to deploy until the list is empty. It blocks on sample copy and sample quotes, any AI-generated image, a snapshot of invented prices, and a production environment that is missing its Square credentials or its booking URL.",
          // src: README "Open question (MHAIR-37)" and "Launching" (GST); spec §3.6 Imagery
          "Two rules are held there on purpose. Displayed prices must include GST under Australian Consumer Law, so the gate stays closed until the owner confirms how her Square prices are set up. And images that are placeholders are never presented as her work or her salon: each is replaced with real photography or removed before launch.",
        ],
      },
      {
        title: "Where it stands",
        paras: [
          // src: git log (37 commits, 2026-10-05); README "Run it"; tests/unit (17 files), tests/e2e (7 specs); .github/workflows/ci.yml; CLAUDE.md "Stage: not declared"
          "The site is built and tested, and is not live. The suite covers the Square mapping and fallback, the health endpoint and the OAuth routes in unit tests, and the page itself end to end at phone and desktop sizes in Chromium and WebKit, with the Lighthouse budget (LCP 2.5 s, layout shift 0.05, 10 KB of script) alongside it. What remains is the work the gate lists: the owner's content and photographs, her Square connection, the domain and the first production deploy.",
        ],
      },
    ],
  },
  // DRAFT for Kasper: Pac Technologies website, from .superpowers/sdd/2026-10-02-office-interactions-m2/content-drafts.md §3.2, verbatim.
  {
    slug: "pac-technologies",
    intro: [
      // src: llms.txt (founded 2003, Brisbane HQ); CLAUDE.md; github.md
      "The public website for Pac Technologies, an industrial automation engineering firm founded in Brisbane in 2003. It's hand-written static HTML with no framework and no build step, rebuilt on the company's own design system so the website, the company's documents and its internal tools share one visual language.",
      // src: seo/audit/2026-05-17/FULL-AUDIT-REPORT.md Executive Summary
      "The engineering substance was already in the copy. What was missing was everything underneath it: sitemap, canonicals, structured data, social metadata, any signal for AI crawlers. The work was to build that foundation, then grow a body of technical writing on top of it.",
    ],
    sections: [
      {
        title: "Starting from 45",
        paras: [
          // src: FULL-AUDIT-REPORT.md score table + Executive Summary (drop if §1.6 says so)
          "A baseline audit in May 2026 scored the site 45 out of 100. The prose rated above the local integrator average; the infrastructure rated close to nothing. There was no robots.txt, no sitemap and no canonical URLs, not one block of JSON-LD on any page, a font-loading waterfall delaying the largest paint, and two logo files of around 800 KB each.",
          // src: seo/audit/2026-05-17/HANDOVER.md status table; git 2026-05-17 → 2026-05-20
          "The fixes were mechanical and went in as sprints. First came the sitemap, robots.txt, canonicals and on-page corrections. Then service, FAQ, breadcrumb, article and product schemas, Open Graph and Twitter metadata on every page, and explicit image dimensions and compression. A post-deploy audit then caught the remaining schema and layout-shift issues.",
        ],
      },
      {
        title: "Readable by search engines and language models",
        paras: [
          // src: grep "@type" over tracked HTML (31 of 40 site pages carry JSON-LD; Service + Offer on 5 of 6 service pages — services/programming lost it in the rebuild, §1.7); index.html (Organization, 2 PostalAddress); git 2026-05-19 "GEO quick wins: SpeakableSpecification"
          "Structured data runs through 31 of the site's 40 pages. Articles and guides carry Article, FAQPage and BreadcrumbList markup, plus a SpeakableSpecification marking the passages a voice assistant or AI answer should quote. The service pages carry Service and Offer markup, and the organisation record carries both offices' addresses.",
          // src: llms.txt; HANDOVER.md (IndexNow key); _indexnow_ping.ps1
          "An llms.txt at the root gives language models a plain-text map of the company: services, products, guides, and every article with a one-line summary. New URLs are announced through IndexNow instead of waiting for a crawl.",
        ],
      },
      {
        title: "Writing for the people who buy automation",
        paras: [
          // src: llms.txt "Resources" and "Blog"; blog/ listing
          "Two long-form guides, one on brownfield PLC upgrades and one on food-and-beverage automation, anchor sixteen articles for plant managers and controls engineers. Topics include S7-300 migration, SCADA cutover strategy, PackML code standards, SIL determination and machine-vision selection. One article embeds a payback calculator written in plain JavaScript.",
          // src: git 2026-05-19 "Remove all specific time and cost estimates", 2026-05-17 "Round volatile numbers"; llms.txt (dated standards)
          "Standards and regulatory dates are cited. Specific time and cost estimates were removed from every page, and volatile figures are rounded, so the copy doesn't go stale the month after it's published.",
        ],
      },
      {
        title: "Rebuilt on the design system",
        paras: [
          // src: github.md "Updated in this project"; CLAUDE.md
          "In August 2026 the site was rebuilt on the Pac Technologies design system's own build: navy chrome, uppercase display type, a safety-orange accent. The system's CSS and JavaScript are copied in unchanged and upgraded at the source. Page-level patterns such as heroes, hairline grids, filters and forms live in a single extra stylesheet that uses the same vocabulary.",
          // src: tools/gen-world-map.py docstring; index.html:22, 118-126
          "The homepage map of project locations is generated offline by a Python script from Natural Earth land data, and the pin coordinates are written into the HTML as literals, so the map renders with JavaScript disabled. The hero video loads poster-first: the poster is the video's own first frame, preloaded as the largest-contentful-paint element, and the video isn't fetched until it plays.",
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
