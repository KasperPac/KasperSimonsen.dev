"use client";

import { useEffect, useLayoutEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { theme } from "@/office/theme";
import { COPY } from "@/office/copy";
import type { HotspotName } from "@/office/hotspots/registry";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The Read more dialog over the office. It traps focus; Esc, the close button and a click outside call `onClose` (one
 * history step back); focus returns to whatever opened it. `inert` while another panel is open over it.
 */
export default function Panel({ hotspot, titleId, onClose, inert, children }: { hotspot: HotspotName; titleId: string; onClose: () => void; inert?: boolean; children: ReactNode }) {
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  // Taken once, before the next frame: a panel opening over another makes that one inert, which drops its focus then,
  // and React's dev replay of these effects would otherwise take this panel itself for its opener.
  useLayoutEffect(() => {
    if (!opener.current) opener.current = document.activeElement as HTMLElement | null;
  }, []);
  // Given back after the commit that closes this panel, by when the one under it is no longer inert.
  useEffect(() => {
    const back = opener.current;
    dialog.current?.focus({ preventScroll: true });
    return () => back?.focus?.({ preventScroll: true });
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !dialog.current) return;
    const items = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) return e.preventDefault();
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === dialog.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="panel-scrim" inert={inert} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="panel"
        style={{ "--accent": theme.accents[hotspot] } as CSSProperties}
        onKeyDown={onKeyDown}
      >
        <button type="button" className="panel-close" onClick={onClose}>
          {COPY.close}
        </button>
        {children}
      </div>
    </div>
  );
}
