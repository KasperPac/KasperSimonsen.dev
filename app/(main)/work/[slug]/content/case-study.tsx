import { caseStudies } from "@/app/(v2)/v2/work/caseStudies";

const serif = { fontFamily: "var(--font-fraunces), 'Instrument Serif', Georgia, serif" };
const body  = { fontFamily: "var(--font-instrument-sans), system-ui, -apple-system, sans-serif" };
const mono  = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };

/**
 * The write-up for a project that has no long-form page of its own: its case study's intro and sections, in the same
 * type as the bespoke pages. Prints nothing for a slug with no case study.
 */
export default function CaseStudyContent({ slug }: { slug: string }) {
  const study = caseStudies.find((c) => c.slug === slug);
  if (!study) return null;
  return (
    <div className="space-y-14">
      <div className="space-y-4 max-w-[68ch]">
        {study.intro.map((para) => (
          <p key={para.slice(0, 32)} className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
            {para}
          </p>
        ))}
      </div>

      {study.sections.map((section) => (
        <section key={section.title} className="space-y-4 max-w-[68ch]">
          <h2 className="text-[1.6rem] italic leading-snug" style={{ ...serif, color: "var(--text-primary)" }}>
            {section.title}
          </h2>
          {section.paras.map((para) => (
            <p key={para.slice(0, 32)} className="text-[17px] leading-[1.7]" style={{ ...body, color: "var(--text-muted)" }}>
              {para}
            </p>
          ))}
          {section.image && (
            <figure className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={section.image.src}
                alt={section.image.caption}
                loading="lazy"
                style={{ width: "100%", height: "auto", display: "block", border: "0.5px solid var(--border)" }}
              />
              <figcaption className="text-[11px] tracking-[0.05em] uppercase" style={{ ...mono, color: "var(--text-dim)" }}>
                {section.image.caption}
              </figcaption>
            </figure>
          )}
        </section>
      ))}
    </div>
  );
}
