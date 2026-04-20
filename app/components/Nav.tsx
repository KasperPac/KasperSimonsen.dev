"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/work",          label: "Work"          },
  { href: "/work-with-me", label: "Work With Me"   },
  { href: "/contact",      label: "Contact"        },
];

const LOGO_FONT = "'Inter Display','Helvetica Neue',Helvetica,Arial,sans-serif";

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
        letterSpacing="-75"
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

  return (
    <nav
      className="flex items-center justify-between px-6 md:px-10 py-5"
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
      <div className="flex items-center gap-8">
        {links.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="text-xs tracking-[0.05em] uppercase transition-colors"
              style={{
                fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                color: active ? "var(--text-primary)" : "#888888",
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
