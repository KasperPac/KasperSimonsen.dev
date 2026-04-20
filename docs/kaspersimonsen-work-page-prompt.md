# Work page build — handoff to Claude Code

This prompt builds `/work` (index) and `/work/[slug]` (case studies) for the `kaspersimonsen.dev` site. It assumes the main build brief (`kaspersimonsen-dev-build-brief.md`) is already loaded — palette, fonts, anti-goals, and the hero morph mechanic. Anything not specified here inherits from that brief.

---

## 1. Scope of this prompt

Build two things:

1. **`/work`** — the work index page. Two sections: `Currently` and `Previously`. Pac-Forge and Assemblio-v2 live in Currently; Previously is hidden until it has content.
2. **`/work/[slug]`** — the case study template, with one signature interaction on the post title (see §5). Two slugs to create: `pac-forge` and `assemblio`.

---

## 2. Route structure

- `/work` — the index
- `/work/pac-forge` — Pac-Forge case study
- `/work/assemblio` — Assemblio case study (v1 + v2 evolution, see §4)
- Nav link `WORK` in the global nav points to `/work` and shows active state when on any `/work/*` route.

Use Next.js App Router conventions. `/work/page.tsx` and `/work/[slug]/page.tsx`. Generate static params for the two slugs — no dynamic data fetching at request time, case studies should be statically generated.

---

## 3. Work index page — `/work`

### Page structure

```
[Global nav]

[Page header]
  "Work" — large serif italic, same treatment as other section headers
  Meta line below: "TWO PROJECTS — ACTIVE" in mono/orange

[Currently section]
  Section label: "Currently" (serif italic, 24-28px)
  Subtitle line in mono/dim: "Actively developing"
  Two project blocks (see layout below)

[Previously section]
  HIDDEN for now. Implement the component so it can be enabled later by
  populating a `previously` array — if the array is empty, render nothing
  for this section.

[Global footer]
```

### Currently — project block layout

Each "Currently" project gets a generous block, not a compact row. Dense enough to signal substance, open enough to breathe.

```
┌───────────────────────────────────────────────────────────────┐
│ [STATUS PILL]   [VERSION]                        [YEAR RANGE] │
│                                                                │
│ [PROJECT SLUG — uppercase mono]            [CATEGORY TAG]     │
│                                                                │
│ [Italic serif headline — the project's thesis]                │
│                                                                │
│ [2–3 sentence description paragraph]                           │
│                                                                │
│ [Tech pill row]                                                │
│                                                                │
│ [Operator metadata grid — 2 rows x 3 cols]                    │
│   Last commit | Last deploy | Repo stars (if public)          │
│   Primary stack | Integration points | Status                 │
│                                                                │
│                                        [→ Read the case study]│
└───────────────────────────────────────────────────────────────┘
```

### Distinguishing the two "Currently" projects

Both are active but represent different modes. Signal this through the status pill only — everything else follows the same layout.

- **Pac-Forge:** `● BUILDING v0.4.2` (pulse-dot animation, orange accent)
- **Assemblio:** `↻ REBUILDING — v2` (refresh icon instead of dot, same orange treatment. Subtitle beneath: "v1 shipped 2024")

Keep both in the Currently section. Do not split Assemblio across Currently and Previously — it's one project with a v2 rebuild in progress.

### Operator metadata grid

A 2x3 grid of small mono key-value rows per project, pulling real data where possible:

| Pac-Forge | Assemblio |
|---|---|
| Last commit: {from GitHub API} | Last commit: {from GitHub API} |
| Deploy: {from Vercel API, fallback "—"} | Deploy: {from Vercel API, fallback "—"} |
| Stars: {from GitHub API if public repo, hide row if private} | v1 shipped: 2024 |
| Stack: React 19 · Claude API · .NET 4.8 | Stack: Next.js 16 · Supabase · Shopify |
| Integration: TIA Openness | Integration: Shopify OAuth, webhooks |
| Status: Primary focus | Status: Rebuild in progress |

Fetch GitHub data at build time (ISR with 15-min revalidation). No runtime API calls. If a field is unavailable, hide that row — do not fake data.

### Previously section — hidden-by-default implementation

```tsx
const previously: Project[] = []; // empty for now

{previously.length > 0 && (
  <section>
    <h2>Previously</h2>
    {previously.map(...)}
  </section>
)}
```

When this array gets populated later, previously entries should render as **compact rows**, not full blocks — name, year, one-line description, link. Much tighter than the Currently blocks. This creates visual hierarchy: "Currently" = large, "Previously" = small. Reflects what matters now.

