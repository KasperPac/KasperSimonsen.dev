# SEO Action Plan — kaspersimonsen.dev
**Generated:** 2026-04-24 | **Current score:** 44/100 | **Projected score after all fixes:** ~74/100

---

## Critical (Fix Immediately)

### C1 — Add canonical tags and redirect www to apex
**Impact:** Prevents duplicate content penalty, consolidates link equity  
**Effort:** 30 min  
**How:** In `next.config.ts`, add a redirect rule for www → apex. Then ensure `metadataBase` is set in `layout.tsx` (already done) so Next.js auto-generates canonical links per page.

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.kaspersimonsen.dev' }],
        destination: 'https://kaspersimonsen.dev/:path*',
        permanent: true,
      },
    ]
  },
}
```

### C2 — Add XML sitemap
**Impact:** Enables complete indexation of all 7 pages  
**Effort:** 20 min  
**How:** Create `app/sitemap.ts` (see recommended code in FULL-AUDIT-REPORT.md)

### C3 — Add H1 to homepage
**Impact:** Most important on-page ranking signal for the homepage  
**Effort:** 15 min  
**How:** In `app/components/Hero.tsx`, change the headline element to `<h1>`. If the visual design must not change, add a visually hidden `<h1>` with the target keyword phrase (e.g., "Independent Software Engineer Melbourne").

### C4 — Add JSON-LD structured data
**Impact:** Enables rich results, improves AI citability, establishes entity identity  
**Effort:** 30 min  
**How:** Add a `<script type="application/ld+json">` block in `app/layout.tsx` with `Person` + `ProfessionalService` schema (see FULL-AUDIT-REPORT.md for the full JSON).

---

## High Priority (Fix Within 1 Week)

### H1 — Unique titles and meta descriptions for all pages
**Impact:** Differentiates pages in SERPs, improves CTR  
**Effort:** 30 min  
**How:** Add `generateMetadata()` exports to:
- `app/work/page.tsx` — Title: `"Work — Kasper Simonsen"`, description covering the projects
- `app/work-with-me/page.tsx` — Title: `"Work With Me — Kasper Simonsen, Independent Engineer"`, description of the engagements
- Fix `app/work/[slug]/page.tsx:33` to use `project.description` instead of `project.headline` for `description`
- Shorten the global description in `layout.tsx` to ≤160 chars

Current global description (208 chars):
> "Custom software for businesses when the off-the-shelf tools don't fit. Web, iPhone, Android. Operational tools, Shopify backends, AI agents that write industrial code. Independent engineer based in Melbourne."

Suggested (158 chars):
> "Independent software engineer in Melbourne. Custom web, mobile, and AI systems for businesses when off-the-shelf tools won't do. Shopify, industrial, SaaS."

### H2 — Fix OG image dimensions
**Impact:** Better social sharing previews on LinkedIn, Slack, Twitter  
**Effort:** 30 min  
**How:** Regenerate `app/opengraph-image.png` at 1200×630 pixels and `app/twitter-image.png` at 1200×630 (or 800×418 for Twitter summary_large_image). The current 538×184 will be cropped or letterboxed.

### H3 — Add robots.txt standard directives + Sitemap reference
**Impact:** Explicit crawl guidance + sitemap discovery  
**Effort:** 10 min  
**How:** Replace the current content of `public/robots.txt` (or the Next.js `app/robots.ts` file if that's the source) with:

```
User-agent: *
Allow: /
Disallow: /login
Disallow: /api/

Sitemap: https://kaspersimonsen.dev/sitemap.xml
```

Keep the EU content signals section if desired, but add the standard directives above it.

### H4 — Add llms.txt for AI search visibility
**Impact:** Enables CitationBot, Perplexity, ChatGPT Browse, Claude web search to properly represent the site  
**Effort:** 20 min  
**How:** Create `public/llms.txt`:

```
# Kasper Simonsen — Independent Software Engineer

