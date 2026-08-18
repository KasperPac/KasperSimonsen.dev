const serif = { fontFamily: "var(--font-fraunces), 'Instrument Serif', Georgia, serif" };
const body  = { fontFamily: "var(--font-instrument-sans), system-ui, -apple-system, sans-serif" };
const mono  = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };

const nodeStyle = {
  ...mono,
  color: "var(--text-muted)",
  fontSize: 11,
  whiteSpace: "nowrap" as const,
};

const hubNodeStyle = {
  ...mono,
  color: "var(--text-primary)",
  fontSize: 11,
  padding: "0.5rem 0.75rem",
  border: "0.5px solid rgba(255,90,31,0.4)",
  background: "rgba(255,90,31,0.05)",
  textAlign: "center" as const,
  whiteSpace: "nowrap" as const,
};

function ShapeDiagram() {
  const nodeBase = { ...nodeStyle, flexShrink: 0 } as const;
  const hubBase = { ...hubNodeStyle, flexShrink: 0 } as const;
  const segment = (
    <div className="flex items-center gap-1 flex-1 mx-2">
      <div className="flex-1 h-[0.5px]" style={{ background: "var(--border)" }} />
      <span style={{ color: "var(--accent)", fontSize: 10, ...mono, flexShrink: 0 }}>→</span>
    </div>
  );

  return (
    <div
      className="p-5 overflow-x-auto"
      style={{ background: "#0f0f0f", border: "0.5px solid var(--border)" }}
    >
      <div className="flex items-center" style={{ minWidth: 660 }}>
        <span style={nodeBase}>Shopify order</span>
        {segment}
        <span style={nodeBase}>Active BOM</span>
        {segment}
        <span style={nodeBase}>Reservation</span>
        {segment}
        <span style={hubBase}>Movement + Balance</span>
        {segment}
        <span style={nodeBase}>Availability</span>
      </div>

      {/* Edge legend */}
      <div
        className="mt-5 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2"
        style={{ borderTop: "0.5px solid var(--border)" }}
      >
        <p className="text-[11px] leading-snug" style={{ ...mono, color: "var(--text-dim)" }}>
          Shopify order → Active BOM — webhook resolves the variant
        </p>
        <p className="text-[11px] leading-snug" style={{ ...mono, color: "var(--text-dim)" }}>
          Active BOM → Reservation — recursive explode down to components, with yield %
        </p>
        <p className="text-[11px] leading-snug" style={{ ...mono, color: "var(--text-dim)" }}>
          Reservation → Movement + Balance — append-only, transactional, per location
        </p>
        <p className="text-[11px] leading-snug" style={{ ...mono, color: "var(--text-dim)" }}>
          Movement + Balance → Availability — derived, refreshed on a short tick
        </p>
      </div>
    </div>
  );
}

const hardBits = [
  {
    title: "One ledger for every inventory mutation",
    paras: [
      "Supabase is the inventory source of truth. Shopify stays the sales channel, but operational availability lives in Manuva. Every receipt, stocktake variance, manual adjustment, and reservation writes an append-only movement record and updates the derived balance for that component and location.",
      "That invariant matters because the app has to hold up under audit, reconciliation, and recovery. If a balance ever changes without a movement behind it, the system is lying. There is one code path for inventory math. No side doors, no hidden writes, no Shopify-only updates leaking through.",
    ],
  },
  {
    title: "BOM versioning with yield % per line",
    paras: [
      "Bills of material are multi-level and versioned. Each variant has one active BOM at a time, with a full history behind it. Lines carry yield %, so the explosion that drives reservations and costing reflects what actually comes off the line, not the idealised recipe.",
      "Templates speed up the common case — a candle line that shares a wax base across thirty fragrances reuses one sub-assembly. Activating a new version doesn't break the past: old orders keep pointing at the BOM that priced and reserved them.",
    ],
  },
  {
    title: "Allocating components from live Shopify demand",
    paras: [
      "Orders sync in from Shopify and land as local orders and order lines. Each line immediately drives component reservations through the active BOM for the ordered variant. Availability stops being \"how many finished goods are left\" and becomes \"are the required components on hand once already-reserved stock is taken out.\"",
      "Cancellations release reservations. Fulfillments consume them. Missing BOMs, weak component coverage, and over-reservation all surface before the floor feels them.",
    ],
  },
  {
    title: "Stocktake, purchasing, and goods inwards on the same ledger",
    paras: [
      "Stocktake sessions run by location. They capture expected vs counted quantities, move through approval states, and apply the variance back into the ledger atomically. Purchase orders and goods inwards receiving use the same model — partial receipts line by line, bulk receipts when the dock fills up, supplier lead times tracked against reality.",
      "There's no side channel for warehouse ops. Receiving, counting, and manual corrections all land on the same balances and movement history. Reports and audits read from one source.",
    ],
  },
  {
    title: "Tenant isolation from the schema up",
    paras: [
      "Manuva is multi-tenant from the database outward. Every operational table carries a tenant key, every RLS policy enforces it, every RPC is written so an unauthenticated path can't bypass it. The Shopify webhook handler is idempotent and tenant-scoped: a replayed delivery for one shop can't touch another's inventory.",
      "An integrity audit runs continuously over the live data — reconciliation drift, over-reservation, over-receipt, duplicate movements. Anything that violates the invariant lights up before a customer or auditor finds it.",
    ],
  },
  {
    title: "Capacity, costing, and the shop floor",
    paras: [
      "Inventory isn't the end of the model. Open order lines can generate frozen cost snapshots pulled from the active BOM, labour routing, rate schedules, admin load, utilities, and overhead. The snapshot is the estimate the job was quoted against.",
      "Actual time entries roll back into actual labour cost, margin, and department utilisation. That ties customer demand, material consumption, and shop-floor capacity into one model, where before they lived in three disconnected spreadsheets.",
    ],
  },
];

