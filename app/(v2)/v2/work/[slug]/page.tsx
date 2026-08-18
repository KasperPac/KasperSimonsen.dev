import Link from "next/link";
import { notFound } from "next/navigation";
import { currently, previously } from "@/app/(main)/work/data";
import { caseStudies } from "../caseStudies";
import V2Nav from "../../components/V2Nav";
import Arrow from "../../components/Arrow";
import Marquee from "../../components/Marquee";
import Parallax from "../../components/Parallax";
import Scrub from "../../components/Scrub";
import Reveal from "../../Reveal";

type Params = Promise<{ slug: string }>;

const projects = [...currently, ...previously];

/* Atmospheric backdrop per project; falls back to the shared hero texture. */
const textureBySlug: Record<string, string> = {
  "pac-forge": "/v2/texture-forja.jpg",
  manuva: "/v2/texture-manuva.jpg",
  silio: "/v2/texture-silio.jpg",
};

export async function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) return {};
  return {
    title: `${project.displayName} — Kasper Simonsen`,
    description: project.description,
  };
}

export default async function V2CaseStudyPage({ params }: { params: Params }) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  const study = caseStudies.find((c) => c.slug === slug);
  if (!project || !study) notFound();

  const order = caseStudies.map((c) => c.slug);
  const nextSlug = order[(order.indexOf(slug) + 1) % order.length]!;
  const nextProject = projects.find((p) => p.slug === nextSlug)!;

  return (
    <main>
      <V2Nav />

      {/* ── Header ── */}
      <Scrub mode="exit" className="v2-case-hero">
        <Parallax speed={0.14} className="v2-case-texture">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={textureBySlug[slug] ?? "/v2/hero-texture.jpg"} alt="" fetchPriority="high" />
        </Parallax>

        <div className="v2-case-hero-inner">
          <div className="v2-case-kicker">
            <span className="v2-caption">{project.category}</span>
            <span className="v2-caption">{project.yearRange}</span>
            <span className="v2-caption">{project.statusLabel}</span>
          </div>

          <h1 className="v2-case-title">
            <span className="v2-line">
              <span>{project.displayName}</span>
            </span>
          </h1>
          <p className="v2-case-headline">{project.headline}</p>

          <div className="v2-case-meta">
            {[
              { label: "Year", value: project.yearRange },
              { label: "Role", value: project.role },
              { label: "Status", value: project.statusNote },
              { label: "Stack", value: project.stackSummary },
            ].map(({ label, value }) => (
              <div key={label} className="v2-case-meta-cell">
                <span className="v2-caption">{label}</span>
                <span className="v2-value">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </Scrub>

      {/* ── Body ── */}
      <section className="v2-section" style={{ paddingTop: 0 }}>
        <Reveal>
          <div className="v2-case-intro">
            {study.intro.map((para) => (
              <p key={para.slice(0, 32)}>{para}</p>
            ))}
          </div>
        </Reveal>

        <div style={{ marginTop: "clamp(48px, 8vh, 80px)" }}>
          {study.sections.map((section) => (
            <Scrub key={section.title}>
              <Reveal className="v2-case-section">
                <h3>{section.title}</h3>
                <div>
                  <div className="v2-prose">
                    {section.paras.map((para) => (
                      <p key={para.slice(0, 32)}>{para}</p>
                    ))}
                  </div>
                  {section.image && (
                    <figure className="v2-figure">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={section.image.src} alt={section.image.caption} loading="lazy" />
                      <figcaption className="v2-caption">{section.image.caption}</figcaption>
                    </figure>
                  )}
                </div>
              </Reveal>
            </Scrub>
          ))}
        </div>

        {/* Links out */}
        <div className="v2-case-links">
          {project.liveUrl && (
            <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="v2-ghost">
              {project.liveUrl.replace(/^https?:\/\//, "")} <Arrow />
            </a>
          )}
          <Link href={`/work/${project.slug}`} className="v2-ghost">
            Full technical write-up <Arrow />
          </Link>
          <a href="/v2#work" className="v2-ghost">
            All work <Arrow />
          </a>
        </div>
      </section>

      {/* ── Stack marquee ── */}
      <Marquee items={project.pills.flatMap((pill) => [pill, "&"])} />

      {/* ── Next project ── */}
      <Link href={`/v2/work/${nextProject.slug}`} className="v2-next">
        <span className="v2-caption">Next project</span>
        <span className="v2-next-name" style={{ marginTop: 20 }}>
          <em className="v2-it">next:</em> {nextProject.displayName}
          <Arrow />
        </span>
      </Link>

      {/* ── Mini footer ── */}
      <footer
        className="v2-footer"
        style={{ paddingTop: 40, paddingBottom: 40 }}
      >
        <div className="v2-footer-meta" style={{ borderTop: "none", paddingTop: 0 }}>
          <a href="mailto:hello@kaspersimonsen.dev" className="v2-hairline-link">
            hello@kaspersimonsen.dev
          </a>
          <span className="v2-caption">Melbourne · AEST · UTC+10</span>
        </div>
      </footer>
    </main>
  );
}
