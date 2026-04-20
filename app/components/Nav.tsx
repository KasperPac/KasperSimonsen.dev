"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/work", label: "Work" },
  { href: "/writing", label: "Writing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex items-center justify-between px-6 md:px-10 py-4"
      style={{ borderBottom: "0.5px solid var(--border)" }}
    >
      <Link
        href="/"
        className="text-xs tracking-[0.06em] uppercase"
        style={{
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
          color: "var(--text-primary)",
        }}
      >
        KS —
      </Link>
      <div className="flex items-center gap-6">
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
