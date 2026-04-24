# SEO Audit — kaspersimonsen.dev
**Audit date:** 2026-04-24  
**Site:** https://kaspersimonsen.dev  
**Business type:** Independent software engineer / freelance portfolio (service business, B2B)  
**Pages crawled:** 7 (/, /work, /work-with-me, /contact, /work/assemblio, /work/pac-forge, /work/silio)

---

## Overall SEO Health Score: 44 / 100

| Category | Score | Weight | Weighted |
|---|---|---|---|
| Technical SEO | 38/100 | 22% | 8.4 |
| Content Quality | 52/100 | 23% | 12.0 |
| On-Page SEO | 38/100 | 20% | 7.6 |
| Schema / Structured Data | 0/100 | 10% | 0.0 |
| Performance (CWV) | 70/100 | 10% | 7.0 (estimated) |
| AI Search Readiness | 30/100 | 10% | 3.0 |
| Images | 82/100 | 5% | 4.1 |
| **Total** | | | **42.1 / 100** |

> Performance score is estimated (PageSpeed API rate-limited). Vercel + Cloudflare CDN stack is generally fast; score reflects that structural assumptions.

---

## Executive Summary

### Top 5 Critical Issues

1. **No canonical tags anywhere** — Both `www.kaspersimonsen.dev` and `kaspersimonsen.dev` return HTTP 200. Search engines may index both versions, splitting link equity and potentially penalising for duplicate content.
2. **No XML sitemap** — `/sitemap.xml` returns 404. Google cannot efficiently discover or prioritise all pages.
3. **Zero structured data (JSON-LD)** — No Schema.org markup on any page. Missing `Person`, `ProfessionalService`, `WebPage`, and `BreadcrumbList` opportunities.
4. **Homepage has no H1 tag** — The most important on-page signal is entirely absent from the homepage and contact page.
5. **All main pages share the same title and meta description** — `/`, `/work`, and `/work-with-me` all inherit the layout-level defaults with no per-page overrides.

### Top 5 Quick Wins

1. Add `generateMetadata()` to `/work/page.tsx` and `/work-with-me/page.tsx` with unique titles and descriptions (~30 min).
2. Add a `<h1>` to the homepage hero component (~5 min, visually hidden if needed).
3. Add canonical tag via `metadataBase` + per-page canonical in metadata (~20 min).
4. Create `/app/sitemap.ts` using Next.js App Router built-in sitemap generation (~20 min).
5. Add `Person` + `ProfessionalService` JSON-LD to the layout (~30 min).

---

## Technical SEO

### Crawlability

| Check | Status | Notes |
|---|---|---|
| robots.txt accessible | ✅ | Returns 200 |
| robots.txt has Googlebot directives | ❌ | File only contains EU copyright signal declarations — no `User-agent:` or `Disallow:` lines, no `Sitemap:` directive |
| XML sitemap | ❌ | `/sitemap.xml` returns 404 |
| Sitemap referenced in robots.txt | ❌ | No `Sitemap:` entry |
| HTTP → HTTPS redirect | ✅ | 308 redirect in place |
| www → non-www canonical | ❌ | `www.kaspersimonsen.dev` returns 200 (not redirected to apex). Trailing slash on www/work redirects back to www, not apex. |
| 404 handling | ✅ | Not-found pages return 404 (Next.js default) |

**robots.txt issue:** The current file is a custom EU copyright signal format. It is valid in that it allows all crawling (no Disallow), but it is missing the `Sitemap:` directive and lacks standard `User-agent: *` / `Allow: /` declarations that make intent explicit. Some crawlers may not understand the custom format.

### Indexability

| Check | Status | Notes |
|---|---|---|
| Canonical tags | ❌ | Not present on any page |
| Robots meta tag | ✅ | Not set (defaults to index, follow — correct) |
| x-robots-tag header | ✅ | Not set (defaults to index, follow — correct) |
| Duplicate content risk | ❌ | www and non-www both serve identical content without canonical |

### Security Headers

| Header | Status |
|---|---|
| Strict-Transport-Security | ✅ max-age=63072000 (2 years) |
| Content-Security-Policy | ❌ Missing |
| X-Frame-Options | ❌ Missing |
| X-Content-Type-Options | ❌ Missing |
| Referrer-Policy | ❌ Missing |
| Permissions-Policy | ❌ Missing |
| X-Powered-By | ⚠️ Exposes "Next.js" |

Security headers don't directly affect rankings, but Google's best practices audit (Lighthouse) will flag missing headers, and CSP/framing headers affect trust signals.

### Core Web Vitals (estimated)

PageSpeed Insights API was rate-limited. Based on infrastructure analysis:
- **Hosting:** Vercel with Cloudflare CDN (`x-vercel-cache: HIT`)
- **Caching:** ISR/static prerender (`x-nextjs-prerender: 1`)
- **JS bundle:** Appears lean (no heavy third-party scripts observed)
- **Fonts:** Google Fonts via `next/font` (automatic optimisation)
- **Images:** Low image count (0 on homepage, 1–3 on work pages)

