'use client'

import type { Cover } from '@/lib/admin/schemas'

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

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
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

export default function CoverForm({
  cover,
  onChange,
}: {
  cover: Cover
  onChange: (cover: Cover) => void
}) {
  function set<K extends keyof Cover>(key: K, value: Cover[K]) {
    onChange({ ...cover, [key]: value })
  }

  function setMeta<K extends keyof Cover['meta']>(
    key: K,
    value: Cover['meta'][K]
  ) {
    onChange({ ...cover, meta: { ...cover.meta, [key]: value } })
  }

  return (
    <div className="space-y-8">
      {/* Main cover fields */}
      <section>
        <p
          className="text-[9px] tracking-[0.18em] uppercase mb-4"
          style={{ ...mono, color: 'var(--accent)' }}
        >
          Cover
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Eyebrow (project slug, lowercase)">
            <input
              style={fieldStyle}
              value={cover.eyebrow}
              onChange={(e) => set('eyebrow', e.target.value)}
              placeholder="forja"
            />
          </Field>
          <Field label="Hint (status banner)">
            <input
              style={fieldStyle}
              value={cover.hint}
              onChange={(e) => set('hint', e.target.value)}
              placeholder="Project Planning Document — v1.0 · Draft"
            />
          </Field>
          <Field label="Title (use <br> for line breaks)">
            <input
              style={fieldStyle}
              value={cover.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Code that<br>stays in spec."
            />
          </Field>
          <Field label="Subtitle (Fraunces italic)">
            <input
              style={fieldStyle}
              value={cover.subtitle}
              onChange={(e) => set('subtitle', e.target.value)}
              placeholder="An AI-assisted platform…"
            />
          </Field>
        </div>
      </section>

      {/* Meta cells */}
      <section>
        <p
          className="text-[9px] tracking-[0.18em] uppercase mb-4"
          style={{ ...mono, color: 'var(--text-dim)' }}
        >
          Metadata cells
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Client">
            <input
              style={fieldStyle}
              value={cover.meta.client}
              onChange={(e) => setMeta('client', e.target.value)}
              placeholder="Pac Technologies"
            />
          </Field>
          <Field label="Author">
            <input
              style={fieldStyle}
              value={cover.meta.author}
              onChange={(e) => setMeta('author', e.target.value)}
              placeholder="Kasper Simonsen"
            />
          </Field>
          <Field label="Date">
            <input
              style={fieldStyle}
              type="date"
              value={cover.meta.date}
              onChange={(e) => setMeta('date', e.target.value)}
            />
          </Field>
          <Field label="Status">
            <input
              style={fieldStyle}
              list="status-options"
              value={cover.meta.status}
              onChange={(e) => setMeta('status', e.target.value)}
              placeholder="Draft"
            />
            <datalist id="status-options">
              <option value="Draft" />
              <option value="Final" />
              <option value="In Review" />
            </datalist>
          </Field>
          <Field label="Engagement">
            <input
              style={fieldStyle}
              value={cover.meta.engagement}
              onChange={(e) => setMeta('engagement', e.target.value)}
              placeholder="Internal tooling"
            />
          </Field>
          <Field label="Stack">
            <input
              style={fieldStyle}
              value={cover.meta.stack}
              onChange={(e) => setMeta('stack', e.target.value)}
              placeholder="React 19 · Supabase · Claude"
            />
          </Field>
          <Field label="Pages">
            <input
              style={fieldStyle}
              value={cover.meta.pages}
              onChange={(e) => setMeta('pages', e.target.value)}
              placeholder="—"
            />
          </Field>
          <Field label="Document ID">
            <input
              style={fieldStyle}
              value={cover.meta.documentId}
              onChange={(e) => setMeta('documentId', e.target.value)}
              placeholder="ks-ppd-forja-v1"
            />
          </Field>
        </div>
      </section>
    </div>
  )
}
