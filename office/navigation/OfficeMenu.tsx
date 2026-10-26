"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { work } from "@/content/work";
import { services } from "@/content/services";
import { COPY } from "../copy";
import type { Hit } from "../hotspots/registry";

export default function OfficeMenu({ onNavigate }: { onNavigate: (hit: Hit | null, reading?: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("office-menu-open", open);
    return () => document.documentElement.classList.remove("office-menu-open");
  }, [open]);
  const close = () => { dialog.current?.close(); setOpen(false); };
  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === "Escape") { e.stopPropagation(); return; }
    if (e.key !== "Tab") return;
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>("button, a[href]")];
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === e.currentTarget)) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };
  const go = (e: MouseEvent<HTMLAnchorElement>, hit: Hit | null, reading = false) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    close();
    onNavigate(hit, reading);
  };

  return (
    <>
      <div className="office-quick-nav">
        <a className="office-contact-link" href="/contact">{COPY.menu.contact}</a>
        <button className="office-menu-toggle" type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls="office-menu" onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" /></svg>
          {COPY.menu.open}
        </button>
      </div>
      <dialog id="office-menu" ref={dialog} className="office-menu" aria-labelledby="office-menu-title" onClose={() => setOpen(false)} onCancel={(e) => { e.preventDefault(); close(); }} onKeyDown={onKeyDown} onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const box = e.currentTarget.getBoundingClientRect();
        if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) close();
      }}>
        <div className="office-menu-head">
          <h2 id="office-menu-title">{COPY.menu.title}</h2>
          <button type="button" onClick={close}>{COPY.close}</button>
        </div>
        <nav aria-label={COPY.menu.title}>
          <a className="office-menu-primary" href="/contact" onClick={(e) => go(e, { hotspot: "hs_drawer", item: null }, true)}>{COPY.labels.hs_drawer}<span aria-hidden="true">↗</span></a>
          <section aria-labelledby="menu-work">
            <h3 id="menu-work"><a href="/work" onClick={(e) => go(e, { hotspot: "hs_crate", item: null })}>{COPY.labels.hs_crate}<span aria-hidden="true">↗</span></a></h3>
            <ul>{work.map((item) => <li key={item.slug}><a href={`/work/${item.slug}`} onClick={(e) => go(e, { hotspot: "hs_crate", item: item.slug }, true)}>{item.name}</a></li>)}</ul>
          </section>
          <section aria-labelledby="menu-services">
            <h3 id="menu-services"><a href="/#services" onClick={(e) => go(e, { hotspot: "hs_shelf", item: null })}>{COPY.labels.hs_shelf}<span aria-hidden="true">↗</span></a></h3>
            <ul>{services.map((item) => <li key={item.slug}><a href={`/services/${item.slug}`} onClick={(e) => go(e, { hotspot: "hs_shelf", item: item.slug }, true)}>{item.name}</a></li>)}</ul>
          </section>
          <a className="office-menu-primary" href="/#monitor" onClick={(e) => go(e, { hotspot: "hs_monitor", item: null }, true)}>{COPY.reel.title}<span aria-hidden="true">↗</span></a>
          <a className="office-menu-primary" href="/" onClick={(e) => go(e, null)}>{COPY.menu.office}<span aria-hidden="true">↗</span></a>
        </nav>
      </dialog>
    </>
  );
}
