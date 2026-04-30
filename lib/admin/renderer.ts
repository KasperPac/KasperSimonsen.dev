import { Marked } from 'marked'

// Isolated instance — does not mutate the global marked singleton
const md = new Marked({
  gfm: true,
  renderer: {
    heading(token) {
      // # → h2, ## → h3, deeper stays as-is (spec only supports two levels)
      const level = token.depth === 1 ? 2 : token.depth === 2 ? 3 : token.depth
      return `<h${level}>${token.text}</h${level}>\n`
    },
  },
})

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function preprocessShortcodes(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const fenceMatch = lines[i].match(/^:::(.*)/)

    if (fenceMatch) {
      const tag = fenceMatch[1].trim()
      const bodyLines: string[] = []
      i++
      while (i < lines.length && lines[i].trim() !== ':::') {
        bodyLines.push(lines[i])
        i++
      }
      i++ // skip closing :::
      const body = bodyLines.join('\n')

      if (tag.startsWith('callout ')) {
        const label = tag.slice(8).trim()
        const inner = md.parse(body) as string
        out.push(`<div class="callout"><span class="label">${escapeHtml(label)}</span>${inner}</div>`)

      } else if (tag === 'lead') {
        out.push(`<p class="lead">${body.trim()}</p>`)

      } else if (tag === 'dim') {
        out.push(`<p class="dim">${body.trim()}</p>`)

      } else if (tag.startsWith('eyebrow ')) {
        const eyebrow = tag.slice(8).trim()
        // Body is typically `## Heading` — strip the ## and use the text directly
        const headingMatch = body.trim().match(/^##?\s+(.+)/)
        const heading = headingMatch ? headingMatch[1] : escapeHtml(body.trim())
        // Use <eyebrow-h2> as a protected placeholder — won't be touched by post-processing
        out.push(`<div class="h2-block"><span class="eyebrow">${escapeHtml(eyebrow)}</span><eyebrow-h2>${heading}</eyebrow-h2></div>`)

      } else if (tag === 'rowlabels') {
        const rows = body.trim().split('\n')
          .filter((r) => r.trim())
          .map((row) => {
            const sep = row.indexOf(' | ')
            if (sep === -1) return `<tr><td>${escapeHtml(row.trim())}</td></tr>`
            const key = row.slice(0, sep).trim()
            const val = row.slice(sep + 3).trim()
            return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(val)}</td></tr>`
          })
          .join('\n')
        out.push(`<table class="brand rowlabels"><tbody>\n${rows}\n</tbody></table>`)

      } else {
        // Unknown fence — pass through unchanged
        out.push(`:::${fenceMatch[1]}`)
        for (const l of bodyLines) out.push(l)
        out.push(':::')
      }
    } else {
      out.push(lines[i])
      i++
    }
  }

  return out.join('\n')
}

function postProcess(html: string): string {
  return (
    html
      // Lists get brand class
      .replace(/<ul>/g, '<ul class="brand">')
      .replace(/<ol>/g, '<ol class="brand">')
      // Blockquote → .quote div
      .replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, (_, content) => {
        const inner = content.replace(/<\/?p>/g, '').trim()
        return `<div class="quote">${inner}</div>`
      })
      // Tables get brand class
      .replace(/<table>/g, '<table class="brand">')
      // Images → figure + figcaption
      .replace(/<img([^>]*)>/g, (_, attrs) => {
        const src = attrs.match(/src="([^"]*)"/)?.[1] ?? ''
        const alt = attrs.match(/alt="([^"]*)"/)?.[1] ?? ''
        return `<figure><img src="${src}" alt="${escapeHtml(alt)}"><figcaption>${escapeHtml(alt)}</figcaption></figure>`
      })
      // Resolve eyebrow placeholder back to h2
      .replace(/<eyebrow-h2>/g, '<h2>')
      .replace(/<\/eyebrow-h2>/g, '</h2>')
  )
}

export function renderMarkdown(body: string): string {
  if (!body.trim()) return ''
  const preprocessed = preprocessShortcodes(body)
  const raw = md.parse(preprocessed) as string
  return postProcess(raw)
}
