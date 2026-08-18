import Link from "next/link";
import { currently, previously } from "@/app/(main)/work/data";
import { availability } from "@/lib/availability";
import type { CSSProperties } from "react";
import Reveal from "./Reveal";
import Arrow from "./components/Arrow";
import V2Nav from "./components/V2Nav";
import Marquee from "./components/Marquee";
import Parallax from "./components/Parallax";
import Scrub from "./components/Scrub";

const cardDrifts = ["26px", "-34px", "46px"];

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
      <div className="v2-page-above">
      <V2Nav />

      {/* ── Hero ── */}
      <Scrub mode="exit" className="v2-hero" id="top">
        <Parallax speed={0.12} className="v2-hero-texture-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/v2/hero-texture.jpg" alt="" className="v2-hero-texture" fetchPriority="high" />
        </Parallax>
        <Parallax speed={0.24} className="v2-hero-shape" />

        <div className="v2-hero-inner">
          <p className="v2-hero-status">
            <span className="v2-dot" />
            <span className="v2-caption">
              Freelance web &amp; app developer — {availability.label}
            </span>
          </p>

          <h1 className="v2-display-xl">
            <span className="v2-line">
              <span>
                I build <em className="v2-it">the</em>
              </span>
            </span>
            <span className="v2-line">
              <span>
                software <em className="v2-it">that</em>
              </span>
            </span>
            <span className="v2-line">
              <span>
                nobody sells<em className="v2-it">.</em>
              </span>
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
      </Scrub>

      {/* ── Capability marquee ── */}
      <Marquee
        items={[
          "Web platforms",
          "&",
          "Mobile apps",
          "&",
          "AI systems",
          "&",
          "Industrial software",
          "for the",
          "Real world",
          "·",
        ]}
      />

      {/* ── Selected work ── */}
      <Scrub className="v2-section v2-fade" id="work">
        <Scrub>
          <Reveal className="v2-section-head">
            <p className="v2-caption">Selected work — 2023 to now</p>
            <h2 className="v2-display">
              <span className="v2-line">
                <span>
                  Selected <em className="v2-it">work</em>
                </span>
              </span>
            </h2>
          </Reveal>
        </Scrub>

        <Scrub className="v2-work-grid">
          {projects.map((project, i) => (
            <div
              key={project.slug}
              className="v2-drift"
              style={{ "--drift": cardDrifts[i] ?? "0px" } as CSSProperties}
            >
              <Reveal delay={i * 90}>
                <Link
                  href={`/v2/work/${project.slug}`}
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
            </div>
          ))}
        </Scrub>

        {/* Full-bleed product shots */}
        <div className="v2-showcase">
          <Scrub className="v2-shot v2-fade">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/silio-dashboard.png"
              alt="Silio production dashboard — live PLC state, throughput, productive hours"
              loading="lazy"
            />
          </Scrub>
          <div className="v2-shot-caption">
            <span className="v2-caption">
              Silio — live production dashboard. Running a feed plant since 2023.
            </span>
            <Link href="/v2/work/silio" className="v2-caption">
              Case study <Arrow size={10} />
            </Link>
          </div>

          <Scrub className="v2-shot v2-fade">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/v2/manuva-live.jpg"
              alt="Manuva — manufacturing operations for Shopify brands, live at manuva.app"
              loading="lazy"
            />
          </Scrub>
          <div className="v2-shot-caption">
            <span className="v2-caption">Manuva — live at manuva.app.</span>
            <Link href="/v2/work/manuva" className="v2-caption">
              Case study <Arrow size={10} />
            </Link>
          </div>
        </div>
      </Scrub>

      {/* ── Services — the linen page turn ── */}
      <Scrub className="v2-linen v2-fade" id="services">
        <div className="v2-section">
          <Scrub>
            <Reveal className="v2-section-head">
              <p className="v2-caption">Services</p>
              <h2 className="v2-display">
                <span className="v2-line">
                  <span>
                    What I <em className="v2-it">actually</em> do
                  </span>
                </span>
              </h2>
            </Reveal>
          </Scrub>

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
      </Scrub>

      {/* ── Process ── */}
      <Scrub className="v2-section v2-fade" id="process">
        <Scrub>
          <Reveal className="v2-section-head">
            <p className="v2-caption">Process — what happens after you get in touch</p>
            <h2 className="v2-display">
              <span className="v2-line">
                <span>
                  No <em className="v2-it">mystery</em>
                </span>
              </span>
            </h2>
          </Reveal>
        </Scrub>

        <div className="v2-process">
          {steps.map((step, i) => (
            <Reveal key={step.num} className="v2-step" delay={i * 90}>
              <span className="v2-step-num">{step.num}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </Reveal>
          ))}
        </div>
      </Scrub>
      </div>

      {/* ── Contact / footer — revealed as the page lifts away ── */}
      <footer className="v2-footer v2-footer--curtain" id="contact">
        <div>
          <p className="v2-caption">Contact</p>
          <h2 className="v2-display-xl v2-footer-cta">
            Let&apos;s <em className="v2-it">talk</em>
            <span className="v2-dot v2-dot--period" />
          </h2>
          <a href="mailto:hello@kaspersimonsen.dev" className="v2-hairline-link">
            hello@kaspersimonsen.dev
          </a>
        </div>

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
