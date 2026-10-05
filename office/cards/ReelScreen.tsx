"use client";

import { slides, type Slide } from "@/content/screens";
import { COPY } from "@/office/copy";
import type { ReelView } from "@/office/monitor/reel";
import type { HoldProps } from "@/office/monitor/useReel";

/** CSS px the monitor's print is laid out at (its 16:9 screen face is 1280 x 720: laid out at twice the screen's on-screen size so the browser shrinks it, crisp, spec 3.5 3a). */
export const SCREEN_WIDTH_PX = 1280;

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

/**
 * What's printed on the monitor (spec 3.5): the slide's screenshot edge to edge, the next one sliding in over it, and the
 * carousel over them: ‹ and › as tall zones at the edges, a dot per slide along the bottom (and "Slide n of N" for screen readers), and the expand button. The
 * screenshot opens full screen on a click; the zones and buttons over it don't. The visually hidden heading takes focus as
 * the monitor opens. `dots` is "buttons" where they can be tapped, "marker" on phones, where they only show the position.
 */
export default function ReelScreen({ titleId, view, hold, onStep, onShow, onOpen, dots }: {
  titleId: string; view: ReelView; hold: HoldProps; onStep: (dir: 1 | -1) => void; onShow: (i: number) => void; onOpen: () => void; dots: "buttons" | "marker";
}) {
  const i = view.words;
  return (
    <div className="office-reel" data-reel data-monitor={view.monitor} {...hold}>
      <h2 id={titleId} className="visually-hidden" tabIndex={-1}>{COPY.reel.title}</h2>
      {/* the screenshot opens full screen; the zones and buttons over it don't */}
      <div className="reel-open" onClick={onOpen}>
        <Shot slide={slides[view.monitor]} />
        {view.moving && <Shot slide={slides[view.moving.slide]} sliding />}
      </div>
      {/* the next screenshot, fetched before it slides in, and the previous one, which ‹ uncovers */}
      {neighbours(view.monitor).map((src) => (
        <img key={src} className="reel-preload" src={src} alt="" aria-hidden="true" draggable={false} />
      ))}
      <button type="button" className="reel-zone reel-zone--prev" aria-label={COPY.reel.prev} onClick={() => onStep(-1)}>‹</button>
      <button type="button" className="reel-zone reel-zone--next" aria-label={COPY.reel.next} onClick={() => onStep(1)}>›</button>
      <button type="button" className="reel-expand" aria-label={COPY.reel.expand} onClick={onOpen}>⤢</button>
      <div className="reel-dots">
        {dots === "buttons"
          ? slides.map((s, k) => <button key={k} type="button" className="reel-dot" aria-label={COPY.reel.show(s.label)} aria-current={k === i} onClick={() => onShow(k)} />)
          : slides.map((_, k) => <span key={k} className="reel-pip" aria-hidden="true" data-current={k === i || undefined} />)}
        {/* where the reel is, read out in both modes */}
        <span className="visually-hidden">{COPY.reel.position(i + 1, slides.length)}</span>
      </div>
    </div>
  );
}
