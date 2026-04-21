const serif = { fontFamily: "var(--font-fraunces), 'Instrument Serif', Georgia, serif" };
const body  = { fontFamily: "var(--font-instrument-sans), system-ui, -apple-system, sans-serif" };
const mono  = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };

const hardBits = [
  {
    title: "Append-only ledger design",
    paras: [
      "Moving from 'update the stock count' to an event-sourced ledger meant dropping the obvious approach. The database has no current_quantity column. There's no mutable number to decrement. Every stock movement — receipt, commitment, allocation, return — is an immutable event. Availability is always computed from the ledger. Nothing is read from a cached number that might be stale.",
      "Current availability comes from a materialised view that rolls up recent events and refreshes on a short interval. Reads are fast, and correctness still holds even if the refresh lags a few seconds, because the underlying events are always right. The view is the cache. The ledger is the truth.",
    ],
  },
  {
    title: "BOM explosion for multi-level assemblies",
    paras: [
      "Some products are assembled from sub-components that are themselves assembled from lower-level parts. A recursive BOM explosion walks the full tree to work out what raw components an order actually consumes. With deep trees and high SKU counts, this gets expensive fast.",
      "Assemblio uses a recursive CTE in Postgres to traverse the tree in a single query, and caches results for BOMs that haven't changed. The cache invalidates on BOM edits via a simple structural hash.",
    ],
  },
  {
    title: "Shopify webhook reliability",
    paras: [
      "Shopify webhooks are at-least-once. Duplicate deliveries happen, and if you don't handle them you get double-deductions in your ledger. Every webhook carries an X-Shopify-Webhook-Id header. Assemblio stores processed IDs in a dedupe table and rejects duplicates before they reach the ledger.",
      "The dedupe check and the ledger write happen in the same Postgres transaction, so no duplicate can slip through between the check and the write. HMAC verification runs on every delivery, so spoofed payloads never reach application code.",
    ],
  },
  {
    title: "Tenant isolation under load",
    paras: [
      "Tenants are logically isolated but share a Postgres database. One busy tenant shouldn't slow down the others. Row Level Security runs on every query, so tenant boundaries are enforced at the database level, not in application code where a missing WHERE clause leaks data.",
      "Supabase's managed PgBouncer caps concurrent connections per tenant and stops one tenant from starving the rest. The kind of constraint that only matters at scale, and gets painful to retrofit if it's not there from day one.",
    ],
  },
];

export default function AssemblioContent() {
  return (
    <div className="space-y-14">

      {/* Opening */}
      <div className="space-y-4 max-w-[68ch]">
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          Assemblio plugs into a Shopify store and solves one problem: inventory counts drift. Shopify's inventory tracks units sold. It doesn't understand Bills of Materials. It doesn't track committed stock. It can't handle components that are mid-assembly. A merchant building products that share sub-components will run out of those sub-components faster than Shopify predicts, and Shopify won't flag it until the order is already in.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          The gap between what Shopify thinks you have and what you actually have is inventory drift. It compounds with order volume, and it costs real money the first time a customer places an order for something you can't actually fulfil.
        </p>
      </div>

      {/* The problem */}
      <section className="space-y-4 max-w-[68ch]">
        <h2 className="text-[2rem] italic leading-tight mb-5" style={{ ...serif, color: "var(--text-primary)" }}>
          The problem
        </h2>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          Every Shopify merchant running a manufacturing or assembly workflow hits the same wall. Their store has products with Bills of Materials, where each finished good is assembled from a set of components. Shopify doesn't know about BOMs. It tracks finished goods, not components. When an order comes in, Shopify decrements the finished good count, but if you're building to order (pulling components from a bin to assemble the product), Shopify never tracked the components in the first place.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          Spreadsheets fill the gap until they don't. Assemblio is the replacement: a system that understands BOMs, tracks components, and stays accurate without manual reconciliation.
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
            Assemblio installs into a Shopify store via OAuth and subscribes to order webhooks. When an order arrives, Assemblio intercepts it, explodes the BOM for each product, and records the committed quantities in its own ledger. Shopify's numbers aren't touched. The authoritative view of what's actually available lives in Assemblio.
          </p>
          <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
            Multi-tenancy is enforced at the Postgres level with Row Level Security. Every query runs under the authenticated tenant's context. One tenant's data can't appear in another's queries, even if the application layer has a bug.
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
          v1 shipped in 2024. The append-only ledger and BOM explosion did what I hoped — inventory drift dropped noticeably against unmanaged Shopify. The architecture held up against real orders, real webhooks, and the edge cases that only show up in production.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          v1 also exposed what I'd built too fast. The multi-tenancy was application-level filtering, not real RLS. The BOM explosion was synchronous and got slow above a couple hundred SKUs. Webhook handlers lived in Next.js API routes that cold-started too slowly for time-sensitive inventory updates.
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
          v2 rebuilds tenant isolation on Postgres RLS from day one. Lesson from v1: application-level filtering works until it doesn't. A single missing WHERE clause in a new query is enough to leak data between tenants. RLS enforces the boundary in the database, where it can't be forgotten. The data model from v1 carries over. The application layer doesn't.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          Webhook handling moves to Supabase Edge Functions — always warm, no cold start, isolated from the Next.js request path. The BOM explosion becomes a proper recursive CTE with result caching keyed on a structural hash. The materialised view refresh interval gets tuned to what v1 actually showed in production: the 30-second default is too slow for high-volume merchants, and 5 seconds is fine with negligible database load.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          The v2 target is simple: ship to more tenants without the operational overhead v1 needed. The architecture has to handle 50 concurrent tenants the same way it handles 5. Building that in now is cheaper than retrofitting it when the user count demands it.
        </p>
      </section>

    </div>
  );
}
