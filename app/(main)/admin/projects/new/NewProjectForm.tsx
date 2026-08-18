'use client'

import { useState, useEffect } from 'react'

const mono = { fontFamily: 'var(--font-mono, ui-monospace, monospace)' }

const inputStyle: React.CSSProperties = {
  ...mono,
  width: '100%',
  background: 'transparent',
  border: '0.5px solid var(--border)',
  color: 'var(--text-primary)',
  fontSize: 13,
  padding: '10px 12px',
  outline: 'none',
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

export default function NewProjectForm() {
  const [client, setClient] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!slugEdited) setSlug(slugify(client))
  }, [client, slugEdited])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: client.trim(), slug: slug.trim() }),
      })

      if (res.ok) {
        const { id } = await res.json()
        window.location.href = `/admin/projects/${id}/edit`
      } else {
        const data = await res.json()
        setError(data.error ?? 'Failed to create project')
        setPending(false)
      }
    } catch {
      setError('Network error')
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" style={{ maxWidth: 480 }}>
      <div className="space-y-1.5">
        <label
          htmlFor="client"
          className="block text-[10px] tracking-[0.12em] uppercase"
          style={{ ...mono, color: 'var(--text-dim)' }}
        >
          Client name
        </label>
        <input
          id="client"
          required
          autoFocus
          type="text"
          value={client}
          onChange={(e) => setClient(e.target.value)}
          placeholder="Pac Technologies"
          style={inputStyle}
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="slug"
          className="block text-[10px] tracking-[0.12em] uppercase"
          style={{ ...mono, color: 'var(--text-dim)' }}
        >
          Slug{' '}
          <span style={{ color: 'var(--text-dim)', textTransform: 'none', letterSpacing: 0 }}>
            — auto-generated, used in document IDs and URLs
          </span>
        </label>
        <input
          id="slug"
          required
          type="text"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value)
            setSlugEdited(true)
          }}
          placeholder="pac-technologies"
          style={inputStyle}
          disabled={pending}
        />
      </div>

      {error && (
        <p className="text-xs" style={{ ...mono, color: 'var(--accent)' }}>
          {error}
        </p>
      )}

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={pending || !client.trim()}
          className="flex items-center gap-2 px-5 py-3 text-xs tracking-[0.08em] uppercase transition-colors disabled:opacity-40"
          style={{
            ...mono,
            color: 'var(--accent)',
            border: '0.5px solid var(--accent)',
            background: 'rgba(255,90,31,0.04)',
            cursor: pending || !client.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {pending ? 'Creating…' : 'Create project →'}
        </button>

        <a
          href="/admin/projects"
          className="text-xs tracking-[0.08em] uppercase"
          style={{ ...mono, color: 'var(--text-dim)' }}
        >
          Cancel
        </a>
      </div>
    </form>
  )
}
