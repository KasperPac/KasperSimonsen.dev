import { currently, previously, type Project } from "@/app/(main)/work/data";
import { caseStudies, type CaseSection } from "@/app/(v2)/v2/work/caseStudies";

/** A case study as the office shows it. Record sleeves, panels and standalone pages all read this. */
export type WorkItem = {
  slug: string;
  name: string;
  headline: string;
  years: string;
  role: string;
  stack: string[];
  liveUrl?: string;
  /** The project's one-paragraph description (the reel's words on the laptop). */
  description: string;
  /** Years · role · stack, for the reel's details line. */
  details: string;
  intro: string[];
  sections: CaseSection[];
};

function toItem(p: Project): WorkItem {
  const study = caseStudies.find((c) => c.slug === p.slug);
  return {
    slug: p.slug,
    name: p.displayName,
    headline: p.headline,
    years: p.yearRange,
    role: p.role,
    stack: p.stack,
    liveUrl: p.liveUrl,
    description: p.description,
    details: [p.yearRange, p.role, p.stackSummary].filter(Boolean).join(" · "),
    intro: study?.intro ?? [p.description],
    sections: study?.sections ?? [],
  };
}

/** Newest first: current work, then previous. The crate's records follow this order. */
export const work: WorkItem[] = [...currently, ...previously].map(toItem);

export function findWork(slug: string): WorkItem | undefined {
  return work.find((w) => w.slug === slug);
}
