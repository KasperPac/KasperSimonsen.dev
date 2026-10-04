"use client";

import { useState } from "react";

const mono = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };

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

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    // Intentionally stubbed — real auth comes later.
    setTimeout(() => {
      setError("Incorrect username or password.");
      setPending(false);
    }, 350);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-[10px] tracking-[0.08em] uppercase" style={{ ...mono, color: "var(--text-dim)" }}>
          Email
        </label>
        <input
          required
          autoFocus
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={inputStyle}
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] tracking-[0.08em] uppercase" style={{ ...mono, color: "var(--text-dim)" }}>
          Password
        </label>
        <input
          required
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={inputStyle}
          disabled={pending}
        />
      </div>

      {error && (
        <p className="text-xs" style={{ ...mono, color: "var(--accent)" }}>
          {error}
        </p>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={pending}
          className="group flex items-center gap-3 px-5 py-3 text-xs tracking-[0.08em] uppercase transition-colors duration-150 disabled:opacity-50"
          style={{
            ...mono,
            color: "var(--accent)",
            border: "0.5px solid var(--accent)",
            background: "rgba(255,90,31,0.04)",
            cursor: pending ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (!pending) (e.currentTarget as HTMLElement).style.background = "rgba(255,90,31,0.1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,90,31,0.04)";
          }}
        >
          {pending ? "Signing in…" : "Sign in"}
          {!pending && (
            <span className="inline-block transition-transform duration-150 group-hover:translate-x-[3px]">→</span>
          )}
        </button>
      </div>
    </form>
  );
}
