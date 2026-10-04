"use client";

import { useEffect, type RefObject } from "react";
import type { Service } from "@/content/services";
import { COPY } from "@/office/copy";
import Card from "./Card";

/** The plaque beside a picked ornament (interactions spec 3.4): name, two or three lines, Read more. Focus moves to its title as it shows. */
export default function Plaque({ service, titleId, cardRef, onReadMore }: { service: Service; titleId: string; cardRef: RefObject<HTMLElement | null>; onReadMore: () => void }) {
  useEffect(() => {
    document.getElementById(titleId)?.focus({ preventScroll: true });
  }, [titleId, service.slug]);
  return (
    <Card hotspot="hs_shelf" titleId={titleId} cardRef={cardRef}>
      <p className="office-card-eyebrow">{COPY.plaque.eyebrow(service.number)}</p>
      <h2 id={titleId} className="office-card-title" tabIndex={-1}>
        {service.name}
      </h2>
      <p className="office-card-text">{service.summary}</p>
      <button type="button" className="office-card-cta" onClick={onReadMore}>
        {COPY.plaque.readMore}
      </button>
    </Card>
  );
}
