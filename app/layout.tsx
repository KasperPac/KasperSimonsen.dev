import type { Metadata } from "next";
import { Inter, Fraunces, Instrument_Sans, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Nav from "@/app/components/Nav";
import Footer from "@/app/components/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["italic"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const SITE_TITLE = "Kasper Simonsen — Independent Software Engineering";
const SITE_DESCRIPTION =
  "Custom software for businesses when the off-the-shelf tools don't fit. Web, iPhone, Android. Operational tools, Shopify backends, AI agents that write industrial code. Independent engineer based in Melbourne.";

export const metadata: Metadata = {
  metadataBase: new URL("https://kaspersimonsen.dev"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    url: "https://kaspersimonsen.dev",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: "Kasper Simonsen",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${instrumentSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg-primary text-text-primary">
        <Nav />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
