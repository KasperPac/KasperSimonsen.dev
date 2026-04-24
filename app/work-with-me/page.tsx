import type { Metadata } from "next";
import Link from "next/link";
import InversionCursor from "@/app/components/InversionCursor";
import { availability } from "@/lib/availability";
import { WorkWithMeOfferings } from "./Offerings";

export const metadata: Metadata = {
  title: "Work With Me — Kasper Simonsen",
  description:
    "Hire an independent software engineer in Melbourne. Fixed-scope tools in 1–3 weeks, or full platform builds in 6–16 weeks. Custom web, mobile, and AI systems.",
};

const mono    = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };
const body    = { fontFamily: "var(--font-instrument-sans), system-ui, -apple-system, sans-serif" };
const display = { fontFamily: "var(--font-inter), 'Helvetica Neue', Helvetica, Arial, sans-serif" };

export default function WorkWithMePage() {
  return (
    <main>
      <div
        className="px-6 md:px-10 pt-10 pb-10"
        style={{ borderBottom: "0.5px solid var(--border)" }}
      >
        <p className="text-xs tracking-[0.18em] uppercase mb-4" style={{ ...mono, color: "var(--accent)" }}>
          {availability.text}
        </p>
        <InversionCursor>
          <h1
            className="font-black uppercase leading-none"
            style={{ ...display, fontSize: "clamp(52px, 8vw, 100px)", letterSpacing: "-0.06em", color: "var(--text-primary)" }}
          >
            WORK WITH ME
          </h1>
        </InversionCursor>
      </div>

      {/* What I actually do — plain-English intro */}
      <div
        className="px-6 md:px-10 py-10 md:py-12"
        style={{ borderBottom: "0.5px solid var(--border)" }}
      >
        <div className="space-y-4 max-w-[68ch]">
          <p className="text-base md:text-lg leading-relaxed" style={{ ...body, color: "var(--text-primary)" }}>
            I build custom software for businesses when the off-the-shelf tools don&apos;t fit.
          </p>
          <p className="text-sm leading-relaxed" style={{ ...body, color: "var(--text-muted)" }}>
            Sometimes that&apos;s a small internal tool. Sometimes a proper platform. Either way, start to finish — you get me, not a project manager forwarding emails to a developer.
          </p>
          <p className="text-sm leading-relaxed" style={{ ...body, color: "var(--text-muted)" }}>
            The work tends to be the stuff off-the-shelf software won&apos;t touch. Stock counts that drift between systems, industrial plants still running on spreadsheets, Shopify stores that assemble products from components. Things where the answer has to be built, because nobody sells it.
          </p>
        </div>
      </div>

      <WorkWithMeOfferings />

      {/* Not a fit */}
      <div
        className="grid grid-cols-1 lg:grid-cols-[120px_1fr] gap-8 lg:gap-16 px-6 md:px-10 py-10"
        style={{ borderBottom: "0.5px solid var(--border)", background: "rgba(255,255,255,0.015)" }}
      >
        <div className="flex lg:flex-col gap-4 lg:gap-2 flex-wrap">
          <span className="text-2xl font-black leading-none" style={{ ...mono, color: "var(--accent)" }}>—</span>
          <span className="text-[10px] tracking-[0.1em] uppercase" style={{ ...mono, color: "var(--accent)", marginTop: 2 }}>Not a fit</span>
        </div>
        <div className="space-y-3">
          <h2 className="font-black uppercase leading-tight" style={{ ...display, fontSize: "clamp(18px, 2vw, 24px)", letterSpacing: "-0.02em", color: "#cccccc" }}>
            Not currently taking on:
          </h2>
          <p className="text-sm leading-relaxed max-w-[60ch]" style={{ ...body, color: "var(--text-dim)" }}>
            WordPress or Webflow builds. E-commerce theme customisation. Front-end-only design
            work. Short-term staff aug through recruiters. Anything under a few days of work.
            For those, happy to point you somewhere useful — just ask.
          </p>
        </div>
      </div>

      {/* What happens after */}
      <div className="px-6 md:px-10 py-12" style={{ borderBottom: "0.5px solid var(--border)" }}>
        <h2
          className="font-black uppercase leading-tight mb-10"
          style={{ ...display, fontSize: "clamp(22px, 3vw, 36px)", letterSpacing: "-0.03em", color: "var(--text-primary)" }}
        >
          What happens after you get in touch
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { step: "01", title: "A short reply.",      desc: "Within 24 hours, usually sooner. Either a yes with next steps, or a clear no with somewhere useful to try instead." },
            { step: "02", title: "A scoping call.",     desc: "30–45 minutes. Understand what you're trying to do, what you've already tried, and what has to be true by the end. Free." },
            { step: "03", title: "A written proposal.", desc: "Scope, milestones, timeline, price. Fixed or staged. No surprises later." },
            { step: "04", title: "We build.",           desc: "Weekly visible progress. Actual check-ins. Shipped at the end, not thrown over a fence and forgotten." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="p-5 space-y-3" style={{ border: "0.5px solid #1f1f1f", background: "rgba(255,255,255,0.015)" }}>
              <p className="text-[10px] tracking-[0.1em] uppercase" style={{ ...mono, color: "var(--accent)" }}>{step}</p>
              <p className="font-black uppercase leading-tight" style={{ ...display, fontSize: 13, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>{title}</p>
              <p className="text-xs leading-relaxed" style={{ ...body, color: "var(--text-dim)" }}>{desc}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-10">
          <Link
            href="/contact"
            className="group flex items-center gap-3 px-5 py-3 text-xs tracking-[0.08em] uppercase"
            style={{ ...mono, color: "var(--accent)", border: "0.5px solid var(--accent)", background: "rgba(255,90,31,0.04)" }}
          >
            Get in touch
            <span className="inline-block transition-transform duration-150 group-hover:translate-x-[3px]">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
