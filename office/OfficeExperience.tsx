"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import OfficeErrorBoundary from "./OfficeErrorBoundary";
import { theme } from "./theme";
import { COPY } from "./copy";
import { useWalkInProgress } from "./walkin/useWalkInProgress";
import { startAutoWalk } from "./walkin/autoWalk";
import { dragPan, inView, isPanGesture, panFor } from "./camera/pan";
import { describeDirector, focusedHotspot, initialDirector, isLocked, reduceDirector, type DirectorState } from "./director/director";
import { pathForTarget } from "./scene/targets";
import { layerOf, sceneFor } from "./scene/location";
import { clearLayer, pushLayer, replaceLayer, useOfficeLocation } from "./history";
import { HOTSPOTS, labelFor, sameHit, type Hit, type SignpostName } from "./hotspots/registry";
import type { OverlayElements } from "./OfficeCanvas";
import BusinessCard from "./cards/BusinessCard";
import SleeveBack from "./cards/SleeveBack";
import Plaque from "./cards/Plaque";
import ReelScreen from "./cards/ReelScreen";
import ReelWords from "./cards/ReelWords";
import ReelViewer from "./cards/ReelViewer";
import Whiteboard, { type BoardPointer } from "./cards/Whiteboard";
import { endStroke } from "./whiteboard/board";
import type { ToolId } from "./whiteboard/marker";
import { useReel } from "./monitor/useReel";
import { wrap } from "./monitor/reel";
import { usePortrait } from "./usePortrait";
import { useCoarsePointer } from "./useCoarsePointer";
import { clampDig } from "./objects/crate";
import { canPull, digFor, swipeStep } from "./crate/dig";
import { tourAt } from "./hints/tour";
import { GLINT_SECONDS, glintGap, nextGlint } from "./hints/glint";
import { findWork, work } from "@/content/work";
import { slides } from "@/content/screens";
import { findService, services } from "@/content/services";
import type { Topic } from "@/content/contact";
import Panel from "@/panels/Panel";
import ContactForm from "@/panels/ContactForm";
import CaseStudy from "@/panels/CaseStudy";
import ServiceArticle from "@/panels/ServiceArticle";

// three.js never runs on the server and never ships to pages that don't render the office.
const OfficeCanvas = dynamic(() => import("./OfficeCanvas"), { ssr: false });

const toEnd = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const back = () => window.history.back();
const portrait = () => window.innerWidth < window.innerHeight;

