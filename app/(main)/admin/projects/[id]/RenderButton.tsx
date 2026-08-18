'use client'

import { useState } from 'react'

const mono = { fontFamily: 'var(--font-mono, ui-monospace, monospace)' }

export default function RenderButton({ id, slug, revision }: { id: string; slug: string; revision: number }) {
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRender() {
    setRendering(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/projects/${id}/render`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ks-ppd-${slug}-v${revision}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Render failed')
    } finally {
      setRendering(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRender}
        disabled={rendering}
        className="px-4 py-2.5 text-xs tracking-[0.08em] uppercase transition-opacity disabled:opacity-50"
        style={{
          ...mono,
          color: 'var(--text-primary)',
          border: '0.5px solid var(--border)',
          cursor: rendering ? 'wait' : 'pointer',
        }}
      >
        {rendering ? 'Rendering…' : 'Render PDF'}
      </button>
      {error && (
        <span className="text-[10px]" style={{ ...mono, color: 'var(--accent)' }}>
          {error}
        </span>
      )}
    </div>
  )
}
