# Work With Me page build — handoff to Claude Code

This prompt builds `/work-with-me` for `kaspersimonsen.dev`. It assumes the main build brief and the work page prompt are already in context — palette, fonts, nav, footer, and overall design language are inherited from the existing work page. Do not redefine any of that. Match the existing visual system exactly.

---

## 1. Route and nav

- Route: `/work-with-me`
- Nav link label: `WORK WITH ME` (in the same mono/uppercase/letter-spacing style as other nav items)
- Active state on nav when on this route
- Add to the nav in the order: `WORK · WORK WITH ME · ABOUT · CONTACT`

---

## 2. Purpose

This page is a qualifying tool for prospective clients. Two offerings, no pricing, per-offering CTAs that route to a contact form with a pre-filled subject line. Its job is to make prospects self-select *in* or *out* within 60 seconds of reading.

No testimonials, no pricing, no client logos, no FAQ, no Calendly embed.

---

## 3. Page structure (top to bottom)

1. Global nav
2. Page header — "Work with me" serif italic, intro paragraph, availability pill
3. Offering 01 — Tools & dashboards
4. Offering 02 — Platforms & systems
5. "Not a fit" block — subtly distinguished, filters aggressively
6. "What happens after you get in touch" — four-step process
7. Global footer

Match the rhythm of the work page: generous vertical padding between sections, 0.5px borders as dividers, consistent left-gutter for section numbering.

---

## 4. Page header

```
[Availability pill — pulsing dot + "AVAILABLE Q2 2026 — ACCEPTING NEW PROJECTS"]

Work with me          ← serif italic, large, same treatment as other page headers

I take on two kinds of engagements. Small, scoped builds for teams who
need something specific done well. And larger custom systems for teams
building something that doesn't yet exist. Based in Melbourne, working
remotely.
```

Availability text should be driven by a single site-level constant so it can be changed in one place — this text is likely to be updated periodically ("AVAILABLE Q3 2026," "BOOKED UNTIL JULY," etc).

---

## 5. Offerings — shared layout

Each offering uses the same 2-column grid the work page uses: narrow mono meta column on the left, generous body on the right.

### Left meta column contains:

- Orange section number (`01` / `02`)
- Small meta label (`SCOPED & FIXED` / `CUSTOM & SCALED`)
- Timeline in white mono (`1–3 WEEKS` / `6–16 WEEKS`)

### Right body column contains:

- Italic serif headline (the offering name as a complete phrase)
- Description paragraph (2–4 sentences)
- Two labelled sections, each with:
  - Small orange mono label
  - Body content in light grey (first section) or dim grey (second section)
- CTA row at the bottom — left-aligned reply-time hint, right-aligned CTA button

### CTA button styling

Orange border (0.5px), subtle orange-tinted background (`rgba(255,90,31,0.04)`), mono uppercase text, orange arrow that translates 3px right on hover, background intensifies to `rgba(255,90,31,0.1)` on hover.

Clicking a CTA navigates to `/contact?topic={tools|platforms}` — the contact page reads the `topic` query param and pre-fills its subject field.

---

## 6. Offering 01 — Tools & dashboards

### Left column

- `01`
- `SCOPED & FIXED`
- `1–3 WEEKS`

### Right column

**Headline (italic serif):**
> Tools & dashboards.

**Description:**
> Small, tightly-scoped builds for teams who need something specific done properly. Usually one problem, one interface, one backend. Priced per project, delivered in days or weeks rather than months.

**Section 1 — `TYPICALLY FITS`:**
> Admin panels · internal workflow tools · custom reporting views · client portals · small Shopify or Supabase-backed apps · bespoke integrations between two existing systems.

**Section 2 — `YOU PROVIDE`:**
> A clear description of what the thing needs to do, access to any existing systems it needs to talk to, and someone who can answer questions as they come up.

**CTA row:**
- Left hint: `— typical reply within 24 hours`
- Button: `START A TOOL OR DASHBOARD →`
- Links to `/contact?topic=tools`

---

## 7. Offering 02 — Platforms & systems

### Left column

- `02`
- `CUSTOM & SCALED`
- `6–16 WEEKS`

### Right column

**Headline (italic serif):**
> Platforms & systems.

**Description:**
> Larger engagements where the thing being built doesn't yet exist. Multi-tenant SaaS, LLM-driven tooling, integrations with systems software doesn't usually touch. Architecture, schema, API, UI — the whole stack. Priced per project after a scoping conversation.

**Section 1 — `TYPICALLY FITS`:**
> Multi-tenant SaaS with real data-integrity requirements · LLM pipelines and agent systems · Shopify and e-commerce backend integrations · bespoke internal platforms for manufacturing or industrial ops · anything with strict audit or reconciliation needs.

