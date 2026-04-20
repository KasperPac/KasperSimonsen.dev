import InversionCursor from "./InversionCursor";
import { availability } from "@/lib/availability";

export default function Hero() {
  return (
    <section className="hero-morph pb-10 pt-8">
      <div className="mb-6 px-6 md:px-10">
        <span className="hint-pill">
          <span className="pulse-dot-o" />
          Independent Engineering — {availability.label}
        </span>
      </div>

      <InversionCursor>
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
      </InversionCursor>

      <div className="mt-6 space-y-4 px-6 md:px-10">
        <p
          className="max-w-xl text-base leading-relaxed"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
        >
          12 years of getting things to work. SaaS products, LLM systems,
          and the occasional thing that probably shouldn't work but does.
          Based in Melbourne. Taking on selective contract work —{" "}
          <a href="/contact" style={{ color: "var(--accent)", textDecoration: "none" }}>
            get in touch
          </a>
          .
        </p>
        <div
          className="flex items-center gap-8 text-xs tracking-widest uppercase"
          style={{
            color: "var(--text-dim)",
            fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
          }}
        >
          <span>Melbourne · AEST · UTC+10</span>
        </div>
      </div>
    </section>
  );
}