> Custom software built by a single engineer for businesses when off-the-shelf tools don't fit.

Kasper Simonsen is an independent software engineer based in Melbourne, Australia. He builds custom web applications, mobile apps, and AI-powered systems for small to mid-size businesses. Specialises in Shopify integrations, industrial automation software, and multi-tenant SaaS platforms.

## Services

- Tools & Dashboards: fixed-scope builds (1–3 weeks)
- Platforms & Systems: full-stack project builds (6–16 weeks)

## Notable Work

- Forja: Eight-agent AI pipeline for Siemens TIA Portal (LLM + .NET Openness)
- Assemblio: Shopify-connected BOM, inventory, and operations system (multi-tenant SaaS)
- Silio: Industrial feed production software (Omron PLC + React Native Android + SQL)

## Contact

https://kaspersimonsen.dev/contact
```

---

## Medium Priority (Fix Within 1 Month)

### M1 — Add H1 to contact page
**Effort:** 5 min  
Add a visible or visually-hidden `<h1>Contact</h1>` to `app/contact/page.tsx`.

### M2 — Add BreadcrumbList schema to case study pages
**Effort:** 20 min  
Add JSON-LD breadcrumb markup to `app/work/[slug]/page.tsx` so Google can display breadcrumbs in SERPs.

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Work", "item": "https://kaspersimonsen.dev/work" },
    { "@type": "ListItem", "position": 2, "name": "{project.displayName}", "item": "https://kaspersimonsen.dev/work/{slug}" }
  ]
}
```

### M3 — Enhance case study meta descriptions
**Effort:** 15 min  
In `app/work/[slug]/page.tsx`, change `description: project.headline` to `description: project.description` (the 2-sentence summary already in `data.ts`). This turns 23-char descriptions into 80-200 char ones.

### M4 — Add homepage → work-with-me link
**Effort:** 10 min  
The homepage has no direct link to `/work-with-me`. Add a CTA or navigation hint in the Hero section to improve internal link graph and signal that page's importance.

### M5 — Add security headers
**Effort:** 30 min  
Add to `next.config.ts`:

```typescript
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ],
  }]
}
```

### M6 — Improve homepage content depth
**Effort:** 1–2 hours  
At 317 words the homepage is thin for a primary landing page. Consider adding:
- A short "about" paragraph (2–3 sentences) in the hero
- Explicit mention of target industries (manufacturing, e-commerce, B2B SaaS)
- A brief testimonial or social proof element

### M7 — Cross-link case studies
**Effort:** 20 min  
Add "Related work" links at the bottom of each case study pointing to the other projects. This distributes link equity and keeps readers engaged.

---

## Low Priority (Backlog)

### L1 — Add CreativeWork schema to case study pages
Each case study could have `SoftwareApplication` or `CreativeWork` schema with name, description, author, and technology used. Low priority but adds richness.

### L2 — Remove X-Powered-By header
Add `poweredByHeader: false` to `next.config.ts` to avoid exposing the tech stack in HTTP headers.

### L3 — Consider WebSite schema with SearchAction
If a site search is added later, `WebSite` schema with `SearchAction` enables the Google sitelinks search box.

### L4 — Evaluate font strategy
Four typefaces (Inter, Fraunces, Instrument Sans, Geist Mono) adds load. Fraunces appears to be used only in case study prose. If so, consider deferring it to the case study route only rather than loading globally.

---

## Projected Score After All Fixes

| Category | Current | After Critical | After All |
|---|---|---|---|
| Technical SEO | 38 | 70 | 85 |
| Content Quality | 52 | 52 | 68 |
| On-Page SEO | 38 | 70 | 82 |
| Schema | 0 | 55 | 72 |
| Performance | 70 | 70 | 74 |
| AI Search | 30 | 50 | 72 |
| Images | 82 | 90 | 90 |
| **Estimated total** | **44** | **64** | **~78** |
