import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { COPY } from "@/office/copy";
import { theme } from "@/office/theme";
import ContactForm from "@/panels/ContactForm";

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
      <a href="/" className="standalone-enter">{COPY.enter}</a>
      <ContactForm topic={typeof topic === "string" ? topic : undefined} titleId="contact-title" level={1} />
    </main>
  );
}
