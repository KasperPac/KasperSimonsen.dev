"use client";

import { Suspense, useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, Quaternion, Vector3, type Mesh, type Object3D, type PerspectiveCamera } from "three";
import manifest from "./manifest.json";
import { theme } from "./theme";
import { applyCleanEdges, setHighlight, setLineResolution, updateEdgeFades, type CleanEdgesHandle } from "./style/cleanEdges";
import { findClipFor, makeClipSampler, progressToTime } from "./walkin/clipSampler";
import { useTurntable } from "./idle/useTurntable";
import { applySkippingGirl, findSkippingGirl } from "./walkin/skippingGirl";
import { findCamera, WALKIN_CAMERA } from "./walkin/cameraPose";
import { applyPose, makePose, readPose, type Pose } from "./camera/pose";
import { basePose, focusPose } from "./camera/basePose";
import { CameraRig, FOCUS_MOVES, PLAYER_MOVE } from "./camera/rig";
import { cameraKey } from "./camera/key";
import { FOCUS_CAMERA, HOTSPOTS, highlightFor, highlightKey, hitFor, pickHit, type Hit, type HotspotName } from "./hotspots/registry";
import { addHitProxies } from "./hotspots/proxies";
import { focusedHotspot, IDLE_AT, type DirectorState } from "./director/director";
import { CARD_NODE, findMotionNodes, ObjectMotion } from "./objects/motion";
import { CrateMotion, findCrateNodes, type PlayerPoses } from "./objects/crate";
import { addDigPlane, DIG_PLANE, digFromDepth } from "./crate/scrub";
import { PLATTER_NODE, STAND_NODE } from "./idle/turntable";
import CardFace from "./cards/CardFace";
import { SLEEVE_WIDTH_PX } from "./cards/SleeveBack";
import { work } from "@/content/work";

/** DOM the canvas positions each frame: the hover label and the touch markers. */
export type OverlayElements = { label: HTMLElement | null; markers: Partial<Record<HotspotName, HTMLElement | null>> };

export type OfficeCanvasProps = {
  /** Walk-in progress 0 → 1. Read every frame; never causes a render. */
  progress: RefObject<number>;
  /** Carries data-scene-ready, data-walkin-progress, data-camera and data-drawer for the page and for tests. */
  host: RefObject<HTMLElement | null>;
  director: RefObject<DirectorState>;
  /** What is hovered (pointer) or keyboard-focused (DOM); highlighted, labelled and teased. */
  hover: RefObject<Hit | null>;
  overlay: RefObject<OverlayElements>;
  /** What's printed on the business card in the drawer while it shows, or null. */
  drawerCard: { titleId: string; content: ReactNode } | null;
  /** The crate, read every frame: the front record of the dig, the record on the player (or null), and whether the visitor is browsing it. */
  crate: RefObject<{ dig: number; playing: number | null; browsing: boolean }>;
  /** What's printed on the back of the sleeve on the now-playing stand while it shows, or null. */
  sleeveBack: { index: number; titleId: string; content: ReactNode } | null;
  /** A record finished going onto the player, its sleeve turned round on the stand (true), or started back (false). */
  onSleeveOut: (out: boolean) => void;
  onProgressCross: (progress: number) => void;
  onSettled: () => void;
  onHover: (hit: Hit | null) => void;
  onActivate: (hit: Hit) => void;
  /** The drawer finished opening (true) or started closing (false). */
  onDrawerOpen: (open: boolean) => void;
};

type OfficeInfo = {
  edges: CleanEdgesHandle;
  focus: Partial<Record<HotspotName, { land: Pose; portrait: Pose | null }>>;
  /** The record player's focus cameras: a record from the crate is played there. */
  player: { land: Pose; portrait: Pose | null } | null;
  standPortrait: Pose | null;
  anchors: Partial<Record<HotspotName, Vector3>>;
};

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Loads a model and restyles it as clean edges, keeping line widths right on resize and distance fades current. */
function useCleanEdges(url: string, keyFor?: (mesh: Object3D) => string | null) {
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
        highlightKey: keyFor,
      }),
    [gltf.scene, keyFor],
  );
  useEffect(() => setLineResolution(handle, width, height), [handle, width, height]);
  useFrame(({ camera }) => updateEdgeFades(handle, camera.position)); // dense detail fades with distance
  return { gltf, handle };
}

type StreetProps = Pick<OfficeCanvasProps, "progress" | "host" | "director" | "onProgressCross" | "onSettled"> & { info: RefObject<OfficeInfo | null> };

