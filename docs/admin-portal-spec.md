# Admin Portal — Document Authoring & Rendering

> Spec for adding a private admin area to `kaspersimonsen.dev` that lets Kasper author, revise, render, and share client deliverables (Project Planning Documents and, later, other document types) using the existing KS brand template system.

**Status:** Ready to build
**Phase:** A (structured-form authoring + PDF export). Designed so Phase C (live web URLs as deliverables) is a natural extension rather than a rebuild.
**Author:** Spec drafted with Claude (chat); implementation by Claude Code.

---

## 00 · Before you start

Read these files first. They define the visual contract this portal must produce. Do not start writing portal code without reading them.

| File | What it tells you |
|---|---|
| `/content/templates/ppd/style.css` | The complete brand CSS. Class names, CSS variables, font stacks, page layout. **Do not modify.** |
| `/content/templates/ppd/reference/forja-index.html` | A complete example of valid HTML output. Every section pattern, every shortcode, every component. **The HTML the portal generates must match this structure.** |
| `/content/templates/ppd/reference/forja-ppd.pdf` | The rendered output. Visual reference. New PDFs the portal generates should look indistinguishable in style. |
| `/content/templates/ppd/assets/` | Fonts and the KS monogram. Referenced by `style.css`. The portal links to these at render time. |

When in doubt about an HTML structure, class name, or visual pattern, the reference HTML is authoritative — not this spec, not your training data. If the reference disagrees with the spec, ask before changing either.

---

## 01 · Goal in one sentence

Replace the current "copy a folder, edit HTML, run a render script" workflow for client deliverables with a private web admin where Kasper logs in, fills in structured forms per document section, gets per-section AI prompts to draft/polish copy, renders to PDF on demand, and shares with clients via a private URL or PDF download — with automatic revision history.

---

## 02 · Non-goals (do not build these)

These are deliberately out of scope. Do not build them, do not scaffold them, do not "leave room" for them in ways that complicate the core work.

- **Client-facing accounts or authentication.** Clients never log in. They receive a PDF or click a tokenised share link.
- **Real-time collaboration.** Single user, no concurrent edit handling.
- **Block-based editor (Notion-style).** Each section is a single rich-text/markdown field, not a stack of typed blocks.
- **Diagram editor.** Diagrams are uploaded as PNG/SVG files per project (Phase A approach). No in-browser diagram authoring.
- **Brand redesign.** The existing CSS, fonts, monogram, and PDF template system are inputs, not deliverables. Do not "improve" the brand.
- **Database.** Content lives in repo files. No Postgres, no Supabase, no SQLite. (See §05.)
- **Migration to Supabase.** This is a likely v2 move, but not now. Don't write code that anticipates it.
- **AI integration in-app.** The AI prompt feature copies a prompt to clipboard for Kasper to paste into Claude/ChatGPT externally. No API calls to AI providers from this app.
- **PDF templating beyond what already exists.** The HTML/CSS/font system from the template is the renderer. Do not introduce a different PDF library or templating engine.

---

## 03 · The existing template system (input, not deliverable)

A working template already exists in this repo at `/content/templates/ppd/`:

```
content/templates/ppd/
├── style.css                       ← Brand styling — DO NOT MODIFY
├── assets/
│   ├── fonts/                      ← 8 TTFs (Inter, Instrument Sans, Fraunces, Geist Mono)
│   └── img/
│       └── ks-monogram.png
└── reference/
    ├── forja-index.html            ← Complete example of valid HTML output
    └── forja-ppd.pdf               ← The rendered output, for visual comparison
```

The admin portal's job is to:

1. **Generate HTML** dynamically from structured project data, matching the patterns in `forja-index.html`.
2. **Run WeasyPrint** against that HTML, with `style.css` and the assets folder, to produce a PDF.
3. **Serve both** the rendered PDF and (eventually) a live web view.

The CSS, fonts, and assets are not regenerated or modified by the portal — they're read at render time.

**Critical:** The class names and CSS variables in `style.css` are the contract. The portal must produce HTML using those exact patterns: `.section-opener`, `.h2-block`, `ul.brand`, `table.brand`, `.callout`, `.quote`, `figure`, `.toc`, etc. See `forja-index.html` for the full vocabulary.

---

## 04 · Tech stack

The site is **Next.js (App Router) + TypeScript + Tailwind**, deployed on Vercel.

**Add for this feature:**

