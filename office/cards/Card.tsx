"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import { theme } from "@/office/theme";
import type { HotspotName } from "@/office/hotspots/registry";

/**
 * A content card beside its object (interactions spec section 4). The canvas positions it each frame through
 * `cardRef` (placeCard). On narrow screens CSS docks it to the bottom and ignores that position.
 */
export default function Card({
  hotspot,
  titleId,
  cardRef,
  children,
}: {
  hotspot: HotspotName;
  titleId: string;
  cardRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  return (
    <section
      ref={cardRef as RefObject<HTMLElement>}
      className="office-card"
      aria-labelledby={titleId}
      style={{ "--accent": theme.accents[hotspot] } as CSSProperties}
    >
      {children}
    </section>
  );
}
