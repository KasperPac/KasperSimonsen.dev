import fs from 'fs/promises'
import path from 'path'
import { renderMarkdown } from './renderer'
import { DOCUMENTS_ROOT } from './documents'
import type { Revision, Cover, ContentsItem, Section } from './schemas'

export const TEMPLATE_DIR = path.join(process.cwd(), 'content', 'ks-ppd-template')

export type RenderMode = 'preview' | 'pdf'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sanitizeTitle(str: string): string {
  // Allow <br> only — everything else is escaped
  return escapeHtml(str).replace(/&lt;br&gt;/gi, '<br>')
}

function toFileUrl(p: string): string {
  return 'file:///' + p.replace(/\\/g, '/')
}

function coverHtml(cover: Cover, monogramUrl: string): string {
  const { meta } = cover
  const cells: Array<[string, string, boolean]> = [
    ['Client', meta.client, false],
    ['Author', meta.author, false],
    ['Date', meta.date, false],
    ['Status', meta.status, true],
    ['Engagement', meta.engagement, false],
    ['Stack', meta.stack, false],
    ['Pages', meta.pages, false],
    ['Document ID', meta.documentId, false],
  ]

  return `<section class="cover">
  <div class="cover-mark">
    <img src="${monogramUrl}" alt="Kasper Simonsen">
  </div>
  <span class="cover-hint">${escapeHtml(cover.hint)}</span>
  <span class="cover-eyebrow">${escapeHtml(cover.eyebrow)}</span>
  <h1 class="cover-title">${sanitizeTitle(cover.title)}</h1>
  <p class="cover-subtitle">${escapeHtml(cover.subtitle)}</p>
  <div class="cover-meta">
    ${cells.map(([label, value, accent]) =>
      `<div class="cover-meta-cell">
      <span class="label">${label}</span>
      <span class="value${accent ? ' text-accent' : ''}">${escapeHtml(value)}</span>
    </div>`
    ).join('\n    ')}
  </div>
  <div class="cover-footer">
    <a href="mailto:hello@kaspersimonsen.dev">hello@kaspersimonsen.dev</a>
    <span>kaspersimonsen.dev / Melbourne · AEST · UTC+10</span>
  </div>
</section>`
}

function contentsHtml(contents: ContentsItem[]): string {
  if (contents.length === 0) return ''
  const items = contents
    .map(
      (item) =>
        `    <div class="toc-item"><span class="num">${escapeHtml(item.num)}</span><span class="label">${escapeHtml(item.label)}</span><span class="meta">${escapeHtml(item.meta)}</span></div>`
    )
    .join('\n')
  return `<section>
  <div class="section-opener">
    <span class="section-num">00 · Contents</span>
    <span class="section-rule"></span>
    <span class="section-meta">${contents.length} sections</span>
  </div>
  <div class="toc">
${items}
  </div>
</section>`
}

function sectionHtml(section: Section): string {
  const body = renderMarkdown(section.body)
  return `<section class="page-break"></section>
<section>
  <div class="section-opener">
    <span class="section-num">${escapeHtml(section.num)}</span>
    <span class="section-rule"></span>
    <span class="section-meta">${escapeHtml(section.meta)}</span>
  </div>
  <h1>${escapeHtml(section.title)}</h1>
${body}
</section>`
}

export async function generateHtml(
  revision: Revision,
  docId: string,
  mode: RenderMode
): Promise<string> {
  const cssRaw = await fs.readFile(path.join(TEMPLATE_DIR, 'style.css'), 'utf-8')

  const assetBase =
    mode === 'pdf'
      ? toFileUrl(path.join(TEMPLATE_DIR, 'assets'))
      : '/api/admin/template/assets'

  const docAssetBase =
    mode === 'pdf'
      ? toFileUrl(path.join(DOCUMENTS_ROOT, docId, 'assets'))
      : `/api/admin/projects/${docId}/assets`

  // Patch font/image URLs in the CSS to be absolute
  const css = cssRaw
    .replace(/url\("assets\/fonts\//g, `url("${assetBase}/fonts/`)
    .replace(/url\("assets\/img\//g, `url("${assetBase}/img/`)

  const monogramUrl =
    mode === 'pdf'
      ? toFileUrl(path.join(TEMPLATE_DIR, 'assets', 'img', 'ks-monogram.png'))
      : '/api/admin/template/assets/img/ks-monogram.png'

  // Override @page running headers with project-specific text
  const pageOverride = `
@page {
  @top-left {
    content: "${escapeHtml(revision.cover.eyebrow)}  ·  project planning document";
  }
  @top-right {
    content: "${escapeHtml(revision.cover.meta.status.toLowerCase())} · v${revision.revision}";
  }
}`

  // Render sections with the document's asset base
  const sections = revision.sections
    .map((s) => sectionHtml({ ...s }))
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(revision.cover.eyebrow)} — project planning document</title>
  <style>
${css}
  </style>
  <style>${pageOverride}</style>
</head>
<body>
${coverHtml(revision.cover, monogramUrl)}
${contentsHtml(revision.contents)}
${sections}
</body>
</html>`
}
