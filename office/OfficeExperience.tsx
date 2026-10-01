"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import OfficeErrorBoundary from "./OfficeErrorBoundary";
import { theme } from "./theme";
import { useWalkInProgress } from "./walkin/useWalkInProgress";

// three.js never runs on the server and never ships to pages that don't render the office.
const OfficeCanvas = dynamic(() => import("./OfficeCanvas"), { ssr: false });

/** Fixed full-screen office over a scroll track exactly as long as the walk-in. */
export default function OfficeExperience() {
  const host = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const progress = useWalkInProgress(track);

  return (
    <div ref={host} className="office" data-walkin-progress="0">
      <div className="office-stage">
        <OfficeErrorBoundary host={host}>
          <OfficeCanvas progress={progress} host={host} />
        </OfficeErrorBoundary>
      </div>
      <div ref={track} className="office-track" style={{ height: `${theme.walkInScreens * 100}vh` }} aria-hidden="true" />
    </div>
  );
}
