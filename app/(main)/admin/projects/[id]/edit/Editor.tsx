'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Meta, Revision, Cover, ContentsItem, Section } from '@/lib/admin/schemas'
import CoverForm from './CoverForm'
import ContentsForm from './ContentsForm'
import SectionForm from './SectionForm'

const mono = { fontFamily: 'var(--font-mono, ui-monospace, monospace)' }

type Selection =
  | { type: 'cover' }
  | { type: 'contents' }
  | { type: 'section'; id: string }

function navItemStyle(active: boolean): React.CSSProperties {
  return {
    ...mono,
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '7px 16px',
    fontSize: 11,
    letterSpacing: '0.04em',
    background: active ? 'rgba(255,90,31,0.06)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-dim)',
    border: 'none',
    cursor: 'pointer',
    borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
  }
}

export default function Editor({
  meta,
  initialRevision,
}: {
  meta: Meta
  initialRevision: Revision
}) {
  const [cover, setCover] = useState<Cover>(initialRevision.cover)
  const [contents, setContents] = useState<ContentsItem[]>(initialRevision.contents)
  const [sections, setSections] = useState<Section[]>(initialRevision.sections)
  const [dirty, setDirty] = useState(false)
  const [selection, setSelection] = useState<Selection>({ type: 'cover' })
  const [currentRev, setCurrentRev] = useState(initialRevision.revision)
  const [saveNote, setSaveNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Warn before closing/refreshing with unsaved changes
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  function updateCover(updated: Cover) {
    setCover(updated)
    setDirty(true)
  }

  function updateContents(updated: ContentsItem[]) {
    setContents(updated)
    setDirty(true)
  }

  function updateSection(updated: Section) {
    setSections((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    setDirty(true)
  }

  function addSection() {
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
    const num = String(sections.length + 1).padStart(2, '0')
    const section: Section = { id, num, meta: '', title: 'New section', body: '' }
    setSections((prev) => [...prev, section])
    setSelection({ type: 'section', id })
    setDirty(true)
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id))
    setSelection({ type: 'cover' })
    setDirty(true)
  }

  function moveSectionUp(id: string) {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx <= 0) return prev
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
    setDirty(true)
  }

  function moveSectionDown(id: string) {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/admin/projects/${meta.id}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'ppd',
          cover,
          contents,
          sections,
          notes: saveNote.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      const { revision } = await res.json()
      setCurrentRev(revision)
      setDirty(false)
      setSaveNote('')
      setSavedMsg(`Saved as v${revision}`)
      setTimeout(() => setSavedMsg(null), 4000)
    } catch {
      setSaveError('Save failed — check console')
    } finally {
      setSaving(false)
    }
  }

  const selectedSection =
    selection.type === 'section'
      ? sections.find((s) => s.id === selection.id)
      : null

  return (
    <div className="flex flex-col">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-3 gap-4 sticky top-0 z-10"
        style={{
          borderBottom: '0.5px solid var(--border)',
          background: 'var(--bg-primary)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/admin/projects/${meta.id}`}
            className="text-[10px] tracking-[0.1em] uppercase shrink-0"
            style={{ ...mono, color: 'var(--text-dim)' }}
          >
            ← {meta.client}
          </Link>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span
            className="text-[10px] tracking-[0.08em]"
            style={{ ...mono, color: 'var(--text-dim)' }}
          >
            v{currentRev}
          </span>
          {dirty && (
            <>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span
                className="text-[10px] tracking-[0.08em]"
                style={{ ...mono, color: 'var(--accent)' }}
              >
                unsaved
              </span>
            </>
          )}
          {savedMsg && (
            <>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span
                className="text-[10px] tracking-[0.08em]"
                style={{ ...mono, color: 'var(--health)' }}
              >
                {savedMsg}
              </span>
            </>
          )}
          {saveError && (
            <span
              className="text-[10px] tracking-[0.08em]"
              style={{ ...mono, color: 'var(--accent)' }}
            >
              {saveError}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="text"
            placeholder="Revision note (optional)"
            value={saveNote}
            onChange={(e) => setSaveNote(e.target.value)}
            className="hidden md:block text-[11px] px-3 py-1.5"
            style={{
              ...mono,
              background: 'transparent',
              border: '0.5px solid var(--border)',
              color: 'var(--text-primary)',
              outline: 'none',
              width: 220,
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="px-4 py-2 text-[11px] tracking-[0.08em] uppercase transition-opacity disabled:opacity-30"
            style={{
              ...mono,
              color: 'var(--accent)',
              border: '0.5px solid var(--accent)',
              background: 'rgba(255,90,31,0.06)',
              cursor: saving || !dirty ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save revision →'}
          </button>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* Left nav */}
        <div
          className="shrink-0 py-4"
          style={{
            width: 220,
            borderRight: '0.5px solid var(--border)',
            position: 'sticky',
            top: 49,
            alignSelf: 'flex-start',
            maxHeight: 'calc(100vh - 49px)',
            overflowY: 'auto',
          }}
        >
          <button
            style={navItemStyle(selection.type === 'cover')}
            onClick={() => setSelection({ type: 'cover' })}
          >
            Cover
          </button>
          <button
            style={navItemStyle(selection.type === 'contents')}
            onClick={() => setSelection({ type: 'contents' })}
          >
            Contents
          </button>

          {sections.length > 0 && (
            <div
              className="mt-2 mb-1 mx-4 text-[9px] tracking-[0.14em] uppercase"
              style={{ ...mono, color: 'var(--text-dim)' }}
            >
              Sections
            </div>
          )}

          {sections.map((s, i) => {
            const active =
              selection.type === 'section' && selection.id === s.id
            return (
              <div key={s.id} className="group flex items-center">
                <button
                  style={{
                    ...navItemStyle(active),
                    flex: 1,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    paddingRight: 8,
                  }}
                  onClick={() => setSelection({ type: 'section', id: s.id })}
                  title={s.title}
                >
                  <span style={{ color: active ? 'var(--accent)' : 'var(--border)' }}>
                    {s.num}&nbsp;
                  </span>
                  {s.title || 'Untitled'}
                </button>
                <div
                  className="flex flex-col opacity-0 group-hover:opacity-100 pr-1"
                  style={{ transition: 'opacity 0.15s' }}
                >
                  <button
                    onClick={() => moveSectionUp(s.id)}
                    disabled={i === 0}
                    className="px-1 text-[9px] disabled:opacity-20"
                    style={{ ...mono, color: 'var(--text-dim)', lineHeight: 1 }}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveSectionDown(s.id)}
                    disabled={i === sections.length - 1}
                    className="px-1 text-[9px] disabled:opacity-20"
                    style={{ ...mono, color: 'var(--text-dim)', lineHeight: 1 }}
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>
              </div>
            )
          })}

          <button
            onClick={addSection}
            className="mt-2 w-full text-left px-4 py-2 text-[10px] tracking-[0.08em] uppercase"
            style={{ ...mono, color: 'var(--text-dim)' }}
          >
            + Add section
          </button>
        </div>

        {/* Right form pane */}
        <div className="flex-1 min-w-0 px-8 py-8" style={{ maxWidth: 800 }}>
          {selection.type === 'cover' && (
            <CoverForm cover={cover} onChange={updateCover} />
          )}
          {selection.type === 'contents' && (
            <ContentsForm contents={contents} onChange={updateContents} />
          )}
          {selection.type === 'section' && selectedSection && (
            <SectionForm
              key={selectedSection.id}
              section={selectedSection}
              onChange={updateSection}
              onRemove={() => removeSection(selectedSection.id)}
            />
          )}
          {selection.type === 'section' && !selectedSection && (
            <p
              className="text-sm"
              style={{ ...mono, color: 'var(--text-dim)' }}
            >
              Section not found.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
