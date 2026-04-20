const mono = { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" };

export default function Footer() {
  return (
    <footer
      className="flex flex-wrap items-center justify-between gap-4 px-6 md:px-10 py-5 mt-auto"
      style={{ borderTop: "0.5px solid var(--border)" }}
    >
      <a
        href="mailto:kasper@simonsen.dev"
        className="text-xs transition-colors duration-150 hover:opacity-100 opacity-60"
        style={{ ...mono, color: "var(--text-primary)" }}
      >
        kasper<span style={{ color: "var(--text-primary)", opacity: 1 }}>@</span>simonsen.dev
      </a>

      <div className="flex items-center gap-6">
        <a
          href="https://github.com/kaspersimonsen"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs opacity-40 hover:opacity-100 transition-opacity duration-150"
          style={{ ...mono, color: "var(--text-primary)" }}
        >
          GitHub
        </a>
        <a
          href="https://linkedin.com/in/kaspersimonsen"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs opacity-40 hover:opacity-100 transition-opacity duration-150"
          style={{ ...mono, color: "var(--text-primary)" }}
        >
          LinkedIn
        </a>
      </div>

      <span className="text-xs" style={{ ...mono, color: "var(--text-dim)" }}>
        Melbourne / AEST — UTC+10
      </span>
    </footer>
  );
}
