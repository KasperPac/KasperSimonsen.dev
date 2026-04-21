const stack = [
  { label: "ts",       color: "#3178C6", why: "Compile-time safety at multi-tenant scale" },
  { label: "react",    color: "#61DAFB", why: "Server components — zero JS where possible" },
  { label: "postgres", color: "#336791", why: "RLS-scoped, 40+ tables, append-only ledgers" },
  { label: "next",     color: "#FAFAFA", why: "App Router, ISR, edge-ready. Powers this site" },
  { label: "supabase", color: "#3ECF8E", why: "Postgres + Auth + Edge Functions in one" },
  { label: "claude",   color: "#FF5A1F", why: "LLM backbone for the seven-agent pipeline" },
  { label: ".net",     color: "#9B6BF2", why: "Only programmatic path into TIA Portal" },
];

const mono = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };
const body = { fontFamily: "var(--font-instrument-sans), system-ui, -apple-system, sans-serif" };

export default function StackTile() {
  return (
    <div className="tile-cell group relative h-[240px] cursor-default overflow-hidden">
      {/* At rest */}
      <div className="stack-at-rest absolute inset-0 flex flex-col gap-3 p-5 transition-opacity duration-300 opacity-100 group-hover:opacity-0">
        <p className="text-xs tracking-[0.06em] uppercase flex-shrink-0" style={{ ...mono, color: "var(--text-dim)" }}>
          Primary stack
        </p>
        <div className="mt-auto flex flex-wrap gap-2">
          {stack.map(({ label, color }) => (
            <span
              key={label}
              className="inline-flex items-center px-2.5 py-1 text-xs tracking-wide uppercase"
              style={{
                ...mono,
                border: `1px solid ${color}33`,
                color,
                background: `${color}11`,
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* On hover */}
      <div className="stack-detail absolute inset-0 flex flex-col gap-3 p-5 transition-opacity duration-300 opacity-0 group-hover:opacity-100">
        <p className="text-xs tracking-[0.06em] uppercase flex-shrink-0" style={{ ...mono, color: "var(--text-dim)" }}>
          Primary stack
        </p>
        <div className="flex flex-col gap-2 mt-1">
          {stack.map(({ label, color, why }) => (
            <div key={label} className="flex gap-3 items-baseline">
              <span
                className="text-xs tracking-wide uppercase flex-shrink-0 w-[52px]"
                style={{ ...mono, color }}
              >
                {label}
              </span>
              <span className="text-xs leading-snug" style={{ ...body, color: "var(--text-muted)" }}>
                {why}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
