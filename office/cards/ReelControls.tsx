"use client";

import { findWork } from "@/content/work";
import { slides, type Slide } from "@/content/screens";
import { COPY } from "@/office/copy";
import type { ReelView } from "@/office/monitor/reel";
import type { HoldProps } from "@/office/monitor/useReel";
import { SCREEN_WIDTH_PX } from "./ReelScreen";

/** CSS px the laptop's print is laid out at. */
export const LAPTOP_WIDTH_PX = 640;
/** The strip under the monitor on portrait screens: as wide as the monitor's print, so it spans the screen. */
export const STRIP_WIDTH_PX = SCREEN_WIDTH_PX;
export const STRIP_HEIGHT_PX = 300;
/** Between the screen's bottom edge and the strip, at the screen's print scale: clear of the bezel's chin. */
export const STRIP_GAP_PX = 12;

/** The line a slide's words show: its crate project's headline, or its own line for work not in the crate. */
export function headlineFor(slide: Slide): string {
  return slide.slug ? findWork(slide.slug)!.headline : slide.line!;
}

/**
 * The reel's words and controls (spec 3.5): the slide's label, its headline, its action and ‹ › — on the laptop, or on a
 * strip under the monitor on portrait screens. The laptop has a dot per slide; the strip, sized for fingers, has a
 * read-out of where it is instead (a dot per slide couldn't be tapped once there are more than a few).
 */
export default function ReelControls({
  titleId,
  view,
  hold,
  onStep,
  onShow,
  onPlay,
  place,
}: {
  titleId: string;
  view: ReelView;
  hold: HoldProps;
  onStep: (dir: 1 | -1) => void;
  onShow: (i: number) => void;
  onPlay: () => void;
  place: "laptop" | "strip";
}) {
  const i = view.words;
  const slide = slides[i];
  return (
    <div className={`reel-words reel-words--${place}`} data-slide={i} {...hold}>
      <h2 id={titleId} className="visually-hidden" tabIndex={-1}>
        {COPY.reel.title}
      </h2>
      <p className="reel-label">{slide.label}</p>
      <p className="reel-headline">{headlineFor(slide)}</p>
      {(slide.slug || slide.href) && (
        <button type="button" className="office-card-cta" onClick={onPlay}>
          {slide.slug ? COPY.reel.caseStudy : COPY.reel.visit}
        </button>
      )}
      <div className="reel-controls">
        <button type="button" className="reel-step" aria-label={COPY.reel.prev} onClick={() => onStep(-1)}>
          ‹
        </button>
        {place === "laptop" ? (
          slides.map((s, k) => (
            <button key={k} type="button" className="reel-dot" aria-label={COPY.reel.show(s.label)} aria-current={k === i} onClick={() => onShow(k)} />
          ))
        ) : (
          <span className="reel-count" aria-hidden="true">
            {`${i + 1} / ${slides.length}`}
          </span>
        )}
        <button type="button" className="reel-step" aria-label={COPY.reel.next} onClick={() => onStep(1)}>
          ›
        </button>
      </div>
    </div>
  );
}
