"use client";

import { findWork } from "@/content/work";
import { slides } from "@/content/screens";
import { COPY } from "@/office/copy";
import type { ReelView } from "@/office/monitor/reel";
import type { HoldProps } from "@/office/monitor/useReel";
import ReelWindow from "./ReelWindow";

/** CSS px the monitor's print is laid out at (its screen face is 640 x 352). */
export const SCREEN_WIDTH_PX = 640;

/** What's printed on the monitor (spec 3.5): the slide's window, its headline, See the case study (or Visit the site), ‹ › and dots. */
export default function ReelScreen({
  titleId,
  view,
  hold,
  onStep,
  onShow,
  onPlay,
}: {
  titleId: string;
  view: ReelView;
  hold: HoldProps;
  onStep: (dir: 1 | -1) => void;
  onShow: (i: number) => void;
  onPlay: () => void;
}) {
  const slide = slides[view.monitor];
  // A slide that plays a crate record shows its headline; one that opens a page has no record to read it from.
  const headline = slide.slug ? findWork(slide.slug)!.headline : COPY.reel.site;
  return (
    <div className="office-reel" data-reel data-slide={view.monitor} {...hold}>
      <h2 id={titleId} className="visually-hidden" tabIndex={-1}>
        {COPY.reel.title}
      </h2>
      <div className="reel-stage">
        <ReelWindow slide={slide} />
        {view.moving && (
          <div className="reel-moving reel-moving--monitor" aria-hidden="true">
            <ReelWindow slide={slides[view.moving.slide]} dragged />
          </div>
        )}
      </div>
      <div className="reel-strip">
        <p className="reel-headline">{headline}</p>
        <button type="button" className="office-card-cta" onClick={onPlay}>
          {slide.slug ? COPY.reel.caseStudy : COPY.reel.visit}
        </button>
      </div>
      <div className="reel-controls">
        <button type="button" aria-label={COPY.reel.prev} onClick={() => onStep(-1)}>
          ‹
        </button>
        {slides.map((s, i) => (
          <button key={i} type="button" className="reel-dot" aria-label={COPY.reel.show(s.label)} aria-current={i === view.monitor} onClick={() => onShow(i)} />
        ))}
        <button type="button" aria-label={COPY.reel.next} onClick={() => onStep(1)}>
          ›
        </button>
      </div>
    </div>
  );
}
