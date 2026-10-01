"use client";

import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { PerspectiveCamera } from "three";
import manifest from "./manifest.json";
import { theme } from "./theme";
import { applyCleanEdges, setLineResolution } from "./style/cleanEdges";
import { findClipFor, makeClipSampler, progressToTime } from "./walkin/clipSampler";
import { useTurntable } from "./idle/useTurntable";
import { copyCameraPose, findCamera } from "./walkin/cameraPose";

const WALKIN_CAMERA = "cam_walkin";

export type OfficeCanvasProps = {
  /** Walk-in progress 0 → 1. Read every frame; never causes a render. */
  progress: RefObject<number>;
  /** Carries data-scene-ready and data-walkin-progress for the page and for tests. */
  host: RefObject<HTMLElement | null>;
};

/** Loads a model and restyles it as clean edges, keeping line widths right on resize. */
function useCleanEdges(url: string) {
  const gltf = useGLTF(url);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const handle = useMemo(
    () =>
      applyCleanEdges(gltf.scene, {
        background: theme.background,
        line: theme.line,
        lineWidth: theme.lineWidth,
        thresholdDeg: theme.edgeThresholdDeg,
      }),
    [gltf.scene],
  );
  useEffect(() => setLineResolution(handle, width, height), [handle, width, height]);
  return gltf;
}

function Street({ progress, host }: OfficeCanvasProps) {
  const street = useCleanEdges(manifest.street.url);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const walkIn = useMemo(() => {
    const clip = findClipFor(street.animations, WALKIN_CAMERA);
    return { duration: clip.duration, sample: makeClipSampler(clip, street.scene), source: findCamera(street.scene, WALKIN_CAMERA) };
  }, [street]);
  const written = useRef(-1);

  useFrame(() => {
    const p = progress.current;
    walkIn.sample(progressToTime(p, walkIn.duration));
    copyCameraPose(walkIn.source, camera);
    const el = host.current;
    if (el && Math.abs(p - written.current) > 0.00005) {
      el.dataset.walkinProgress = p.toFixed(4);
      el.dataset.sceneReady = "true";
      written.current = p;
    }
  });

  return <primitive object={street.scene} />;
}

function Office() {
  const office = useCleanEdges(manifest.office.url);
  useTurntable(office.scene);
  return <primitive object={office.scene} />;
}

export default function OfficeCanvas({ progress, host }: OfficeCanvasProps) {
  return (
    <Canvas dpr={[1, 2]} camera={{ fov: 50, near: 0.1, far: 10000 }} gl={{ antialias: true }}>
      <color attach="background" args={[theme.background]} />
      <fog attach="fog" args={[theme.background, theme.fogNear, theme.fogFar]} />
      <Suspense fallback={null}>
        <Street progress={progress} host={host} />
        {/* The office streams in separately so the street can show first. */}
        <Suspense fallback={null}>
          <Office />
        </Suspense>
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(manifest.street.url);
