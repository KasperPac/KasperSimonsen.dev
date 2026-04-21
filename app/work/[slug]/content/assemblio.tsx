const serif = { fontFamily: "var(--font-fraunces), 'Instrument Serif', Georgia, serif" };
const body  = { fontFamily: "var(--font-instrument-sans), system-ui, -apple-system, sans-serif" };
const mono  = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };

const hardBits = [
  {
    title: "Append-only ledger design",
    paras: [
      "Moving from a 'update stock count' mental model to an event-sourced ledger required rejecting a lot of the obvious approaches. The database has no current_quantity column — there is no mutable number that gets decremented. Every stock movement — receipt, commitment, allocation, return — is an immutable event. Availability is always computed by aggregating the ledger, not read from a cached number that could be stale.",
      "Current availability is derived from a materialized view that rolls up recent events and refreshes on a short interval. Read performance is acceptable, and correctness is guaranteed even if the refresh lags by a few seconds, because the underlying events are always correct. The view is the cache; the ledger is the truth.",
    ],
  },
  {
    title: "BOM explosion for multi-level assemblies",
    paras: [
      "Some products are assembled from sub-components that are themselves assembled from lower-level parts. A recursive BOM explosion walks the full tree to determine leaf-level component requirements. This gets expensive with deep trees and high SKU counts.",
      "Assemblio handles this with a recursive CTE in Postgres that traverses the BOM tree in a single query, and caches explosion results for BOMs that haven't changed. The cache invalidates on BOM edits — a simple hash of the BOM structure triggers the cache bust.",
    ],
  },
  {
    title: "Shopify webhook reliability",
    paras: [
      "Shopify webhooks are delivered at-least-once, not exactly-once. Duplicate deliveries are real and would result in double-deductions from the ledger if not handled. Every webhook carries an X-Shopify-Webhook-Id header. Assemblio stores processed webhook IDs in a deduplication table and rejects duplicates before they reach the ledger.",
      "The deduplication check and the ledger write happen in the same Postgres transaction — so there's no window for a duplicate to slip through between the check and the write. HMAC verification on every delivery rejects spoofed payloads before they reach application code.",
    ],
  },
  {
    title: "Tenant isolation under load",
    paras: [
      "Each tenant's BOM graph and ledger are logically isolated, but they all live in the same Postgres database. A heavily-active tenant shouldn't degrade performance for others. Row Level Security policies run on every query, enforcing tenant boundaries at the database level — not in application code where a missing WHERE clause creates a data leak.",
      "Connection pooling via Supabase's managed PgBouncer caps concurrent connections per tenant and prevents one tenant from exhausting the connection pool. This is the kind of constraint that matters at scale and is expensive to retrofit if you don't build it in from the start.",
    ],
  },
];

