const mono = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };

export default function Footer() {
  return (
    <footer
      className="flex flex-wrap items-center justify-between gap-4 px-6 md:px-10 py-5 mt-auto"
      style={{ borderTop: "0.5px solid var(--border)" }}
    >
      <a
        href="mailto:hello@kaspersimonsen.dev"
        className="text-xs transition-colors duration-150 hover:opacity-100 opacity-60"
        style={{ ...mono, color: "var(--text-primary)" }}
      >
        hello<span style={{ color: "var(--text-primary)", opacity: 1 }}>@</span>kaspersimonsen.dev
      </a>

      <span className="text-xs" style={{ ...mono, color: "var(--text-dim)" }}>
        Melbourne / AEST — UTC+10
      </span>
    </footer>
  );
}
