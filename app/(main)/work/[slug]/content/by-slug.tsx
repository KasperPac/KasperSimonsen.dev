import type { ComponentType, ReactElement } from "react";
import PacForgeContent from "./pac-forge";
import ManuvaContent from "./manuva";
import SilioContent from "./silio";
import CaseStudyContent from "./case-study";

/** Long-form pages written by hand. Any other project is written up from its case study (CaseStudyContent). */
export const contentBySlug: Record<string, ComponentType> = {
  "pac-forge": PacForgeContent,
  "manuva":    ManuvaContent,
  "silio":     SilioContent,
};

/** The body of /work/[slug]: the hand-written page when there is one, otherwise the project's own case study. Never another project's. */
export function contentFor(slug: string): ReactElement {
  const Content = contentBySlug[slug];
  return Content ? <Content /> : <CaseStudyContent slug={slug} />;
}