/** Fixed full-screen office over a scroll track exactly as long as the walk-in. The location drives everything. */
export default function OfficeExperience() {
  const { pathname, layer } = useOfficeLocation();
  const scene = sceneFor(pathname, layer);
  const host = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const progress = useWalkInProgress(track);
  const [state, dispatch] = useReducer(reduceDirector, undefined, initialDirector);
  const director = useRef<DirectorState>(state);
  director.current = state;
  const hover = useRef<Hit | null>(null);
  const [hovered, setHovered] = useState<Hit | null>(null);
  const overlay = useRef<OverlayElements>({ label: null, markers: {} });
  const navRef = useRef<HTMLElement | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dig, setDig] = useState(0);
  const browsingRef = useRef(false);
  // Arrival hints (spec 3.1): a tour of the four objects, then each object's dot, in its colour, with now and then one
  // object lit up (a glint). Once the visitor has opened something the glints and the line of text stop; the dots stay.
  const [hints, setHints] = useState<"" | "tour" | "dots" | "used">("");
  const used = useRef(false);
  const toured = useRef(false);

  // A reload keeps history.state; a fresh office starts with no layer.
  useEffect(clearLayer, []);

  // "Come in" walks the visitor in by scrolling for them, so the walk-in plays as it would scrolled (spec 3.3).
  const [walking, setWalking] = useState(false);
  const stopWalk = useRef<(() => void) | null>(null);
  useEffect(() => () => stopWalk.current?.(), []);
  const comeIn = () => {
    if (reducedMotion()) return toEnd();
    stopWalk.current?.();
    setWalking(true);
    stopWalk.current = startAutoWalk(theme.walkInAutoSeconds, () => {
      stopWalk.current = null;
      setWalking(false);
    });
  };

  // The location asks for a target; the director moves the camera there (or home).
  const targetKey = scene.target ? `${scene.target.hotspot}:${scene.target.item ?? ""}` : "";
  useEffect(() => {
    if (scene.target) {
      if (director.current.kind === "walkIn") toEnd();
      dispatch({ type: "focus", target: scene.target });
    } else dispatch({ type: "release" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  // What shows as hovered: the highlight, label and tease. The tour shows through it too.
  const show = useCallback((hit: Hit | null) => {
    if (sameHit(hover.current, hit)) return;
    hover.current = hit;
    setHovered(hit);
    if (host.current) host.current.dataset.hover = hit ? hit.hotspot : "";
  }, []);
  // The tour and the glints give way to the visitor's own pointer at once, and come back to what it's on.
  const interacted = useRef(false);
  const visitorHover = useRef<Hit | null>(null);
  const markUsed = useCallback(() => {
    if (used.current) return;
    used.current = true;
    setHints("used");
  }, []);
  // The visitor's own hover or keyboard focus: ends the hints, and in the crate brings the hovered record to the front.
  const onHover = useCallback(
    (hit: Hit | null) => {
      visitorHover.current = hit;
      if (hit) interacted.current = true;
      if (hit?.hotspot === "hs_crate" && hit.item && browsingRef.current) {
        const i = work.findIndex((w) => w.slug === hit.item);
        if (i >= 0) setDig(i);
      }
      show(hit);
    },
    [markUsed, show],
  );

  // One history entry per new layer: what the live entry already shows is never pushed again (double clicks, repeat Enter).
  const live = () => {
    const l = layerOf(window.history.state);
    return { layer: l, scene: sceneFor(window.location.pathname, l) };
  };
  const activate = useCallback((hit: Hit) => {
    if (panning.current) return; // the end of a pan, not a tap
    const now = live().scene.target;
    if (now && sameHit(now, hit)) return;
    if (now?.hotspot === "hs_crate" && now.item && hit.hotspot === "hs_crate") return; // one record out at a time
    // Keyboard users opened it from the nav: focus moves into what opened, and comes back here when it closes.
    markUsed();
    // Another ornament while one is out: swap them in the same history entry, so one Back still returns to the shelf.
    if (now?.hotspot === "hs_shelf" && now.item && hit.hotspot === "hs_shelf" && hit.item) {
      replaceLayer({ focus: "hs_shelf", reading: false, topic: null }, pathForTarget(hit)!);
      return;
    }
    const active = document.activeElement as HTMLElement | null;
    if (active && navRef.current?.contains(active)) trigger.current = active;
    pushLayer({ focus: hit.hotspot, reading: false, topic: null }, pathForTarget(hit) ?? "/");
  }, [markUsed]);
  const read = useCallback(() => {
    const { layer: l, scene: s } = live();
    if (!l.reading && s.target) pushLayer({ focus: s.target.hotspot, reading: true, topic: null });
  }, []);
  // An engagement model's button in a service's Read more: the contact form over it, its topic pre-filled (spec 3.4).
  const write = useCallback((topic: Topic) => {
    const { layer: l, scene: s } = live();
    if (s.target && l.reading && l.topic !== topic) pushLayer({ focus: s.target.hotspot, reading: true, topic });
  }, []);

  // Esc backs out one layer. With focus inside the panel, its own handler takes Esc and stops it reaching here.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const d = director.current;
      if (live().scene.reading || d.kind === "focusing" || d.kind === "focused") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Scrolling would replay the walk-in under an open object.
  useEffect(() => {
    document.documentElement.classList.toggle("office-locked", isLocked(state));
    return () => document.documentElement.classList.remove("office-locked");
  }, [state]);

  const focusedOn = state.kind === "focused" ? state.target.hotspot : null;
  // The monitor's reel of past work (spec 3.5): runs while the monitor is open, and keeps its place between visits.
  // Asked once, on the client: this page is also rendered on the server, where there is no matchMedia.
  const reduced = useMemo(() => typeof window !== "undefined" && reducedMotion(), []);
  // The reel's full-screen view (spec 3.5 3a) is the monitor's reading layer, as Read more is the others': Esc or Back
  // closes it to the monitor. The reel holds still while it's open.
  const viewing = scene.reading && scene.target?.hotspot === "hs_monitor";
  const reel = useReel(focusedOn === "hs_monitor", slides.length, reduced, viewing);
  const portraitScreen = usePortrait();
  // Dots are tappable only where the screen is big and the pointer is fine: phones, either way up, get the marker.
  const coarsePointer = useCoarsePointer();
  // Opening the full-screen view settles the reel first, on the slide the visitor sees (the sliding one once it covers more than half
  // the monitor): `tickReel` would otherwise finish a slide in progress before honouring the hold, and the view would switch as it lands.
  const reelSettle = reel.settle;
  const openViewer = useCallback(() => {
    reelSettle();
    read();
  }, [reelSettle, read]);
  const reelPlace = portraitScreen ? "strip" : "laptop";
  const play = useCallback((slug: string) => activate({ hotspot: "hs_crate", item: slug }), [activate]);
  // The reel's action plays the slide its words name: a crate record plays as picking it in the crate does, a page opens in a new tab.
  const reelCurrent = reel.current;
  const playReel = useCallback(() => {
    const slide = slides[reelCurrent()];
    if (slide.slug) play(slide.slug);
    else if (slide.href) window.open(slide.href, "_blank", "noopener,noreferrer");
  }, [play, reelCurrent]);
  const showCard = focusedOn === "hs_drawer" && drawerOpen;

  // The whiteboard (whiteboard spec 3.2): the tool in hand, and where the pointer is on the board, read by the canvas each
  // frame to move the held marker. The white marker comes off the tray once the camera is at the board.
  const [tool, setTool] = useState<ToolId>(0);
  const whiteboard = useRef<{ held: ToolId | null; pointer: BoardPointer }>({ held: null, pointer: { pt: null, pressing: false } });
  whiteboard.current.held = focusedOn === "hs_whiteboard" ? tool : null;
  // The print reads and writes the shared pointer through this, so the canvas sees every move without a render.
  const boardPointer = useMemo(
    () => ({
      get current() {
        return whiteboard.current.pointer;
      },
      set current(p: BoardPointer) {
        whiteboard.current.pointer = p;
      },
    }),
    [],
  );
  // Leaving mid-stroke (Esc or Back with the pointer down) closes the stroke and lets go of the board. The next visit
  // to the board picks up the white marker again (whiteboard spec 3.2).
  useEffect(() => {
    if (focusedOn === "hs_whiteboard") return;
    whiteboard.current.pointer = { pt: null, pressing: false };
    endStroke();
    setTool(0);
  }, [focusedOn]);
  // The print's height follows the board's surface, measured by the canvas once the model has loaded.
  const [boardHeightPx, setBoardHeightPx] = useState(590);

  // The crate (spec 3.2): flick through the records, pull the front one out, read it on its back and in the panel.
  const pulledSlug = scene.target?.hotspot === "hs_crate" ? scene.target.item : null;
  const pulledIndex = pulledSlug ? work.findIndex((w) => w.slug === pulledSlug) : -1;
  const [sleeveOut, setSleeveOut] = useState(false);
  const browsing = focusedOn === "hs_crate" && !pulledSlug && !scene.reading;
  browsingRef.current = browsing;
  const crate = useRef({ dig: 0, playing: null as number | null, browsing: false });
  crate.current = { dig: digFor(dig, pulledSlug), playing: pulledIndex < 0 ? null : pulledIndex, browsing };
  const crateRef = useRef<HTMLDivElement | null>(null);

  // The shelf (spec 3.4): browse it, pick an ornament (it floats to the camera, its plaque beside it), read it in the panel.
  const shelfSlug = scene.target?.hotspot === "hs_shelf" ? scene.target.item : null;
  const shelfIndex = shelfSlug ? services.findIndex((s) => s.slug === shelfSlug) : -1;
  const shelf = useRef({ presented: null as number | null });
  shelf.current = { presented: shelfIndex < 0 ? null : shelfIndex };
  // Which ornament is out in front of the camera, so a swap drops the old plaque at once (focus stays on the link picked).
  const [outIndex, setOutIndex] = useState<number | null>(null);
  const plaqueRef = useRef<HTMLElement | null>(null);
  const shelfOpen = focusedOn === "hs_shelf" && !scene.reading;
  const shelfBrowsing = shelfOpen && !shelfSlug;
  const shelfLinks = useRef<Partial<Record<string, HTMLAnchorElement | null>>>({});
  const lastShelf = useRef<string | null>(null);
  useEffect(() => {
    if (shelfSlug) lastShelf.current = shelfSlug;
  }, [shelfSlug]);
  // Browsing the shelf, an ornament's link has focus: the one that was just out, else the first.
  useEffect(() => {
    if (!shelfBrowsing) return;
    (shelfLinks.current[lastShelf.current ?? ""] ?? shelfLinks.current[services[0].slug])?.focus({ preventScroll: true });
  }, [shelfBrowsing]);
  useEffect(() => {
    if (state.kind === "idle") lastShelf.current = null;
  }, [state.kind]);

  // A pulled record (a click, Enter or Forward) is at the front; the dig starts again at the front of a fresh visit.
  useEffect(() => {
    if (pulledSlug) setDig((d) => digFor(d, pulledSlug));
  }, [pulledSlug]);
  useEffect(() => {
    if (state.kind === "idle") setDig(0);
  }, [state.kind]);

  const flick = useCallback((step: number) => setDig((d) => clampDig(d + step, work.length)), []);
  const pull = useCallback(() => {
    if (!canPull(focusedHotspot(director.current), live().scene.target?.item ?? null)) return;
    activate({ hotspot: "hs_crate", item: work[crate.current.dig].slug });
  }, [activate]);

  // On a phone, standing in the office, a sideways drag pans the view along the room (Kasper: a tall screen has a lot of
  // empty space). Up and down stays the walk-in's scroll. A drag never also opens what it ended on.
  const pan = useRef(0);
  const panning = useRef(false);
  useEffect(() => {
    if (state.kind !== "idle") return;
    let start: { x: number; y: number; pan: number } | null = null;
    const onDown = (e: PointerEvent) => {
      panning.current = false;
      start = window.innerWidth < window.innerHeight ? { x: e.clientX, y: e.clientY, pan: pan.current } : null;
    };
    const onMove = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      if (!panning.current && isPanGesture(dx, e.clientY - start.y)) panning.current = interacted.current = true;
      if (panning.current) pan.current = dragPan(start.pan, dx, window.innerWidth);
    };
    let clear = 0;
    const onUp = () => {
      start = null;
      // the click that follows this pointerup still sees `panning`, then it's over
      window.clearTimeout(clear);
      clear = window.setTimeout(() => (panning.current = false), 60);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.clearTimeout(clear);
    };
  }, [state.kind]);

  // Swipes flick while browsing the crate on a touch screen (hovering does it with a pointer).
  useEffect(() => {
    if (!browsing) return;
    let startY: number | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") startY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (startY === null) return;
      const step = swipeStep(e.clientY - startY);
      startY = null;
      if (step) flick(step);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [browsing, flick]);

  // Keyboard flicks show the front record's label, as hovering it would.
  useEffect(() => {
    if (browsing && document.activeElement === crateRef.current) show({ hotspot: "hs_crate", item: work[digFor(dig, null)].slug });
  }, [browsing, dig, show]);

  const onCrateKey = (e: ReactKeyboardEvent) => {
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (step) {
      e.preventDefault();
      flick(step);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pull();
    }
  };

  // Focus follows what's open (spec 7.3): every object takes it into itself (the drawer's card and the monitor's screen
  // through CardFace, the crate's control, the shelf's links or plaque), and it goes home again at idle.
  // Browsing the crate, its control has focus (the arrow keys flick, Enter pulls), again when a record goes back.
  useEffect(() => {
    if (browsing) crateRef.current?.focus({ preventScroll: true });
  }, [browsing]);
  useEffect(() => {
    if (state.kind === "idle" && trigger.current) {
      trigger.current.focus({ preventScroll: true });
      trigger.current = null;
    }
  }, [state.kind]);

  useEffect(() => {
    if (state.kind !== "idle" || toured.current || used.current) return;
    toured.current = true;
    setHints("tour");
    const start = performance.now();
    let frame = 0;
    let done = false;
    const step = () => {
      if (used.current) return;
      const at = interacted.current ? null : tourAt((performance.now() - start) / 1000);
      if (!interacted.current) {
        show(at ? { hotspot: at, item: null } : null);
        if (portrait()) pan.current = at ? panFor(at) : 0; // on a phone the tour pans to each object, and back to the desk
      }
      if (at) frame = requestAnimationFrame(step);
      else {
        done = true;
        setHints("dots");
      }
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      if (!done && !used.current) {
        if (!interacted.current) show(null);
        setHints("dots");
      }
    };
  }, [state.kind, show]);

  // Glints (Kasper picked them over labels): after the tour, until something's been opened, an object lights up in its
  // colour now and then, one at a time, never while the visitor is on something themselves.
  useEffect(() => {
    if (state.kind !== "idle" || hints !== "dots") return;
    let timer = 0;
    let last: SignpostName | null = null;
    let lit = false;
    const wait = () => (timer = window.setTimeout(glint, glintGap(Math.random()) * 1000));
    const glint = () => {
      if (visitorHover.current) return wait();
      // on a phone, only what's on screen at the current pan
      const among = portrait() ? HOTSPOTS.filter((h) => inView(h, pan.current)) : HOTSPOTS;
      if (!among.length) return wait();
      last = nextGlint(last, Math.random(), among);
      lit = true;
      show({ hotspot: last, item: null });
      timer = window.setTimeout(() => {
        lit = false;
        show(visitorHover.current);
        wait();
      }, GLINT_SECONDS * 1000);
    };
    wait();
    return () => {
      window.clearTimeout(timer);
      if (lit) show(visitorHover.current);
    };
  }, [state.kind, hints, show]);

  const navProps = (hit: Hit) => ({ onFocus: () => onHover(hit), onBlur: () => onHover(null) });

  return (
    <div ref={host} className="office" data-walkin-progress="0" data-director={describeDirector(state)} data-drawer="shut" data-sleeve="in" data-dig={crate.current.dig} data-playing={pulledSlug ?? ""} data-presented={shelfSlug ?? ""} data-shelf="in" data-notes="up" data-neon="off" data-whiteboard="shut" data-hints={hints} data-walking={walking}>
      {/* First in the page, so the keyboard reaches it first (spec 7.3). Shows only on the street. */}
      <div className="office-arrive">
        <button type="button" className="office-come-in" onClick={comeIn}>
          {COPY.arrive.comeIn}
        </button>
        <p className="office-scroll" aria-hidden="true">
          {COPY.arrive.scroll}
        </p>
      </div>

      <div className="office-stage">
        <OfficeErrorBoundary host={host}>
          <OfficeCanvas
            progress={progress}
            pan={pan}
            host={host}
            director={director}
            hover={hover}
            overlay={overlay}
            drawerCard={showCard ? { titleId: "card-title", content: <BusinessCard titleId="card-title" onWrite={read} /> } : null}
            crate={crate}
            sleeveBack={
              pulledSlug && sleeveOut && pulledIndex >= 0
                ? { index: pulledIndex, titleId: "sleeve-title", content: <SleeveBack item={work[pulledIndex]} titleId="sleeve-title" onReadMore={read} /> }
                : null
            }
            onSleeveOut={setSleeveOut}
            shelf={shelf}
            plaque={plaqueRef}
            monitorScreen={
              focusedOn === "hs_monitor"
                ? {
                    titleId: "reel-title",
                    content: (
                      <ReelScreen
                        titleId="reel-title"
                        view={reel.view}
                        hold={reel.hold}
                        onStep={reel.step}
                        onShow={reel.show}
                        onOpen={openViewer}
                        dots={portraitScreen || coarsePointer ? "marker" : "buttons"}
                      />
                    ),
                  }
                : null
            }
            reelWords={
              focusedOn === "hs_monitor" ? { place: reelPlace, content: <ReelWords view={reel.view} hold={reel.hold} onPlay={playReel} place={reelPlace} /> } : null
            }
            whiteboard={{
              print:
                focusedOn === "hs_whiteboard"
                  ? { titleId: "wb-title", content: <Whiteboard titleId="wb-title" heightPx={boardHeightPx} tool={tool} onTool={setTool} pointer={boardPointer} /> }
                  : null,
              state: whiteboard,
            }}
            onBoardHeight={setBoardHeightPx}
            onPresented={setOutIndex}
            onProgressCross={(value) => dispatch({ type: "progress", value })}
            onSettled={() => dispatch({ type: "settled" })}
            onHover={onHover}
            onActivate={activate}
            onDrawerOpen={setDrawerOpen}
          />
        </OfficeErrorBoundary>
      </div>

      <nav ref={navRef} className="office-nav" aria-label={COPY.nav}>
        <ul>
          <li>
            <button type="button" onClick={() => activate({ hotspot: "hs_crate", item: null })} {...navProps({ hotspot: "hs_crate", item: null })}>
              {COPY.labels.hs_crate}
            </button>
          </li>
          <li>
            <a
              href="/contact"
              onClick={(e) => {
                e.preventDefault();
                activate({ hotspot: "hs_drawer", item: null });
              }}
              {...navProps({ hotspot: "hs_drawer", item: null })}
            >
              {COPY.labels.hs_drawer}
            </a>
          </li>
          <li>
            <button type="button" onClick={() => activate({ hotspot: "hs_shelf", item: null })} {...navProps({ hotspot: "hs_shelf", item: null })}>
              {COPY.labels.hs_shelf}
            </button>
          </li>
          <li>
            <button type="button" onClick={() => activate({ hotspot: "hs_monitor", item: null })} {...navProps({ hotspot: "hs_monitor", item: null })}>
              {COPY.labels.hs_monitor}
            </button>
          </li>
          {/* A hidden extra: no dot, tour or glint, but the keyboard can still reach it (whiteboard spec 5). */}
          <li>
            <button type="button" onClick={() => activate({ hotspot: "hs_whiteboard", item: null })} {...navProps({ hotspot: "hs_whiteboard", item: null })}>
              {COPY.whiteboard.nav}
            </button>
          </li>
        </ul>
      </nav>

      <div
        ref={(el) => {
          overlay.current.label = el;
        }}
        className="office-label"
        aria-hidden="true"
        hidden={!hovered}
        style={{ "--accent": hovered ? theme.accents[hovered.hotspot] : theme.line } as CSSProperties}
      >
        {hovered ? labelFor(hovered, COPY.labels) : ""}
      </div>
      {HOTSPOTS.map((h) => (
        <span
          key={h}
          ref={(el) => {
            overlay.current.markers[h] = el;
          }}
          className="office-marker"
          data-hotspot={h}
          style={{ "--marker": theme.accents[h] } as CSSProperties}
          aria-hidden="true"
          // A dot is a way in too, for a finger especially; the nav has the same for keyboards and screen readers.
          onClick={() => activate({ hotspot: h, item: null })}
          onPointerEnter={() => onHover({ hotspot: h, item: null })}
          onPointerLeave={() => onHover(null)}
        />
      ))}

      {focusedOn && !scene.reading && (
        <button type="button" className="office-back" onClick={back}>
          {COPY.back}
        </button>
      )}

      {browsing && (
        <>
          <div
            ref={crateRef}
            className="office-crate"
            role="group"
            tabIndex={0}
            aria-roledescription="record crate"
            aria-label={COPY.crate.label(work[crate.current.dig].name, crate.current.dig + 1, work.length)}
            onKeyDown={onCrateKey}
            onFocus={() => show({ hotspot: "hs_crate", item: work[crate.current.dig].slug })}
          />
          {/* read out as the records flick (the group's own label isn't re-announced when it changes) */}
          <p className="office-sr" aria-live="polite">
            {work[crate.current.dig].name}
          </p>
          <p className="office-hint" aria-hidden="true">
            <span className="office-hint-pointer">{COPY.crate.hint}</span>
            <span className="office-hint-touch">{COPY.crate.hintTouch}</span>
          </p>
        </>
      )}

      {shelfOpen && (
        <ul className="office-shelf" aria-label={COPY.shelf.label}>
          {services.map((s) => (
            <li key={s.slug}>
              <a
                ref={(el) => {
                  shelfLinks.current[s.slug] = el;
                }}
                href={`/services/${s.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  activate({ hotspot: "hs_shelf", item: s.slug });
                }}
                {...navProps({ hotspot: "hs_shelf", item: s.slug })}
              >
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      )}
      {shelfBrowsing && (
        <p className="office-hint" aria-hidden="true">
          <span className="office-hint-pointer">{COPY.shelf.hint}</span>
          <span className="office-hint-touch">{COPY.shelf.hintTouch}</span>
        </p>
      )}
      {/* stays under the panel while reading, so closing it returns to the plaque and its Read more */}
      {focusedOn === "hs_shelf" && shelfIndex >= 0 && outIndex === shelfIndex && (
        <Plaque service={services[shelfIndex]} titleId="plaque-title" cardRef={plaqueRef} onReadMore={read} />
      )}

      {/* over the whole window (never inside the monitor's print, which would confine it); ← → switch at once, mid-slide too */}
      {viewing && (
        <ReelViewer
          index={reel.view.words}
          titleId="reel-viewer-title"
          returnTo="reel-title"
          onStep={(d) => reel.show(wrap(reel.view.words + d, slides.length))}
          onClose={back}
        />
      )}

      {scene.reading && scene.target?.hotspot === "hs_drawer" && (
        <Panel hotspot="hs_drawer" titleId="panel-title" onClose={back}>
          <ContactForm titleId="panel-title" level={2} />
        </Panel>
      )}

      {scene.reading && pulledSlug && findWork(pulledSlug) && (
        <Panel hotspot="hs_crate" titleId="case-title" onClose={back}>
          <CaseStudy item={findWork(pulledSlug)!} titleId="case-title" />
        </Panel>
      )}

      {scene.reading && shelfSlug && findService(shelfSlug) && (
        <Panel hotspot="hs_shelf" titleId="service-title" onClose={back} inert={!!scene.topic}>
          <ServiceArticle service={findService(shelfSlug)!} titleId="service-title" level={2} onWrite={write} />
        </Panel>
      )}
      {/* over the service, so Esc closes just the form and focus goes back to the button that opened it */}
      {scene.reading && scene.topic && shelfSlug && (
        <Panel hotspot="hs_shelf" titleId="write-title" onClose={back}>
          <ContactForm topic={scene.topic} titleId="write-title" level={2} />
        </Panel>
      )}

      <p className="office-hints-text" aria-hidden="true">
        <span className="office-hints-wide">
          {COPY.hints}
          <span className="office-hints-more"> {COPY.hintsMore}</span>
        </span>
        <span className="office-hints-tall">{COPY.hintsPan}</span>
      </p>

      <div ref={track} className="office-track" style={{ height: `${theme.walkInScreens * 100}vh` }} aria-hidden="true" />
    </div>
  );
}
