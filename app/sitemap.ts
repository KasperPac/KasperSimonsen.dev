import type { MetadataRoute } from "next";
import { currently, previously } from "./work/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://kaspersimonsen.dev";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base,                     priority: 1.0, changeFrequency: "monthly" },
    { url: `${base}/work`,           priority: 0.9, changeFrequency: "monthly" },
    { url: `${base}/work-with-me`,   priority: 0.9, changeFrequency: "monthly" },
    { url: `${base}/contact`,        priority: 0.7, changeFrequency: "yearly"  },
  ];

  const caseStudies: MetadataRoute.Sitemap = [...currently, ...previously].map((p) => ({
    url: `${base}/work/${p.slug}`,
    priority: 0.8,
    changeFrequency: "monthly" as const,
  }));

  return [...staticRoutes, ...caseStudies];
}
