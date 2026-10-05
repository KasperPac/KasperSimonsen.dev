"use client";

import type { WorkItem } from "@/content/work";
import { screenFor } from "@/content/screens";

/** A project as a little window (spec 3.5): its name on a title bar, its screenshot or its logo card. `dragged` adds the pointer. */
export default function ReelWindow({ item, dragged = false }: { item: WorkItem; dragged?: boolean }) {
  const { shot, logo } = screenFor(item.slug);
  return (
    <div className="reel-window">
      <div className="reel-bar">
        <span className="reel-name">{item.name}</span>
        {dragged && (
          <svg className="reel-pointer" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 1 L2 13 L5.5 9.8 L8 15 L10 14 L7.6 8.9 L12.5 8.9 Z" />
          </svg>
        )}
      </div>
      <div className="reel-body">
        {shot ? (
          <img src={shot.src} alt={shot.alt} draggable={false} />
        ) : (
          <div className="reel-card">
            {logo && <img src={logo} alt="" draggable={false} />}
            <p aria-hidden="true">{item.name}</p>
          </div>
        )}
      </div>
    </div>
  );
}