- **WeasyPrint** for PDF rendering. Runs as a child process (`python3 -m weasyprint ...`) from a Next.js API route. Requires Python 3 and WeasyPrint installed on the host. **This means the admin must run on a host with Python available — not Vercel's serverless functions.** See §06 for the deployment story.
- **Marked** (or a similar markdown→HTML library) for converting section markdown to HTML.
- **Zod** for schema validation of document JSON files.
- **next-auth** with a single hardcoded credential (or a simpler env-var password) for the admin gate. Auth is genuinely simple; do not over-engineer.

**Do not add:**
- A new UI library beyond what the site already uses
- A WYSIWYG editor (use a `<textarea>` with markdown — see §08)
- An ORM, query builder, or any database client
- A state management library beyond React's built-ins

---

## 05 · Data model — files, not tables

All document data lives in the repo at `/content/documents/`. This means:

- **Versioning is git.** Every save is a commit (in dev, manual; in production, see §06).
- **No migrations.** Schema is enforced at read time by Zod.
- **No backups.** Git is the backup.

### Directory layout

```
/content/documents/
  /<doc-id>/
    meta.json                    Project-level metadata (slug, client, current revision, etc.)
    /revisions/
      v1.json                    A complete document at a point in time
      v2.json
      v3.json
    /assets/
      <user-uploaded files>      Diagrams, logos, etc. for this document
```

### `meta.json` schema

