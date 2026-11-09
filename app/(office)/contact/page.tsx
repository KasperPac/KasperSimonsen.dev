import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { theme } from "@/office/theme";
import ContactForm from "@/panels/ContactForm";
import PortfolioNav from "../PortfolioNav";

export const metadata: Metadata = {
  title: "Contact — Kasper Simonsen",
  description: "Get in touch with Kasper Simonsen about a website, app or business automation project.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string | string[] }>;
}) {
  const { topic } = await searchParams;
  return (
    <main className="standalone" style={{ "--accent": theme.accents.hs_drawer } as CSSProperties}>
      <PortfolioNav current="contact" />
      <ContactForm topic={typeof topic === "string" ? topic : undefined} titleId="contact-title" level={1} />
    </main>
  );
}