---

## 4. Case study page — `/work/[slug]`

Each case study is a standalone long-form page. The brief's §9 covers the structural outline (Header → The problem → The shape of the system → The hard bits → The result → Tech details sidebar); this prompt focuses on what's new for these pages.

### Page header — the signature interaction lives here

The case study title is treated as a second signature moment for the site, equal in craft to the hero morph on the home page but different in mechanic.

Use the **white cursor inversion effect** (`mix-blend-mode: difference`) on the title only. Not applied site-wide — scoped strictly to the case study page title. As the cursor moves across the large title, letters invert from white to black. Outside the title area, the cursor returns to normal.

```
┌───────────────────────────────────────────────────────────────┐
│ [Back link: ← Work]                                            │
│                                                                │
│ [CATEGORY TAG — orange mono]                                   │
│                                                                │
│ [MASSIVE TITLE — white, bold, with inversion cursor]          │
│                                                                │
│ [Italic serif subtitle — the project's thesis]                 │
│                                                                │
│ [Meta strip — year, status, role, stack summary]               │
└───────────────────────────────────────────────────────────────┘
```

Implementation notes for the inversion cursor:

- White circle (~180px diameter) with `mix-blend-mode: difference`
- Follows cursor with a short ease (~0.25 lerp factor per frame)
- Scale 0 on `mouseleave`, scale 1 on `mouseenter`, transition 0.2s
- Only active within the title section's bounding box — outside it, cursor hides and native cursor resumes
- `cursor: none` on the section wrap while active
- Touch-device fallback: no cursor effect, title renders as bold static
- Listen for `prefers-reduced-motion` and disable cursor animation if set

### Title typography

Case study titles are large but not as large as the homepage hero name — the hero is the ceiling, nothing else on the site should out-shout it. Rough scale:

- Case study title: ~72-84px, bold uppercase, tracking tight (~-0.04em)
- Same font family as hero (Inter Display)
- Title should wrap to 2 lines for most case studies; size for that

### Case study titles (initial)

- **pac-forge:** "TEACHING SEVEN AGENTS TO WRITE PLC CODE"
- **assemblio:** "INVENTORY THAT DOESN'T DRIFT"

(The italic-serif thesis line beneath each is kept from the home page cards.)

### Body layout — two-column with sidebar

```
| ─────────── Long-form prose body ─────────── | ─ Sidebar ─ |
|                                              |             |
| The problem                                   | [Tech      |
| [2-3 paragraphs]                              |  details   |
|                                              |  panel —   |
| The shape of the system                      |  sticky    |
| [Architecture diagram]                        |  scroll]   |
| [2-3 paragraphs]                              |             |
|                                              | Role        |
| The hard bits                                | Year        |
| [Subsection A]                                | Stack       |
| [Subsection B]                                | Integration |
|                                              | Status      |
| The result                                   |             |
| [Paragraphs]                                 | [Repo link  |
|                                              |  if public] |
| v2 update (Assemblio only)                    |             |
| [What's changing and why]                     |             |
```

Sidebar sticks to viewport on scroll until the end of the main prose. At mobile widths (< 768px), sidebar collapses to the top of the page above the prose as a single flat block.

### Prose typography

- Body prose: `Instrument Sans` at 17-18px, line-height ~1.7, max-width ~64ch
- Section headings: Fraunces italic at ~32px, not uppercase — editorial rather than dashboard
- Sub-section headings: same font, smaller (22-24px)
- Code blocks: mono font on a slightly-lighter-than-background surface (`#141414`), 14px, padding 1rem, border-radius 4px, no syntax highlighting for v1
- Inline code: mono font, same slight background, border-radius 2px
- Blockquotes: serif italic, left border in orange (0.5px solid)
- Links: orange, no underline, underline on hover

### Assemblio v2 section

The Assemblio case study has an additional section at the end that Pac-Forge doesn't have: **"Bringing it back: v2"**. This is where the rebuild narrative lives. Short section — 2-3 paragraphs. Explains what's changing, why, and what v1 taught that v2 applies.

This section should be clearly demarcated — maybe a thin orange top border, or a small section label in mono orange — so a reader skimming knows this is meaningful context, not an afterthought.

---

## 5. Data layer

For v1, case study content lives in markdown files colocated with the route. Recommended structure:

```
app/
  work/
    page.tsx                  # index page
    [slug]/
      page.tsx                 # case study shell
      components/
        InversionCursor.tsx
    content/
      pac-forge.mdx
      assemblio.mdx
```