```typescript
{
  id: string;                    // short stable id, e.g. "doc_xk2p9"
  slug: string;                  // url-safe slug, e.g. "forja"
  client: string;                // display name, e.g. "Pac Technologies"
  type: "ppd";                   // document type — only "ppd" for now
  currentRevision: number;       // which revision is "live"
  shareToken: string | null;     // long random string if shared, null if not
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

### Revision schema (`vN.json`)

```typescript
{
  revision: number;              // matches the filename
  documentType: "ppd";
  cover: {
    eyebrow: string;             // lowercase project slug
    title: string;               // big headline (allows <br> for line breaks)
    subtitle: string;            // Fraunces-italic one-liner
    hint: string;                // status banner ("Project Planning Document — v1.0 · Draft")
    meta: {
      client: string;
      author: string;            // defaults to "Kasper Simonsen"
      date: string;              // YYYY-MM-DD
      status: string;            // "Draft" | "Final" | other
      engagement: string;
      stack: string;
      pages: string;             // "29" or "—"
      documentId: string;        // "ks-ppd-acme-v1"
    };
  };
  contents: Array<{              // table of contents entries
    num: string;                 // "01", "02", "A", "B"
    label: string;
    meta: string;                // "Brief", "Discovery", "Architecture", etc.
  }>;
  sections: Array<{              // the actual document body
    id: string;                  // stable, used for permalinks
    num: string;                 // "01", "A"
    meta: string;                // section meta tag, matches contents
    title: string;               // h1
    body: string;                // markdown — see §08 for what's supported
  }>;
  createdAt: string;
  notes?: string;                // optional revision note ("Added risk register")
}
```

### Why this shape

- **Cover and contents are separate from sections** because they're structurally different and need their own form layout.
- **Sections are an ordered array, each with markdown body**, because that's the simplest thing that works. We don't need a typed-block system to ship value.
- **Section IDs are stable across revisions** so future "show me what changed" features can diff revisions section-by-section.
- **`documentType` is on the revision, not just meta.json**, so a single document could in principle change type (it shouldn't, but the data won't lie).

---

## 06 · Deployment

This is the biggest non-obvious part of the spec, so read it carefully.

### The constraint

WeasyPrint is a Python library. It cannot run in a Vercel serverless function. The admin portal therefore cannot live on standard Vercel hosting alongside the rest of the site.

### The solution — split deployment

**Public site (`kaspersimonsen.dev`)** stays on Vercel as it is now. No changes.

**Admin portal (`/admin/*` routes + the API routes that render PDFs)** runs **locally on Kasper's machine** during normal use. The portal reads/writes files in the repo, which is a working copy. When Kasper finishes editing, they commit and push. Public share routes (`/d/<token>`) read the committed files from the deployed Vercel build.

This means:

- The admin URL is `http://localhost:3000/admin` — only ever accessed by Kasper, on his laptop.
- The Vercel-deployed site does NOT include the admin routes. Use Next.js middleware or a build-time env check to gate them.
- The Vercel-deployed site DOES include `/d/<token>` routes, which serve the committed document data as a read-only web view (Phase C scaffolding).
- After editing, Kasper runs `git add . && git commit && git push` to publish updates. The deploy step is mildly annoying but acceptable.

### Why this is the right call

- Zero infrastructure cost.
- Git is the audit trail.
- The "private to me" property is enforced by the network — there's no public admin URL to attack.
- No need to set up a VPS, no Python on the production server, no auth system to harden.
- Trivial to upgrade later: when you want a server-hosted admin, the data layer doesn't change.

### Concrete implementation notes

- API route handlers that touch the file system or run WeasyPrint should `throw new Error("Admin not available in production")` if `process.env.NODE_ENV === "production"` — a defensive belt-and-braces measure.
- The `/admin` page should similarly refuse to render in production.
- Add a `dev:admin` script to `package.json`: `next dev --turbo` plus whatever env vars are needed.
- Document this clearly in the repo's main README.

### What about the PDF rendering — do we need a PDF for the share link?

Yes, but it's pre-generated. When Kasper hits "Render PDF" in the admin, the resulting PDF gets written to `/public/d/<token>.pdf` (or similar) and committed alongside the document JSON. Public share routes serve that pre-rendered PDF. WeasyPrint never runs in production.

---

## 07 · Routes and pages

### Admin (local-only)

| Route | Purpose |
|---|---|
| `/admin` | Login screen — single password field, sets a cookie, redirects to project list |
| `/admin/projects` | List of all documents — grid of cards, "New project" button |
| `/admin/projects/new` | Create a new project: pick type (only "ppd" available), fill client name, slug auto-generates |
| `/admin/projects/[id]` | Project dashboard — shows current revision, list of past revisions, "Edit", "Render PDF", "Share" actions |
| `/admin/projects/[id]/edit` | The editor — split-pane: section nav on left, current section's form on right |
| `/admin/projects/[id]/preview` | HTML preview of the document at the current revision (uses the same template as the PDF) |

### API (local-only)

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/auth` | POST | Login |
| `/api/admin/projects` | GET | List projects |
| `/api/admin/projects` | POST | Create project |
| `/api/admin/projects/[id]` | GET | Get meta + current revision |
| `/api/admin/projects/[id]` | PATCH | Update meta (client name, share token, etc.) |
| `/api/admin/projects/[id]/revisions` | POST | Save current edits as a new revision |
| `/api/admin/projects/[id]/revisions/[n]` | GET | Get a specific revision |
| `/api/admin/projects/[id]/render` | POST | Render the current revision to PDF, save to `/public/d/<token>.pdf` |
| `/api/admin/projects/[id]/share` | POST | Generate / rotate / clear share token |
| `/api/admin/projects/[id]/upload` | POST | Upload a diagram or asset to `/content/documents/<id>/assets/` |

### Public (production, on Vercel)

| Route | Purpose |
|---|---|
| `/d/[token]` | Public document view — currently just an HTML page with a download button for the PDF |
| `/d/[token].pdf` | The pre-rendered PDF (served from `/public/d/<token>.pdf`) |

### Routes that don't exist (yet)

- `/admin/templates` — no template editing in v1
- `/admin/settings` — settings live in env vars
- `/d/<token>/edit` — clients never edit
- `/d/<token>/v/<n>` — revision-by-revision public view comes in Phase C

---

## 08 · The editor

The most-used screen. Get this right.

### Layout

Split-pane on desktop, stacked on mobile (mobile is low priority but should not break).

**Left pane (≈30%):** A vertical nav showing the document's structure.
- Cover (one item)
- Contents (one item)
- Sections (a list — click to jump to that section's form)
- "+ Add section" button at the bottom
- Drag-handle to reorder sections (use `react-beautiful-dnd` or `dnd-kit`)

**Right pane (≈70%):** The form for whatever's selected on the left.

- **Cover form** — fields for every cover token (eyebrow, title, subtitle, hint, all 8 metadata cells)
- **Contents form** — editable list of `{num, label, meta}` rows, with add/remove/reorder
- **Section form** — three fields:
  - `num` — short text input
  - `meta` — short text input (autocompletes from existing values: Brief, Discovery, Scope, Architecture, Risk, Delivery, Appendix)
  - `title` — text input
  - `body` — large `<textarea>` for markdown
  - "Generate AI prompt" button (see §09)

### Body field — markdown, not WYSIWYG

The body of each section is **markdown in a plain `<textarea>`**, not a rich-text editor. Reasons:

- It's faster to build.
- It's faster to author in (Kasper is a developer).
- It composes well with the AI prompt workflow — paste markdown out, paste markdown in.
- It avoids the "what if the rich-text editor produced HTML the brand CSS doesn't know how to style?" problem.

### Markdown features supported

The body field supports a deliberately limited subset of markdown, plus a few brand-specific shortcodes. The renderer (custom — built on top of `marked`) translates these into the HTML structures the brand CSS expects.

| Markdown / shortcode | Renders as |
|---|---|
| `# Heading` | `<h2>` (no h1 in body — h1 is the section title field) |
| `## Heading` | `<h3>` (mono uppercase orange) |
| `### Heading` | error or warning — only 2 levels supported |
| `**bold**` | `<strong>` |
| `*italic*` | `<em>` |
| `` `code` `` | `<code class="mono">` |
| `- item` | `<ul class="brand"><li>` |
| `1. item` | `<ol class="brand"><li>` |
| `> quote` | `<div class="quote">` |
| `\| col \| col \|` table syntax | `<table class="brand">` |
| `:::callout LABEL` ... `:::` | `<div class="callout"><span class="label">LABEL</span><p>...</p></div>` |
| `:::lead` ... `:::` | `<p class="lead">...</p>` |
| `:::dim` ... `:::` | `<p class="dim">...</p>` |
| `![alt](filename.png)` | `<figure><img src="..."><figcaption>...</figcaption></figure>` — caption from alt text |
| `<br>` | line break (preserved) |

The h2-block-with-eyebrow pattern (`SECTION · 01` / `Heading text`) is enough of a special case to get its own shortcode:

```
:::eyebrow Stage 02 — Months 6–9
## Hosted Supabase, local frontend
:::
```

Renders to:

```html
<div class="h2-block">
  <span class="eyebrow">Stage 02 — Months 6–9</span>
  <h2>Hosted Supabase, local frontend</h2>
</div>
```

### Tables

Standard markdown tables. The renderer adds `class="brand"` automatically. For row-label tables (first column is a label), use a fence flag: `\|---\|---\|{.rowlabels}` — or whatever syntax `marked` extensions allow. Pick one and document it.

### Saving

- Saves to memory continuously (debounced) so navigating between sections doesn't lose work.
- "Save revision" button at the top creates a new immutable `vN.json` file with the current state and bumps `currentRevision` in `meta.json`.
- An optional "revision note" textarea above the save button captures what changed.
- Confirm dialog if the user navigates away with unsaved changes.

### Preview

The `/admin/projects/[id]/preview` route renders the current revision to HTML (using the same template the PDF renderer uses) and shows it in a styled iframe at A4 aspect ratio. Useful for quick visual checks without going through the PDF round-trip.

---

## 09 · AI prompt feature

This is the differentiator. Build it carefully.

### What it does

In the section editor, a "Generate AI prompt" button. Clicking it:

1. Looks up the prompt template for that section type (or, if section-type-specific prompts don't exist yet, the generic section prompt).
2. Injects: project metadata (client, type, slug), the section's current state (num, title, existing body), and the KS voice rules.
3. Copies the resulting prompt to the clipboard.
4. Shows a toast: "Prompt copied — paste into Claude or ChatGPT."

Kasper pastes the prompt into Claude/ChatGPT externally, gets a draft, and pastes the result back into the body field manually.

### The prompt template

Stored in the repo at `/content/prompts/<docType>/<sectionId>.md`. If a section-specific template doesn't exist, fall back to `/content/prompts/<docType>/_default.md`.

A template is a markdown file with template tokens. Example:

```markdown
You are drafting the **{{section.title}}** section of a Project Planning Document for Kasper Simonsen, an independent software engineer in Melbourne, working with {{project.client}} on a project called {{project.slug}}.

**Voice rules — non-negotiable:**
- Direct, plain-spoken, slightly understated. Australian register.
- Em-dashes welcome. Lowercase project names (forja, not Forja).
- No marketing language. Never use the words: solutions, delight, amazing, unleash, cutting-edge, synergy.
- Specific over generic. Numbers over hand-waving.
- Sentence case for body, headlines may be sentence case or uppercase.

**Section purpose:**
{{section.purpose}}

**Project context:**
{{project.summary}}

**Existing draft (may be empty):**

{{section.body}}

**Your task:**
{{userInstruction}}

Output as markdown, using only:
- Paragraphs
- ## headings (level-2 max)
- - bullet lists
- 1. numbered lists
- > quotes
- Tables with the standard syntax
- :::callout LABEL ... ::: blocks for emphasised insights
- :::lead ... ::: for the section's opening paragraph
```

### Where the section-specific bits come from

Every section type has metadata stored in `/content/types/ppd.json`:

```json
{
  "type": "ppd",
  "name": "Project Planning Document",
  "sectionTypes": [
    {
      "id": "executive-summary",
      "name": "Executive Summary",
      "purpose": "A 2-3 paragraph thesis statement of what the project is, who it's for, and why it matters. Lead with the strongest claim. No preamble. The reader should know whether to keep reading after the first sentence.",
      "promptTemplate": "executive-summary"
    },
    {
      "id": "risk-register",
      "name": "Risk Register",
      "purpose": "A markdown table of 8-12 risks. Columns: ID (R-01, R-02...), Risk (one-line description), Likelihood (Low/Medium/High), Impact (Low/Medium/High/Very High), Mitigation. Mitigations should be specific and actionable, not generic.",
      "promptTemplate": "risk-register"
    }
    // ... more
  ]
}
```

When Kasper creates a section in the editor, he picks from this list (or "Custom"). The section's `purpose` and `promptTemplate` are stored in the revision so the prompt can be regenerated correctly.

### The "userInstruction" field

When Kasper clicks "Generate AI prompt," a small modal appears with a single textarea labelled "What do you want the AI to do?" with placeholder text like:

> "Draft this section from scratch based on the context above"
> "Tighten this draft and remove any marketing language"
> "Add a paragraph about [topic]"
> "Convert this into a comparison table"

He types one line, hits Copy. That line gets injected as `{{userInstruction}}` in the prompt.

### Why no in-app AI

- Cost predictability — Kasper's AI usage is on his own subscription, not metered through the app.
- Quality control — Kasper reviews every output before it lands in the document.
- Simplicity — no API keys, no streaming, no error handling for AI providers.
- Tool freedom — Kasper can use whichever AI is best for the task without app changes.

This is the right trade-off for v1. May be worth revisiting in v2.

---

## 10 · Sharing

### Phase A behaviour (now)

A document can be in one of two states:

- **Private** — `meta.shareToken` is `null`. Only Kasper sees it.
- **Shared** — `meta.shareToken` is a long random string (e.g. 32 chars). The PDF is accessible at `https://kaspersimonsen.dev/d/<token>.pdf`. The HTML view is accessible at `https://kaspersimonsen.dev/d/<token>`.

The HTML view at `/d/<token>` is intentionally minimal in Phase A: a small banner with the project name and version, a download button for the PDF, and an iframe of the rendered document. It exists primarily to scaffold Phase C, not to be the primary deliverable.

### Sharing a document

In `/admin/projects/[id]`, three buttons:

- **Share publicly** — generates a token if none exists, copies the URL to clipboard
- **Rotate token** — generates a new token, invalidating any previously shared URL
- **Stop sharing** — sets the token to null, makes the URL 404

Tokens are 32-char URL-safe random strings. They're long enough to be unguessable for low-stakes sharing, not long enough for high-security needs. This is fine for the use case.

### What happens when a revision is saved on a shared document

The latest committed revision is what's served. If Kasper saves revision 3 of a shared document, then commits and pushes, `/d/<token>.pdf` serves revision 3's PDF.

Provide a per-document setting `pinnedRevision: number | null` so Kasper can lock the public URL to a specific revision (useful when negotiating — you don't want the doc changing under the client). Default is `null` (always serve latest).

---

## 11 · Building order — vertical slices

Build in this order. Each slice is independently shippable and the project remains usable at every stage.

### Slice 1 — Foundation

- File system layout under `/content/documents/`
- Zod schemas for `meta.json` and revision JSON
- Read/write helpers
- Auth middleware for `/admin/*`
- Login page + cookie session
- Empty `/admin/projects` list (shows "No projects yet")
- "Create new project" form → writes `meta.json` and `v1.json` with empty content

### Slice 2 — Editor (forms only, no rendering)

- `/admin/projects/[id]` dashboard
- `/admin/projects/[id]/edit` editor with split-pane layout
- Cover form
- Contents form
- Section form (markdown textarea, no preview)
- Add/remove/reorder sections
- Save revision flow

### Slice 3 — Preview & PDF render

- Markdown→HTML renderer with brand shortcodes
- HTML preview at `/admin/projects/[id]/preview`
- PDF render API (calls WeasyPrint via child_process)
- "Render PDF" button on dashboard, downloads result

### Slice 4 — Sharing

- Share token generation
- `/d/[token]` and `/d/[token].pdf` public routes
- "Share / Rotate / Stop sharing" actions
- Pre-render PDF to `/public/d/<token>.pdf` on save

### Slice 5 — AI prompts

- `/content/prompts/ppd/*.md` template files
- `/content/types/ppd.json` section type definitions
- "Section type" selector in the section form
- "Generate AI prompt" button + modal
- Clipboard write

### Slice 6 — Polish

- Drag-and-drop section reordering
- Asset upload for diagrams
- Revision diff view ("what changed in v3")
- Confirm-before-leave on unsaved changes
- Error states, loading states, empty states

Stop at any slice if priorities change. Slices 1–3 alone get you out of the manual-zip workflow. Slices 4–5 are the differentiation.

---

## 12 · Decisions made on Kasper's behalf

Where the spec required a choice, here's what I picked. Override any of these before Claude Code starts.

| Decision | Why |
|---|---|
| Markdown over rich-text editor | Faster to build, composes with AI prompts, no risk of the editor producing off-brand HTML |
| Files over database | No infra, git is version history, works for a solo user |
| Local-only admin | No auth hardening required, no server costs, simple deploy story |
| Pre-rendered PDFs in `/public` | Avoids running WeasyPrint in production |
| Per-section AI prompts via clipboard | No AI API integration needed, keeps Kasper in control of model and review |
| Section IDs are stable across revisions | Future-proofs revision diffing |
| `pinnedRevision` defaults to null | Latest = live by default, opt in to pinning when you want stability |
| 32-char random share tokens | Sufficient for low-stakes sharing; not for sensitive docs |
| One document type at MVP (PPD) | Don't build the type system until you have two of them |

---

## 13 · Things to ask Kasper before building, if unclear

These are decisions Claude Code should confirm rather than guess:

1. **Auth method.** Use `next-auth` with credentials, or a simpler `ADMIN_PASSWORD` env var + signed cookie? (My default: env var + cookie, simpler.)
2. **Markdown library.** `marked` with custom extensions, `markdown-it`, or hand-rolled? (My default: `marked` with custom token rules.)
3. **Drag-and-drop.** `dnd-kit` or `react-beautiful-dnd`? (My default: `dnd-kit`, more actively maintained.)
4. **Where to render PDFs.** Spawn `python3` as a child process, or use a Node binding? (My default: child process. Simpler, no native deps.)
5. **Asset management.** Just file uploads to disk, or also support URL imports for diagrams hosted elsewhere? (My default: file uploads only at MVP.)

---

## 14 · Done criteria

The portal is "done" when Kasper can:

- Log in to `/admin` on his local machine
- Create a new PPD for a client
- Author every section using markdown + AI prompt assistance
- Save revisions
- Render the document to a PDF that's visually identical to the existing Forja PPD
- Share the PDF via a public token-protected URL
- Stop sharing or rotate the token
- Commit the result to git, push, and have the share URL work in production

A more advanced "done" — desirable but not required to ship Phase A:

- Drag-reorder sections
- Upload diagrams as assets
- Diff revisions side-by-side
- Pin a revision so the share URL doesn't change when Kasper edits

---

## 15 · Phase C — what changes later

For context, so the build doesn't paint Phase C into a corner:

- The data model already supports it. No schema changes needed to render documents as live web pages.
- `/d/[token]` already exists as an HTML route. In Phase C, it stops being "iframe of PDF" and starts being "the actual document, rendered as a styled web page." Same data, different presentation layer.
- The PDF becomes an export option from the live page, not the primary artefact.
- Revision history becomes navigable (`/d/[token]/v/[n]`).
- A small read-only client comment system might attach (out of scope for this spec).
- If Kasper outgrows file-based storage, Supabase migration is the path. The JSON shapes already match what a Postgres `jsonb` column would hold.

None of this should drive Phase A decisions. It's just an assurance that the work won't need to be undone.

---

*Spec drafted 2026-04-30. Adjust freely before implementation.*
