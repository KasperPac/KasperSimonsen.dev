# Kasper Simonsen — Portfolio Site Build Brief

A sales-oriented personal site for a solo contracting practice. Not a resume, not a blog — a qualifying tool that reassures prospective clients within three seconds that they're dealing with a senior operator with taste.

---

## 1. Who / what / why

- **Name on the site:** Kasper Simonsen
- **Domain:** `kaspersimonsen.dev` (primary), `kaspersimonsen.com` (secondary, redirects)
- **Positioning:** Independent software engineering — full-stack + AI, taking on selective contract work from Melbourne
- **Business model:** Side hustle. Day job continues. Side engagements are opportunistic, higher-rate, specialist work. Not agency-bidding on Upwork.
- **Target client:** Direct (not through recruiters). Primarily: teams building something ambitious that needs multi-tenant SaaS, LLM orchestration, or integrations with systems software doesn't usually touch. Range across industrial/manufacturing, AI tooling, and commerce SaaS.
- **Tone:** Confident without being cold. Technical without being alienating. Warm at the details, bold at the headlines.

---

## 2. Tech stack

- Framework: **Next.js 16** (App Router) + **React 19**
- Language: **TypeScript 5**
- Styling: **Tailwind CSS**
- Deployment: **Vercel**
- Contact: simple form posting to **Resend** (or plain `mailto:` for v1)
- **No Supabase for v1** — static/SSG is fine and removes a layer
- GitHub API integration for the activity log (see §7)

**Repo:** create a new repo, not tucked inside the existing Assemblio monorepo. The portfolio should be structurally decoupled from any single project.

---

## 3. Design system

### Palette

| Token | Hex | Usage |
|---|---|---|
| Background primary | `#0B0B0B` | Main background, deep charcoal |
| Text primary | `#FAFAFA` | Name, headlines, primary copy |
| Text muted | `#AAAAAA` | Subtitles, prose body |
| Text dim | `#666666` | Metadata, tertiary |
| Border | `#1F1F1F` | Section dividers, card edges |
| Accent | `#FF5A1F` | CTAs, availability indicator, emphasis |
| Health (optional) | `#7A9B6E` | Only if needed for "live/healthy" signals on dashboard tiles |

One accent. Orange does the work. Don't introduce secondary colours without a semantic reason.

### Typography

| Role | Font stack | Weight / style |
|---|---|---|
| Hero name (mega display) | `Inter Display, Suisse Intl, Helvetica Neue, Helvetica, Arial, sans-serif` | 900, uppercase |
| Case study headlines | `Fraunces, Instrument Serif, Georgia, serif` | 400, italic |
| Body prose | `Instrument Sans, system-ui, -apple-system, sans-serif` | 400 |
| UI labels, metadata, code | `Geist Mono, IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace` | 400–500 |
| Nav | Same mono stack, uppercase, letter-spacing 0.04–0.06em | |

Load real fonts via `next/font` (Google Fonts). Fraunces italic in particular is doing important character work — don't substitute.

### Anti-patterns to avoid

- Purple gradients. Any gradients, really.
- Uniform rounded corners everywhere. Mostly 0 or 8px at most.
- Centered hero blob with a floating illustration.
- System sans as the hero font — defeats the whole point.
- "WordPress blog" aesthetic — no excessive whitespace padding, no large featured-image layouts, no author avatar circles.
- Fake dashboard metrics. If a number appears on the site, it must be real.

---

## 4. Information architecture

| Route | Purpose |
|---|---|
| `/` | Home — hero, metric tiles, selected work cards, activity log |
| `/work/pac-forge` | Pac-Forge case study (long-form) |
| `/work/assemblio` | Assemblio case study (long-form) |
| `/about` | Short bio, maybe |
| `/contact` | Simple contact form + direct email |

Not in v1: `/writing`, `/now`, `/uses`, third case study, blog. Placeholder links that scroll to contact are fine.

---

## 5. Hero — the locked design

The signature moment of the site. A cursor-hover morph on the name: at rest it's bold, tight, edge-to-edge; on hover it relaxes into readable, comfortable proportions.

### Interaction mechanic

