'use client'

import { useEffect, useRef } from 'react'
import type { Section } from '@/lib/admin/schemas'

const mono = { fontFamily: 'var(--font-mono, ui-monospace, monospace)' }

const fieldStyle: React.CSSProperties = {
  ...mono,
  width: '100%',
  background: 'transparent',
  border: '0.5px solid var(--border)',
  color: 'var(--text-primary)',
  fontSize: 13,
  padding: '8px 10px',
  outline: 'none',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label
        className="block text-[9px] tracking-[0.14em] uppercase"
        style={{ ...mono, color: 'var(--text-dim)' }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

export default function SectionForm({
  section,
  onChange,
  onRemove,
}: {
  section: Section
  onChange: (section: Section) => void
  onRemove: () => void
}) {
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize the body textarea
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [section.body])

  function set<K extends keyof Section>(key: K, value: Section[K]) {
    onChange({ ...section, [key]: value })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p
          className="text-[9px] tracking-[0.18em] uppercase"
          style={{ ...mono, color: 'var(--accent)' }}
        >
          Section
        </p>
        <button
          type="button"
          onClick={onRemove}
          className="text-[10px] tracking-[0.08em] uppercase px-2 py-1"
          style={{ ...mono, color: 'var(--text-dim)', border: '0.5px solid var(--border)' }}
        >
          Remove section
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Number">
          <input
            style={fieldStyle}
            value={section.num}
            onChange={(e) => set('num', e.target.value)}
            placeholder="01"
          />
        </Field>
        <Field label="Category">
          <input
            style={fieldStyle}
            list="section-meta-options"
            value={section.meta}
            onChange={(e) => set('meta', e.target.value)}
            placeholder="Brief"
          />
          <datalist id="section-meta-options">
            <option value="Brief" />
            <option value="Discovery" />
            <option value="Scope" />
            <option value="Architecture" />
            <option value="Risk" />
            <option value="Delivery" />
            <option value="Appendix" />
          </datalist>
        </Field>
      </div>

      <Field label="Title">
        <input
          style={fieldStyle}
          value={section.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Executive summary"
        />
      </Field>

      <Field label="Body (markdown)">
        <textarea
          ref={bodyRef}
          style={{
            ...fieldStyle,
            resize: 'none',
            minHeight: 320,
            lineHeight: 1.6,
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 12,
          }}
          value={section.body}
          onChange={(e) => set('body', e.target.value)}
          placeholder={`Write in markdown. Supported shortcodes:\n\n# Heading → <h2>\n## Subheading → <h3>\n> quote → .quote\n:::callout LABEL ... ::: → .callout\n:::lead ... ::: → .lead\n:::eyebrow Stage 01\n## Heading\n:::`}
          spellCheck
        />
      </Field>

      <div
        className="p-3 text-[10px] leading-relaxed"
        style={{
          ...mono,
          color: 'var(--text-dim)',
          border: '0.5px solid var(--border)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <span style={{ color: 'var(--text-dim)' }}>Markdown reference: </span>
        {[
          '# h2',
          '## h3',
          '**bold**',
          '*italic*',
          '`code`',
          '- list',
          '1. numbered',
          '> quote',
          '| table |',
          ':::callout LABEL',
          ':::lead',
          ':::dim',
          ':::eyebrow',
          '![alt](file.png)',
        ].map((s, i, a) => (
          <span key={s}>
            <span style={{ color: 'var(--text-primary)' }}>{s}</span>
            {i < a.length - 1 && <span style={{ color: 'var(--border)' }}> · </span>}
          </span>
        ))}
      </div>
    </div>
  )
}