export default function AssemblioContent() {
  return (
    <div className="space-y-14">

      {/* Opening */}
      <div className="space-y-4 max-w-[68ch]">
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          Assemblio connects to a Shopify store and solves a specific problem: inventory counts drift. Standard Shopify inventory tracks units sold, but has no concept of a Bill of Materials, no understanding of committed stock, and no way to handle components that are mid-assembly. A merchant building products that share sub-components will exhaust those sub-components faster than Shopify predicts.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          The gap between "what Shopify thinks we have" and "what we actually have available" is inventory drift. It compounds with order volume and costs real money when a customer places an order for something that turns out to be unfulfillable.
        </p>
      </div>

      {/* The problem */}
      <section className="space-y-4 max-w-[68ch]">
        <h2 className="text-[2rem] italic leading-tight mb-5" style={{ ...serif, color: "var(--text-primary)" }}>
          The problem
        </h2>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          Shopify merchants running manufacturing or assembly workflows hit the same wall. Their store has products with Bills of Materials — each finished good is assembled from a set of components. But Shopify doesn't understand BOMs. It tracks finished goods inventory, not component inventory. When an order comes in, Shopify decrements the finished good count, but if you're building to order (pulling components from a bin to assemble the product), the components were never tracked in the first place.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          Spreadsheets fill the gap until they don't. Assemblio was built to replace the spreadsheet with a system that understands BOMs, tracks components, and keeps inventory accurate without manual reconciliation.
        </p>
      </section>

      {/* Shape of the system */}
      <section className="space-y-6">
        <h2 className="text-[2rem] italic leading-tight mb-5" style={{ ...serif, color: "var(--text-primary)" }}>
          The shape of the system
        </h2>

        {/* System diagram */}
        <div
          className="p-5 space-y-3 overflow-x-auto"
          style={{ background: "#0f0f0f", border: "0.5px solid var(--border)" }}
        >
          {[
            { from: "Shopify order", to: "Assemblio webhook handler", note: "at-least-once delivery" },
            { from: "Webhook handler", to: "BOM explosion", note: "recursive CTE" },
            { from: "BOM explosion", to: "Ledger write", note: "append-only, transactional" },
            { from: "Ledger", to: "Availability view", note: "materialized, short TTL" },
          ].map(({ from, to, note }) => (
            <div key={from} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="text-[11px] sm:w-[140px] flex-shrink-0" style={{ ...mono, color: "var(--text-muted)" }}>{from}</span>
              <div className="flex items-center gap-1 sm:flex-1">
                <div className="hidden sm:block flex-1 h-[0.5px]" style={{ background: "var(--border)" }} />
                <span className="text-[10px] sm:px-2 flex-shrink-0" style={{ ...mono, color: "var(--text-dim)" }}>{note}</span>
                <div className="hidden sm:block w-3 h-[0.5px]" style={{ background: "var(--border)" }} />
                <span style={{ color: "var(--accent)", fontSize: 10 }}>→</span>
              </div>
              <span className="text-[11px] sm:w-[140px] flex-shrink-0 sm:text-right" style={{ ...mono, color: "var(--text-muted)" }}>{to}</span>
            </div>
          ))}
        </div>

        <div className="space-y-4 max-w-[68ch]">
          <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
            Assemblio connects to a Shopify store via OAuth and registers for order webhooks. When an order comes in, it intercepts it, explodes the BOM for each ordered product, and records committed quantities in its own ledger — not in Shopify's inventory. Shopify's numbers are left untouched. Assemblio maintains the authoritative view of what's actually available.
          </p>
          <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
            Multi-tenancy is enforced at the Postgres level using Row Level Security. Every query runs under the context of the authenticated tenant. It's impossible for one tenant's data to appear in another's queries even if application-level bugs exist.
          </p>
        </div>
      </section>

      {/* The hard bits */}
      <section className="space-y-10">
        <h2 className="text-[2rem] italic leading-tight" style={{ ...serif, color: "var(--text-primary)" }}>
          The hard bits
        </h2>
        {hardBits.map((section) => (
          <div key={section.title} className="space-y-4 max-w-[68ch]">
            <h3 className="text-[1.4rem] italic leading-snug" style={{ ...serif, color: "var(--text-primary)" }}>
              {section.title}
            </h3>
            {section.paras.map((para, i) => (
              <p key={i} className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
                {para}
              </p>
            ))}
          </div>
        ))}
      </section>

      {/* The result */}
      <section className="space-y-4 max-w-[68ch]">
        <h2 className="text-[2rem] italic leading-tight mb-5" style={{ ...serif, color: "var(--text-primary)" }}>
          The result
        </h2>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          v1 shipped in 2024, serving Shopify merchants managing manufacturing workflows. The append-only ledger and BOM explosion proved out the core hypothesis: inventory drift dropped significantly versus unmanaged Shopify alone. The architecture held up under real orders, real webhooks, and the inevitable edge cases that only appear in production.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          v1 also revealed what was built too fast. The multi-tenancy model used application-level filtering rather than true RLS. The BOM explosion code was synchronous and slow above ~200 SKUs. Webhook handlers lived in Next.js API routes that cold-started too slowly for time-sensitive inventory updates.
        </p>
      </section>

      {/* v2 section */}
      <section
        className="space-y-4 max-w-[68ch] pt-10"
        style={{ borderTop: "0.5px solid var(--accent)44" }}
      >
        <p className="text-xs tracking-[0.1em] uppercase mb-4" style={{ ...mono, color: "var(--accent)" }}>
          Bringing it back: v2
        </p>
        <h2 className="text-[2rem] italic leading-tight mb-5" style={{ ...serif, color: "var(--text-primary)" }}>
          What v1 taught v2
        </h2>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          v2 rebuilds the tenant isolation model using Postgres RLS from day one. The lesson from v1: application-level filtering works right up until it doesn't — a missing WHERE clause in a new query creates a data leak between tenants. RLS enforces the boundary at the database level where it can't be forgotten. The data model from v1 carries over. The application layer doesn't.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          Webhook handling moves to Supabase Edge Functions — always warm, no cold-start penalty, and isolated from the Next.js request path. The BOM explosion gets rewritten as a proper recursive CTE with result caching keyed on a hash of the BOM structure. And the materialized view refresh interval gets tuned based on what v1 measured in production: the 30-second default is too slow for high-volume merchants; 5 seconds is fine and the database load is negligible.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          The goal for v2 is to ship to more tenants without the operational overhead that v1 required. The architecture should handle 50 concurrent tenants as easily as it handles 5. Building that in now, before the user count demands it, is cheaper than retrofitting it under pressure.
        </p>
      </section>

    </div>
  );
}
