import Link from "next/link";
import { currently } from "@/app/work/data";

const mono   = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };
const serif  = { fontFamily: "var(--font-fraunces), 'Instrument Serif', Georgia, serif" };
const body   = { fontFamily: "var(--font-instrument-sans), system-ui, -apple-system, sans-serif" };

export default function WorkCards() {
  const count = String(currently.length).padStart(2, "0");

  return (
    <section>
      {/* Section label */}
      <div
        className="flex items-center gap-5 px-6 md:px-10 py-7"
        style={{ background: "#161616", borderTop: "1px solid #333333", borderBottom: "0.5px solid #2a2a2a" }}
      >
        <span className="text-sm tracking-[0.18em] uppercase flex-shrink-0" style={{ ...mono, color: "var(--text-primary)" }}>
          Selected work
        </span>
        <div className="flex-1 h-px" style={{ background: "#2a2a2a" }} />
        <span className="text-xs flex-shrink-0" style={{ ...mono, color: "var(--text-dim)" }}>
          {count} projects
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        {currently.map((project, i) => (
          <Link
            key={project.slug}
            href={`/work/${project.slug}`}
            className="group flex flex-col gap-5 p-8 transition-colors duration-200 hover:bg-[#0f0f0f]"
            style={{
              borderRight: i === 0 ? "0.5px solid var(--border)" : "none",
              borderBottom: "0.5px solid var(--border)",
            }}
          >
            {/* Status row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-[6px] h-[6px] rounded-full flex-shrink-0"
                  style={{ background: "var(--health)" }}
                />
                <span className="text-xs tracking-wide uppercase" style={{ ...mono, color: "var(--text-dim)" }}>
                  {project.statusLabel}
                </span>
              </div>
              <span className="text-xs" style={{ ...mono, color: "var(--text-dim)" }}>
                {project.yearRange}
              </span>
            </div>

            {/* Category tag */}
            <span
              className="text-xs tracking-[0.08em] uppercase w-fit"
              style={{ ...mono, color: "var(--accent)" }}
            >
              {project.category}
            </span>

            {/* Headline — Fraunces italic */}
            <h3
              className="text-[1.6rem] leading-tight italic"
              style={{ ...serif, color: "var(--text-primary)" }}
            >
              {project.headline}
            </h3>

            {/* Description */}
            <p className="text-sm leading-relaxed" style={{ ...body, color: "var(--text-muted)" }}>
              {project.description}
            </p>

            {/* Pills + arrow */}
            <div className="relative z-10 mt-auto flex items-center justify-between pt-2">
              <div className="flex flex-wrap gap-2">
                {project.pills.map((pill) => (
                  <span
                    key={pill}
                    className="text-xs px-2 py-0.5"
                    style={{
                      ...mono,
                      border: "0.5px solid var(--border)",
                      color: "var(--text-dim)",
                    }}
                  >
                    {pill}
                  </span>
                ))}
              </div>
              <span
                className="text-xs tracking-wider uppercase transition-colors duration-200 flex-shrink-0 ml-4"
                style={{ ...mono, color: "var(--text-dim)" }}
              >
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ color: "var(--accent)" }}>
                  Read →
                </span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
