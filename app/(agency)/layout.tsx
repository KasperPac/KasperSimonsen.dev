import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Caveat } from "next/font/google";
import "./agency.css";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--agency-sans", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400"], variable: "--agency-mono", display: "swap" });
const note = Caveat({ subsets: ["latin"], weight: ["400"], variable: "--agency-note", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://kaspersimonsen.dev"),
  title: "KS — Websites, AI agents & business software",
  description: "Websites, custom AI agents, business software and digital support for small businesses. A Melbourne practice led by Kasper Simonsen, a Claude Certified Architect.",
  robots: { index: false, follow: false },
};

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en-AU" className={`${sans.variable} ${mono.variable} ${note.variable}`}><body className="agency">{children}</body></html>;
}
