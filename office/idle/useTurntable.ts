import { useMemo, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Object3D } from "three";
import { applyTurntable, findTurntable } from "./turntable";

/**
 * Spins the record player and alternates the now-playing sleeves, hiding them while `hideSleeves` is set (a project's
 * sleeve is on the stand). A no-op if the model lacks the nodes.
 */
export function useTurntable(scene: Object3D, hideSleeves?: RefObject<boolean>) {
  const nodes = useMemo(() => findTurntable(scene), [scene]);
  const reduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  useFrame(({ clock }) => {
    if (nodes) applyTurntable(nodes, clock.elapsedTime, reduced, hideSleeves?.current ?? false);
  });
}