**Section 2 — `HOW IT USUALLY GOES`:**
> A short scoping conversation, then a written proposal with milestones, timeline, and fixed or staged pricing. I build in weekly visible increments — you see real progress every week, not a reveal at the end.

**CTA row:**
- Left hint: `— expect a scoping call within the week`
- Button: `START A PLATFORM OR SYSTEM →`
- Links to `/contact?topic=platforms`

---

## 8. "Not a fit" block

Uses the same 2-column grid. Subtly distinguished from the offerings with a light background tint (`rgba(255,255,255,0.015)`) and dimmer type — it's informational rather than sales.

### Left column

- Dash character (`—`) where the number would normally be, in orange
- Label: `NOT A FIT`

### Right column

**Heading (italic serif, smaller than offering headlines, dimmer colour `#CCCCCC`):**
> Not currently taking on:

**Body (small, dim grey):**
> WordPress or Webflow work · e-commerce theme customisation · front-end-only design projects · short-term staff augmentation through recruiters · anything under a few days of scope. For those, happy to refer — just ask.

Do not include a CTA here. The block's job is to filter, not to convert.

---

## 9. "What happens after you get in touch"

Four-step grid explaining the client journey from enquiry to delivery. Sits below the offerings and the "Not a fit" block.

### Section heading (italic serif)

> What happens after you get in touch.

### Four steps — grid of 4 columns on desktop, 2 columns on tablet, 1 column stacked on mobile

Each step is a compact card with:
- Thin border (`0.5px solid #1F1F1F`)
- Subtle light background tint (`rgba(255,255,255,0.015)`)
- Small orange mono step number
- Italic serif title
- Small dim-grey description

| Step | Title | Description |
|---|---|---|
| 01 | A short reply. | Usually within 24 hours. Either "yes this fits, let's talk" or a clear no with a referral where possible. |
| 02 | A scoping call. | 30–45 minutes. Understand what you need, what you've tried, what constraints exist. Free. |
| 03 | A written proposal. | Scope, milestones, timeline, price. Either fixed or staged. No surprises later. |
| 04 | We build. | Weekly visible progress. Real check-ins. Shipped at the end, not thrown over a fence. |

---

## 10. Contact page integration

This page's CTAs pass a `topic` query parameter to `/contact`. The contact form should:

- Read `topic` from the URL query string on mount
- Pre-fill a subject line based on the topic:
  - `topic=tools` → subject: `Tools & dashboards enquiry`
  - `topic=platforms` → subject: `Platforms & systems enquiry`
  - No topic or unrecognised topic → empty subject
- Subject field should remain editable — the prefill is a convenience, not a lock

If the contact page doesn't exist yet, scaffold a minimal version: name, email, subject (with the prefill logic), message, submit button. Don't wire up email sending in this step — just ensure the form exists and reads the query param correctly.

---

## 11. Site-level constant for availability

Create a single source of truth for the availability text:

```ts
// lib/availability.ts
export const availability = {
  status: "available", // "available" | "booked" | "limited"
  text: "AVAILABLE Q2 2026 — ACCEPTING NEW PROJECTS",
  // text used on hero, work-with-me page, and anywhere else relevant
};
```

Use this constant on the home page hero and the Work With Me page header. When you update it, both pages update together.

---

## 12. Responsive behaviour

- Desktop (≥1024px): 2-column grid for offerings and "not a fit," 4-column grid for process steps
- Tablet (768–1023px): same 2-column for offerings, 2-column for process steps
- Mobile (<768px): single-column stacked everywhere. The numbered left rail becomes a small inline number above each offering's content, not a separate column

Offerings should remain visually distinct from each other on mobile — orange borders and section numbering carry the hierarchy when the layout flattens.

---

## 13. Anti-goals (specific to this page)

- No pricing anywhere. Not even "starts from." Not even hints. This was a deliberate call.
- No testimonials, client logos, or social proof. Don't scaffold placeholders — they encourage faking content.
- No "book a call" button with external calendar integration. Keep the flow through the contact form.
- No FAQ section. If clients have questions, they ask through the contact form.
- No "download my rate card" or any other asset download.
- Do not add a third offering. Two is the deliberate ceiling.
- Do not add pricing tiers to either offering ("Starter / Pro / Enterprise"). Every engagement is scoped individually.
- No stock photography of anyone working on laptops.

---

## 14. Build order

1. Create `/work-with-me/page.tsx` with the static layout scaffolded
2. Build the offering component — reusable, takes props for the copy variations
3. Implement the availability constant and wire it into both hero and this page
4. Build the "Not a fit" block (reuses offering grid styles)
5. Build the "What happens after" process grid
6. Update the global nav to include the new link with active-state logic
7. Wire the CTA buttons to `/contact?topic=...`
8. Ensure the contact page reads and prefills from the query param (scaffold the page if missing)
9. Test responsive behaviour at mobile / tablet / desktop breakpoints
10. Deploy

---

End of work-with-me prompt.