SVG with `textLength` fixed at 760 and `lengthAdjust="spacing"`. Animating `font-size` and `letter-spacing` via CSS transitions — because textLength is locked, the spacing between letters auto-rebalances to fit the width. One coordinated motion, no jumps.

### Hero code (reference implementation)

```html
<!-- Structure -->
<section class="hero-morph">
  <div class="hero-pad-top">
    <span class="hint-pill">
      <span class="pulse-dot-o"></span>
      INDEPENDENT ENGINEERING — AVAILABLE Q2 2026
    </span>
  </div>

  <svg viewBox="0 0 760 130" preserveAspectRatio="xMidYMid meet" style="width:100%; display:block;">
    <text
      class="hero-name-morph"
      x="0" y="65"
      textLength="760"
      lengthAdjust="spacing"
      dominant-baseline="central"
    >KASPER SIMONSEN</text>
  </svg>

  <div class="hero-pad-bottom">
    <p class="hero-sub">
      Multi-tenant SaaS, LLM pipelines, and the occasional seven-agent system
      that writes PLC code. Taking on selective contract work from Melbourne.
    </p>
    <div class="hero-footer">
      <span>MELBOURNE · AEST · UTC+10</span>
      <span>→ SELECTED WORK · 02 PROJECTS</span>
    </div>
  </div>
</section>
```

```css
.hero-morph {
  position: relative;
  background: #0B0B0B;
  overflow: hidden;
}

.hero-name-morph {
  font-family: 'Inter Display', 'Suisse Intl', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-weight: 900;
  fill: #FAFAFA;
  font-size: 125px;
  letter-spacing: -11px;
  transition:
    font-size 0.55s cubic-bezier(0.22, 1, 0.36, 1),
    letter-spacing 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}

.hero-morph:hover .hero-name-morph {
  font-size: 86px;
  letter-spacing: -3px;
}

.pulse-dot-o {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #FF5A1F;
  animation: pulse-o 2s infinite;
  vertical-align: middle;
  margin-right: 7px;
}

@keyframes pulse-o {
  0% { box-shadow: 0 0 0 0 rgba(255, 90, 31, 0.6); }
  70% { box-shadow: 0 0 0 6px rgba(255, 90, 31, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 90, 31, 0); }
}
```

**Critical details:**
- `textLength="760"` must stay static. That's what makes the spacing auto-adjust as `font-size` changes.
- `dominant-baseline="central"` keeps the text vertically centered during the transition (prevents it jumping down as letters shrink).
- Transition timing is `0.55s cubic-bezier(0.22, 1, 0.36, 1)` — ease-out-quint, which has the right snap.
- Don't animate `textLength` itself — it doesn't tween cleanly.

### Touch / mobile behaviour

Hover doesn't exist on touch. Options:
1. Leave the site in "C" state by default and let mobile users see the bold version — acceptable because the morph is a delight, not a usability mechanism.
2. Use `@media (hover: none)` to render A-state by default on touch devices so it's more readable.

I'd go with **option 2**.

---

## 6. Dashboard tile row (below hero)

A row of four tiles that fills the gap between the hero and the selected work. Each tile is a genuine mini-dashboard, not decoration.

| Tile | Content | Data source |
|---|---|---|
| **Systems in prod** | "02" + mini health rows for pac-forge and assemblio with uptime % | Vercel API / Better Uptime |
| **LLM agents** | "07" + 7-node inline SVG showing the Pac-Forge pipeline (PM → CODE → STD → I/O → SAFE → LIB → AUDIT) | Static (facts about Pac-Forge) |
| **Commits · 12w** | Sparkline of weekly commits over last 12 weeks + total count + "live" indicator | GitHub API |
| **Primary stack** | Coloured pills: ts, react, postgres, next, supabase, claude, .net | Static |

**Everything on this row must be real.** If the Vercel API integration isn't ready for v1, swap to simpler static cards rather than faking data.

### Sparkline SVG pattern

```html
<svg viewBox="0 0 140 32" preserveAspectRatio="none" style="width: 100%; height: 32px;">
  <polyline
    fill="none"
    stroke="#FF5A1F"
    stroke-width="1.2"
    points="2,22 14,18 26,20 38,14 50,16 62,10 74,13 86,8 98,11 110,6 122,9 134,4"
  />
  <circle cx="134" cy="4" r="2.2" fill="#FF5A1F" />
</svg>
```

