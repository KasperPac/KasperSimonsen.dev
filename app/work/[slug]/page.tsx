import type { ComponentType } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { currently, previously } from "@/app/work/data";
import { fetchRepoMeta } from "@/lib/github";
import InversionCursor from "@/app/components/InversionCursor";
import PacForgeContent from "./content/pac-forge";
import AssemblioContent from "./content/assemblio";
import SilioContent from "./content/silio";

type Params = Promise<{ slug: string }>;

const display = { fontFamily: "var(--font-inter), 'Helvetica Neue', Helvetica, Arial, sans-serif" };
const mono    = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };
const serif   = { fontFamily: "var(--font-fraunces), 'Instrument Serif', Georgia, serif" };

const allProjects = [...currently, ...previously];

const contentBySlug: Record<string, ComponentType> = {
  "pac-forge": PacForgeContent,
  "assemblio": AssemblioContent,
  "silio":     SilioContent,
};

export async function generateStaticParams() {
  return allProjects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const project = allProjects.find((p) => p.slug === slug);
  if (!project) return {};
  return {
    title: `${project.displayName} — Kasper Simonsen`,
    description: project.headline,
  };
}

export default async function CaseStudyPage({ params }: { params: Params }) {
  const { slug } = await params;
  const project = allProjects.find((p) => p.slug === slug);
  if (!project) notFound();

  const github = await fetchRepoMeta(project.githubRepo);

  const Content = contentBySlug[project.slug] ?? PacForgeContent;

  return (
    <article>
      {/* ── Header ── */}
      <header
        className="px-6 md:px-10 pt-8 pb-0"
        style={{ borderBottom: "0.5px solid var(--border)" }}
      >
        {/* Back link + category */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/work"
            className="text-xs transition-opacity duration-150 opacity-40 hover:opacity-100"
            style={{ ...mono, color: "var(--text-primary)" }}
          >
            ← Work
          </Link>
          <span
            className="text-xs tracking-[0.1em] uppercase"
            style={{ ...mono, color: "var(--accent)" }}
          >
            {project.category}
          </span>
        </div>

        {/* Massive title with inversion cursor */}
        <InversionCursor>
          <h1
            className="font-black uppercase leading-[0.9] mb-0"
            style={{
              ...display,
              fontSize: "clamp(52px, 8vw, 96px)",
              color: "var(--text-primary)",
              letterSpacing: "-0.04em",
            }}
          >
            {project.title}
          </h1>
        </InversionCursor>

        {/* Identity + metadata table */}
        <div
          className="mt-8 pt-8 pb-10 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 md:gap-16"
          style={{ borderTop: "0.5px solid var(--border)" }}
        >
          {/* Logo + product name */}
          <div className="flex flex-col justify-center gap-3 md:min-w-[160px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.logo}
              alt={project.displayName}
              style={{
                height: 32,
                width: "auto",
                maxWidth: 160,
                objectFit: "contain",
                objectPosition: "left",
                filter: "brightness(0) invert(1)",
                opacity: 0.85,
              }}
            />
            <p
              className="text-xs tracking-[0.14em] uppercase"
              style={{ ...mono, color: "var(--text-dim)" }}
            >
              {project.displayName}
            </p>
          </div>

          {/* Metadata table */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-x-10 gap-y-4"
            style={{ borderLeft: "0.5px solid var(--border)", paddingLeft: "2.5rem" }}
          >
            {[
              { label: "Year",        value: project.yearRange },
              { label: "Role",        value: project.role },
              { label: "Status",      value: project.statusNote },
              { label: "Stack",       value: project.stackSummary },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <p
                  className="text-[10px] tracking-[0.08em] uppercase"
                  style={{ ...mono, color: "var(--text-dim)" }}
                >
                  {label}
                </p>
                <p
                  className="text-xs leading-snug"
                  style={{ ...mono, color: "var(--text-muted)" }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="px-6 md:px-10 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-10 lg:gap-16 max-w-[1200px]">

          {/* Prose — last on mobile (sidebar floats above), first col on desktop */}
          <div className="order-last lg:order-none min-w-0">
            <Content />
          </div>

          {/* Sidebar — first on mobile, second col on desktop */}
          <aside className="order-first lg:order-none">
            <div
              className="p-5 space-y-6 lg:sticky lg:top-8"
              style={{ border: "0.5px solid var(--border)" }}
            >

              {/* Stack */}
              <div className="space-y-2">
                <p
                  className="text-[10px] tracking-[0.06em] uppercase"
                  style={{ ...mono, color: "var(--text-dim)" }}
                >
                  Stack
                </p>
                <div className="space-y-1.5">
                  {project.stack.map((item) => (
                    <p
                      key={item}
                      className="text-xs leading-snug"
                      style={{ ...mono, color: "var(--text-muted)" }}
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </div>

              {/* Integration */}
              <div
                className="space-y-2"
                style={{
                  borderTop: "0.5px solid var(--border)",
                  paddingTop: "1.25rem",
                }}
              >
                <p
                  className="text-[10px] tracking-[0.06em] uppercase"
                  style={{ ...mono, color: "var(--text-dim)" }}
                >
                  Integration
                </p>
                <div className="space-y-1.5">
                  {project.integrationPoints.map((item) => (
                    <p
                      key={item}
                      className="text-xs leading-snug"
                      style={{ ...mono, color: "var(--text-muted)" }}
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </div>

              {/* Notable details */}
              {project.notableDetails.length > 0 && (
                <div
                  className="space-y-2"
                  style={{
                    borderTop: "0.5px solid var(--border)",
                    paddingTop: "1.25rem",
                  }}
                >
                  <p
                    className="text-[10px] tracking-[0.06em] uppercase"
                    style={{ ...mono, color: "var(--text-dim)" }}
                  >
                    Notable
                  </p>
                  <div className="space-y-1.5">
                    {project.notableDetails.map((item) => (
                      <p
                        key={item}
                        className="text-xs leading-snug"
                        style={{ ...mono, color: "var(--text-muted)" }}
                      >
                        — {item}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Role / Year / Last commit */}
              <div
                className="space-y-2"
                style={{
                  borderTop: "0.5px solid var(--border)",
                  paddingTop: "1.25rem",
                }}
              >
                {[
                  { label: "Role", value: project.role },
                  { label: "Year", value: project.year },
                  ...(github.lastCommit
                    ? [{ label: "Last commit", value: github.lastCommit.date }]
                    : []),
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between items-baseline gap-2"
                  >
                    <span
                      className="text-[10px] tracking-[0.06em] uppercase flex-shrink-0"
                      style={{ ...mono, color: "var(--text-dim)" }}
                    >
                      {label}
                    </span>
                    <span
                      className="text-xs text-right"
                      style={{ ...mono, color: "var(--text-muted)" }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>

            </div>
          </aside>

        </div>
      </div>
    </article>
  );
}
