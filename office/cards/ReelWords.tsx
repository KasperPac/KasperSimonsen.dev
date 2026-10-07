"use client";

import { useEffect } from "react";
import { findWork } from "@/content/work";
import { slides, type Slide } from "@/content/screens";
import { COPY } from "@/office/copy";
import type { ReelView } from "@/office/monitor/reel";
import type { HoldProps } from "@/office/monitor/useReel";

/** CSS px the laptop's print is laid out at. */
export const LAPTOP_WIDTH_PX = 640;
/** The strip under the monitor on portrait screens, laid out at the old monitor scale so its words stay finger-sized. */
export const STRIP_WIDTH_PX = 640;
/** Content box 324 - 32 padding - 2 border = 290: label 22 + 2-line headline 70 + 2-line description 70 + action 84 + 3 gaps of 10 = 276. */
export const STRIP_HEIGHT_PX = 324;
/** Between the screen's bottom edge and the strip: the bezel's chin is 0.02 m (~21 px at 640 across the 0.604 m screen), so 28 clears it. */
export const STRIP_GAP_PX = 28;

/** The line a slide's words show: its crate project's headline, or its own line for work not in the crate. */
export function headlineFor(slide: Slide): string {
  return slide.slug ? findWork(slide.slug)!.headline : slide.line!;
}

/** The reel's words (spec 3.5): the slide's label, headline, description, details and action — on the laptop, or on a strip under the monitor on portrait screens. */
export default function ReelWords({ view, hold, onPlay, place }: { view: ReelView; hold: HoldProps; onPlay: () => void; place: "laptop" | "strip" }) {
  const i = view.words;
  const slide = slides[i];
  const work = slide.slug ? findWork(slide.slug) : undefined;
  // a print unmounted under the mouse (a resize to portrait swaps it) never gets its pointerleave: release the hold
  useEffect(() => () => hold.onPointerLeave(), [hold]);
  return (
    <div className={`reel-words reel-words--${place}`} data-slide={i} {...hold}>
      <p className="reel-label">
        <span>{slide.label}</span>
      </p>
      <p className="reel-headline">{headlineFor(slide)}</p>
      {work && <p className="reel-description">{work.description}</p>}
      {work && place === "laptop" && <p className="reel-details">{work.details}</p>}
      {(slide.slug || slide.href) && (
        <button type="button" className="office-card-cta" onClick={onPlay}>
          {slide.slug ? COPY.reel.caseStudy : COPY.reel.visit}
        </button>
      )}
    </div>
  );
}