Estimated CWV posture: **Good** for desktop, likely **Needs Improvement** on mobile due to large font loads (4 typefaces: Inter, Fraunces, Instrument Sans, Geist Mono).

---

## Content Quality

### E-E-A-T Assessment

**Experience:** Strong signals. All projects are described in first person with specific technical detail (TIA Portal Openness, PLCsim compile-in-loop, Supabase RLS schema design). These are credible specifics that signal genuine authorship.

**Expertise:** Good. Stack choices are specific and accurate. Case studies include implementation constraints ("Seven-level priority hierarchy", "Fixed-field binary protocol between app and PLC"). Reads like someone who did the work.

**Authoritativeness:** Weak. No external links, no backlink profile from industry sources, no publications/press/conferences cited. For a new/small site this is expected but limits authority.

**Trustworthiness:** Adequate. Contact page exists, no phone number or address (expected for solo freelancer). No testimonials or client attribution anywhere on the site.

### Thin Content Pages

| Page | Word Count | Assessment |
|---|---|---|
| / (homepage) | 317 | Thin. Activity log and tile row add sparse copy. |
| /work | 238 | Very thin. Project cards are primarily labels and pills. |
| /work-with-me | 509 | Borderline adequate. Good prose, good structure. |
| /contact | 23 | Intentionally minimal — acceptable for a contact form. |
| /work/assemblio | 833 | Adequate for a case study. |
| /work/pac-forge | 1,605 | Good. Well-developed case study. |
| /work/silio | 1,592 | Good. Well-developed case study. |

### Readability

Content tone is clear and direct. The "plain English" sections on `/work-with-me` (added recently per git history) are good. Technical case studies are readable without being dumbed down. Good fit for the B2B / technical buyer audience.

### Duplicate Content

- Homepage, `/work`, and `/work-with-me` all carry identical meta descriptions (inherited from `layout.tsx`). This is a duplicate meta issue, not page content duplication, but still harmful for SERP display differentiation.

---

## On-Page SEO

### Title Tags

| Page | Title | Length | Issue |
|---|---|---|---|
| / | Kasper Simonsen — Independent Software Engineering | 50 | ✅ Good length; used for 3 pages |
| /work | Kasper Simonsen — Independent Software Engineering | 50 | ❌ Same as homepage |
| /work-with-me | Kasper Simonsen — Independent Software Engineering | 50 | ❌ Same as homepage |
| /contact | Contact — Kasper Simonsen | 25 | ✅ Unique; slightly short |
| /work/assemblio | Assemblio — Kasper Simonsen | 28 | ✅ Unique; could include more keywords |
| /work/pac-forge | Forja — Kasper Simonsen | 23 | ✅ Unique; very short |
| /work/silio | Silio — Kasper Simonsen | 22 | ✅ Unique; very short |

**Issue:** `generateMetadata()` is not implemented for `/work/page.tsx` or `/work-with-me/page.tsx`. Both inherit the global default from `layout.tsx`.

### Meta Descriptions

| Page | Length | Issue |
|---|---|---|
| / | 208 chars | ❌ Over recommended 160 char limit; will be truncated in SERPs |
| /work | 208 chars | ❌ Same as homepage; over limit |
| /work-with-me | 208 chars | ❌ Same as homepage; over limit |
| /contact | 43 chars | ✅ Good length |
| /work/assemblio | 32 chars | ⚠️ Very short — just the project headline |
| /work/pac-forge | 24 chars | ⚠️ Very short — just the project headline |
| /work/silio | 23 chars | ⚠️ Very short — just the project headline |

The case study `generateMetadata()` at `app/work/[slug]/page.tsx:33` uses `description: project.headline` — a one-liner. These should use the project's `description` field (2–3 sentences) instead.

### Heading Structure

| Page | H1 | H2s | Issue |
|---|---|---|---|
| / | ❌ None | None | **Critical** — No heading structure at all |
| /work | ✅ "WORK" | "Currently", "Previously" | Good |
| /work-with-me | ✅ "WORK WITH ME" | 5 semantic H2s | Good |
| /contact | ❌ None | None | Missing H1 |
| /work/assemblio | ✅ "OPERATIONS UNDER THE STOREFRONT" | 4 sections | Good |
| /work/pac-forge | ✅ "CODE THAT STAYS IN SPEC" | 4 sections | Good |
| /work/silio | ✅ "EVERY GRAM, SIGNED FOR" | 4 sections | Good |

The Hero component (`app/components/Hero.tsx`) renders the main headline as a `<p>` or `<span>`, not an `<h1>`. This is the primary on-page SEO gap for the homepage.

### Internal Linking

Internal link graph is sparse but structurally sound:
- Nav links: Work, Work With Me, Contact, Login
- Homepage → Contact ("get in touch")
- Work page → individual case studies
- Case study pages → ← Work (back link)
- Work-with-me page → Contact (two CTAs)

**Gap:** No cross-linking between case studies. No link from the homepage to `/work-with-me`. The `/work-with-me` page is only accessible from the Nav — not linked from the homepage hero or work cards.

