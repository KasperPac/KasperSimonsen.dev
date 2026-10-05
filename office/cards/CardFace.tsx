"use client";

import { useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { createPortal, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Vector3, type Mesh } from "three";
import { theme } from "@/office/theme";
import type { HotspotName } from "@/office/hotspots/registry";
import { backFaceFor, belowFaceFor, faceFor, screenFaceFor } from "./face";

/** CSS px the face is laid out at; it is then mapped onto the card's real size. */
export const FACE_WIDTH_PX = 520;

/**
 * Content printed on an object in the scene (interactions spec 3.2, 3.3): real HTML laid onto a card's top face, a
 * sleeve's back, or a monitor's screen with drei's `Html` in transform mode. It moves with the object and is seen in perspective, and its
 * links, focus and accessible name still work. Focus moves to its title (`titleId`) as it shows, unless `focus` is off.
 */
export default function CardFace({
  surface,
  place = "top",
  widthPx = FACE_WIDTH_PX,
  hotspot,
  titleId,
  focus = true,
  below,
  hidden = false,
  children,
}: {
  surface: Mesh;
  place?: "top" | "back" | "screen";
  widthPx?: number;
  hotspot: HotspotName;
  titleId: string;
  /** Move focus to the title as it shows. */
  focus?: boolean;
  /** With `place="screen"`: hang the print under the screen (its height, and the gap below the screen's bottom edge, in px) instead of on it. */
  below?: { heightPx: number; gapPx: number };
  /** Hide the print from screen readers (a decorative one). */
  hidden?: boolean;
  children: ReactNode;
}) {
  const face = useMemo(() => {
    if (place === "screen") {
      const at = surface.geometry.getAttribute("position");
      const screen = screenFaceFor(Array.from({ length: at.count }, (_, i) => new Vector3().fromBufferAttribute(at, i)), widthPx);
      return below ? belowFaceFor(screen, below.heightPx, below.gapPx) : screen;
    }
    if (!surface.geometry.boundingBox) surface.geometry.computeBoundingBox();
    return (place === "back" ? backFaceFor : faceFor)(surface.geometry.boundingBox!, widthPx);
  }, [surface, place, widthPx, below?.heightPx, below?.gapPx]);
  // drei mounts the print in its own React root and places it on the next frame; until then it would sit flat at the
  // top left of the canvas. Html's frame callback runs before this one (it subscribed first), so once the section
  // exists here it has been placed: show it, and move focus into it. The mark is on the element itself, not a flag on
  // this component: drei rebuilds its root (and the section) when its effects re-run, as React's StrictMode does in
  // development, and a fresh section must be shown again.
  const section = useRef<HTMLElement>(null);
  useFrame(() => {
    const el = section.current;
    if (!el || el.dataset.placed !== undefined) return;
    el.dataset.placed = "";
    if (focus) document.getElementById(titleId)?.focus({ preventScroll: true });
  });
  return createPortal(
    <Html transform position={face.position} rotation={face.rotation} distanceFactor={face.distanceFactor}>
      <section
        ref={section}
        className={place === "back" ? "office-card-face office-sleeve-back" : place === "screen" ? "office-card-face office-screen" : "office-card-face"}
        aria-labelledby={focus ? titleId : undefined}
        aria-hidden={hidden || undefined}
        style={{ width: widthPx, height: face.heightPx, "--accent": theme.accents[hotspot] } as CSSProperties}
      >
        {children}
      </section>
    </Html>,
    surface,
  );
}
