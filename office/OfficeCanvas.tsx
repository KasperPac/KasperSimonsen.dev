"use client";

import { Suspense, useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  CanvasTexture,
  Euler,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
  type Object3D,
  type PerspectiveCamera,
} from "three";
import manifest from "./manifest.json";
import { theme } from "./theme";
import { applyCleanEdges, setHighlight, setLineResolution, setTint, updateEdgeFades, type CleanEdgesHandle } from "./style/cleanEdges";
import { findClipFor, makeClipSampler, progressToTime } from "./walkin/clipSampler";
import { useTurntable } from "./idle/useTurntable";
import { applySkippingGirl, findSkippingGirl } from "./walkin/skippingGirl";
import { findCamera, WALKIN_CAMERA } from "./walkin/cameraPose";
import { onStreet } from "./walkin/autoWalk";
import { applyPose, makePose, readPose, type Pose } from "./camera/pose";
import { basePose, focusPose, MONITOR_MIN_HEIGHT, playerPose } from "./camera/basePose";
import { CameraRig, FOCUS_MOVES, PLAYER_MOVE } from "./camera/rig";
import { cameraKey } from "./camera/key";
import { ALL_HOTSPOTS, FOCUS_CAMERA, HOTSPOTS, highlightFor, highlightKey, hitFor, pickHit, type Hit, type HotspotName } from "./hotspots/registry";
import { addHitProxies, NO_BOUNDS, outlineBox } from "./hotspots/proxies";
import { focusedHotspot, IDLE_AT, LEAVE_AT, type DirectorState } from "./director/director";
import { CARD_NODE, findMotionNodes, ObjectMotion, SCREEN_NODE } from "./objects/motion";
import { CrateMotion, findCrateNodes, type PlayerPoses } from "./objects/crate";
import { findShelfNodes, ShelfMotion } from "./objects/shelf";
import { findNotesNodes, NotesMotion } from "./objects/notes";
import NeonSign from "./neon/NeonSign";
import type { Placement } from "./objects/shelf";
import { screenRect } from "./overlay/screenRect";
import { placeCard } from "./overlay/place";
import { addDigPlane, DIG_PLANE, digFromPointer, recordUnder } from "./crate/scrub";
import { PLATTER_NODE, STAND_NODE } from "./idle/turntable";
import CardFace from "./cards/CardFace";
import { SLEEVE_WIDTH_PX } from "./cards/SleeveBack";
import { SCREEN_WIDTH_PX } from "./cards/ReelScreen";
import { LAPTOP_WIDTH_PX, STRIP_GAP_PX, STRIP_HEIGHT_PX, STRIP_WIDTH_PX } from "./cards/ReelWords";
import { STRIP_PX, TOOLS, WHITEBOARD_WIDTH_PX, type BoardPointer } from "./cards/Whiteboard";
import { screenFaceFor } from "./cards/face";
import { boardPoint, findTools, handPlacement, ToolMotion, type Face, type ToolId, type ToolNodes } from "./whiteboard/marker";
import { boardCanvas, boardSize, boardVersion, sizeBoard } from "./whiteboard/surface";
import { work } from "@/content/work";

/** DOM the canvas positions each frame: the hover label and the touch markers. */
export type OverlayElements = { label: HTMLElement | null; markers: Partial<Record<HotspotName, HTMLElement | null>> };

