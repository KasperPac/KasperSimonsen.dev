import type { Metadata } from "next";
import LoginForm from "./LoginForm";
import InversionCursor from "@/app/components/InversionCursor";

export const metadata: Metadata = {
  title: "Sign in — Kasper Simonsen",
  robots: { index: false, follow: false },
};

const mono = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };
const body = { fontFamily: "var(--font-instrument-sans), system-ui, -apple-system, sans-serif" };
const display = { fontFamily: "var(--font-inter), 'Helvetica Neue', Helvetica, Arial, sans-serif" };

export default function LoginPage() {
  return (
    <div>
      {/* Page header */}
      <div
        className="px-6 md:px-10 pt-10 pb-10"
        style={{ borderBottom: "0.5px solid var(--border)" }}
      >
        <p
          className="text-xs tracking-[0.18em] uppercase mb-4"
          style={{ ...mono, color: "var(--accent)" }}
        >
          — client portal
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
            SIGN IN
          </h1>
        </InversionCursor>
        <p
          className="text-sm leading-relaxed max-w-[52ch]"
          style={{ ...body, color: "var(--text-muted)" }}
        >
          Sign in to check where your quote or project is at. Live view of the same thing I&apos;m looking at.
        </p>
      </div>

      {/* Form */}
      <div
        className="grid grid-cols-1 lg:grid-cols-[minmax(0,600px)_1fr]"
        style={{ borderTop: "0.5px solid var(--border)" }}
      >
        <div
          className="px-6 md:px-10 py-12"
          style={{ borderRight: "0.5px solid var(--border)" }}
        >
          <LoginForm />
        </div>

        {/* Info panel — desktop only */}
        <div className="hidden lg:block">
          <div
            className="px-8 py-8"
            style={{ borderBottom: "0.5px solid var(--border)" }}
          >
            <p
              className="text-[10px] tracking-[0.1em] uppercase mb-3"
              style={{ ...mono, color: "var(--accent)" }}
            >
              Not a client?
            </p>
            <p
              className="text-xs leading-relaxed"
              style={{ ...body, color: "var(--text-dim)" }}
            >
              This is just for clients with a live project. If you&apos;re here about starting one, head to the{" "}
              <a
                href="/contact"
                style={{ ...mono, color: "var(--accent)", textDecoration: "none" }}
              >
                contact page
              </a>
              {" "}instead.
            </p>
          </div>

          <div
            className="px-8 py-8"
            style={{ borderBottom: "0.5px solid var(--border)" }}
          >
            <p
              className="text-[10px] tracking-[0.1em] uppercase mb-3"
              style={{ ...mono, color: "var(--accent)" }}
            >
              What you&apos;ll see
            </p>
            <ul className="space-y-2">
              {[
                "Current quote or project status",
                "Timeline and key dates",
                "Recent updates from me",
                "Milestones as they complete",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span
                    style={{
                      ...mono,
                      color: "var(--accent)",
                      fontSize: 10,
                      marginTop: 3,
                    }}
                  >
                    —
                  </span>
                  <span
                    className="text-xs leading-relaxed"
                    style={{ ...body, color: "var(--text-dim)" }}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="px-8 py-8">
            <p
              className="text-[10px] tracking-[0.1em] uppercase mb-3"
              style={{ ...mono, color: "var(--text-dim)" }}
            >
              Source
            </p>
            <p
              className="text-xs leading-relaxed"
              style={{ ...body, color: "var(--text-dim)" }}
            >
              Pulled live from the same board I&apos;m working out of. What you see is what I see — no staging version, no curated updates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
