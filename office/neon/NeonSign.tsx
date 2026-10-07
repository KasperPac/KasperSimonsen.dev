import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Object3D } from "three";
import type { DirectorState } from "../director/director";
import { applyFrame, buildSign, clampDt, disposeSign, setSignResolution, type Sign } from "./sign";
import { NEON_NODE } from "./mark";
import { neonFrame, nextPower, type NeonPower } from "./sequence";

let warned = false;

type Props = {
  scene: Object3D;
  director: RefObject<DirectorState>;
  /** Carries data-neon: off | powering | on. */
  host: RefObject<HTMLElement | null>;
  reduced: boolean;
};

/**
 * The neon sign over the couch (neon sign spec): off in the walk-in, powering up as the visitor comes into the room,
 * then stepping round. In the room means anything but the walk-in, so a direct visit that opens an object counts too.
 */
export default function NeonSign({ scene, director, host, reduced }: Props) {
  const anchor = useMemo(() => scene.getObjectByName(NEON_NODE) ?? null, [scene]);
  const seed = useMemo(() => Math.floor(Math.random() * 2 ** 32), []);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const get = useThree((s) => s.get);
  // Built in the effect, not a memo: React's dev double-mount runs the cleanup once, and a memoised sign would come
  // back with its geometry and materials disposed.
  const signRef = useRef<Sign | null>(null);
  const power = useRef<NeonPower>("off");
  const t = useRef(0);

  useEffect(() => {
    if (!anchor) {
      if (!warned) {
        warned = true;
        console.warn(`${NEON_NODE} not found in the office model; no neon sign.`);
      }
      return;
    }
    const sign = buildSign();
    const { size } = get();
    setSignResolution(sign, size.width, size.height);
    applyFrame(sign, neonFrame(power.current, t.current, seed, reduced));
    anchor.add(sign.root);
    signRef.current = sign;
    return () => {
      disposeSign(sign);
      signRef.current = null;
    };
  }, [anchor, seed, reduced, get]);

  useEffect(() => {
    if (signRef.current) setSignResolution(signRef.current, width, height);
  }, [width, height]);

  useFrame((_, dt) => {
    const sign = signRef.current;
    if (!sign) return;
    t.current += clampDt(dt);
    const next = nextPower(power.current, director.current.kind !== "walkIn", t.current, reduced);
    if (next !== power.current) {
      power.current = next;
      t.current = 0;
      if (host.current) host.current.dataset.neon = next;
    }
    applyFrame(sign, neonFrame(power.current, t.current, seed, reduced));
  });

  return null;
}
