import type { Metadata } from "next";
import Link from "next/link";
import { fetchRepoMeta, type RepoMeta } from "@/lib/github";
import { currently, previously, type Project } from "./data";
import InversionCursor from "@/app/components/InversionCursor";

export const metadata: Metadata = {
  title: "Work — Kasper Simonsen",
  description:
    "Case studies from Kasper Simonsen: AI agents for Siemens TIA Portal, a Shopify-connected operations platform, and an industrial feed production system.",
};

const mono    = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };
const body    = { fontFamily: "var(--font-instrument-sans), system-ui, -apple-system, sans-serif" };
const display = { fontFamily: "var(--font-inter), 'Helvetica Neue', Helvetica, Arial, sans-serif" };

function buildMeta(project: Project, github: RepoMeta) {
  const items: { key: string; value: string }[] = [];
  if (github.lastCommit) {
    items.push({ key: "Last commit", value: `${github.lastCommit.sha} · ${github.lastCommit.date}` });
  }
  items.push({ key: "Deploy", value: "—" });
  if (project.v1ShippedYear) {
    items.push({ key: "v1 shipped", value: project.v1ShippedYear });
  } else if (github.stars !== null) {
    items.push({ key: "Stars", value: String(github.stars) });
  }
  items.push({ key: "Stack",       value: project.stackSummary });
  items.push({ key: "Integration", value: project.integration });
  items.push({ key: "Status",      value: project.statusNote });
  return items;
}

function StatusPill({ project }: { project: Project }) {
  const pillStyle: React.CSSProperties = {
    ...mono,
    color: "var(--accent)",
    border: "0.5px solid rgba(255,90,31,0.3)",
    background: "rgba(255,90,31,0.05)",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "5px 10px",
    fontSize: 11,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  };
  if (project.statusType === "building") {
    return (
      <span style={pillStyle}>
        <span className="pulse-dot-o" style={{ margin: 0 }} />
        {project.statusLabel}
      </span>
    );
  }
  if (project.statusType === "shipped") {
    return (
      <span style={pillStyle}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--accent)",
            opacity: 0.55,
            display: "inline-block",
          }}
        />
        {project.statusLabel}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span style={pillStyle}>↻ {project.statusLabel}</span>
      {project.v1ShippedYear && (
        <span className="text-xs" style={{ ...mono, color: "var(--text-dim)" }}>
          v1 shipped {project.v1ShippedYear}
        </span>
      )}
    </div>
  );
}

function ProjectBlock({ project, github }: { project: Project; github: RepoMeta }) {
  const meta = buildMeta(project, github);

  return (
    <Link
      href={`/work/${project.slug}`}
      className="group block"
      style={{ borderBottom: "0.5px solid var(--border)" }}
    >
      <div className="px-6 md:px-10 py-8 md:py-10 transition-colors duration-200 hover:bg-[#0f0f0f]">

        {/* Row 1: Logo + status + year */}
        <div className="flex items-center justify-between gap-6 mb-6 flex-wrap">
          <div className="flex items-center gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.logo}
              alt={project.displayName}
              style={{
                height: 24,
                width: "auto",
                maxWidth: 120,
                objectFit: "contain",
                objectPosition: "left",
                filter: "brightness(0) invert(1)",
                opacity: 0.6,
              }}
            />
            <StatusPill project={project} />
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <span className="text-xs tracking-[0.08em] uppercase" style={{ ...mono, color: "var(--accent)" }}>
              {project.category}
            </span>
            <span className="text-xs" style={{ ...mono, color: "var(--text-dim)" }}>
              {project.yearRange}
            </span>
          </div>
        </div>

        {/* Row 2: Headline — bold display, full width */}
        <h3
          className="font-black uppercase leading-tight mb-6"
          style={{
            ...display,
            fontSize: "clamp(32px, 4vw, 52px)",
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
          }}
        >
          {project.headline.replace(/\.$/, "")}
        </h3>

        {/* Row 3: Description + metadata side by side */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 md:gap-16">

          {/* Left: description + pills */}
          <div className="space-y-5">
            <p className="text-sm leading-relaxed max-w-[64ch]" style={{ ...body, color: "var(--text-muted)" }}>
              {project.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {project.pills.map((pill) => (
                <span
                  key={pill}
                  className="text-xs px-2 py-0.5"
                  style={{ ...mono, border: "0.5px solid var(--border)", color: "var(--text-dim)" }}
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>

          {/* Right: metadata table */}
          <div
            className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 self-start md:min-w-[420px]"
            style={{ borderTop: "0.5px solid var(--border)", paddingTop: "0.75rem" }}
          >
            {meta.map((item) => (
              <div key={item.key} className="space-y-0.5">
                <p className="text-[10px] tracking-[0.06em] uppercase" style={{ ...mono, color: "var(--text-dim)" }}>
                  {item.key}
                </p>
                <p className="text-[11px] leading-snug" style={{ ...mono, color: "var(--text-muted)" }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex justify-end mt-6">
          <span
            className="text-xs tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ ...mono, color: "var(--accent)" }}
          >
            → Read the case study
          </span>
        </div>

      </div>
    </Link>
  );
}

export default async function WorkPage() {
  const [githubResults, previouslyGithubResults] = await Promise.all([
    Promise.all(currently.map((p) => fetchRepoMeta(p.githubRepo))),
    Promise.all(previously.map((p) => fetchRepoMeta(p.githubRepo))),
  ]);

  return (
    <main>
      {/* Page header */}
      <div
        className="px-6 md:px-10 pt-10 pb-10"
        style={{ borderBottom: "0.5px solid var(--border)" }}
      >
        <p
          className="text-xs tracking-[0.18em] uppercase mb-4"
          style={{ ...mono, color: "var(--accent)" }}
        >
          {currently.length} projects — active
        </p>
        <InversionCursor>
          <h1
            className="font-black uppercase leading-none"
            style={{
              ...display,
              fontSize: "clamp(72px, 10vw, 110px)",
              letterSpacing: "-0.085em",
              color: "var(--text-primary)",
            }}
          >
            WORK
          </h1>
        </InversionCursor>
      </div>

      {/* Currently section */}
      <section>
        <div
          className="px-6 md:px-10 py-6"
          style={{ borderBottom: "0.5px solid var(--border)", background: "#161616" }}
        >
          <h2
            className="font-black uppercase tracking-tight"
            style={{ ...display, fontSize: 22, letterSpacing: "-0.02em", color: "var(--text-primary)" }}
          >
            Currently
          </h2>
          <p className="text-xs tracking-[0.06em] uppercase mt-1" style={{ ...mono, color: "var(--text-dim)" }}>
            Actively developing
          </p>
        </div>

        {currently.map((project, i) => (
          <ProjectBlock key={project.slug} project={project} github={githubResults[i]!} />
        ))}
      </section>

      {/* Previously — hidden until populated */}
      {previously.length > 0 && (
        <section>
          <div
            className="px-6 md:px-10 py-6"
            style={{ borderBottom: "0.5px solid var(--border)", background: "#161616" }}
          >
            <h2
              className="font-black uppercase tracking-tight"
              style={{ ...display, fontSize: 22, letterSpacing: "-0.02em", color: "var(--text-primary)" }}
            >
              Previously
            </h2>
            <p className="text-xs tracking-[0.06em] uppercase mt-1" style={{ ...mono, color: "var(--text-dim)" }}>
              Shipped and moved on
            </p>
          </div>
          {previously.map((project, i) => (
            <ProjectBlock key={project.slug} project={project} github={previouslyGithubResults[i]!} />
          ))}
        </section>
      )}
    </main>
  );
}
