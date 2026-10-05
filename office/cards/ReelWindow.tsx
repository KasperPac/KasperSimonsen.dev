"use client";

import type { Slide } from "@/content/screens";

/** A slide as a little window (spec 3.5): its label on a title bar, its screenshot filling the rest. `dragged` adds the pointer. */
export default function ReelWindow({ slide, dragged = false }: { slide: Slide; dragged?: boolean }) {
  return (
    <div className="reel-window">
      <div className="reel-bar">
        <span className="reel-name">{slide.label}</span>
        {dragged && (
          <svg className="reel-pointer" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 1 L2 13 L5.5 9.8 L8 15 L10 14 L7.6 8.9 L12.5 8.9 Z" />
          </svg>
        )}
      </div>
      <div className="reel-body">
        <img src={slide.shot.src} alt={slide.shot.alt} draggable={false} />
      </div>
    </div>
  );
}
