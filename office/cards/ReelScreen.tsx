"use client";

import { slides, type Slide } from "@/content/screens";
import type { ReelView } from "@/office/monitor/reel";
import type { HoldProps } from "@/office/monitor/useReel";

/** CSS px the monitor's print is laid out at (its 16:10 screen face is 640 x 400). */
export const SCREEN_WIDTH_PX = 640;

/** One screenshot filling the screen; `sliding` is the one moving over it, which screen readers skip (they get it as it lands). */
function Shot({ slide, sliding = false }: { slide: Slide; sliding?: boolean }) {
  return (
    <div className={sliding ? "reel-shot reel-moving" : "reel-shot"} aria-hidden={sliding || undefined}>
      <img src={slide.shot.src} alt={sliding ? "" : `${slide.label}: ${slide.shot.alt}`} draggable={false} />
    </div>
  );
}

/** The screenshots either side of slide `i` (next, then previous), each once and never the one showing. */
function neighbours(i: number): string[] {
  const n = slides.length;
  const showing = slides[i].shot.src;
  return [...new Set([slides[(i + 1) % n].shot.src, slides[(i - 1 + n) % n].shot.src])].filter((src) => src !== showing);
}

/** What's printed on the monitor (spec 3.5): the slide's screenshot edge to edge, and the next one sliding in over it. */
export default function ReelScreen({ view, hold }: { view: ReelView; hold: HoldProps }) {
  return (
    <div className="office-reel" data-reel data-monitor={view.monitor} {...hold}>
      <Shot slide={slides[view.monitor]} />
      {view.moving && <Shot slide={slides[view.moving.slide]} sliding />}
      {/* the next screenshot, fetched before it slides in, and the previous one, which ‹ uncovers */}
      {neighbours(view.monitor).map((src) => (
        <img key={src} className="reel-preload" src={src} alt="" aria-hidden="true" draggable={false} />
      ))}
    </div>
  );
}
