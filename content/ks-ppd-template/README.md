# ks-ppd-template

Project Planning Document template — Kasper Simonsen brand, dark theme, A4 PDF output.

```
ks-ppd-template/
├── README.md           ← you are here
├── index.html          ← the document (edit this)
├── style.css           ← brand styling (don't edit unless the brand changes)
├── assets/
│   ├── fonts/          ← embedded brand fonts (TTF)
│   └── img/            ← monogram + per-project diagrams
├── scripts/
│   └── render.sh       ← generates the PDF
└── examples/
    └── forja-ppd.pdf   ← reference output to compare against
```

---

## 01 · Quick start

```bash
cp -r ks-ppd-template/ ks-ppd-<client-slug>/
cd ks-ppd-<client-slug>/
# edit index.html
./scripts/render.sh <client>-ppd.pdf
```

Run from the template root. The PDF lands in the same directory.

**One-time setup (per machine):**
```bash
pip install weasyprint --break-system-packages
```

---

## 02 · How to edit `index.html`

The file has three parts.

### Cover · always page 1
Edit the seven tokens at the top:
- `cover-hint` — status banner ("Project Planning Document — v1.0 · Draft")
- `cover-eyebrow` — lowercase project slug (forja, assemblio)
- `cover-title` — 4–7 word headline. Inter Black 80pt — keep it tight.
- `cover-subtitle` — one sentence in Fraunces italic
- `cover-meta` cells — eight metadata pairs
- `cover-footer` — email, location

### Contents
Edit the `toc-item` rows. Group sections by phase tag: Brief, Discovery, Scope, Architecture, Risk, Delivery, Appendix. Number with leading zeros (01, 02 ... A, B).

### Sections
Each `<section>` is one logical chunk. The `<section class="page-break"></section>` marker before each one starts it on a fresh page. Edit the `section-num`, the meta tag, the `<h1>`, and the body content.

For long sections, use `<h2>` to break things up. For phased or sequential subsections, use the `.h2-block` pattern (mono eyebrow above the H2).

---

## 03 · Pattern library

The bottom of `index.html` has a section labelled **PATTERN REFERENCE** with every brand component the CSS supports — bullet lists, numbered lists, plain tables, row-label tables, callouts, pull quotes, status rows, tag pills, number-led tiles, figures, two-column layouts.

**Copy what you need into your real sections, then delete the pattern reference section before final render.** It's there as a live cheat sheet, not as content to ship.

---

## 04 · Adding diagrams

1. Build SVG manually, or use any tool that exports SVG.
2. Use the brand colour tokens — see "Colour tokens" below.
3. Render to PNG at 2× output resolution:
   ```bash
   python3 -c "import cairosvg; cairosvg.svg2png(url='diagram.svg', write_to='diagram.png', output_width=2200)"
   ```
4. Drop the PNG into `assets/img/`.
5. Embed with the `<figure>` pattern:
   ```html
   <figure>
     <img src="assets/img/diagram.png" alt="Description">
     <figcaption>Fig. 01 — Caption text in mono uppercase</figcaption>
   </figure>
   ```

Diagram conventions:
- Background `#0B0B0B` to match document
- Hairline strokes 0.5px, in `#1F1F1F`
- Type: Inter for headings, Geist Mono for labels
- One accent (`#FF5A1F`) per diagram, used sparingly
- Avoid arrow glyphs (`→`) — none of the brand fonts have them. Use em-dash (`—`) or render as SVG paths.

---

## 05 · Voice rules — quick reference

Pulled from the KS Design Profile. Skim before writing.

| Use | Avoid |
|---|---|
| Direct, declarative sentences | Throat-clearing intros |
| Em-dashes for clauses | Parenthetical asides |
| Lowercase project names (forja) | Forja, FORJA in body |
| "Not currently taking on" | "Out of scope", "Limitations" |
| "12 years getting things to work" | "Trusted partner", "industry-leading" |
| Specific numbers | "Many", "several", "various" |

**Words to avoid:** solutions · delight · amazing · unleash · cutting-edge · synergy · transform your business

**Punctuation:** em-dash (—) for inline separators, middle dot (·) for metadata, slash (/) for path-like breadcrumbs, no exclamation marks anywhere.

---

## 06 · Colour tokens

Defined in `style.css` as CSS variables. Don't hardcode hex in markup.

```
--ink       #FAFAFA   primary text
--muted     #AAAAAA   body copy
--dim       #666666   metadata, labels
--bg        #0B0B0B   page background
--surface   #161616   callouts, raised areas
--border    #1F1F1F   hairline rules
--border-2  #2A2A2A   slightly stronger rules
--accent    #FF5A1F   the orange — use sparingly
--health    #7A9B6E   sage green — only for "all good" status
```

In markup: `<span class="text-accent">` · `<span class="text-health">` · `<span class="text-dim">`.

---

## 07 · Typography

Defined in `style.css`. Embedded as TTF — no external font dependency.

```
--display   Inter             headlines, monogram, hero
--body      Instrument Sans   running prose
--serif     Fraunces italic   project headlines, pull quotes
--mono      Geist Mono        labels, metadata, status, code
```

Body text is `Instrument Sans` 10.5pt at line-height 1.55. Don't override sizes inline — use the existing classes (`.lead`, `.dim`, `.mono`, etc.).

---

## 08 · File naming

```
ks-ppd-<client-slug>-v<n>.pdf
```

Lowercase, hyphenated. Bump the `v<n>` on each major revision sent to the client. Keep all versions — never overwrite.

---

## 09 · Templates that share this brand

This template is one of a planned family. They all use the same `style.css` and brand assets, with different default `index.html` structures.

- `ks-ppd-template` — Project Planning Document (this one)
- `ks-sow-template` — Statement of Work — _to build_
- `ks-status-template` — Status report / milestone summary — _to build_

When the brand evolves, change `style.css` and the assets folder once, then sync into each template.

---

## 10 · Troubleshooting

**Fonts look wrong in the PDF.** Check that the `assets/fonts/` directory is intact and the TTF filenames match the `@font-face` declarations in `style.css`.

**Diagram is blurry in the PDF.** Render at 2× the intended display width. WeasyPrint downscales cleanly; it doesn't upscale.

**Page numbers are wrong.** WeasyPrint counts from page 1. The cover counts as page 1. If you want the count to start at 2, that's a CSS edit — see the `@page :first` rule.

**Section starts on a new line, not a new page.** Make sure there's a `<section class="page-break"></section>` before the section opener.

**Callout breaks across two pages.** Add `page-break-inside: avoid;` to that callout inline, or move the section break.

---

*ks-ppd-template · v1.0 · 2026-04-29*
