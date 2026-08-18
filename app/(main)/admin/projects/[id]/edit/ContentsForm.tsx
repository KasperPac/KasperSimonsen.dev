'use client'

import type { ContentsItem } from '@/lib/admin/schemas'

const mono = { fontFamily: 'var(--font-mono, ui-monospace, monospace)' }

const cellInput: React.CSSProperties = {
  ...mono,
  background: 'transparent',
  border: 'none',
  borderBottom: '0.5px solid var(--border)',
  color: 'var(--text-primary)',
  fontSize: 12,
  padding: '6px 4px',
  outline: 'none',
  width: '100%',
}

export default function ContentsForm({
  contents,
  onChange,
}: {
  contents: ContentsItem[]
  onChange: (contents: ContentsItem[]) => void
}) {
  function updateRow(index: number, updates: Partial<ContentsItem>) {
    const next = contents.map((row, i) =>
      i === index ? { ...row, ...updates } : row
    )
    onChange(next)
  }

  function addRow() {
    onChange([
      ...contents,
      {
        num: String(contents.length + 1).padStart(2, '0'),
        label: '',
        meta: '',
      },
    ])
  }

  function removeRow(index: number) {
    onChange(contents.filter((_, i) => i !== index))
  }

  function moveRow(index: number, direction: 'up' | 'down') {
    const next = [...contents]
    const swap = direction === 'up' ? index - 1 : index + 1
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    onChange(next)
  }

  return (
    <div>
      <p
        className="text-[9px] tracking-[0.18em] uppercase mb-4"
        style={{ ...mono, color: 'var(--accent)' }}
      >
        Table of Contents
      </p>

      <div style={{ border: '0.5px solid var(--border)' }}>
        {/* Header */}
        <div
          className="grid px-3 py-2"
          style={{
            gridTemplateColumns: '48px 1fr 100px 64px',
            borderBottom: '0.5px solid var(--border)',
          }}
        >
          {['#', 'Label', 'Category', ''].map((h) => (
            <span
              key={h}
              className="text-[9px] tracking-[0.12em] uppercase"
              style={{ ...mono, color: 'var(--text-dim)' }}
            >
              {h}
            </span>
          ))}
        </div>

        {contents.length === 0 && (
          <div className="px-3 py-4">
            <span
              className="text-[10px]"
              style={{ ...mono, color: 'var(--text-dim)' }}
            >
              No entries yet. Add one below.
            </span>
          </div>
        )}

        {contents.map((row, i) => (
          <div
            key={i}
            className="grid items-center px-3 py-1"
            style={{
              gridTemplateColumns: '48px 1fr 100px 64px',
              borderBottom:
                i < contents.length - 1 ? '0.5px solid var(--border)' : 'none',
            }}
          >
            <input
              style={{ ...cellInput, width: 40 }}
              value={row.num}
              onChange={(e) => updateRow(i, { num: e.target.value })}
              placeholder="01"
            />
            <input
              style={cellInput}
              value={row.label}
              onChange={(e) => updateRow(i, { label: e.target.value })}
              placeholder="Executive Summary"
            />
            <input
              style={cellInput}
              list="meta-options"
              value={row.meta}
              onChange={(e) => updateRow(i, { meta: e.target.value })}
              placeholder="Brief"
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveRow(i, 'up')}
                disabled={i === 0}
                className="px-1.5 py-1 text-[10px] disabled:opacity-20"
                style={{ ...mono, color: 'var(--text-dim)' }}
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveRow(i, 'down')}
                disabled={i === contents.length - 1}
                className="px-1.5 py-1 text-[10px] disabled:opacity-20"
                style={{ ...mono, color: 'var(--text-dim)' }}
                title="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="px-1.5 py-1 text-[10px]"
                style={{ ...mono, color: 'var(--text-dim)' }}
                title="Remove"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <datalist id="meta-options">
        <option value="Brief" />
        <option value="Discovery" />
        <option value="Scope" />
        <option value="Architecture" />
        <option value="Risk" />
        <option value="Delivery" />
        <option value="Appendix" />
      </datalist>

      <button
        type="button"
        onClick={addRow}
        className="mt-3 text-xs tracking-[0.08em] uppercase px-3 py-2"
        style={{
          ...mono,
          color: 'var(--accent)',
          border: '0.5px solid var(--border)',
        }}
      >
        + Add row
      </button>
    </div>
  )
}