/** The street, the walk-in and the one place the render camera is driven from. */
function Street({ progress, host, director, onProgressCross, onSettled, info }: StreetProps) {
  const { gltf: street } = useCleanEdges(manifest.street.url);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const walkIn = useMemo(() => {
    const clip = findClipFor(street.animations, WALKIN_CAMERA);
    return { duration: clip.duration, sample: makeClipSampler(clip, street.scene), source: findCamera(street.scene, WALKIN_CAMERA) };
  }, [street]);
  const skippingGirl = useMemo(() => findSkippingGirl(street.scene), [street]);
  const reduced = useMemo(reducedMotion, []);
  const rig = useMemo(() => new CameraRig(), []);
  const poses = useMemo(() => ({ walk: makePose(), base: makePose(), focus: makePose(), now: makePose(), out: makePose() }), []);
  const seen = useRef("");
  const left = useRef<HotspotName | null>(null); // the object a return move leaves, so it retraces that object's arc
  const atEnd = useRef<boolean | null>(null);
  const written = useRef({ progress: -1, camera: "" });

  useFrame((_, dt) => {
    const p = progress.current;
    walkIn.sample(progressToTime(p, walkIn.duration));
    if (skippingGirl) applySkippingGirl(skippingGirl, p, reduced);
    readPose(walkIn.source, poses.walk);
    const office = info.current;
    basePose(poses.walk, office?.standPortrait ?? null, p, camera.aspect, poses.base);

    const d = director.current;
    const hotspot = focusedHotspot(d);
    // A record from the crate is played on the record player: the crate's other view.
    const playing = (d.kind === "focusing" || d.kind === "focused") && d.target.hotspot === "hs_crate" && d.target.item !== null;
    const cams = playing ? (office?.player ?? office?.focus.hs_crate) : hotspot ? office?.focus[hotspot] : undefined;
    if (cams) focusPose(cams.land, cams.portrait, camera.aspect, poses.focus);

    // A new state or a new object starts a camera move from wherever the camera is.
    const key = cameraKey(d.kind, hotspot, playing, !!cams);
    if (key !== seen.current) {
      const was = seen.current;
      seen.current = key;
      readPose(camera, poses.now);
      if (d.kind === "focusing") {
        // Cut instead of gliding under reduced motion (the content is read up close, on the object) and from the
        // walk-in (never fly through walls).
        const move = FOCUS_MOVES[d.target.hotspot];
        left.current = d.target.hotspot;
        if (cams) rig.moveTo(poses.now, { kind: "pose", pose: poses.focus }, reduced || d.from === "walkIn" ? 0 : move.seconds, move.arc);
        else rig.moveTo(poses.now, { kind: "base" }, 0);
      } else if (d.kind === "focused" && was.startsWith("focused") && cams) {
        // The same object, another view: a record goes onto the player, or back to the crate.
        rig.moveTo(poses.now, { kind: "pose", pose: poses.focus }, reduced ? 0 : PLAYER_MOVE.seconds, PLAYER_MOVE.arc);
      } else if (d.kind === "returning") {
        const move = left.current ? FOCUS_MOVES[left.current] : null;
        rig.moveTo(poses.now, { kind: "base" }, reduced || !move ? 0 : move.seconds, move?.arc ?? null);
      }
    }
    // Settle while the move is over, every frame until the director has moved on (it ignores the extras), so a missed
    // frame can never leave it waiting.
    rig.advance(dt);
    if (!rig.moving && (d.kind === "focusing" || d.kind === "returning")) onSettled();
    applyPose(rig.pose(poses.base, poses.out), camera);

    const end = p >= IDLE_AT;
    if (end !== atEnd.current) {
      atEnd.current = end;
      onProgressCross(p);
    }
    const el = host.current;
    if (!el) return;
    if (Math.abs(p - written.current.progress) > 0.00005) {
      el.dataset.walkinProgress = p.toFixed(4);
      el.dataset.sceneReady = "true";
      written.current.progress = p;
    }
    const cameraState = rig.moving ? "moving" : rig.goalKind === "pose" ? "focus" : "base";
    if (cameraState !== written.current.camera) {
      el.dataset.camera = cameraState;
      written.current.camera = cameraState;
    }
  });

  return <primitive object={street.scene} />;
}

type OfficeProps = Pick<
  OfficeCanvasProps,
  "host" | "director" | "hover" | "overlay" | "drawerCard" | "crate" | "sleeveBack" | "onHover" | "onActivate" | "onDrawerOpen" | "onSleeveOut"
> & {
  info: RefObject<OfficeInfo | null>;
};

