import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./office.css";

// Carried over from the old site; phase 5 rewrites the description in Kasper's voice.
const SITE_TITLE = "Kasper Simonsen — Independent Software Engineering";
const SITE_DESCRIPTION =
  "Independent software engineer in Melbourne. Custom web, mobile & AI systems when off-the-shelf won't do — Shopify, industrial automation, multi-tenant SaaS.";

export const metadata: Metadata = {
  metadataBase: new URL("https://kaspersimonsen.dev"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
};

export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
