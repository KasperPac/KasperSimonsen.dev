"use client";

import type { WorkItem } from "@/content/work";
import { COPY } from "@/office/copy";
import { leadOf } from "./lead";

/** CSS px the back is laid out at, square like the sleeve. */
export const SLEEVE_WIDTH_PX = 600;

/** What's printed on a pulled sleeve's back, like liner notes (interactions spec 3.2). */
export default function SleeveBack({ item, titleId, onReadMore }: { item: WorkItem; titleId: string; onReadMore: () => void }) {
  return (
    <>
      <p className="office-card-eyebrow">
        {item.years} · {item.role}
      </p>
      <h2 id={titleId} className="office-card-title" tabIndex={-1}>
        {item.name}
      </h2>
      <p className="office-sleeve-headline">{item.headline}</p>
      <p className="office-card-text">{leadOf(item.intro)}</p>
      <p className="office-sleeve-label">{COPY.sleeve.stack}</p>
      <ul className="office-sleeve-stack">
        {item.stack.slice(0, 6).map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <button type="button" className="office-card-cta" onClick={onReadMore}>
        {COPY.sleeve.readMore}
      </button>
    </>
  );
}
