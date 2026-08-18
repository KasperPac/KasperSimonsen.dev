import type { Metadata } from "next";
import { Inter_Tight, Instrument_Serif } from "next/font/google";
import SmoothScroll from "./v2/components/SmoothScroll";
import "./v2.css";

const interTight = Inter_Tight({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif-v2",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kaspersimonsen.dev"),
  title: "Kasper Simonsen — Freelance Web & App Developer",
  description:
    "Freelance web and app developer in Melbourne. Custom platforms, mobile apps, and AI systems for businesses when off-the-shelf software doesn't fit.",
  // Parallel design preview — keep it out of the index while the current site is canonical.
  robots: { index: false, follow: false },
};

export default function V2Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${interTight.variable} ${instrumentSerif.variable}`}>
      <body className="v2-body">
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
