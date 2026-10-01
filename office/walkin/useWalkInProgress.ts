"use client";

import { useRef, type RefObject } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Walk-in progress through `track`: 0 when its top meets the viewport top, 1 when its bottom meets the
 * viewport bottom, smoothed by GSAP scrub. Read `.current` inside useFrame; it never causes a render.
 */
export function useWalkInProgress(track: RefObject<HTMLElement | null>, smoothing = 0.8): RefObject<number> {
  const progress = useRef(0);
  useGSAP(
    () => {
      if (!track.current) return;
      const proxy = { p: 0 };
      const tween = gsap.to(proxy, {
        p: 1,
        ease: "none",
        onUpdate: () => {
          progress.current = proxy.p;
        },
        scrollTrigger: { trigger: track.current, start: "top top", end: "bottom bottom", scrub: smoothing },
      });
      // Start where the page already is (e.g. a restored scroll position), not back on the street.
      const trigger = tween.scrollTrigger;
      if (trigger) {
        tween.progress(trigger.progress);
        progress.current = proxy.p;
      }
    },
    { dependencies: [smoothing] },
  );
  return progress;
}
