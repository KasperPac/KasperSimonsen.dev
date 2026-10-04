"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import InversionCursor from "@/app/components/InversionCursor";

const mono    = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };
const body    = { fontFamily: "var(--font-instrument-sans), system-ui, -apple-system, sans-serif" };
const display = { fontFamily: "var(--font-inter), 'Helvetica Neue', Helvetica, Arial, sans-serif" };

const subjectMap: Record<string, string> = {
  tools:     "Tools & dashboards enquiry",
  platforms: "Platforms & systems enquiry",
};

const inputStyle: React.CSSProperties = {
  ...mono,
  width: "100%",
  background: "transparent",
  border: "0.5px solid var(--border)",
  color: "var(--text-primary)",
  fontSize: 13,
  padding: "10px 12px",
  outline: "none",
};

export default function ContactForm() {
  const params = useSearchParams();
  const topic  = params.get("topic") ?? "";

  const [form, setForm] = useState({
    name:    "",
    email:   "",
    subject: subjectMap[topic] ?? "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    if (topic && subjectMap[topic]) {
      setForm((f) => ({ ...f, subject: subjectMap[topic] }));
    }
  }, [topic]);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      {/* Page header */}
      <div
        className="px-6 md:px-10 pt-10 pb-10"
        style={{ borderBottom: "0.5px solid var(--border)" }}
      >
        <p className="text-xs tracking-[0.18em] uppercase mb-4" style={{ ...mono, color: "var(--accent)" }}>
          — typical reply within 24 hours
        </p>
        <InversionCursor>
          <h1
            className="font-black uppercase leading-none mb-6"
            style={{
              ...display,
              fontSize: "clamp(72px, 10vw, 110px)",
              letterSpacing: "-0.085em",
              color: "var(--text-primary)",
            }}
          >
            CONTACT
          </h1>
        </InversionCursor>
        <p className="text-sm leading-relaxed max-w-[52ch]" style={{ ...body, color: "var(--text-muted)" }}>
          Tell me what you&apos;re building, or what you need done. I read every message and reply within a day — usually faster.
        </p>
      </div>

      {/* Form + Info panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,600px)_1fr]" style={{ borderTop: "0.5px solid var(--border)" }}>

        {/* Form column */}
        <div className="px-6 md:px-10 py-12" style={{ borderRight: "0.5px solid var(--border)" }}>
        {status === "sent" ? (
          <div className="space-y-3">
            <p className="font-black uppercase text-2xl leading-none" style={{ ...display, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
              Message sent.
            </p>
            <p className="text-sm" style={{ ...body, color: "var(--text-muted)" }}>
              I&apos;ll be in touch shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] tracking-[0.08em] uppercase" style={{ ...mono, color: "var(--text-dim)" }}>
                  Name
                </label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={set("name")}
                  placeholder="Your name"
                  style={inputStyle}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] tracking-[0.08em] uppercase" style={{ ...mono, color: "var(--text-dim)" }}>
                  Email
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="your@email.com"
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] tracking-[0.08em] uppercase" style={{ ...mono, color: "var(--text-dim)" }}>
                Subject
              </label>
              <input
                required
                type="text"
                value={form.subject}
                onChange={set("subject")}
                placeholder="What is this about?"
                style={inputStyle}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] tracking-[0.08em] uppercase" style={{ ...mono, color: "var(--text-dim)" }}>
                Message
              </label>
              <textarea
                required
                rows={8}
                value={form.message}
                onChange={set("message")}
                placeholder="Describe what you're building, what you need, and any relevant constraints or timeline."
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            {status === "error" && (
              <p className="text-xs" style={{ ...mono, color: "var(--accent)" }}>
                Something went wrong — try again or email directly.
              </p>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={status === "sending"}
                className="group flex items-center gap-3 px-5 py-3 text-xs tracking-[0.08em] uppercase transition-colors duration-150 disabled:opacity-50"
                style={{
                  ...mono,
                  color: "var(--accent)",
                  border: "0.5px solid var(--accent)",
                  background: "rgba(255,90,31,0.04)",
                  cursor: status === "sending" ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (status !== "sending")
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,90,31,0.1)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,90,31,0.04)";
                }}
              >
                {status === "sending" ? "Sending…" : "Send message"}
                {status !== "sending" && (
                  <span className="inline-block transition-transform duration-150 group-hover:translate-x-[3px]">→</span>
                )}
              </button>
            </div>
          </form>
        )}
        </div>

        {/* Info panel */}
        <div className="hidden lg:block">

          {/* Availability */}
          <div className="px-8 py-8" style={{ borderBottom: "0.5px solid var(--border)" }}>
            <p className="text-[10px] tracking-[0.1em] uppercase mb-3" style={{ ...mono, color: "var(--accent)" }}>Availability</p>
            <div className="flex items-center gap-2 mb-2">
              <span className="pulse-dot-o" style={{ margin: 0 }} />
              <span className="text-sm font-black uppercase" style={{ ...display, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Available Q2 2026</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ ...body, color: "var(--text-dim)" }}>
              Taking new projects now. Selective — I only take on work I can do well, not everything that comes through the door.
            </p>
          </div>

          {/* What to include */}
          <div className="px-8 py-8" style={{ borderBottom: "0.5px solid var(--border)" }}>
            <p className="text-[10px] tracking-[0.1em] uppercase mb-3" style={{ ...mono, color: "var(--accent)" }}>Good to include</p>
            <ul className="space-y-2">
              {[
                "What you're building or trying to fix",
                "Rough timeline or deadline",
                "What you're already running, if anything",
                "Budget range — optional but useful",
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span style={{ ...mono, color: "var(--accent)", fontSize: 10, marginTop: 3 }}>—</span>
                  <span className="text-xs leading-relaxed" style={{ ...body, color: "var(--text-dim)" }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Response + Location */}
          <div className="px-8 py-8" style={{ borderBottom: "0.5px solid var(--border)" }}>
            <p className="text-[10px] tracking-[0.1em] uppercase mb-3" style={{ ...mono, color: "var(--accent)" }}>Response</p>
            <p className="text-xs leading-relaxed mb-4" style={{ ...body, color: "var(--text-dim)" }}>
              Every message gets read. Reply within a day, usually faster. If it&apos;s not a fit I&apos;ll say so and point you somewhere useful.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] tracking-[0.06em] uppercase" style={{ ...mono, color: "var(--text-dim)" }}>Based in</span>
              <span className="text-[10px] tracking-[0.06em] uppercase" style={{ ...mono, color: "var(--text-muted)" }}>Melbourne — AEST / UTC+10</span>
            </div>
          </div>

          {/* Not taking on */}
          <div className="px-8 py-8">
            <p className="text-[10px] tracking-[0.1em] uppercase mb-3" style={{ ...mono, color: "var(--text-dim)" }}>Not currently taking on</p>
            <p className="text-xs leading-relaxed" style={{ ...body, color: "var(--text-dim)" }}>
              WordPress or Webflow builds · front-end-only design · short-term staff aug through recruiters · anything under a few days of work. Happy to point you somewhere for those.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
