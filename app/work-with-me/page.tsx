"use client";

import { useState } from "react";
import Link from "next/link";
import InversionCursor from "@/app/components/InversionCursor";
import { availability } from "@/lib/availability";

const mono    = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };
const body    = { fontFamily: "var(--font-instrument-sans), system-ui, -apple-system, sans-serif" };
const display = { fontFamily: "var(--font-inter), 'Helvetica Neue', Helvetica, Arial, sans-serif" };

/* ── Wireframes ── */

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.45)",
  textAlign: "center",
  marginTop: 8,
  display: "block",
};

function WireframeDashboard() {
  const [hov, setHov] = useState<"d"|"t"|"p"|null>(null);
  const dim = "rgba(255,255,255,0.1)";
  const mid = "rgba(255,255,255,0.18)";
  const acc = "rgba(255,90,31,0.55)";
  const bg  = "#0f0f0f";
  const bg2 = "#161616";
  const frm = "rgba(255,255,255,0.2)";

  return (
    <div style={{ position: "relative" }}>
      {/* Large preview — absolutely to the left, desktop only */}
      <div className="hidden md:block" style={{ position: "absolute", right: "100%", top: 0, marginRight: 16, pointerEvents: "none" }}>

        {hov === "d" && (
          <div style={{ width: 260 }}>
            <svg viewBox="0 0 220 148" style={{ width: "100%", height: "auto", display: "block" }}>
              <defs><clipPath id="wfd-d2"><rect x="1" y="1" width="218" height="146" /></clipPath></defs>
              <rect x="0" y="0" width="220" height="148" rx="2" fill={bg} stroke={frm} strokeWidth="0.5" />
              <g clipPath="url(#wfd-d2)">
                <rect x="1" y="1" width="218" height="17" fill={bg2} />
                <rect x="5" y="5" width="22" height="8" rx="1" fill={acc} opacity="0.6" />
                {[32,52,72].map(x => <rect key={x} x={x} y="7" width="16" height="4" rx="1" fill={mid} />)}
                <rect x="183" y="5" width="14" height="7" rx="3" fill={dim} />
                <rect x="200" y="5" width="14" height="7" rx="3" fill={dim} />
                <line x1="1" y1="18" x2="219" y2="18" stroke={dim} strokeWidth="0.5" />
                <rect x="1" y="18" width="36" height="127" fill={bg2} />
                <line x1="37" y1="18" x2="37" y2="147" stroke={dim} strokeWidth="0.5" />
                {[0,1,2,3,4,5,6].map(i => (
                  <g key={i}>
                    <rect x="6"  y={25+i*17} width="5" height="5" rx="1" fill={i===1?acc:dim} opacity={i===1?.8:1} />
                    <rect x="14" y={27+i*17} width="18" height="3" rx="1" fill={i===1?acc:dim} opacity={i===1?.6:.65} />
                  </g>
                ))}
                {[0,1,2].map(i => (
                  <g key={i}>
                    <rect x={41+i*59} y="21" width="53" height="26" rx="1" fill={bg2} stroke={dim} strokeWidth="0.5" />
                    <rect x={46+i*59} y="26" width="14" height="3" rx="1" fill={dim} />
                    <rect x={46+i*59} y="33" width="24" height="7" rx="1" fill={i===0?acc:mid} opacity={i===0?.6:.38} />
                  </g>
                ))}
                {[0,1,2,3,4,5,6,7].map(i => (
                  <g key={i}>
                    <rect x="41" y={53+i*12} width="176" height="12" fill={i===0?acc:"none"} fillOpacity="0.1" stroke={dim} strokeWidth="0.5" />
                    <rect x="46"  y={56+i*12} width={i===0?22:18} height="3" rx="1" fill={i===0?acc:dim} opacity={i===0?.6:.42-i*.04} />
                    <rect x="78"  y={56+i*12} width="38" height="3" rx="1" fill={dim} opacity={.38-i*.04} />
                    <rect x="130" y={56+i*12} width="22" height="3" rx="1" fill={dim} opacity={.34-i*.04} />
                    <rect x="168" y={56+i*12} width="40" height="3" rx="1" fill={i===3?acc:dim} opacity={i===3?.38:.28-i*.03} />
                  </g>
                ))}
              </g>
            </svg>
            <span style={LABEL_STYLE}>WEB APP / SITE</span>
          </div>
        )}

        {hov === "t" && (
          <div style={{ width: 200 }}>
            <svg viewBox="228 0 92 148" style={{ width: "100%", height: "auto", display: "block" }}>
              <defs><clipPath id="wfd-t2"><rect x="229" y="1" width="90" height="146" /></clipPath></defs>
              <rect x="228" y="0" width="92" height="148" rx="3" fill={bg} stroke={frm} strokeWidth="0.5" />
              <g clipPath="url(#wfd-t2)">
                <rect x="229" y="1" width="90" height="14" fill={bg2} />
                <rect x="233" y="4" width="14" height="6" rx="1" fill={acc} opacity="0.5" />
                <rect x="297" y="4" width="9" height="6" rx="2" fill={dim} />
                <rect x="309" y="4" width="9" height="6" rx="2" fill={dim} />
                <line x1="229" y1="15" x2="319" y2="15" stroke={dim} strokeWidth="0.5" />
                {[0,1].map(col => [0,1,2].map(row => (
                  <g key={`${col}${row}`}>
                    <rect x={231+col*44} y={18+row*20} width="40" height="16" rx="1" fill={bg2} stroke={dim} strokeWidth="0.5" />
                    <rect x={235+col*44} y={22+row*20} width="12" height="3" rx="1" fill={dim} />
                    <rect x={235+col*44} y={27+row*20} width={col===0&&row===0?22:16} height="4" rx="1" fill={col===0&&row===0?acc:mid} opacity={col===0&&row===0?.58:.35} />
                  </g>
                )))}
                {[0,1,2,3,4,5,6].map(i => (
                  <g key={i}>
                    <rect x="231" y={82+i*9} width="86" height="8" fill={i===0?acc:"none"} fillOpacity="0.08" stroke={dim} strokeWidth="0.5" />
                    <rect x="235" y={85+i*9} width={i===0?18:14} height="3" rx="1" fill={i===0?acc:dim} opacity={i===0?.55:.4-i*.04} />
                    <rect x="262" y={85+i*9} width="28" height="3" rx="1" fill={dim} opacity={.35-i*.04} />
                    <rect x="300" y={85+i*9} width="14" height="3" rx="1" fill={i===3?acc:dim} opacity={i===3?.35:.28-i*.04} />
                  </g>
                ))}
              </g>
            </svg>
            <span style={LABEL_STYLE}>TABLET</span>
          </div>
        )}

        {hov === "p" && (
          <div style={{ width: 130 }}>
            <svg viewBox="328 0 58 148" style={{ width: "100%", height: "auto", display: "block" }}>
              <defs><clipPath id="wfd-p2"><rect x="330" y="7" width="56" height="134" /></clipPath></defs>
              <rect x="328" y="0" width="58" height="148" rx="6" fill={bg} stroke={frm} strokeWidth="0.5" />
              <rect x="342" y="3" width="14" height="3" rx="1.5" fill={dim} />
              <rect x="348" y="142" width="14" height="3" rx="1.5" fill={dim} />
              <g clipPath="url(#wfd-p2)">
                <rect x="330" y="9" width="56" height="12" fill={bg2} />
                <rect x="334" y="12" width="8" height="5" rx="1" fill={acc} opacity="0.45" />
                <rect x="374" y="12" width="7" height="5" rx="1" fill={dim} />
                <line x1="330" y1="21" x2="386" y2="21" stroke={dim} strokeWidth="0.5" />
                {[0,1,2,3].map(i => (
                  <g key={i}>
                    <rect x="332" y={24+i*20} width="52" height="16" rx="1" fill={bg2} stroke={dim} strokeWidth="0.5" />
                    <rect x="336" y={28+i*20} width="14" height="3" rx="1" fill={dim} />
                    <rect x="336" y={34+i*20} width={[28,22,26,20][i]} height="5" rx="1" fill={i===0?acc:mid} opacity={i===0?.55:.35} />
                  </g>
                ))}
                {[0,1,2,3,4,5].map(i => (
                  <g key={i}>
                    <rect x="332" y={108+i*6} width="52" height="5" fill="none" stroke={dim} strokeWidth="0.5" />
                    <rect x="336" y={110+i*6} width={[22,28,18,24,20,16][i]} height="2" rx="1" fill={i===0?acc:dim} opacity={.42-i*.06} />
                  </g>
                ))}
              </g>
            </svg>
            <span style={LABEL_STYLE}>IPHONE / ANDROID</span>
          </div>
        )}
      </div>

      {/* Small cluster */}
      <svg viewBox="0 0 390 148" style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <clipPath id="wfd-d"><rect x="1" y="1" width="218" height="146" /></clipPath>
          <clipPath id="wfd-t"><rect x="229" y="1" width="90" height="146" /></clipPath>
          <clipPath id="wfd-p"><rect x="330" y="7" width="56" height="134" /></clipPath>
        </defs>

        {/* Desktop */}
        <g onMouseEnter={() => setHov("d")} onMouseLeave={() => setHov(null)}
           style={{ opacity: hov && hov !== "d" ? 0.45 : 1, transition: "opacity 0.15s" }}>
          <rect x="0" y="0" width="220" height="148" rx="2" fill={bg} stroke={frm} strokeWidth="0.5" />
          <g clipPath="url(#wfd-d)">
            <rect x="1" y="1" width="218" height="17" fill={bg2} />
            <rect x="5" y="5" width="22" height="8" rx="1" fill={acc} opacity="0.6" />
            {[32,52,72].map(x => <rect key={x} x={x} y="7" width="16" height="4" rx="1" fill={mid} />)}
            <rect x="183" y="5" width="14" height="7" rx="3" fill={dim} />
            <rect x="200" y="5" width="14" height="7" rx="3" fill={dim} />
            <line x1="1" y1="18" x2="219" y2="18" stroke={dim} strokeWidth="0.5" />
            <rect x="1" y="18" width="36" height="127" fill={bg2} />
            <line x1="37" y1="18" x2="37" y2="147" stroke={dim} strokeWidth="0.5" />
            {[0,1,2,3,4].map(i => (
              <g key={i}>
                <rect x="6"  y={25+i*20} width="5" height="5" rx="1" fill={i===1?acc:dim} opacity={i===1?.8:1} />
                <rect x="14" y={27+i*20} width="18" height="3" rx="1" fill={i===1?acc:dim} opacity={i===1?.6:.65} />
              </g>
            ))}
            {[0,1,2].map(i => (
              <g key={i}>
                <rect x={41+i*59} y="21" width="53" height="26" rx="1" fill={bg2} stroke={dim} strokeWidth="0.5" />
                <rect x={46+i*59} y="26" width="14" height="3" rx="1" fill={dim} />
                <rect x={46+i*59} y="33" width="24" height="7" rx="1" fill={i===0?acc:mid} opacity={i===0?.6:.38} />
              </g>
            ))}
            {[0,1,2,3,4,5].map(i => (
              <g key={i}>
                <rect x="41" y={53+i*15} width="176" height="15" fill={i===0?acc:"none"} fillOpacity="0.1" stroke={dim} strokeWidth="0.5" />
                <rect x="46"  y={57+i*15} width={i===0?22:18} height="3" rx="1" fill={i===0?acc:dim} opacity={i===0?.6:.42-i*.05} />
                <rect x="78"  y={57+i*15} width="38" height="3" rx="1" fill={dim} opacity={.38-i*.05} />
                <rect x="130" y={57+i*15} width="22" height="3" rx="1" fill={dim} opacity={.34-i*.05} />
                <rect x="168" y={57+i*15} width="40" height="3" rx="1" fill={i===3?acc:dim} opacity={i===3?.38:.28-i*.04} />
              </g>
            ))}
          </g>
        </g>

        {/* Tablet */}
        <g onMouseEnter={() => setHov("t")} onMouseLeave={() => setHov(null)}
           style={{ opacity: hov && hov !== "t" ? 0.45 : 1, transition: "opacity 0.15s" }}>
          <rect x="228" y="0" width="92" height="148" rx="3" fill={bg} stroke={frm} strokeWidth="0.5" />
          <g clipPath="url(#wfd-t)">
            <rect x="229" y="1" width="90" height="14" fill={bg2} />
            <rect x="233" y="4" width="14" height="6" rx="1" fill={acc} opacity="0.5" />
            <rect x="297" y="4" width="9" height="6" rx="2" fill={dim} />
            <rect x="309" y="4" width="9" height="6" rx="2" fill={dim} />
            <line x1="229" y1="15" x2="319" y2="15" stroke={dim} strokeWidth="0.5" />
            {[0,1].map(col => [0,1].map(row => (
              <g key={`${col}${row}`}>
                <rect x={231+col*44} y={18+row*22} width="40" height="18" rx="1" fill={bg2} stroke={dim} strokeWidth="0.5" />
                <rect x={235+col*44} y={22+row*22} width="12" height="3" rx="1" fill={dim} />
                <rect x={235+col*44} y={28+row*22} width={col===0&&row===0?22:16} height="5" rx="1" fill={col===0&&row===0?acc:mid} opacity={col===0&&row===0?.58:.35} />
              </g>
            )))}
            {[0,1,2,3,4,5].map(i => (
              <g key={i}>
                <rect x="231" y={64+i*13} width="86" height="13" fill={i===0?acc:"none"} fillOpacity="0.08" stroke={dim} strokeWidth="0.5" />
                <rect x="235" y={68+i*13} width={i===0?18:14} height="3" rx="1" fill={i===0?acc:dim} opacity={i===0?.55:.4-i*.05} />
                <rect x="262" y={68+i*13} width="28" height="3" rx="1" fill={dim} opacity={.35-i*.05} />
                <rect x="300" y={68+i*13} width="14" height="3" rx="1" fill={i===3?acc:dim} opacity={i===3?.35:.28-i*.04} />
              </g>
            ))}
          </g>
        </g>

        {/* Phone */}
        <g onMouseEnter={() => setHov("p")} onMouseLeave={() => setHov(null)}
           style={{ opacity: hov && hov !== "p" ? 0.45 : 1, transition: "opacity 0.15s" }}>
          <rect x="328" y="0" width="58" height="148" rx="6" fill={bg} stroke={frm} strokeWidth="0.5" />
          <rect x="342" y="3" width="14" height="3" rx="1.5" fill={dim} />
          <rect x="348" y="142" width="14" height="3" rx="1.5" fill={dim} />
          <g clipPath="url(#wfd-p)">
            <rect x="330" y="9" width="56" height="12" fill={bg2} />
            <rect x="334" y="12" width="8" height="5" rx="1" fill={acc} opacity="0.45" />
            <rect x="374" y="12" width="7" height="5" rx="1" fill={dim} />
            <line x1="330" y1="21" x2="386" y2="21" stroke={dim} strokeWidth="0.5" />
            {[0,1,2].map(i => (
              <g key={i}>
                <rect x="332" y={24+i*26} width="52" height="22" rx="1" fill={bg2} stroke={dim} strokeWidth="0.5" />
                <rect x="336" y={28+i*26} width="14" height="3" rx="1" fill={dim} />
                <rect x="336" y={35+i*26} width={[28,22,26][i]} height="7" rx="1" fill={i===0?acc:mid} opacity={i===0?.55:.35} />
              </g>
            ))}
            {[0,1,2,3].map(i => (
              <g key={i}>
                <rect x="332" y={104+i*9} width="52" height="8" fill="none" stroke={dim} strokeWidth="0.5" />
                <rect x="336" y={107+i*9} width={[22,28,18,24][i]} height="3" rx="1" fill={i===0?acc:dim} opacity={.42-i*.07} />
              </g>
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}

function WireframePlatform() {
  const [hov, setHov] = useState<"d"|"t"|"p"|null>(null);
  const dim  = "rgba(255,255,255,0.1)";
  const mid  = "rgba(255,255,255,0.18)";
  const acc  = "rgba(255,90,31,0.55)";
  const bg   = "#0f0f0f";
  const bg2  = "#161616";
  const frm  = "rgba(255,255,255,0.2)";
  const conn = "rgba(255,90,31,0.25)";

  return (
    <div style={{ position: "relative" }}>
      {/* Large preview — absolutely to the left, desktop only */}
      <div className="hidden md:block" style={{ position: "absolute", right: "100%", top: 0, marginRight: 16, pointerEvents: "none" }}>

        {hov === "d" && (
          <div style={{ width: 260 }}>
            <svg viewBox="0 0 220 148" style={{ width: "100%", height: "auto", display: "block" }}>
              <defs>
                <clipPath id="wfp-d2"><rect x="1" y="1" width="218" height="146" /></clipPath>
                <marker id="arr2lg" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                  <path d="M0,0 L5,2.5 L0,5 Z" fill={conn} />
                </marker>
              </defs>
              <rect x="0" y="0" width="220" height="148" rx="2" fill={bg} stroke={frm} strokeWidth="0.5" />
              <g clipPath="url(#wfp-d2)">
                <rect x="1" y="1" width="218" height="14" fill={bg2} />
                <rect x="5" y="4" width="18" height="6" rx="1" fill={acc} opacity="0.5" />
                <rect x="175" y="4" width="11" height="6" rx="2" fill={dim} />
                <rect x="190" y="4" width="11" height="6" rx="2" fill={dim} />
                <rect x="205" y="4" width="11" height="6" rx="2" fill={dim} />
                <line x1="1" y1="15" x2="219" y2="15" stroke={dim} strokeWidth="0.5" />
                <text x="9" y="28" fontSize="4.5" fill={conn} fontFamily="monospace" letterSpacing="0.5">TENANTS</text>
                {["A","B","C"].map((label, i) => (
                  <g key={label}>
                    <rect x="5" y={33+i*34} width="48" height="24" rx="1" fill={bg2} stroke={dim} strokeWidth="0.5" />
                    <rect x="9" y={37+i*34} width="6" height="6" rx="1" fill={acc} opacity="0.4" />
                    <rect x="19" y={38+i*34} width="16" height="3" rx="1" fill={mid} />
                    <rect x="19" y={44+i*34} width="28" height="3" rx="1" fill={dim} opacity="0.5" />
                  </g>
                ))}
                <line x1="53" y1="45" x2="53" y2="113" stroke={conn} strokeWidth="0.5" strokeDasharray="2,2" />
                <text x="82" y="28" fontSize="4.5" fill={conn} fontFamily="monospace" letterSpacing="0.5">PLATFORM</text>
                <rect x="72" y="32" width="76" height="84" rx="1" fill={bg2} stroke={acc} strokeWidth="0.5" strokeOpacity="0.4" />
                {[
                  { label: "Auth",   y: 42, w: 24 },
                  { label: "Schema", y: 58, w: 28 },
                  { label: "API",    y: 74, w: 20 },
                  { label: "RLS",    y: 90, w: 16 },
                  { label: "Jobs",   y: 106, w: 20 },
                ].map(({ label, y, w }) => (
                  <g key={label}>
                    <rect x="78" y={y} width="60" height="10" rx="1" fill={bg} stroke={dim} strokeWidth="0.5" />
                    <rect x="82" y={y+3} width="4" height="4" rx="0.5" fill={acc} opacity="0.5" />
                    <rect x="90" y={y+3} width={w} height="4" rx="1" fill={mid} opacity="0.5" />
                  </g>
                ))}
                {[45,79,113].map(y => (
                  <line key={y} x1="54" y1={y} x2="71" y2={y>79?87:y<79?71:79} stroke={conn} strokeWidth="0.75" markerEnd="url(#arr2lg)" />
                ))}
                <text x="157" y="28" fontSize="4.5" fill={conn} fontFamily="monospace" letterSpacing="0.5">INTEGRATIONS</text>
                {["Shopify","Webhooks","Supabase"].map((label, i) => (
                  <g key={label}>
                    <rect x="152" y={33+i*34} width="62" height="24" rx="1" fill={bg2} stroke={dim} strokeWidth="0.5" />
                    <rect x="156" y={37+i*34} width="6" height="6" rx="1" fill={dim} opacity="0.6" />
                    <rect x="166" y={38+i*34} width={[22,26,22][i]} height="3" rx="1" fill={mid} opacity="0.5" />
                    <rect x="166" y={44+i*34} width={[14,18,14][i]} height="3" rx="1" fill={dim} opacity="0.35" />
                  </g>
                ))}
                <line x1="152" y1="45" x2="152" y2="113" stroke={conn} strokeWidth="0.5" strokeDasharray="2,2" />
                {[45,79,113].map(y => (
                  <line key={y} x1="149" y1={y>79?87:y<79?71:79} x2="151" y2={y} stroke={conn} strokeWidth="0.75" markerEnd="url(#arr2lg)" />
                ))}
                <rect x="1" y="124" width="218" height="23" fill={bg2} />
                <line x1="1" y1="124" x2="219" y2="124" stroke={dim} strokeWidth="0.5" />
                {[0,1,2,3].map(i => (
                  <g key={i}>
                    <rect x={6+i*52} y="129" width="6" height="6" rx="3" fill={i<3?acc:dim} opacity={i<3?.5:.3} />
                    <rect x={16+i*52} y="130" width={[30,26,22,28][i]} height="3" rx="1" fill={dim} opacity="0.4" />
                  </g>
                ))}
              </g>
            </svg>
            <span style={LABEL_STYLE}>WEB APP / SITE</span>
          </div>
        )}

        {hov === "t" && (
          <div style={{ width: 200 }}>
            <svg viewBox="228 0 92 148" style={{ width: "100%", height: "auto", display: "block" }}>
              <defs><clipPath id="wfp-t2"><rect x="229" y="1" width="90" height="146" /></clipPath></defs>
              <rect x="228" y="0" width="92" height="148" rx="3" fill={bg} stroke={frm} strokeWidth="0.5" />
              <g clipPath="url(#wfp-t2)">
                <rect x="229" y="1" width="90" height="13" fill={bg2} />
                <rect x="233" y="4" width="12" height="6" rx="1" fill={acc} opacity="0.45" />
                <rect x="309" y="4" width="8" height="5" rx="2" fill={dim} />
                <line x1="229" y1="14" x2="319" y2="14" stroke={dim} strokeWidth="0.5" />
                {[0,1,2].map(i => (
                  <g key={i}>
                    <rect x={231+i*29} y="17" width="26" height="16" rx="1" fill={bg2} stroke={dim} strokeWidth="0.5" />
                    <rect x={234+i*29} y="21" width="10" height="3" rx="1" fill={dim} />
                    <rect x={234+i*29} y="27" width={[16,12,14][i]} height="4" rx="1" fill={i===1?acc:mid} opacity={i===1?.55:.35} />
                  </g>
                ))}
                {[0,1,2,3].map(row => [0,1].map(col => (
                  <g key={`${row}${col}`}>
                    <rect x={231+col*44} y={37+row*26} width="40" height="22" rx="1" fill={bg2} stroke={col===0&&row===1?acc:dim} strokeWidth={col===0&&row===1?"0.75":"0.5"} strokeOpacity={col===0&&row===1?.5:1} />
                    <rect x={235+col*44} y={41+row*26} width="4" height="4" rx="0.5" fill={col===0&&row===1?acc:dim} opacity={col===0&&row===1?.6:.5} />
                    <rect x={243+col*44} y={42+row*26} width={[18,16,20,14,22,12,18,16][row*2+col]} height="3" rx="1" fill={mid} opacity="0.4" />
                    <rect x={243+col*44} y={48+row*26} width={[12,20,14,18,10,16,12,14][row*2+col]} height="3" rx="1" fill={dim} opacity="0.28" />
                  </g>
                )))}
              </g>
            </svg>
            <span style={LABEL_STYLE}>TABLET</span>
          </div>
        )}

        {hov === "p" && (
          <div style={{ width: 130 }}>
            <svg viewBox="328 0 58 148" style={{ width: "100%", height: "auto", display: "block" }}>
              <defs><clipPath id="wfp-p2"><rect x="330" y="7" width="56" height="134" /></clipPath></defs>
              <rect x="328" y="0" width="58" height="148" rx="6" fill={bg} stroke={frm} strokeWidth="0.5" />
              <rect x="342" y="3" width="14" height="3" rx="1.5" fill={dim} />
              <rect x="348" y="142" width="14" height="3" rx="1.5" fill={dim} />
              <g clipPath="url(#wfp-p2)">
                <rect x="330" y="9" width="56" height="12" fill={bg2} />
                <rect x="334" y="12" width="8" height="5" rx="1" fill={acc} opacity="0.4" />
                <line x1="330" y1="21" x2="386" y2="21" stroke={dim} strokeWidth="0.5" />
                {["Platform","Auth","API","Jobs","Queue","DB","Cache","Events"].map((label, i) => (
                  <g key={label}>
                    <rect x="332" y={24+i*14} width="52" height="11" fill="none" stroke={dim} strokeWidth="0.5" />
                    <rect x="336" y={27+i*14} width="5" height="5" rx="2.5" fill={i<4?acc:dim} opacity={i<4?.55:.3} />
                    <rect x="345" y={28+i*14} width={[24,16,12,20,14,18,22,16][i]} height="3" rx="1" fill={mid} opacity="0.45" />
                  </g>
                ))}
                <rect x="332" y="138" width="52" height="5" rx="1" fill={bg2} stroke={acc} strokeWidth="0.5" strokeOpacity="0.3" />
              </g>
            </svg>
            <span style={LABEL_STYLE}>IPHONE / ANDROID</span>
          </div>
        )}
      </div>

      {/* Small cluster */}
      <svg viewBox="0 0 390 148" style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <clipPath id="wfp-d"><rect x="1" y="1" width="218" height="146" /></clipPath>
          <clipPath id="wfp-t"><rect x="229" y="1" width="90" height="146" /></clipPath>
          <clipPath id="wfp-p"><rect x="330" y="7" width="56" height="134" /></clipPath>
          <marker id="arr2" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
            <path d="M0,0 L5,2.5 L0,5 Z" fill={conn} />
          </marker>
        </defs>

        {/* Desktop — architecture diagram */}
        <g onMouseEnter={() => setHov("d")} onMouseLeave={() => setHov(null)}
           style={{ opacity: hov && hov !== "d" ? 0.45 : 1, transition: "opacity 0.15s" }}>
          <rect x="0" y="0" width="220" height="148" rx="2" fill={bg} stroke={frm} strokeWidth="0.5" />
          <g clipPath="url(#wfp-d)">
            <rect x="1" y="1" width="218" height="14" fill={bg2} />
            <rect x="5" y="4" width="18" height="6" rx="1" fill={acc} opacity="0.5" />
            <rect x="175" y="4" width="11" height="6" rx="2" fill={dim} />
            <rect x="190" y="4" width="11" height="6" rx="2" fill={dim} />
            <rect x="205" y="4" width="11" height="6" rx="2" fill={dim} />
            <line x1="1" y1="15" x2="219" y2="15" stroke={dim} strokeWidth="0.5" />
            <text x="9" y="28" fontSize="4.5" fill={conn} fontFamily="monospace" letterSpacing="0.5">TENANTS</text>
            {["A","B","C"].map((label, i) => (
              <g key={label}>
                <rect x="5" y={33+i*34} width="48" height="24" rx="1" fill={bg2} stroke={dim} strokeWidth="0.5" />
                <rect x="9" y={37+i*34} width="6" height="6" rx="1" fill={acc} opacity="0.4" />
                <rect x="19" y={38+i*34} width="16" height="3" rx="1" fill={mid} />
                <rect x="19" y={44+i*34} width="28" height="3" rx="1" fill={dim} opacity="0.5" />
              </g>
            ))}
            <line x1="53" y1="45" x2="53" y2="113" stroke={conn} strokeWidth="0.5" strokeDasharray="2,2" />
            <text x="82" y="28" fontSize="4.5" fill={conn} fontFamily="monospace" letterSpacing="0.5">PLATFORM</text>
            <rect x="72" y="32" width="76" height="84" rx="1" fill={bg2} stroke={acc} strokeWidth="0.5" strokeOpacity="0.4" />
            {[
              { label: "Auth",   y: 42, w: 24 },
              { label: "Schema", y: 58, w: 28 },
              { label: "API",    y: 74, w: 20 },
              { label: "RLS",    y: 90, w: 16 },
              { label: "Jobs",   y: 106, w: 20 },
            ].map(({ label, y, w }) => (
              <g key={label}>
                <rect x="78" y={y} width="60" height="10" rx="1" fill={bg} stroke={dim} strokeWidth="0.5" />
                <rect x="82" y={y+3} width="4" height="4" rx="0.5" fill={acc} opacity="0.5" />
                <rect x="90" y={y+3} width={w} height="4" rx="1" fill={mid} opacity="0.5" />
              </g>
            ))}
            {[45,79,113].map(y => (
              <line key={y} x1="54" y1={y} x2="71" y2={y>79?87:y<79?71:79} stroke={conn} strokeWidth="0.75" markerEnd="url(#arr2)" />
            ))}
            <text x="157" y="28" fontSize="4.5" fill={conn} fontFamily="monospace" letterSpacing="0.5">INTEGRATIONS</text>
            {["Shopify","Webhooks","Supabase"].map((label, i) => (
              <g key={label}>
                <rect x="152" y={33+i*34} width="62" height="24" rx="1" fill={bg2} stroke={dim} strokeWidth="0.5" />
                <rect x="156" y={37+i*34} width="6" height="6" rx="1" fill={dim} opacity="0.6" />
                <rect x="166" y={38+i*34} width={[22,26,22][i]} height="3" rx="1" fill={mid} opacity="0.5" />
                <rect x="166" y={44+i*34} width={[14,18,14][i]} height="3" rx="1" fill={dim} opacity="0.35" />
              </g>
            ))}
            <line x1="152" y1="45" x2="152" y2="113" stroke={conn} strokeWidth="0.5" strokeDasharray="2,2" />
            {[45,79,113].map(y => (
              <line key={y} x1="149" y1={y>79?87:y<79?71:79} x2="151" y2={y} stroke={conn} strokeWidth="0.75" markerEnd="url(#arr2)" />
            ))}
            <rect x="1" y="124" width="218" height="23" fill={bg2} />
            <line x1="1" y1="124" x2="219" y2="124" stroke={dim} strokeWidth="0.5" />
            {[0,1,2,3].map(i => (
              <g key={i}>
                <rect x={6+i*52} y="129" width="6" height="6" rx="3" fill={i<3?acc:dim} opacity={i<3?.5:.3} />
                <rect x={16+i*52} y="130" width={[30,26,22,28][i]} height="3" rx="1" fill={dim} opacity="0.4" />
              </g>
            ))}
          </g>
        </g>

        {/* Tablet */}
        <g onMouseEnter={() => setHov("t")} onMouseLeave={() => setHov(null)}
           style={{ opacity: hov && hov !== "t" ? 0.45 : 1, transition: "opacity 0.15s" }}>
          <rect x="228" y="0" width="92" height="148" rx="3" fill={bg} stroke={frm} strokeWidth="0.5" />
          <g clipPath="url(#wfp-t)">
            <rect x="229" y="1" width="90" height="13" fill={bg2} />
            <rect x="233" y="4" width="12" height="6" rx="1" fill={acc} opacity="0.45" />
            <rect x="309" y="4" width="8" height="5" rx="2" fill={dim} />
            <line x1="229" y1="14" x2="319" y2="14" stroke={dim} strokeWidth="0.5" />
            {[0,1,2].map(i => (
              <g key={i}>
                <rect x={231+i*29} y="17" width="26" height="16" rx="1" fill={bg2} stroke={dim} strokeWidth="0.5" />
                <rect x={234+i*29} y="21" width="10" height="3" rx="1" fill={dim} />
                <rect x={234+i*29} y="27" width={[16,12,14][i]} height="4" rx="1" fill={i===1?acc:mid} opacity={i===1?.55:.35} />
              </g>
            ))}
            {[0,1,2].map(row => [0,1].map(col => (
              <g key={`${row}${col}`}>
                <rect x={231+col*44} y={37+row*26} width="40" height="22" rx="1" fill={bg2} stroke={col===0&&row===1?acc:dim} strokeWidth={col===0&&row===1?"0.75":"0.5"} strokeOpacity={col===0&&row===1?.5:1} />
                <rect x={235+col*44} y={41+row*26} width="4" height="4" rx="0.5" fill={col===0&&row===1?acc:dim} opacity={col===0&&row===1?.6:.5} />
                <rect x={243+col*44} y={42+row*26} width={[18,16,20,14,22,12][row*2+col]} height="3" rx="1" fill={mid} opacity="0.4" />
                <rect x={243+col*44} y={48+row*26} width={[12,20,14,18,10,16][row*2+col]} height="3" rx="1" fill={dim} opacity="0.28" />
              </g>
            )))}
            <rect x="231" y="117" width="86" height="29" rx="1" fill={bg2} stroke={dim} strokeWidth="0.5" />
            {[0,1,2].map(i => (
              <g key={i}>
                <rect x="235" y={121+i*9} width="4" height="4" rx="0.5" fill={i===0?acc:dim} opacity={i===0?.5:.35} />
                <rect x="243" y={122+i*9} width={[40,30,36][i]} height="3" rx="1" fill={dim} opacity={.35-i*.07} />
              </g>
            ))}
          </g>
        </g>

        {/* Phone */}
        <g onMouseEnter={() => setHov("p")} onMouseLeave={() => setHov(null)}
           style={{ opacity: hov && hov !== "p" ? 0.45 : 1, transition: "opacity 0.15s" }}>
          <rect x="328" y="0" width="58" height="148" rx="6" fill={bg} stroke={frm} strokeWidth="0.5" />
          <rect x="342" y="3" width="14" height="3" rx="1.5" fill={dim} />
          <rect x="348" y="142" width="14" height="3" rx="1.5" fill={dim} />
          <g clipPath="url(#wfp-p)">
            <rect x="330" y="9" width="56" height="12" fill={bg2} />
            <rect x="334" y="12" width="8" height="5" rx="1" fill={acc} opacity="0.4" />
            <line x1="330" y1="21" x2="386" y2="21" stroke={dim} strokeWidth="0.5" />
            {["Platform","Auth","API","Jobs","Queue","DB"].map((label, i) => (
              <g key={label}>
                <rect x="332" y={24+i*16} width="52" height="13" fill="none" stroke={dim} strokeWidth="0.5" />
                <rect x="336" y={28+i*16} width="5" height="5" rx="2.5" fill={i<4?acc:dim} opacity={i<4?.55:.3} />
                <rect x="345" y={29+i*16} width={[24,16,12,20,14,18][i]} height="3" rx="1" fill={mid} opacity="0.45" />
              </g>
            ))}
            <rect x="332" y="122" width="52" height="10" rx="1" fill={bg2} stroke={acc} strokeWidth="0.5" strokeOpacity="0.3" />
            <rect x="336" y="125" width="28" height="3" rx="1" fill={acc} opacity="0.4" />
          </g>
        </g>
      </svg>
    </div>
  );
}

/* ── Offering block ── */

type OfferingProps = {
  number: string;
  meta: string;
  timeline: string;
  headline: string;
  description: string;
  fitsLabel: string;
  fitsBody: string;
  requiresLabel: string;
  requiresBody: string;
  replyHint: string;
  ctaLabel: string;
  ctaHref: string;
  Wireframe: React.ComponentType;
};

function Offering({
  number, meta, timeline,
  headline, description,
  fitsLabel, fitsBody,
  requiresLabel, requiresBody,
  replyHint, ctaLabel, ctaHref,
  Wireframe,
}: OfferingProps) {
  return (
    <div
      className="px-6 md:px-10 py-8 md:py-10"
      style={{ borderBottom: "0.5px solid var(--border)" }}
    >
      {/* Row 1: number + meta + timeline */}
      <div className="flex items-center justify-between gap-6 mb-6 flex-wrap">
        <div className="flex items-center gap-6">
          <span className="font-black text-2xl leading-none" style={{ ...mono, color: "var(--accent)" }}>
            {number}
          </span>
          <span
            className="text-xs tracking-[0.1em] uppercase px-2.5 py-1"
            style={{
              ...mono,
              color: "var(--accent)",
              border: "0.5px solid rgba(255,90,31,0.3)",
              background: "rgba(255,90,31,0.05)",
            }}
          >
            {meta}
          </span>
        </div>
        <span className="text-xs tracking-[0.06em] uppercase" style={{ ...mono, color: "var(--text-dim)" }}>
          {timeline}
        </span>
      </div>

      {/* Row 2: headline full width */}
      <h2
        className="font-black uppercase leading-tight mb-6"
        style={{ ...display, fontSize: "clamp(32px, 4vw, 52px)", letterSpacing: "-0.03em", color: "var(--text-primary)" }}
      >
        {headline}
      </h2>

      {/* Row 3: content + wireframe */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 md:gap-16">
        <div className="space-y-5">
          <p className="text-sm leading-relaxed max-w-[64ch]" style={{ ...body, color: "var(--text-muted)" }}>
            {description}
          </p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-[10px] tracking-[0.1em] uppercase" style={{ ...mono, color: "var(--accent)" }}>{fitsLabel}</p>
              <p className="text-sm leading-relaxed max-w-[60ch]" style={{ ...body, color: "var(--text-muted)" }}>{fitsBody}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] tracking-[0.1em] uppercase" style={{ ...mono, color: "var(--accent)" }}>{requiresLabel}</p>
              <p className="text-sm leading-relaxed max-w-[60ch]" style={{ ...body, color: "var(--text-dim)" }}>{requiresBody}</p>
            </div>
          </div>
          <div className="pt-2 space-y-3">
            <span className="text-xs block" style={{ ...mono, color: "var(--text-dim)" }}>{replyHint}</span>
            <div className="flex justify-end">
              <Link
                href={ctaHref}
                className="group flex items-center gap-3 px-4 py-2.5 text-xs tracking-[0.08em] uppercase transition-colors duration-150"
                style={{ ...mono, color: "var(--accent)", border: "0.5px solid var(--accent)", background: "rgba(255,90,31,0.04)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,90,31,0.1)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,90,31,0.04)"; }}
              >
                {ctaLabel}
                <span className="inline-block transition-transform duration-150 group-hover:translate-x-[3px]">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Wireframe — no box, just the SVG */}
        <div className="self-start md:min-w-[380px] md:max-w-[420px] w-full">
          <Wireframe />
        </div>
      </div>
    </div>
  );
}

/* ── Page ── */

export default function WorkWithMePage() {
  return (
    <main>
      <div
        className="px-6 md:px-10 pt-10 pb-10"
        style={{ borderBottom: "0.5px solid var(--border)" }}
      >
        <p className="text-xs tracking-[0.18em] uppercase mb-4" style={{ ...mono, color: "var(--accent)" }}>
          {availability.text}
        </p>
        <InversionCursor>
          <h1
            className="font-black uppercase leading-none"
            style={{ ...display, fontSize: "clamp(52px, 8vw, 100px)", letterSpacing: "-0.06em", color: "var(--text-primary)" }}
          >
            WORK WITH ME
          </h1>
        </InversionCursor>
      </div>

      <section>
        <div
          className="px-6 md:px-10 py-6"
          style={{ borderBottom: "0.5px solid var(--border)", background: "#161616" }}
        >
          <h2 className="font-black uppercase tracking-tight" style={{ ...display, fontSize: 22, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            Engagements
          </h2>
          <p className="text-xs tracking-[0.06em] uppercase mt-1" style={{ ...mono, color: "var(--text-dim)" }}>
            Two kinds — pick the one that fits
          </p>
        </div>

        <Offering
          number="01" meta="Scoped & Fixed" timeline="1–3 Weeks"
          headline="Tools & Dashboards"
          description="Small, tightly-scoped builds for teams who need something specific done properly. Usually one problem, one interface, one backend. Priced per project, delivered in days or weeks rather than months."
          fitsLabel="Typically fits"
          fitsBody="Admin panels · internal workflow tools · custom reporting views · client portals · small Shopify or Supabase-backed apps · bespoke integrations between two existing systems."
          requiresLabel="You provide"
          requiresBody="A clear description of what the thing needs to do, access to any existing systems it needs to talk to, and someone who can answer questions as they come up."
          replyHint="— typical reply within 24 hours"
          ctaLabel="Start a tool or dashboard" ctaHref="/contact?topic=tools"
          Wireframe={WireframeDashboard}
        />

        <Offering
          number="02" meta="Custom & Scaled" timeline="6–16 Weeks"
          headline="Platforms & Systems"
          description="Larger engagements where the thing being built doesn't yet exist. Multi-tenant SaaS, LLM-driven tooling, integrations with systems software doesn't usually touch. Architecture, schema, API, UI — the whole stack. Priced per project after a scoping conversation."
          fitsLabel="Typically fits"
          fitsBody="Multi-tenant SaaS with real data-integrity requirements · LLM pipelines and agent systems · Shopify and e-commerce backend integrations · bespoke internal platforms for manufacturing or industrial ops · anything with strict audit or reconciliation needs."
          requiresLabel="How it usually goes"
          requiresBody="A short scoping conversation, then a written proposal with milestones, timeline, and fixed or staged pricing. I build in weekly visible increments — you see real progress every week, not a reveal at the end."
          replyHint="— expect a scoping call within the week"
          ctaLabel="Start a platform or system" ctaHref="/contact?topic=platforms"
          Wireframe={WireframePlatform}
        />
      </section>

      {/* Not a fit */}
      <div
        className="grid grid-cols-1 lg:grid-cols-[120px_1fr] gap-8 lg:gap-16 px-6 md:px-10 py-10"
        style={{ borderBottom: "0.5px solid var(--border)", background: "rgba(255,255,255,0.015)" }}
      >
        <div className="flex lg:flex-col gap-4 lg:gap-2 flex-wrap">
          <span className="text-2xl font-black leading-none" style={{ ...mono, color: "var(--accent)" }}>—</span>
          <span className="text-[10px] tracking-[0.1em] uppercase" style={{ ...mono, color: "var(--accent)", marginTop: 2 }}>Not a fit</span>
        </div>
        <div className="space-y-3">
          <h2 className="font-black uppercase leading-tight" style={{ ...display, fontSize: "clamp(18px, 2vw, 24px)", letterSpacing: "-0.02em", color: "#cccccc" }}>
            Not currently taking on:
          </h2>
          <p className="text-sm leading-relaxed max-w-[60ch]" style={{ ...body, color: "var(--text-dim)" }}>
            WordPress or Webflow work · e-commerce theme customisation · front-end-only design
            projects · short-term staff augmentation through recruiters · anything under a few
            days of scope. For those, happy to refer — just ask.
          </p>
        </div>
      </div>

      {/* What happens after */}
      <div className="px-6 md:px-10 py-12" style={{ borderBottom: "0.5px solid var(--border)" }}>
        <h2
          className="font-black uppercase leading-tight mb-10"
          style={{ ...display, fontSize: "clamp(22px, 3vw, 36px)", letterSpacing: "-0.03em", color: "var(--text-primary)" }}
        >
          What happens after you get in touch
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { step: "01", title: "A short reply.",      desc: "Usually within 24 hours. A yes with next steps or a clear no with a referral where possible." },
            { step: "02", title: "A scoping call.",     desc: "30–45 minutes. Understand what you need, what you've tried, what constraints exist. Free." },
            { step: "03", title: "A written proposal.", desc: "Scope, milestones, timeline, price. Either fixed or staged. No surprises later." },
            { step: "04", title: "We build.",           desc: "Weekly visible progress. Real check-ins. Shipped at the end, not thrown over a fence." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="p-5 space-y-3" style={{ border: "0.5px solid #1f1f1f", background: "rgba(255,255,255,0.015)" }}>
              <p className="text-[10px] tracking-[0.1em] uppercase" style={{ ...mono, color: "var(--accent)" }}>{step}</p>
              <p className="font-black uppercase leading-tight" style={{ ...display, fontSize: 13, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>{title}</p>
              <p className="text-xs leading-relaxed" style={{ ...body, color: "var(--text-dim)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
