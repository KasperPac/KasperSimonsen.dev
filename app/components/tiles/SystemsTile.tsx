const mono = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };
const body = { fontFamily: "var(--font-instrument-sans), system-ui, -apple-system, sans-serif" };

export default function SystemsTile() {
  return (
    <div
      className="group relative h-[240px] cursor-default overflow-hidden"
      style={{ borderRight: "0.5px solid var(--border)" }}
    >
      {/* Label — fades out as pac-forge slides up */}
      <p
        className="absolute text-xs tracking-[0.06em] uppercase transition-opacity duration-300 group-hover:opacity-0"
        style={{ ...mono, color: "var(--text-dim)", top: 20, left: 20, right: 20 }}
      >
        Systems in prod
      </p>

      {/* "0" — floats up and blurs out */}
      <span
        className="absolute text-[40px] font-medium leading-none tracking-tight
                   transition-all duration-300 ease-out
                   group-hover:opacity-0 group-hover:-translate-y-3 group-hover:blur-sm"
        style={{ ...mono, color: "var(--text-primary)", top: 52, left: 20 }}
      >
        0
      </span>

      {/* "2" — floats up and blurs out, slight stagger */}
      <span
        className="absolute text-[40px] font-medium leading-none tracking-tight
                   transition-all duration-300 ease-out
                   group-hover:opacity-0 group-hover:-translate-y-3 group-hover:blur-sm"
        style={{ ...mono, color: "var(--text-primary)", top: 52, left: 44, transitionDelay: "40ms" }}
      >
        2
      </span>

      {/* pac-forge desc — materialises from below where "0" was */}
      <div
        className="absolute transition-all duration-300 ease-out
                   opacity-0 translate-y-3 blur-sm
                   group-hover:opacity-100 group-hover:translate-y-0 group-hover:blur-none
                   space-y-2"
        style={{ top: 46, left: 20, right: 20, transitionDelay: "130ms" }}
      >
        <p className="text-xs leading-relaxed" style={{ ...body, color: "var(--text-muted)" }}>
          Multi-agent pipeline → Siemens SCL. Auto-learns from compile errors.
        </p>
        <div className="h-[2px] w-full" style={{ background: "var(--border)" }}>
          <div className="h-full" style={{ width: "99.9%", background: "var(--health)" }} />
        </div>
      </div>

      {/* assemblio desc — materialises from below where "2" was, slight stagger */}
      <div
        className="absolute transition-all duration-300 ease-out
                   opacity-0 translate-y-3 blur-sm
                   group-hover:opacity-100 group-hover:translate-y-0 group-hover:blur-none
                   space-y-2"
        style={{ top: 122, left: 20, right: 20, transitionDelay: "170ms" }}
      >
        <p className="text-xs leading-relaxed" style={{ ...body, color: "var(--text-muted)" }}>
          Shopify-connected BOM + inventory. Append-only ledger, RLS from schema up.
        </p>
        <div className="h-[2px] w-full" style={{ background: "var(--border)" }}>
          <div className="h-full" style={{ width: "99.7%", background: "var(--health)" }} />
        </div>
      </div>

      {/* pac-forge row — slides up to replace the label (Δ=154px) */}
      <div
        className="absolute flex items-center justify-between z-10
                   transition-transform duration-500 ease-out
                   group-hover:-translate-y-[154px]"
        style={{ top: 174, left: 20, right: 20 }}
      >
        <div className="flex items-center gap-2">
          <span className="inline-block w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: "var(--health)" }} />
          <span className="text-sm" style={{ ...mono, color: "var(--text-muted)" }}>pac-forge</span>
        </div>
        <span className="text-xs" style={{ ...mono, color: "var(--health)" }}>99.9%</span>
      </div>

      {/* assemblio row — slides up below pac-forge's expanded state (Δ=100px) */}
      <div
        className="absolute flex items-center justify-between z-10
                   transition-transform duration-500 ease-out
                   group-hover:-translate-y-[100px]"
        style={{ top: 200, left: 20, right: 20, transitionDelay: "60ms" }}
      >
        <div className="flex items-center gap-2">
          <span className="inline-block w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: "var(--health)" }} />
          <span className="text-sm" style={{ ...mono, color: "var(--text-muted)" }}>assemblio</span>
        </div>
        <span className="text-xs" style={{ ...mono, color: "var(--health)" }}>99.7%</span>
      </div>
    </div>
  );
}
