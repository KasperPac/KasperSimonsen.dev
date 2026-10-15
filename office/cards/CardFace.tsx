"use client";

import { useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { createPortal, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Matrix4, Vector3, type Group, type Mesh } from "three";
import { theme } from "@/office/theme";
import type { HotspotName } from "@/office/hotspots/registry";
import { backFaceFor, belowFaceFor, faceFor, screenFaceFor } from "./face";
import { projectFace } from "./projection";

const origin = (): [number, number] => [0, 0];

/** CSS px the face is laid out at; it is then mapped onto the card's real size. */
export const FACE_WIDTH_PX = 520;

/**
 * Content printed on an object in the scene (interactions spec 3.2, 3.3): real HTML laid onto a card's top face, a
 * sleeve's back, or a monitor's screen. A single projected CSS plane moves with the object in perspective, and its
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
  // Html owns the DOM root and its depth order. Project the face ourselves instead of nesting CSS camera/object
  // transforms: Safari can render those away from the mesh and hit-test the whiteboard at a different position.
  const anchor = useRef<Group>(null);
  const clip = useMemo(() => new Matrix4(), []);
  const section = useRef<HTMLElement>(null);
  useFrame(({ camera, size }) => {
    const el = section.current;
    const group = anchor.current;
    if (!el || !group) return;
    camera.updateMatrixWorld();
    group.updateWorldMatrix(true, false);
    clip.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(group.matrixWorld);
    const transform = projectFace(clip, { widthPx, heightPx: face.heightPx, unitsPerPx: face.distanceFactor / 400 }, size);
    el.style.visibility = transform ? "" : "hidden";
    if (!transform) return;
    el.style.transform = transform;
    // A fresh section, including a StrictMode remount, is only revealed/focused after its first projection.
    if (el.dataset.placed !== undefined) return;
    el.dataset.placed = "";
    // A returning sleeve can mount after its reading panel. The modal owns focus while it is open.
    if (focus && !document.querySelector('[role="dialog"][aria-modal="true"]'))
      document.getElementById(titleId)?.focus({ preventScroll: true });
  });
  // Prints are overlays drawn over the canvas, never hidden behind geometry: the reel's strip relies on it (its plane reaches below the desk top).
  return createPortal(
    <group ref={anchor} position={face.position} rotation={face.rotation}>
      <Html calculatePosition={origin}>
        <section
          ref={section}
          className={place === "back" ? "office-card-face office-sleeve-back" : place === "screen" ? "office-card-face office-screen" : "office-card-face"}
          aria-labelledby={focus ? titleId : undefined}
          style={{ width: widthPx, height: face.heightPx, transformOrigin: "0 0", "--accent": theme.accents[hotspot] } as CSSProperties}
        >
          {children}
        </section>
      </Html>
    </group>,
    surface,
  );
}