export type OfficeCanvasProps = {
  /** Walk-in progress 0 → 1. Read every frame; never causes a render. */
  progress: RefObject<number>;
  /** Where the phone's standing view is panned to, -1 → 1 (camera/pan.ts); the camera eases after it. */
  pan: RefObject<number>;
  /** Carries data-scene-ready, data-walkin-progress, data-street, data-camera and data-drawer for the page and for tests. */
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
  /** The shelf, read every frame: the ornament picked (index), or null. */
  shelf: RefObject<{ presented: number | null }>;
  /** The plaque card the canvas keeps beside the picked ornament (CSS docks it on narrow screens). */
  plaque: RefObject<HTMLElement | null>;
  /** What's printed on the monitor's screen while it's open (the reel and its carousel, spec 3.5), or null. Focus moves to its title. */
  monitorScreen: { titleId: string; content: ReactNode } | null;
  /** The reel's words (spec 3.5): on the laptop, or on portrait screens on a strip under the monitor's screen. */
  reelWords: { content: ReactNode; place: "laptop" | "strip" } | null;
  /**
   * The whiteboard: what's printed on it while it's open (or null), and, read every frame, the tool in hand (null when
   * the board isn't open) and where the pointer is on the board.
   */
  whiteboard: { print: { titleId: string; content: ReactNode } | null; state: RefObject<{ held: ToolId | null; pointer: BoardPointer }> };
  /** The height the board's print is laid out at (CSS px, at WHITEBOARD_WIDTH_PX across), once the model has loaded. */
  onBoardHeight: (heightPx: number) => void;
  /** Which ornament is out in front of the camera (its index), or null: each arrival, swap and start back. */
  onPresented: (out: number | null) => void;
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
  /** A played record's sleeve has turned round on the stand (the office writes it each frame for the street's camera). */
  sleeveOut: boolean;
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

/**
 * The whiteboard's tools and their rest poses in the tray, found once per model. drei caches the loaded scene, so if
 * the office remounts (or the frame loop stops) while a tool is out of the tray, finding them again would take where it
 * was left as its new rest and strand it on the board. With the first rest kept, a fresh ToolMotion puts it home.
 */
const toolsByRoot = new WeakMap<Object3D, ToolNodes>();
function toolsOf(root: Object3D): ToolNodes {
  let nodes = toolsByRoot.get(root);
  if (!nodes) toolsByRoot.set(root, (nodes = findTools(root)));
  return nodes;
}

/**
 * Lays the ink quad (1 × 1, facing +z) over the board's drawing area: the canvas's `widthPx × heightPx` from the top
 * left of the print's face, at boardPoint's scale (drei's distanceFactor / 400 metres per CSS px) and in its plane, so
 * a canvas pixel and the held marker's tip agree. The tool strip's part of the face, below it, is left bare.
 */
const inkEuler = new Euler();
function placeInk(mesh: Mesh, face: Face, size: { widthPx: number; heightPx: number }) {
  const k = face.distanceFactor / 400;
  boardPoint(face, WHITEBOARD_WIDTH_PX, { x: size.widthPx / 2, y: size.heightPx / 2 }, mesh.position);
  mesh.quaternion.setFromEuler(inkEuler.set(...face.rotation));
  mesh.scale.set(Math.max(size.widthPx * k, 1e-6), Math.max(size.heightPx * k, 1e-6), 1);
}

type StreetProps = Pick<OfficeCanvasProps, "progress" | "pan" | "host" | "director" | "onProgressCross" | "onSettled"> & { info: RefObject<OfficeInfo | null> };

/** The street, the walk-in and the one place the render camera is driven from. */
function Street({ progress, pan, host, director, onProgressCross, onSettled, info }: StreetProps) {
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
  const band = useRef<number | null>(null);
  const written = useRef({ progress: -1, camera: "" });
  const panNow = useRef(0);

  useFrame((_, dt) => {
    const p = progress.current;
    walkIn.sample(progressToTime(p, walkIn.duration));
    if (skippingGirl) applySkippingGirl(skippingGirl, p, reduced);
    readPose(walkIn.source, poses.walk);
    const office = info.current;
    // The pan follows the finger closely but not rigidly (under reduced motion, exactly).
    panNow.current = reduced ? pan.current : panNow.current + (pan.current - panNow.current) * (1 - Math.exp(-dt * 14));
    basePose(poses.walk, office?.standPortrait ?? null, p, camera.aspect, poses.base, panNow.current);

    const d = director.current;
    const hotspot = focusedHotspot(d);
    // A record from the crate is played on the record player: the crate's other view.
    const playing = (d.kind === "focusing" || d.kind === "focused") && d.target.hotspot === "hs_crate" && d.target.item !== null;
    const cams = playing ? (office?.player ?? office?.focus.hs_crate) : hotspot ? office?.focus[hotspot] : undefined;
    const sleeveOut = playing && !!office?.sleeveOut;
    if (cams && playing) playerPose(cams.land, cams.portrait, camera.aspect, sleeveOut, poses.focus);
    // The monitor's close-up keeps its strip on screen on squarer portrait screens too (a tablet); the others keep their width.
    else if (cams) focusPose(cams.land, cams.portrait, camera.aspect, poses.focus, hotspot === "hs_monitor" ? MONITOR_MIN_HEIGHT : 0);

    // A new state or a new object starts a camera move from wherever the camera is; on a phone, so does the played
    // sleeve turning round (it comes in close to read it).
    const key = cameraKey(d.kind, hotspot, playing, !!cams, sleeveOut && camera.aspect < 1);
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

    // Report each crossing of either threshold: arriving at IDLE_AT, leaving below LEAVE_AT (the director holds between).
    const now = p >= IDLE_AT ? 2 : p >= LEAVE_AT ? 1 : 0;
    if (now !== band.current) {
      band.current = now;
      onProgressCross(p);
    }
    const el = host.current;
    if (!el) return;
    if (Math.abs(p - written.current.progress) > 0.00005) {
      el.dataset.walkinProgress = p.toFixed(4);
      el.dataset.street = String(onStreet(p));
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
  "host" | "director" | "hover" | "overlay" | "drawerCard" | "crate" | "sleeveBack" | "shelf" | "plaque" | "monitorScreen" | "reelWords"
  | "whiteboard" | "onHover" | "onActivate" | "onDrawerOpen" | "onSleeveOut" | "onPresented" | "onBoardHeight"
> & {
  info: RefObject<OfficeInfo | null>;
};

/** The office model: hover, click, highlight, object motion, where the label and markers go, and the business card's print. */
function Office({
  host, director, hover, overlay, drawerCard, crate, sleeveBack, shelf, plaque, monitorScreen, reelWords, whiteboard,
  onHover, onActivate, onDrawerOpen, onSleeveOut, onPresented, onBoardHeight, info,
}: OfficeProps) {
  const { gltf: office, handle } = useCleanEdges(manifest.office.url, highlightKey);
  const albumAway = useRef(false); // a project's record plays, or its sleeve is on the stand: the album is put away
  useTurntable(office.scene, albumAway);
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
  const shelfNodes = useMemo(() => findShelfNodes(nodes.ornaments), [nodes]);
  const shelfMotion = useMemo(() => new ShelfMotion(), []);
  const shelfCam = useMemo(makePose, []);
  const shelfOut = useRef<number | null>(null);
  // The CSS that docks the plaque on narrow screens (office.css), asked without a per-frame getComputedStyle.
  const docked = useMemo(() => (typeof window === "undefined" ? null : window.matchMedia("(max-width: 700px), (orientation: portrait)")), []);
  const screen = useMemo(() => (office.scene.getObjectByName(SCREEN_NODE) as Mesh | undefined) ?? null, [office]);
  const notesRoot = useMemo(() => office.scene.getObjectByName("hs_monitor__notes") ?? null, [office]);
  const notesNodes = useMemo(() => (notesRoot ? findNotesNodes(notesRoot) : { notes: [], stuck: [], rest: [] }), [notesRoot]);
  const notesMotion = useMemo(() => new NotesMotion(), []);
  const notesWere = useRef<"up" | "moving" | "down">("up");
  const laptop = useMemo(() => (office.scene.getObjectByName("prop_laptop__screen") as Mesh | undefined) ?? null, [office]);
  const v = useMemo(() => new Vector3(), []);
  // The whiteboard (whiteboard spec 3.2): the surface its print and the held tool's tip go on, and the tray's tools.
  const surface = useMemo(() => (office.scene.getObjectByName("hs_whiteboard__surface") as Mesh | undefined) ?? null, [office]);
  const boardFace = useMemo(() => {
    if (!surface) return null;
    const at = surface.geometry.getAttribute("position");
    return screenFaceFor(Array.from({ length: at.count }, (_, i) => new Vector3().fromBufferAttribute(at, i)), WHITEBOARD_WIDTH_PX);
  }, [surface]);
  useEffect(() => {
    if (boardFace) onBoardHeight(boardFace.heightPx);
  }, [boardFace, onBoardHeight]);
  const toolNodes = useMemo(() => {
    const root = office.scene.getObjectByName("hs_whiteboard");
    return root ? toolsOf(root) : { tools: new Map(), rest: new Map() };
  }, [office]);
  const toolMotion = useMemo(() => new ToolMotion(), []);
  const wb = useMemo(
    () => ({
      boardLocal: new Vector3(),
      // until the pointer has been on the board, the held tool waits at its middle
      lastBoardLocal: new Vector3().fromArray(boardFace?.position ?? [0, 0, 0]),
      handPose: { position: new Vector3(), quaternion: new Quaternion() } as Placement,
      wasOpen: false,
    }),
    [boardFace],
  );
  // The drawing, on the 3D board for the whole visit (whiteboard spec 3.3): the board's canvas as a texture on a quad
  // over the surface's drawing area, so it's seen from across the room and the held marker is drawn in front of it.
  const ink = useMemo(() => {
    const canvas = boardCanvas();
    if (!surface || !boardFace || !canvas) return null;
    // before the print has measured its strip, the drawing area is the face less the desktop strip
    if (!boardSize().widthPx) sizeBoard(WHITEBOARD_WIDTH_PX, boardFace.heightPx - STRIP_PX);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4; // read at a slant from the standing spot
    const material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false, // the ink's colours are the office's line colours, as printed
      polygonOffset: true, // in front of the board's own fill, which is pushed back
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const mesh = new Mesh(new PlaneGeometry(1, 1), material); // its UVs run u left → right, v bottom → top
    mesh.name = "hs_whiteboard__ink";
    mesh.userData.cleanEdges = true; // never outlined
    mesh.raycast = () => {}; // the board's own parts take the pointer
    mesh.userData[NO_BOUNDS] = true; // nor does it grow the board's hit proxy or move its label
    // over the drawing area before it's ever in the scene (the frame loop moves it if the canvas is resized)
    const size = boardSize();
    placeInk(mesh, boardFace, size);
    return { mesh, texture, material, size, version: -1 };
  }, [surface, boardFace]);
  useEffect(() => {
    if (!ink || !surface) return;
    surface.add(ink.mesh);
    return () => {
      ink.mesh.removeFromParent();
      ink.mesh.geometry.dispose();
      ink.material.dispose();
      ink.texture.dispose();
    };
  }, [ink, surface]);

  // Each object's whole outline takes the pointer while nothing is focused (thin shelf, gaps between ornaments).
  useEffect(() => {
    const proxies = addHitProxies(office.scene, () => focusedHotspot(director.current) === null);
    return () => proxies.forEach((p) => p.removeFromParent());
  }, [office, director]);

  // Browsing the crate, the record under the pointer comes to the front (Kasper: flick on mouseover).
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
    for (const h of ALL_HOTSPOTS) {
      const land = pose(FOCUS_CAMERA[h]);
      if (land) focus[h] = { land, portrait: pose(`${FOCUS_CAMERA[h]}_portrait`) };
      const node = office.scene.getObjectByName(h);
      if (node) {
        const box = outlineBox(node); // the board's ink is no part of its outline
        anchors[h] = new Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
      }
    }
    const playerLand = pose("cam_focus_player");
    const player = playerLand ? { land: playerLand, portrait: pose("cam_focus_player_portrait") } : null;
    info.current = { edges: handle, focus, player, standPortrait: pose("cam_stand_portrait"), anchors, sleeveOut: false };
    return () => {
      info.current = null;
    };
  }, [office, handle, info]);

  // The tray's markers keep their colours in their outlines (whiteboard spec 4). The white one stays the base colour.
  useEffect(() => {
    for (let i = 1; i < TOOLS.length; i++) setTint(handle, `hs_whiteboard__marker_0${i}`, TOOLS[i].color);
  }, [handle]);

  useFrame(({ camera, size, clock }, dt) => {
    // This frame's camera is placed already (the walk-in has just done it); its matrices only follow at the render, so
    // bring them up to date before anything below projects through it (the plaque, the label, the dots).
    camera.updateMatrixWorld();
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
    albumAway.current = crateMotion.onStand || c.playing !== null;
    if (info.current) info.current.sleeveOut = crateMotion.playDone;
    if (crateMotion.playDone !== sleeveWasOut.current) {
      sleeveWasOut.current = crateMotion.playDone;
      onSleeveOut(crateMotion.playDone);
      if (host.current) host.current.dataset.sleeve = crateMotion.playDone ? "out" : "in";
    }
    // A picked ornament floats to where the shelf's camera ends up, so it arrives with the camera (or before it).
    const aspect = (camera as PerspectiveCamera).aspect;
    const cams = info.current?.focus.hs_shelf;
    shelfMotion.update(
      shelfNodes,
      { presented: shelf.current.presented, camera: cams ? focusPose(cams.land, cams.portrait, aspect, shelfCam) : null, aspect, reduced },
      dt,
    );
    // The index, not just "one is out": a swap in a single frame (reduced motion, or a long stall) is still reported.
    const outNow = shelfMotion.presented ? shelf.current.presented : null;
    if (outNow !== shelfOut.current) {
      shelfOut.current = outNow;
      onPresented(outNow);
      if (host.current) host.current.dataset.shelf = outNow === null ? "in" : "out";
    }
    // Its plaque goes beside it (desktop); on narrow screens CSS docks it, so this is skipped.
    const plaqueEl = plaque.current;
    const picked = shelf.current.presented;
    if (plaqueEl && picked !== null && shelfNodes.ornaments[picked] && !docked?.matches) {
      const r = screenRect(shelfNodes.ornaments[picked], camera, size);
      if (r) {
        const at = placeCard({ x: r.right, y: (r.top + r.bottom) / 2 }, { width: plaqueEl.offsetWidth, height: plaqueEl.offsetHeight }, size);
        plaqueEl.style.left = `${at.left}px`;
        plaqueEl.style.top = `${at.top}px`;
      }
    }
    // The notes come off the monitor as its camera move starts and go back on as the camera leaves (spec 3.5).
    notesMotion.update(notesNodes, { open: focused?.hotspot === "hs_monitor", reduced }, dt);
    // Every frame's state, "moving" included, so a test can tell a fall from none (reduced motion never draws one mid-fall).
    if (notesMotion.state !== notesWere.current) {
      notesWere.current = notesMotion.state;
      if (host.current) host.current.dataset.notes = notesMotion.state;
    }
    // The whiteboard's held tool follows the pointer on the board; leaving puts it back in the tray (whiteboard spec 3).
    // Between touches it stays where the pointer last was, lifted, never sent home.
    const board = whiteboard.state.current;
    let hand: Placement | null = null;
    if (board.held !== null && surface && boardFace) {
      if (board.pointer.pt) {
        boardPoint(boardFace, WHITEBOARD_WIDTH_PX, board.pointer.pt, wb.boardLocal);
        wb.lastBoardLocal.copy(wb.boardLocal);
      }
      hand = handPlacement(surface, wb.lastBoardLocal, board.held === "eraser" ? "eraser" : "marker", board.pointer.pressing, wb.handPose);
    }
    toolMotion.update(toolNodes, { held: board.held, hand, reduced, pressing: board.pointer.pressing }, dt);
    // The board's canvas changed: lay its quad over the drawing area again if it was resized, and upload it again.
    if (ink && boardFace) {
      const now = boardSize();
      if (now !== ink.size) {
        ink.size = now;
        placeInk(ink.mesh, boardFace, now);
        ink.texture.dispose(); // a new size needs new texture storage
      }
      const version = boardVersion();
      if (version !== ink.version) {
        ink.version = version;
        ink.texture.needsUpdate = true;
      }
    }
    const open = focused?.hotspot === "hs_whiteboard";
    if (open !== wb.wasOpen) {
      wb.wasOpen = open;
      if (host.current) host.current.dataset.whiteboard = open ? "open" : "shut";
    }

    const lit = hover.current ?? focused;
    const key = lit ? `${highlightFor(lit)}:${lit.hotspot}` : null;
    if (key !== shown.current) {
      setHighlight(handle, lit ? highlightFor(lit) : null, lit ? theme.accents[lit.hotspot] : theme.line);
      shown.current = key;
    }

    // Project with this frame's camera: the walk-in has just placed it, and its matrices only follow at the render.
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
        // `translate`, not `transform`: the pulse's `scale` then breathes the dot about itself. Under `transform` it
        // scaled the whole offset from the screen's corner, swinging every dot to and fro (Kasper).
        el.style.translate = `${s.x}px ${s.y}px`;
      }
    }
  });

  const interactive = () => {
    const d = director.current;
    return d.kind === "idle" || d.kind === "focused";
  };
  const onCrate = (e: ThreeEvent<PointerEvent | MouseEvent>) => e.intersections.some((i) => hitFor(i.object, null)?.hotspot === "hs_crate");
  /** Browsing the crate: the front record the pointer asks for (the record under it), else the current one. Only for hover; a click plays the front record (see onClick). */
  const browsedHit = (e: ThreeEvent<PointerEvent | MouseEvent>): Hit | null => {
    const plane = digPlane.current;
    const across = plane && e.intersections.find((i) => i.object.name === DIG_PLANE);
    // On a record, that one: the next one's top over the front one's as it goes back, a flicked one as it comes
    // forward, and the front one anywhere on its cover, so moving down to click it keeps it (Kasper: "it selects
    // Manuva"). Off them, how deep it crosses the opening (the first project at its front, the last at its back).
    // The records, not shares of the crate's depth, so every one comes up in turn however many projects there are.
    const z = plane?.parent && across ? plane.parent.worldToLocal(across.point.clone()).z : null;
    const on = recordUnder(e.intersections, crateNodes.records);
    const dig = digFromPointer(on, z, plane?.userData.tops ?? [], work.length, crate.current.dig);
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
    // Browsing the crate, a click, tap or second click anywhere on it plays the front record (spec 3.2.3), the one shown,
    // never whichever record happens to be under the pointer at that moment (a leaning one, or one peeking over the front).
    const hit = crate.current.browsing
      ? browsedHit(e) && { hotspot: "hs_crate" as const, item: work[crate.current.dig]?.slug ?? null }
      : pickHit(e.intersections.map((i) => i.object), focusedHotspot(director.current));
    if (!hit) return;
    e.stopPropagation();
    onActivate(hit);
  };

  return (
    <>
      <primitive object={office.scene} onPointerMove={onPointerMove} onPointerOut={onPointerOut} onClick={onClick} />
      <NeonSign scene={office.scene} director={director} host={host} reduced={reduced} />
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
      {monitorScreen && screen && (
        <CardFace surface={screen} place="screen" widthPx={SCREEN_WIDTH_PX} hotspot="hs_monitor" titleId={monitorScreen.titleId}>
          {monitorScreen.content}
        </CardFace>
      )}
      {/* titleId is only a placeholder: focus is off, and the reel's heading (and its region's name) is on the monitor, with the carousel */}
      {reelWords?.place === "laptop" && laptop && (
        <CardFace surface={laptop} place="screen" widthPx={LAPTOP_WIDTH_PX} hotspot="hs_monitor" titleId="reel-words" focus={false}>
          {reelWords.content}
        </CardFace>
      )}
      {reelWords?.place === "strip" && screen && (
        <CardFace surface={screen} place="screen" widthPx={STRIP_WIDTH_PX} below={{ heightPx: STRIP_HEIGHT_PX, gapPx: STRIP_GAP_PX }} hotspot="hs_monitor" titleId="reel-words" focus={false}>
          {reelWords.content}
        </CardFace>
      )}
      {whiteboard.print && surface && (
        <CardFace surface={surface} place="screen" widthPx={WHITEBOARD_WIDTH_PX} hotspot="hs_whiteboard" titleId={whiteboard.print.titleId}>
          {whiteboard.print.content}
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
