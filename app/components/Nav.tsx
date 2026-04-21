"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/work",          label: "Work"          },
  { href: "/work-with-me", label: "Work With Me"   },
  { href: "/contact",      label: "Contact"        },
];

const LOGO_FONT = "var(--font-inter), 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "var(--font-geist-mono), ui-monospace, monospace";

function KSLogo({ hovered }: { hovered: boolean }) {
  return (
    <svg viewBox="0 0 200 200" style={{ width: 40, height: 40, display: "block" }}>
      <rect
        width="200" height="200"
        fill={hovered ? "#0B0B0B" : "#FF5A1F"}
        stroke={hovered ? "#1F1F1F" : "none"}
        strokeWidth="1"
      />
      <text
        x="18" y="155"
        fontSize="180"
        letterSpacing="-45"
        fill={hovered ? "#FAFAFA" : "#0B0B0B"}
        style={{ fontFamily: LOGO_FONT, fontWeight: 900 }}
      >
        KS
      </text>
    </svg>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const [logoHovered, setLogoHovered] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <nav
        className="flex items-center justify-between gap-4 px-4 md:px-10 py-5"
        style={{ borderBottom: "0.5px solid var(--border)" }}
      >
        <Link
          href="/"
          style={{ display: "block", lineHeight: 0 }}
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
        >
          <KSLogo hovered={logoHovered} />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-xs tracking-[0.05em] uppercase transition-colors"
              style={{
                fontFamily: MONO,
                color: isActive(href) ? "var(--text-primary)" : "#888888",
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden relative flex items-center justify-center w-10 h-10 -mr-2"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
        >
          <span
            className="absolute h-[1.5px] w-6 transition-transform duration-200"
            style={{
              background: "var(--text-primary)",
              transform: open ? "rotate(45deg)" : "translateY(-5px)",
            }}
          />
          <span
            className="absolute h-[1.5px] w-6 transition-opacity duration-200"
            style={{
              background: "var(--text-primary)",
              opacity: open ? 0 : 1,
            }}
          />
          <span
            className="absolute h-[1.5px] w-6 transition-transform duration-200"
            style={{
              background: "var(--text-primary)",
              transform: open ? "rotate(-45deg)" : "translateY(5px)",
            }}
          />
        </button>
      </nav>

      {/* Mobile menu panel */}
      <div
        id="mobile-nav"
        className="md:hidden overflow-hidden transition-[max-height] duration-200 ease-out"
        style={{
          maxHeight: open ? "300px" : "0px",
          borderBottom: open ? "0.5px solid var(--border)" : "none",
        }}
      >
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="block px-4 py-4 text-xs tracking-[0.05em] uppercase transition-colors"
            style={{
              fontFamily: MONO,
              color: isActive(href) ? "var(--text-primary)" : "#888888",
              borderTop: "0.5px solid var(--border)",
            }}
          >
            {label}
          </Link>
        ))}
      </div>
    </>
  );
}
