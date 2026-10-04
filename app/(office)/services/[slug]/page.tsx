import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findService, services } from "@/content/services";
import ServiceArticle from "@/panels/ServiceArticle";
import { COPY } from "@/office/copy";
import { theme } from "@/office/theme";

type Params = Promise<{ slug: string }>;

/** Only the four services exist; anything else 404s. */
export const dynamicParams = false;

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const service = findService((await params).slug);
  return service ? { title: `${service.name} — Kasper Simonsen`, description: service.summary } : {};
}

/** A shared or refreshed service link (interactions spec 3.6): the whole service, and the way back into the office. */
export default async function ServicePage({ params }: { params: Params }) {
  const service = findService((await params).slug);
  if (!service) notFound();
  return (
    <main className="standalone" style={{ "--accent": theme.accents.hs_shelf } as CSSProperties}>
      <Link href="/" className="standalone-enter">
        {COPY.enter}
      </Link>
      <ServiceArticle service={service} titleId="service-title" level={1} />
    </main>
  );
}