Use `next-mdx-remote` or `@next/mdx` for MDX parsing. MDX gives you the ability to embed React components (diagrams, custom tech pills, the Assemblio v2 section) inline in the prose without breaking the writing flow.

Project metadata (title, status, stack, role, dates, category) lives in frontmatter at the top of each MDX file. The work index page reads all MDX files in `content/`, parses frontmatter, and renders the index from that. No separate config file — frontmatter is the source of truth.

Example frontmatter:

```yaml
---
slug: pac-forge
title: "Teaching seven agents to write PLC code"
category: "LLM Systems"
status: "building"
version: "0.4.2"
year: "2025"
yearRange: "2025 → present"
role: "Sole engineer"
stack: ["React 19", "Claude API", ".NET 4.8", "Supabase"]
integration: "TIA Openness"
repo: "https://github.com/..."  # optional
published: true
currentFocus: true
---
```

For Assemblio specifically:

```yaml
---
slug: assemblio
title: "Inventory that doesn't drift"
category: "Multi-tenant SaaS"
status: "rebuilding"
version: "v2"
year: "2024"
yearRange: "2024 → present"
v1ShippedYear: "2024"
role: "Sole engineer"
stack: ["Next.js 16", "Supabase", "Shopify API", "Postgres"]
integration: "Shopify OAuth, webhooks"
published: true
currentFocus: true
---
```

---

## 6. GitHub API integration

The operator metadata rows need real data. Create a shared fetcher used at build time:

```ts
// lib/github.ts
async function fetchRepoMeta(owner: string, repo: string) {
  // Fetch via GITHUB_TOKEN (env var)
  // Return: { lastCommit: { sha, message, date }, stars, defaultBranch }
  // Cache with Next.js fetch revalidation (15 min)
}
```

- Use a personal access token with `public_repo` scope stored in `.env.local` / Vercel env vars as `GITHUB_TOKEN`
- Call from page-level Server Components
- Do NOT call from the client
- If the token is missing or the call fails, fall back gracefully: hide the rows rather than rendering empty cells or error states

Same pattern for Vercel deployment status if you want to include it, though it's lower priority.

---

## 7. Anti-goals (specific to this page)

- No "case study" in the title copy or UI anywhere — if we wanted to say it, we'd say it. The URL segment is `/work/{slug}`, not `/case-studies/{slug}`.
- No stock architecture-diagram visuals. Diagrams should either be genuinely informative (real data flow, real component relationships) or absent.
- No social share buttons on case study pages. Anyone sharing a case study will copy the URL.
- No "related work" section linking to the other case study. With two projects, this is pointless — and it dilutes the one being read.
- No reading time estimate. Length is a bad proxy for value and signals blog-thinking.
- No comments, reactions, or any community interaction. This is a sales document, not a conversation.
- The inversion cursor must NOT appear anywhere except the case study title. Not on the index, not on the home page, not in the nav.

---

## 8. Build order suggestion

1. Scaffold the `/work` route and `/work/[slug]` dynamic segment
2. Set up MDX pipeline and frontmatter parsing
3. Build the Currently project block component (static data first, no GitHub yet)
4. Build the work index page using the component
5. Add Previously section with empty-state guard
6. Scaffold the case study shell (layout, typography, sidebar)
7. Build the inversion cursor component, scope it to the title section
8. Write the Pac-Forge case study MDX — real content, real prose
9. Write the Assemblio case study MDX including the v2 section
10. Wire in the GitHub API fetcher, enhance the Currently blocks with live data
11. Polish — mobile layouts, `prefers-reduced-motion`, touch fallbacks
12. Deploy

Get to a version of `/work` rendering statically by step 4. Everything after is enhancement.

---

## 9. Testing checklist before ship

- [ ] `/work` renders correctly at mobile (320px), tablet (768px), desktop (1024px+)
- [ ] Case study title inversion cursor works on mouse, gracefully degrades on touch
- [ ] `prefers-reduced-motion` is respected — no cursor animation if set
- [ ] Sidebar stickiness works during scroll, collapses at mobile width
- [ ] Cursor effect never escapes the title section bounds
- [ ] GitHub API integration fails gracefully when token missing or rate-limited
- [ ] Both case studies are statically generated at build time, no runtime fetches on the case study pages
- [ ] `WORK` nav link shows active state on all `/work/*` routes
- [ ] Previously section does not render when empty

---

End of work-page prompt.
