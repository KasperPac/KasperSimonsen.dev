"use client";

import { slides } from "@/content/screens";
import type { ReelView } from "@/office/monitor/reel";
import ReelWindow from "./ReelWindow";

/** CSS px the laptop's print is laid out at. */
export const LAPTOP_WIDTH_PX = 640;

/** What's printed on the laptop (spec 3.5): the next slide, and a window leaving for the monitor. Decorative: the monitor carries it all for screen readers. */
export default function LaptopScreen({ view }: { view: ReelView }) {
  return (
    <div className="office-reel office-reel--laptop" data-reel aria-hidden="true">
      <div className="reel-stage">
        <ReelWindow slide={slides[view.laptop]} />
        {view.moving && (
          <div className="reel-moving reel-moving--laptop">
            <ReelWindow slide={slides[view.moving.slide]} dragged />
          </div>
        )}
      </div>
    </div>
  );
}