### Agent pipeline SVG pattern

```html
<svg viewBox="0 0 140 14" style="width: 100%; height: 14px;">
  <line x1="7" y1="7" x2="133" y2="7" stroke="#FF5A1F" stroke-width="0.5" stroke-dasharray="2 2" opacity="0.55"/>
  <circle cx="7"   cy="7" r="3.2" fill="#FF5A1F"/>
  <circle cx="28"  cy="7" r="3.2" fill="#FF5A1F"/>
  <circle cx="49"  cy="7" r="3.2" fill="#FF5A1F"/>
  <circle cx="70"  cy="7" r="3.2" fill="#FFFFFF"/>
  <circle cx="91"  cy="7" r="3.2" fill="#FFFFFF"/>
  <circle cx="112" cy="7" r="3.2" fill="#FF5A1F"/>
  <circle cx="133" cy="7" r="3.2" fill="#FF5A1F"/>
</svg>
```

---

## 7. Activity log (pulled from GitHub)

Below the selected work, a compact activity feed showing the most recent N commits across `pac-forge` and `assemblio`. Fetched at build time (ISR with 5-minute revalidation is fine) from the GitHub API. Each row is: date · repo · commit message · short SHA.

```
20 Apr  pac-forge   feat: safety-auditor agent prompt revision     a1c4f8e
18 Apr  assemblio   fix: HMAC verification edge case                f7d22b9
12 Apr  pac-forge   perf: shared cache across agent pipeline        3e8a107
09 Apr  assemblio   feat: drift detection scheduled job             9bb4e02
```

Show 4 rows by default. Optional "view all →" link that goes to a fuller activity page.

**This is the single highest-signal operator move on the site. Treat it as critical, not optional.**

---

## 8. Selected work cards

Two cards side by side. Each contains:
- Status dot + state (`● PRODUCTION · v0.4.2`)
- Year range (`2025 → present`)
- Project slug and category tag
- Italic serif headline (the "thesis" of the project)
- 2–3 sentence description
- Tech pill row

Clicking opens the respective case study page.

### Pac-Forge card copy

- Category tag: `LLM SYSTEMS`
- Headline: *Teaching seven agents to write PLC code.*
- Body: A multi-agent pipeline generates Siemens SCL, compiles it in TIA Portal via a .NET Openness bridge, and learns from every compile failure and engineer correction.
- Pills: React 19 · Claude API · .NET 4.8 · Supabase

### Assemblio card copy

- Category tag: `MULTI-TENANT SAAS`
- Headline: *Inventory that never drifts.*
- Body: A Shopify-connected BOM and component inventory system. Append-only movement ledger, tenant-scoped from the schema up, reconciliation audits baked in.
- Pills: Next.js 16 · Supabase · Shopify API · Postgres

---

## 9. Case studies (long-form)

Each case study page is a standalone read, written in prose rather than bullet-dumped. Structure:

1. **Header** — project name, tagline, status badge, year, role
2. **The problem** — what was broken or missing before this existed
3. **The shape of the system** — architecture diagram + 2–3 paragraphs on how it's organised
4. **The hard bits** — the genuinely difficult technical problems solved, one per section
5. **The result** — what it does now, what it's measured against
6. **Tech details sidebar** — stack, integration points, notable libraries

### Pac-Forge — technical facts