export default function ManuvaContent() {
  return (
    <div className="space-y-14">

      {/* Opening */}
      <div className="space-y-4 max-w-[68ch]">
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          Manuva is manufacturing-operations software for Shopify-native product brands. Inventory, multi-level BOMs, production orders, purchasing, stocktake, reports, and capacity planning — connected, live, and tenant-scoped from the schema up.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          v1 shipped as a fix for inventory drift in Shopify stores that assemble products from components. v2 — Manuva — is the broader rebuild. Shopify still owns the catalog and the demand signal. Everything else lives here: which components are on hand at which location, which are reserved, what came in from suppliers, what got counted on the floor, what a job should cost, how loaded each department is on a given day.
        </p>
      </div>

      {/* The problem */}
      <section className="space-y-4 max-w-[68ch]">
        <h2 className="text-[2rem] italic leading-tight mb-5" style={{ ...serif, color: "var(--text-primary)" }}>
          The problem
        </h2>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          A manufacturer selling through Shopify usually runs two systems pretending to be enough. Shopify knows orders. The floor knows components, receipts, cycle counts, and labour. The moment products share sub-components, buy-to-build timing matters, or margin depends on who did the work, that split gets expensive — and the standard fix is either a stack of spreadsheets or an MRP whose per-seat bill grows faster than the team.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          Manuva sits between them. Variants tie to versioned BOMs, orders to component reservations, purchase orders to goods inwards. Stocktakes apply variance back into the same ledger. Planned work rolls up into costing and capacity. One system covers the whole shop floor — from raw materials in to finished goods out.
        </p>
      </section>

      {/* Shape of the system */}
      <section className="space-y-6 max-w-[68ch]">
        <h2 className="text-[2rem] italic leading-tight mb-5" style={{ ...serif, color: "var(--text-primary)" }}>
          The shape of the system
        </h2>

        <ShapeDiagram />

        <div className="space-y-4">
          <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
            Manuva is the operational layer under the storefront, tenant-scoped from the schema up. A Shopify order lands via webhook, resolves its active BOM, and reserves components before Shopify's own counters have been touched. The reservation writes into an append-only movement ledger, and the derived availability view is what the rest of the app reads.
          </p>
          <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
            Goods inwards, stocktake variances, and manual adjustments all enter the same ledger through the same invariant. Every balance has a movement behind it.
          </p>
          <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
            Shopify inventory is reference only. Manuva doesn't write stock levels back. It keeps its own movement ledger and balance tables per location, so availability, reservations, receiving, and reconciliation all live in one place.
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
          The rebuild has working surfaces for components, products and variants, BOM management, orders, inventory, suppliers, purchasing, goods inwards, stocktake, costing, staffing, actual time, capacity, reports, and activity logging. Wider than an inventory-drift fix.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          v1 proved the demand for component-aware inventory. Manuva is the operating system built around it — one place for materials, inbound supply, counted stock, planned margin, actual labour, and department load.
        </p>
        <p className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
          Tenant isolation runs in Postgres with RLS. Shopify ingest is idempotent. Every inventory mutation rides the movement-plus-balance invariant, and a continuous integrity audit watches it for drift.
        </p>
      </section>

    </div>
  );
}
