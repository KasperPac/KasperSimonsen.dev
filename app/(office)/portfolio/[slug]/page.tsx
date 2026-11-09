import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CONTACT_NAME } from "@/content/contact";
import { findWork, work } from "@/content/work";
import CaseStudy from "@/panels/CaseStudy";
import PortfolioNav from "../../PortfolioNav";

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return work.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const item = findWork((await params).slug);
  if (!item) return {};
  return {
    title: `${item.name} — ${CONTACT_NAME}`,
    description: item.description,
    alternates: { canonical: `/work/${item.slug}` },
  };
}

export default async function PortfolioProject({ params }: { params: Params }) {
  const item = findWork((await params).slug);
  if (!item) notFound();
  return (
    <main className="standalone">
      <PortfolioNav />
      <CaseStudy item={item} titleId="project-title" level={1} />
    </main>
  );
}