- **What it is:** An internal productivity web app for industrial automation engineers. Flagship module *Pac-ST* generates Siemens PLC code (Structured Control Language / SCL) using Claude AI with direct TIA Portal integration. Secondary module *Pac-LAD* generates Ladder Logic diagrams.
- **The pipeline:** PM → Code Architect → Standards Reviewer → IO Validator → Safety Auditor → Pattern Librarian (+ orchestrator). Multi-agent collaboration to produce production-ready PLC code from natural language specs.
- **TIA Integration:** .NET Framework 4.8 / C# console app wrapping TIA Openness, HTTP + WebSocket on port 5102 (Windows-only).
- **Auto-learning:** Pattern library with WRONG/CORRECT examples pulled from compile errors and engineer corrections. Deterministic diff engine, topological sort for dependency ordering, priority/conflict resolution across Platform Rules, Design Profiles, FB Templates, Agent Knowledge, and Reference Library.
- **Stack:** React 19 + Vite 7 + TypeScript 5.9, Tailwind 3, shadcn/ui, Monaco Editor, Zustand, TanStack Query, React Router v7. Backend: Supabase (Postgres + Edge Functions + Auth + RLS); Edge Functions proxy the Claude API. Real-time: WebSocket job status, optimistic UI, auto-renewing leases.
- **Hard problems to write about:**
  - Orchestrating 7 AI agents deterministically (the most novel)
  - Auto-learning from PLC compile errors
  - The TIA Openness bridge (COM-style API from .NET Framework 4.8)
  - Lease-based concurrency for agent coordination

### Assemblio — technical facts

- **What it is:** Multi-tenant Shopify-connected BOM and component inventory system. Ingests Shopify catalog/orders; runs BOM availability, allocations, stocktakes, purchasing, and movement logging in Supabase.
- **Architectural principles:**
  - Supabase is source of truth; Assemblio never writes Shopify inventory
  - Every read/write is `tenant_id`-scoped
  - Append-only movement ledger
  - Reconciliation and drift detection scheduled jobs
  - HMAC + idempotent Shopify webhooks
- **Stack:** Next.js 16 (App Router) + React 19, TypeScript 5, `@supabase/ssr`, `@supabase/supabase-js`, ESLint 9, Vitest 4. Deploy: Vercel.
- **Hard problems to write about:**
  - Multi-tenant integrity at the schema level (RLS across 40+ tables)
  - The reconciliation / drift-detection subsystem
  - HMAC-verified idempotent webhook handling
  - BOM allocation logic without double-spending

---

## 10. Navigation and footer

### Nav (top of every page)

- Left: `KS —` in mono, letter-spacing 0.06em
- Right: `WORK` · `WRITING` · `ABOUT` · `CONTACT` in mono uppercase, current page white (`#FAFAFA`), others grey (`#888`)
- Border-bottom: `0.5px solid #1F1F1F`
- Consistent across pages

### Footer

Simple single row across the bottom of every page:
- Email: `kasper@simonsen.dev` (replace the `@` with white-colored text for emphasis)
- GitHub · LinkedIn links
- `Melbourne / AEST — UTC+10`

Mono, small (11–12px), dim colour.

---

## 11. Secondary interaction: inversion cursor (for a later page)

The `mix-blend-mode: difference` cursor effect was explicitly held back from the hero. It's a strong effect that deserves its own home. Candidates for where to put it:

- `/work` — a future work-index page where the cursor inverts project names as you scan
- `/contact` — as its own hero, with email address and inversion cursor

For v1, don't implement this — just know it's coming for a future page.

---

## 12. What to skip in v1

- `/writing` route (the nav link can 404 or scroll to contact)
- Third case study
- Supabase or any backend beyond the contact form
- OG image generation beyond a single static one
- Dark/light mode toggle — the site is dark-first, period
- Animation libraries (Framer Motion, GSAP) — CSS transitions handle everything here

---

## 13. Build order suggestion

1. Scaffold Next.js 16 project, configure Tailwind, set up fonts via `next/font`
2. Build the design-token layer (CSS variables or Tailwind theme extension) in one pass
3. Build the hero with the morph — nail this first, it's the hardest single thing
4. Build the metric tile row with static data; wire up the GitHub API integration in a second pass
5. Build the selected work cards
6. Build the activity log (real GitHub API)
7. Build one case study page with the full template
8. Duplicate / adapt for the second case study
9. Contact page + email handling
10. Deploy to Vercel, point domain, ship

Get something live at `kaspersimonsen.dev` as early as step 5. A real URL with real content beats a perfect site in a branch.

---

## 14. Anti-goals

Things the site must NOT do:
- Look like a template (no "I'm a web developer" stock hero)
- Use any skill grid with animated progress bars
- Have a "what I can do for you" services section
- Advertise specific hourly rates
- Link to Upwork / Fiverr / Freelancer profiles
- Include testimonials from fake clients
- Use stock photography of anyone

---

End of brief.
