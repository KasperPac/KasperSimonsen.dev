"use client";

import { useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { createPortal, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Mesh } from "three";
import { theme } from "@/office/theme";
import type { HotspotName } from "@/office/hotspots/registry";
import { faceFor } from "./face";

/** CSS px the face is laid out at; it is then mapped onto the card's real size. */
export const FACE_WIDTH_PX = 520;

/**
 * Content printed on a card in the scene (interactions spec 3.3): real HTML laid onto the card's top face with drei's
 * `Html` in transform mode. It moves with the drawer and is seen in perspective, and its links, focus and accessible
 * name still work. Focus moves to its title (`titleId`) as it shows.
 */
export default function CardFace({
  card,
  hotspot,
  titleId,
  children,
}: {
  card: Mesh;
  hotspot: HotspotName;
  titleId: string;
  children: ReactNode;
}) {
  const face = useMemo(() => {
    if (!card.geometry.boundingBox) card.geometry.computeBoundingBox();
    return faceFor(card.geometry.boundingBox!, FACE_WIDTH_PX);
  }, [card]);
  // drei mounts the print in its own React root and places it on the next frame; until then it would sit flat at the
  // top left of the canvas. Html's frame callback runs before this one (it subscribed first), so once the section
  // exists here it has been placed: show it, and move focus into it.
  const section = useRef<HTMLElement>(null);
  const placed = useRef(false);
  useFrame(() => {
    if (placed.current || !section.current) return;
    placed.current = true;
    section.current.dataset.placed = "";
    document.getElementById(titleId)?.focus({ preventScroll: true });
  });
  return createPortal(
    <Html transform position={face.position} rotation={face.rotation} distanceFactor={face.distanceFactor}>
      <section
        ref={section}
        className="office-card-face"
        aria-labelledby={titleId}
        style={{ width: FACE_WIDTH_PX, height: face.heightPx, "--accent": theme.accents[hotspot] } as CSSProperties}
      >
        {children}
      </section>
    </Html>,
    card,
  );
}
