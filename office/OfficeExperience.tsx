"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useReducer, useRef, useState, type CSSProperties } from "react";
import OfficeErrorBoundary from "./OfficeErrorBoundary";
import { theme } from "./theme";
import { COPY } from "./copy";
import { useWalkInProgress } from "./walkin/useWalkInProgress";
import { describeDirector, initialDirector, isLocked, reduceDirector, type DirectorState } from "./director/director";
import { pathForTarget } from "./scene/targets";
import { layerOf, sceneFor } from "./scene/location";
import { clearLayer, pushLayer, useOfficeLocation } from "./history";
import { HOTSPOTS, labelFor, sameHit, type Hit, type HotspotName } from "./hotspots/registry";
import type { OverlayElements } from "./OfficeCanvas";
import Card from "./cards/Card";
import BusinessCard from "./cards/BusinessCard";
import Panel from "@/panels/Panel";
import ContactForm from "@/panels/ContactForm";

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
  const overlay = useRef<OverlayElements>({ label: null, markers: {}, card: null });
  const cardRef = useRef<HTMLElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const backRef = useRef<HTMLButtonElement | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const cardShown = useRef<HotspotName | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const onHover = useCallback((hit: Hit | null) => {
    if (sameHit(hover.current, hit)) return;
    hover.current = hit;
    setHovered(hit);
    if (host.current) host.current.dataset.hover = hit ? hit.hotspot : "";
  }, []);

  // One history entry per new layer: what the live entry already shows is never pushed again (double clicks, repeat Enter).
  const live = () => {
    const l = layerOf(window.history.state);
    return { layer: l, scene: sceneFor(window.location.pathname, l) };
  };
  const activate = useCallback((hit: Hit) => {
    const now = live().scene.target;
    if (now && sameHit(now, hit)) return;
    // Keyboard users opened it from the nav: focus moves into what opened, and comes back here when it closes.
    const active = document.activeElement as HTMLElement | null;
    if (active && navRef.current?.contains(active)) trigger.current = active;
    pushLayer({ focus: hit.hotspot, reading: false }, pathForTarget(hit) ?? "/");
  }, []);
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
  cardShown.current = showCard ? "hs_drawer" : null;
  // The canvas positions the card; hand it the element once React has attached it.
  useEffect(() => {
    overlay.current.card = cardRef.current;
  });

  // Focus follows what's open (spec 7.3): the card's title when a card shows, else the back control; home again at idle.
  const hasCard = focusedOn === "hs_drawer";
  useEffect(() => {
    if (showCard) document.getElementById("card-title")?.focus({ preventScroll: true });
  }, [showCard]);
  useEffect(() => {
    if (focusedOn && !hasCard && trigger.current) backRef.current?.focus({ preventScroll: true });
  }, [focusedOn, hasCard]);
  useEffect(() => {
    if (state.kind === "idle" && trigger.current) {
      trigger.current.focus({ preventScroll: true });
      trigger.current = null;
    }
  }, [state.kind]);

  const navProps = (hit: Hit) => ({ onFocus: () => onHover(hit), onBlur: () => onHover(null) });

  return (
    <div ref={host} className="office" data-walkin-progress="0" data-director={describeDirector(state)} data-drawer="shut">
      <div className="office-stage">
        <OfficeErrorBoundary host={host}>
          <OfficeCanvas
            progress={progress}
            host={host}
            director={director}
            hover={hover}
            overlay={overlay}
            cardShown={cardShown}
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

      {showCard && (
        <Card hotspot="hs_drawer" titleId="card-title" cardRef={cardRef}>
          <BusinessCard titleId="card-title" onWrite={read} />
        </Card>
      )}

      {scene.reading && scene.target?.hotspot === "hs_drawer" && (
        <Panel hotspot="hs_drawer" titleId="panel-title" onClose={back}>
          <ContactForm titleId="panel-title" level={2} />
        </Panel>
      )}

      <div ref={track} className="office-track" style={{ height: `${theme.walkInScreens * 100}vh` }} aria-hidden="true" />
    </div>
  );
}
