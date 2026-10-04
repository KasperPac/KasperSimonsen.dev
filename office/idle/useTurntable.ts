import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Object3D } from "three";
import { applyTurntable, findTurntable, stepAway, type AwayState } from "./turntable";

/**
 * Spins the record player and alternates the now-playing albums. While `hold` is set (a project's record plays, or its
 * sleeve is on the stand) the album on show goes into the sideboard's bay and the alternating pauses; it comes back
 * after. A no-op if the model lacks the nodes.
 */
export function useTurntable(scene: Object3D, hold?: RefObject<boolean>) {
  const nodes = useMemo(() => findTurntable(scene), [scene]);
  const reduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const state = useRef<AwayState & { cycle: number }>({ away: 0, released: Number.POSITIVE_INFINITY, held: 0, cycle: 0 });
  useFrame(({ clock }, dt) => {
    if (!nodes) return;
    const s = state.current;
    const next = stepAway(s, hold?.current ?? false, dt, reduced);
    s.away = next.away;
    s.released = next.released;
    s.held = next.held;
    if (s.away === 0) s.cycle += dt; // the album cycle waits while one is put away, so the same one comes back
    applyTurntable(nodes, s.cycle, reduced, s.away, clock.elapsedTime);
  });
}
