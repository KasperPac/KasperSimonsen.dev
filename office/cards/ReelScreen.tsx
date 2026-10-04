"use client";

import { work } from "@/content/work";
import { COPY } from "@/office/copy";
import type { ReelView } from "@/office/monitor/reel";
import type { HoldProps } from "@/office/monitor/useReel";
import ReelWindow from "./ReelWindow";

/** CSS px the monitor's print is laid out at (its screen face is 640 x 352). */
export const SCREEN_WIDTH_PX = 640;

/** What's printed on the monitor (spec 3.5): the project's window, its headline, See the case study, ‹ › and dots. */
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
  onPlay: (slug: string) => void;
}) {
  const item = work[view.monitor];
  return (
    <div className="office-reel" data-reel data-slide={view.monitor} {...hold}>
      <h2 id={titleId} className="visually-hidden" tabIndex={-1}>
        {COPY.reel.title}
      </h2>
      <div className="reel-stage">
        <ReelWindow item={item} />
        {view.moving && (
          <div className="reel-moving reel-moving--monitor" aria-hidden="true">
            <ReelWindow item={work[view.moving.slide]} dragged />
          </div>
        )}
      </div>
      <div className="reel-strip">
        <p className="reel-headline">{item.headline}</p>
        <button type="button" className="office-card-cta" onClick={() => onPlay(item.slug)}>
          {COPY.reel.caseStudy}
        </button>
      </div>
      <div className="reel-controls">
        <button type="button" aria-label={COPY.reel.prev} onClick={() => onStep(-1)}>
          ‹
        </button>
        {work.map((w, i) => (
          <button key={w.slug} type="button" className="reel-dot" aria-label={COPY.reel.show(w.name)} aria-current={i === view.monitor} onClick={() => onShow(i)} />
        ))}
        <button type="button" aria-label={COPY.reel.next} onClick={() => onStep(1)}>
          ›
        </button>
      </div>
    </div>
  );
}