---

## Schema & Structured Data

**Current implementation: None.** Zero JSON-LD blocks on any page.

### Missing Schema Opportunities

| Schema Type | Priority | Where |
|---|---|---|
| `Person` | High | layout.tsx / homepage |
| `ProfessionalService` | High | layout.tsx / homepage |
| `WebPage` / `WebSite` | Medium | layout.tsx |
| `BreadcrumbList` | Medium | case study pages |
| `CreativeWork` or `SoftwareApplication` | Medium | work case study pages |
| `ContactPage` | Low | /contact |
| `FAQPage` | Low | /work-with-me (the process steps section) |

### Recommended Person + ProfessionalService Schema

```json
{
  "@context": "https://schema.org",
  "@type": ["Person", "ProfessionalService"],
  "name": "Kasper Simonsen",
  "jobTitle": "Independent Software Engineer",
  "url": "https://kaspersimonsen.dev",
  "description": "Custom software for businesses when the off-the-shelf tools don't fit.",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Melbourne",
    "addressCountry": "AU"
  },
  "knowsAbout": [
    "Custom Software Development",
    "Next.js",
    "Supabase",
    "AI Agents",
    "Shopify Development",
    "Industrial Automation Software"
  ],
  "email": "mailto:kasper.simonsen@pac-technologies.com.au"
}
```

---

## Images

| Check | Status | Notes |
|---|---|---|
| Alt text on all images | ✅ | All `<img>` tags have alt attributes |
| OG image present | ✅ | `/opengraph-image.png` |
| Twitter card image present | ✅ | `/twitter-image.png` |
| OG image dimensions | ⚠️ | 538×184 — non-standard. Recommended: 1200×630 |
| Image formats | ✅ | PNG for logos (appropriate for SVG-converted assets) |
| Lazy loading | ✅ | Next.js handles this via `<Image>` |
| Image count | ✅ | Low (0–3 per page) — no bloat |

**OG image size issue:** The `opengraph-image.png` is 538×184 pixels. Facebook, LinkedIn, and Slack all expect 1200×630 for best rendering. The current size will display with letterboxing or cropping on most social platforms.

---

## Performance (Estimated)

| Signal | Assessment |
|---|---|
| CDN | ✅ Vercel + Cloudflare (`x-vercel-cache: HIT`) |
| Static prerendering | ✅ `x-nextjs-prerender: 1` on homepage |
| Fonts | ⚠️ 4 typefaces (Inter, Fraunces, Instrument Sans, Geist Mono) — may cause CLS on slow connections |
| Third-party scripts | ✅ Only Vercel Analytics (minimal) |
| JavaScript | ✅ Low (apparent lean bundle, SVG wireframes are inline) |
| Stale time | ✅ `x-nextjs-stale-time: 300` |
| Cache-Control | ⚠️ `max-age=0, must-revalidate` — no browser caching; relying entirely on CDN |

---

## AI Search Readiness

| Check | Status |
|---|---|
| `llms.txt` | ❌ Missing (`/llms.txt` returns 404) |
| `robots.txt` AI signals | ⚠️ Custom EU copyright format — unclear to most AI crawlers |
| Structured data for AI citation | ❌ No JSON-LD — reduces citability |
| Factual claims (name, location, services) | ✅ Present in homepage copy and meta description |
| Clear service area statement | ✅ "Melbourne" mentioned in meta description |
| Clear service description | ✅ Strong in prose copy |
| Author attribution | ⚠️ No authorship markup |
| Canonical identity signals | ⚠️ Weak — no social profiles linked, no external citations |

Kasper's portfolio could benefit significantly from `llms.txt` since potential clients may ask AI assistants "find an independent developer in Melbourne who does Shopify/AI work." Without structured discoverability signals, the site is unlikely to be cited in AI-generated answers.

---

## Sitemap Analysis

**No sitemap exists.** A Next.js App Router sitemap is trivial to implement.

### Recommended `app/sitemap.ts`

```typescript
import { MetadataRoute } from 'next'
import { currently, previously } from './work/data'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://kaspersimonsen.dev'
  const staticRoutes = ['', '/work', '/work-with-me', '/contact'].map(path => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: path === '' ? 1.0 : 0.8,
  }))
  const caseStudies = [...currently, ...previously].map(p => ({
    url: `${base}/work/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))
  return [...staticRoutes, ...caseStudies]
}
```

---

## Search Experience (SXO)

**Page-type intent alignment:**
- `/` — portfolio/brand page. Serves informational intent well ("who is this person"). Weak on conversion intent ("hire this person") — the call-to-action path is not prominent.
- `/work` — case study listing. Serves research intent well.
- `/work-with-me` — services page. Good fit for commercial intent ("can I hire a developer").
- `/work/[slug]` — case study deep dive. Serves research/validation intent well.

**SERP click-through risk:** With duplicate titles and over-length descriptions across main pages, SERPs will show the same snippet for 3 different pages. This confuses users and wastes crawl budget.

---
