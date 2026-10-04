"use client";

import { useState } from "react";
import { COPY } from "@/office/copy";

/** CSS px the screen is laid out at; it is then mapped onto the monitor's screen. */
export const SCREEN_WIDTH_PX = 640;

/**
 * What the monitor shows (interactions spec 3.5): a fake Australian age check. Both buttons get a punchline, and either
 * can be pressed after the other. No URL; Back or Esc leaves.
 */
export default function AgeGate({ titleId }: { titleId: string }) {
  const [answer, setAnswer] = useState<"over" | "under" | null>(null);
  return (
    <>
      <p className="office-card-eyebrow">{COPY.monitor.eyebrow}</p>
      <h2 id={titleId} className="office-card-title" tabIndex={-1}>
        {COPY.monitor.title}
      </h2>
      <p className="office-card-text">{COPY.monitor.text}</p>
      <div className="office-gate-buttons">
        {(["over", "under"] as const).map((a) => (
          <button key={a} type="button" className="office-card-cta" aria-pressed={answer === a} onClick={() => setAnswer(a)}>
            {COPY.monitor[a]}
          </button>
        ))}
      </div>
      <p className="office-gate-reply" role="status">
        {answer ? COPY.monitor.replies[answer] : ""}
      </p>
    </>
  );
}
