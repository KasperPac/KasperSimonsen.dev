"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

const mono  = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };
const body  = { fontFamily: "var(--font-instrument-sans), system-ui, -apple-system, sans-serif" };
const serif = { fontFamily: "var(--font-fraunces), 'Instrument Serif', Georgia, serif" };

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
        className="px-6 md:px-10 pt-10 pb-12"
        style={{ borderBottom: "0.5px solid var(--border)" }}
      >
        <h1
          className="text-[clamp(2.5rem,6vw,4rem)] italic leading-tight mb-4"
          style={{ ...serif, color: "var(--text-primary)" }}
        >
          Get in touch.
        </h1>
        <p className="text-[16px] leading-[1.7] max-w-[52ch]" style={{ ...body, color: "var(--text-muted)" }}>
          Describe what you&apos;re building or what you need done. I read every message and reply within 24 hours.
        </p>
      </div>

      {/* Form */}
      <div className="px-6 md:px-10 py-12 max-w-[640px]">
        {status === "sent" ? (
          <div className="space-y-3">
            <p className="text-[1.2rem] italic" style={{ ...serif, color: "var(--text-primary)" }}>
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
    </div>
  );
}
