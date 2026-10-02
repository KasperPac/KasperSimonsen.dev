"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useReducer, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import OfficeErrorBoundary from "./OfficeErrorBoundary";
import { theme } from "./theme";
import { COPY } from "./copy";
import { useWalkInProgress } from "./walkin/useWalkInProgress";
import { describeDirector, focusedHotspot, initialDirector, isLocked, reduceDirector, type DirectorState } from "./director/director";
import { pathForTarget } from "./scene/targets";
import { layerOf, sceneFor } from "./scene/location";
import { clearLayer, pushLayer, useOfficeLocation } from "./history";
import { HOTSPOTS, labelFor, sameHit, type Hit } from "./hotspots/registry";
import type { OverlayElements } from "./OfficeCanvas";
import BusinessCard from "./cards/BusinessCard";
import SleeveBack from "./cards/SleeveBack";
import { clampDig } from "./objects/crate";
import { canPull, digFor, swipeStep } from "./crate/dig";
import { tourAt } from "./hints/tour";
import { findWork, work } from "@/content/work";
import Panel from "@/panels/Panel";
import ContactForm from "@/panels/ContactForm";
import CaseStudy from "@/panels/CaseStudy";

// three.js never runs on the server and never ships to pages that don't render the office.
const OfficeCanvas = dynamic(() => import("./OfficeCanvas"), { ssr: false });

const toEnd = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
const back = () => window.history.back();

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
  const backRef = useRef<HTMLButtonElement | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dig, setDig] = useState(0);
  const browsingRef = useRef(false);
  // Arrival hints (spec 3.1): a tour of the four objects, then dots until the visitor uses one.
  const [hints, setHints] = useState<"" | "tour" | "dots">("");
  const used = useRef(false);
  const toured = useRef(false);

  // A reload keeps history.state; a fresh office starts with no layer.
  useEffect(clearLayer, []);

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
  const markUsed = useCallback(() => {
    if (used.current) return;
    used.current = true;
    setHints("");
  }, []);
  // The visitor's own hover or keyboard focus: ends the hints, and in the crate brings the hovered record to the front.
  const onHover = useCallback(
    (hit: Hit | null) => {
      if (hit) markUsed();
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
    const now = live().scene.target;
    if (now && sameHit(now, hit)) return;
    if (now?.hotspot === "hs_crate" && now.item && hit.hotspot === "hs_crate") return; // one record out at a time
    // Keyboard users opened it from the nav: focus moves into what opened, and comes back here when it closes.
    markUsed();
    const active = document.activeElement as HTMLElement | null;
    if (active && navRef.current?.contains(active)) trigger.current = active;
    pushLayer({ focus: hit.hotspot, reading: false }, pathForTarget(hit) ?? "/");
  }, [markUsed]);
  const read = useCallback(() => {
    const { layer: l, scene: s } = live();
    if (!l.reading && s.target) pushLayer({ focus: s.target.hotspot, reading: true });
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
  const showCard = focusedOn === "hs_drawer" && drawerOpen;

  // The crate (spec 3.2): flick through the records, pull the front one out, read it on its back and in the panel.
  const pulledSlug = scene.target?.hotspot === "hs_crate" ? scene.target.item : null;
  const pulledIndex = pulledSlug ? work.findIndex((w) => w.slug === pulledSlug) : -1;
  const [sleeveOut, setSleeveOut] = useState(false);
  const browsing = focusedOn === "hs_crate" && !pulledSlug && !scene.reading;
  browsingRef.current = browsing;
  const crate = useRef({ dig: 0, playing: null as number | null, browsing: false });
  crate.current = { dig: digFor(dig, pulledSlug), playing: pulledIndex < 0 ? null : pulledIndex, browsing };
  const crateRef = useRef<HTMLDivElement | null>(null);

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

  // Focus follows what's open (spec 7.3): the card's title when a card shows (CardFace moves it there), else the back
  // control; home again at idle.
  const hasCard = focusedOn === "hs_drawer";
  useEffect(() => {
    if (focusedOn && !hasCard && focusedOn !== "hs_crate" && trigger.current) backRef.current?.focus({ preventScroll: true });
  }, [focusedOn, hasCard]);
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
      const at = tourAt((performance.now() - start) / 1000);
      show(at ? { hotspot: at, item: null } : null);
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
        show(null);
        setHints("dots");
      }
    };
  }, [state.kind, show]);

  const navProps = (hit: Hit) => ({ onFocus: () => onHover(hit), onBlur: () => onHover(null) });

  return (
    <div ref={host} className="office" data-walkin-progress="0" data-director={describeDirector(state)} data-drawer="shut" data-sleeve="in" data-dig={crate.current.dig} data-playing={pulledSlug ?? ""} data-hints={hints}>
      <div className="office-stage">
        <OfficeErrorBoundary host={host}>
          <OfficeCanvas
            progress={progress}
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
          aria-hidden="true"
        />
      ))}

      {focusedOn && !scene.reading && (
        <button ref={backRef} type="button" className="office-back" onClick={back}>
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
          />
          <p className="office-hint" aria-hidden="true">
            {COPY.crate.hint}
          </p>
        </>
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

      <p className="office-hints-text" aria-hidden="true">
        {COPY.hints}
      </p>

      <div ref={track} className="office-track" style={{ height: `${theme.walkInScreens * 100}vh` }} aria-hidden="true" />
    </div>
  );
}
