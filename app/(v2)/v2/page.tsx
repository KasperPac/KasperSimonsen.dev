import Link from "next/link";
import { currently, previously } from "@/app/(main)/work/data";
import { availability } from "@/lib/availability";
import Reveal from "./Reveal";

function Arrow({ size = 12 }: { size?: number }) {
  return (
    <svg
      className="v2-arrow"
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

const projects = [...currently, ...previously];

const services = [
  {
    title: "Web",
    copy: "Platforms, dashboards, internal tools. Next.js mostly. The systems a spreadsheet was never meant to become — inventory, production, multi-tenant SaaS.",
  },
  {
    title: "Apps",
    copy: "iPhone and Android, React Native. Warehouse scanners, plant-floor apps. Built for gloves, barcodes, and patchy wifi — not just for the demo.",
  },
  {
    title: "AI + Industrial",
    copy: "AI agents wired into real machinery and real codebases. Siemens and Omron PLCs, Shopify backends, ERP integrations. The awkward bits nobody sells a product for.",
  },
];

const steps = [
  {
    num: "one",
    title: "A short reply.",
    copy: "Within 24 hours, usually sooner. Either a yes with next steps, or a clear no with somewhere useful to try instead.",
  },
  {
    num: "two",
    title: "A scoping call.",
    copy: "30–45 minutes. What you're trying to do, what you've already tried, and what has to be true by the end. Free.",
  },
  {
    num: "three",
    title: "A written proposal.",
    copy: "Scope, milestones, timeline, price. Fixed or staged. No surprises later.",
  },
  {
    num: "four",
    title: "We build.",
    copy: "Weekly visible progress. Actual check-ins. Shipped at the end, not thrown over a fence and forgotten.",
  },
];

export default function V2Page() {
  return (
    <main>
      {/* ── Nav ── */}
      <nav className="v2-nav" aria-label="Main">
        <a href="#top" className="v2-logo">
          Kasper Simonsen
        </a>
        <div className="v2-nav-links">
          <a href="#work">Work</a>
          <a href="#services">Services</a>
          <a href="#process">Process</a>
          <a href="#contact">Contact</a>
        </div>
        <Link href="/contact" className="v2-outline-btn">
          Discovery call <Arrow />
        </Link>
      </nav>

      {/* ── Hero ── */}
      <header className="v2-hero" id="top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/v2/hero-texture.jpg"
          alt=""
          className="v2-hero-texture"
          fetchPriority="high"
        />
        <div className="v2-hero-shape" />

        <div className="v2-hero-inner">
          <p className="v2-hero-status">
            <span className="v2-dot" />
            <span className="v2-caption">
              Freelance web &amp; app developer — {availability.label}
            </span>
          </p>

          <h1 className="v2-display-xl">
            <span className="v2-hero-line">
              I build <em className="v2-it">the</em>
            </span>
            <span className="v2-hero-line">
              software <em className="v2-it">that</em>
            </span>
            <span className="v2-hero-line">
              nobody sells<em className="v2-it">.</em>
            </span>
          </h1>

          <div className="v2-hero-foot">
            <p className="v2-body-copy">
              Twelve years getting things to work. Custom web platforms, iPhone
              and Android apps, AI systems wired into factory floors and Shopify
              backends. Based in Melbourne, built start to finish — you get me,
              not a project manager forwarding emails to a developer.
            </p>
            <a href="#work" className="v2-ghost">
              See the work <Arrow />
            </a>
          </div>
        </div>
      </header>

      {/* ── Selected work ── */}
      <section className="v2-section" id="work">
        <Reveal className="v2-section-head">
          <p className="v2-caption">Selected work — 2023 to now</p>
          <h2 className="v2-display">
            Selected <em className="v2-it">work</em>
          </h2>
        </Reveal>

        <div className="v2-work-grid">
          {projects.map((project, i) => (
            <Reveal key={project.slug} delay={i * 90}>
              <Link
                href={`/work/${project.slug}`}
                className={`v2-card${i === 0 ? " v2-card--featured" : ""}`}
              >
                <div className="v2-card-top">
                  <span className="v2-caption">{project.category}</span>
                  <span className="v2-caption">{project.yearRange}</span>
                </div>
                <h3 className="v2-card-name">{project.displayName}</h3>
                <p className="v2-card-desc">{project.headline} {project.description}</p>
                <div className="v2-card-foot">
                  <span className="v2-card-stack">{project.stackSummary}</span>
                  <Arrow />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Services — the linen page turn ── */}
      <section className="v2-linen" id="services">
        <div className="v2-section">
          <Reveal className="v2-section-head">
            <p className="v2-caption">Services</p>
            <h2 className="v2-display">
              What I <em className="v2-it">actually</em> do
            </h2>
          </Reveal>

          <Reveal>
            <p className="v2-linen-intro">
              I build custom software for businesses when the off-the-shelf
              tools don&apos;t fit. Sometimes that&apos;s a small internal tool.
              Sometimes a proper platform.
            </p>
          </Reveal>

          <div className="v2-services">
            {services.map((service, i) => (
              <Reveal key={service.title} className="v2-service" delay={i * 90}>
                <h3>{service.title}</h3>
                <p>{service.copy}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Process ── */}
      <section className="v2-section" id="process">
        <Reveal className="v2-section-head">
          <p className="v2-caption">Process — what happens after you get in touch</p>
          <h2 className="v2-display">
            No <em className="v2-it">mystery</em>
          </h2>
        </Reveal>

        <div className="v2-process">
          {steps.map((step, i) => (
            <Reveal key={step.num} className="v2-step" delay={i * 90}>
              <span className="v2-step-num">{step.num}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Contact / footer ── */}
      <footer className="v2-footer" id="contact">
        <Reveal>
          <p className="v2-caption">Contact</p>
          <h2 className="v2-display-xl v2-footer-cta">
            Let&apos;s <em className="v2-it">talk</em>
            <span className="v2-dot v2-dot--period" />
          </h2>
          <a href="mailto:hello@kaspersimonsen.dev" className="v2-hairline-link">
            hello@kaspersimonsen.dev
          </a>
        </Reveal>

        <div className="v2-footer-meta">
          <div className="v2-footer-meta-col">
            <span className="v2-caption">Kasper Simonsen</span>
            <span className="v2-caption">Melbourne · AEST · UTC+10</span>
          </div>
          <div className="v2-footer-meta-col">
            <span className="v2-caption">Reply within 24 hours, usually sooner</span>
            <Link href="/contact" className="v2-ghost" style={{ padding: 0 }}>
              Or use the form <Arrow />
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
