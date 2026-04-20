export default function Hero() {
  return (
    <section className="hero-morph pb-10 pt-8">
      <div className="mb-6 px-6 md:px-10">
        <span className="hint-pill">
          <span className="pulse-dot-o" />
          Independent Engineering — Available Q2 2026
        </span>
      </div>

      <svg
        viewBox="0 0 760 130"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", display: "block", overflow: "visible" }}
        aria-label="Kasper Simonsen"
      >
        <text
          className="hero-name-morph"
          x="-2"
          y="65"
          textLength="762"
          lengthAdjust="spacing"
          dominantBaseline="central"
        >
          KASPER SIMONSEN
        </text>
      </svg>

      <div className="mt-6 space-y-4 px-6 md:px-10">
        <p
          className="max-w-xl text-base leading-relaxed"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
        >
          Multi-tenant SaaS, LLM pipelines, and the occasional seven-agent
          system that writes PLC code. Taking on selective contract work from
          Melbourne.
        </p>
        <div
          className="flex items-center gap-8 text-xs tracking-widest uppercase"
          style={{
            color: "var(--text-dim)",
            fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
          }}
        >
          <span>Melbourne · AEST · UTC+10</span>
          <span>→ Selected Work · 02 Projects</span>
        </div>
      </div>
    </section>
  );
}