/** The office model: hover, click, highlight, object motion, where the label and markers go, and the business card's print. */
function Office({ host, director, hover, overlay, drawerCard, crate, sleeveBack, onHover, onActivate, onDrawerOpen, onSleeveOut, info }: OfficeProps) {
  const { gltf: office, handle } = useCleanEdges(manifest.office.url, highlightKey);
  const onStand = useRef(false); // a project's sleeve is on the now-playing stand: its covers hide
  useTurntable(office.scene, onStand);
  const motion = useMemo(() => new ObjectMotion(), []);
  const nodes = useMemo(() => findMotionNodes(office.scene), [office]);
  const card = useMemo(() => (office.scene.getObjectByName(CARD_NODE) as Mesh | undefined) ?? null, [office]);
  const reduced = useMemo(reducedMotion, []);
  const shown = useRef<string | null>("");
  const drawerWasOpen = useRef(false);
  const crateNodes = useMemo(() => findCrateNodes(nodes.records), [nodes]);
  const crateMotion = useMemo(() => new CrateMotion(), []);
  // Where a played record goes: its vinyl on the platter, its sleeve where the stand's first cover rests.
  const player = useMemo<PlayerPoses | null>(() => {
    const platter = office.scene.getObjectByName(PLATTER_NODE);
    const slot = office.scene.getObjectByName(STAND_NODE);
    if (!platter || !slot) return null;
    slot.updateWorldMatrix(true, false);
    const stand = { position: new Vector3(), quaternion: new Quaternion() };
    slot.matrixWorld.decompose(stand.position, stand.quaternion, new Vector3());
    // the room's way, toward the standing spot: the flight comes in to the player from that side, under the shelf
    const room = office.scene.getObjectByName("office_room");
    const toward = new Vector3(0, 0, 1);
    if (room) toward.applyQuaternion(room.getWorldQuaternion(new Quaternion()));
    toward.setY(0).normalize();
    return { platter, stand, toward };
  }, [office]);
  const sleeveWasOut = useRef(false);
  const v = useMemo(() => new Vector3(), []);

  // Each object's whole outline takes the pointer while nothing is focused (thin shelf, gaps between ornaments).
  useEffect(() => {
    const proxies = addHitProxies(office.scene, () => focusedHotspot(director.current) === null);
    return () => proxies.forEach((p) => p.removeFromParent());
  }, [office, director]);

  // Browsing the crate, the pointer's depth across its opening picks the front record (Kasper: flick on mouseover).
  const digPlane = useRef<Mesh | null>(null);
  useEffect(() => {
    const crateRoot = office.scene.getObjectByName("hs_crate");
    const plane = crateRoot ? addDigPlane(crateRoot, crateNodes.records, () => crate.current.browsing) : null;
    digPlane.current = plane;
    return () => {
      plane?.removeFromParent();
      digPlane.current = null;
    };
  }, [office, crateNodes, crate]);

  useEffect(() => {
    const pose = (name: string) => {
      const node = office.scene.getObjectByName(name);
      return node ? readPose(node, makePose()) : null;
    };
    const focus: OfficeInfo["focus"] = {};
    const anchors: OfficeInfo["anchors"] = {};
    for (const h of HOTSPOTS) {
      const land = pose(FOCUS_CAMERA[h]);
      if (land) focus[h] = { land, portrait: pose(`${FOCUS_CAMERA[h]}_portrait`) };
      const node = office.scene.getObjectByName(h);
      if (node) {
        const box = new Box3().setFromObject(node);
        anchors[h] = new Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
      }
    }
    const playerLand = pose("cam_focus_player");
    const player = playerLand ? { land: playerLand, portrait: pose("cam_focus_player_portrait") } : null;
    info.current = { edges: handle, focus, player, standPortrait: pose("cam_stand_portrait"), anchors };
    return () => {
      info.current = null;
    };
  }, [office, handle, info]);

  useFrame(({ camera, size, clock }, dt) => {
    const d = director.current;
    const focused = d.kind === "focusing" || d.kind === "focused" ? d.target : null;
    motion.update(nodes, { open: focused?.hotspot ?? null, hovered: hover.current?.hotspot ?? null, reduced }, dt, clock.elapsedTime);
    if (motion.drawerOpen !== drawerWasOpen.current) {
      drawerWasOpen.current = motion.drawerOpen;
      onDrawerOpen(motion.drawerOpen);
      if (host.current) host.current.dataset.drawer = motion.drawerOpen ? "open" : "shut";
    }
    const c = crate.current;
    crateMotion.update(crateNodes, { dig: c.dig, playing: c.playing, player, reduced }, dt);
    onStand.current = crateMotion.onStand;
    if (crateMotion.playDone !== sleeveWasOut.current) {
      sleeveWasOut.current = crateMotion.playDone;
      onSleeveOut(crateMotion.playDone);
      if (host.current) host.current.dataset.sleeve = crateMotion.playDone ? "out" : "in";
    }

    const lit = hover.current ?? focused;
    const key = lit ? `${highlightFor(lit)}:${lit.hotspot}` : null;
    if (key !== shown.current) {
      setHighlight(handle, lit ? highlightFor(lit) : null, lit ? theme.accents[lit.hotspot] : theme.line);
      shown.current = key;
    }

    const project = (p: Vector3) => {
      v.copy(p).project(camera);
      return v.z > 1 ? { x: Number.NaN, y: Number.NaN } : { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
    };
    const anchors = info.current?.anchors;
    const { label, markers } = overlay.current;
    const hovered = hover.current;
    if (label && anchors && hovered) {
      const a = anchors[hovered.hotspot];
      if (a) {
        const s = project(a);
        label.style.transform = `translate(${s.x}px, ${s.y}px)`;
      }
    }
    if (anchors) for (const h of HOTSPOTS) {
      const el = markers[h];
      const a = anchors[h];
      if (el && a) {
        const s = project(a);
        el.style.transform = `translate(${s.x}px, ${s.y}px)`;
      }
    }
  });

  const interactive = () => {
    const d = director.current;
    return d.kind === "idle" || d.kind === "focused";
  };
  const onCrate = (e: ThreeEvent<PointerEvent | MouseEvent>) => e.intersections.some((i) => hitFor(i.object, null)?.hotspot === "hs_crate");
  /** Browsing the crate: the front record the pointer asks for (by its depth across the opening), else the current one. */
  const browsedHit = (e: ThreeEvent<PointerEvent | MouseEvent>): Hit | null => {
    const plane = digPlane.current;
    const across = plane && e.intersections.find((i) => i.object.name === DIG_PLANE);
    let dig = crate.current.dig;
    if (plane?.parent && across) {
      const z = plane.parent.worldToLocal(across.point.clone()).z;
      dig = digFromDepth(z, plane.userData.front, plane.userData.back, work.length, dig);
    }
    return across || onCrate(e) ? { hotspot: "hs_crate", item: work[dig]?.slug ?? null } : null;
  };
  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive()) return;
    // A finger dragged over the crate is a swipe (the page flicks one record per swipe), not a pointer to follow.
    if (crate.current.browsing && e.pointerType === "touch") return;
    e.stopPropagation();
    const hit = crate.current.browsing ? browsedHit(e) : pickHit(e.intersections.map((i) => i.object), focusedHotspot(director.current));
    onHover(hit);
    document.body.style.cursor = hit ? "pointer" : "";
  };
  const onPointerOut = () => {
    onHover(null);
    document.body.style.cursor = "";
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive()) return;
    // Browsing the crate, a click anywhere on it plays the front record.
    const hit = crate.current.browsing ? browsedHit(e) : pickHit(e.intersections.map((i) => i.object), focusedHotspot(director.current));
    if (!hit) return;
    e.stopPropagation();
    onActivate(hit);
  };

  return (
    <>
      <primitive object={office.scene} onPointerMove={onPointerMove} onPointerOut={onPointerOut} onClick={onClick} />
      {drawerCard && card && (
        <CardFace surface={card} hotspot="hs_drawer" titleId={drawerCard.titleId}>
          {drawerCard.content}
        </CardFace>
      )}
      {sleeveBack && crateNodes.records[sleeveBack.index] && (
        <CardFace surface={crateNodes.records[sleeveBack.index] as Mesh} place="back" widthPx={SLEEVE_WIDTH_PX} hotspot="hs_crate" titleId={sleeveBack.titleId}>
          {sleeveBack.content}
        </CardFace>
      )}
    </>
  );
}

export default function OfficeCanvas(props: OfficeCanvasProps) {
  const info = useRef<OfficeInfo | null>(null);
  return (
    <Canvas dpr={[1, 2]} camera={{ fov: 50, near: 0.1, far: 10000 }} gl={{ antialias: true }}>
      <color attach="background" args={[theme.background]} />
      <fog attach="fog" args={[theme.background, theme.fogNear, theme.fogFar]} />
      <Suspense fallback={null}>
        <Street {...props} info={info} />
        {/* The office streams in separately so the street can show first. */}
        <Suspense fallback={null}>
          <Office {...props} info={info} />
        </Suspense>
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(manifest.street.url);
