import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getDocument, listRevisions } from '@/lib/admin/documents'
import RenderButton from './RenderButton'

type Params = Promise<{ id: string }>

const mono = { fontFamily: 'var(--font-mono, ui-monospace, monospace)' }
const display = { fontFamily: 'var(--font-display, var(--font-inter), sans-serif)' }

export default async function ProjectDashboardPage({ params }: { params: Params }) {
  const { id } = await params
  let meta, revisions
  try {
    ;[meta, revisions] = await Promise.all([
      getDocument(id),
      listRevisions(id),
    ])
  } catch {
    notFound()
  }

  return (
    <div className="px-6 md:px-10 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 mb-10">
        <div>
          <p
            className="text-[10px] tracking-[0.15em] uppercase mb-2"
            style={{ ...mono, color: 'var(--text-dim)' }}
          >
            {meta.type} · {meta.slug}
          </p>
          <h1
            className="font-black uppercase leading-none mb-3"
            style={{
              ...display,
              fontSize: 'clamp(32px, 5vw, 52px)',
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
            }}
          >
            {meta.client}
          </h1>
          <p
            className="text-[10px] tracking-[0.08em]"
            style={{ ...mono, color: 'var(--text-dim)' }}
          >
            Created {meta.createdAt.slice(0, 10)} · Updated {meta.updatedAt.slice(0, 10)}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={`/admin/projects/${id}/edit`}
            className="flex items-center gap-2 px-4 py-2.5 text-xs tracking-[0.08em] uppercase"
            style={{
              ...mono,
              color: 'var(--accent)',
              border: '0.5px solid var(--accent)',
              background: 'rgba(255,90,31,0.04)',
            }}
          >
            Edit →
          </Link>
          <RenderButton id={id} slug={meta.slug} revision={meta.currentRevision} />
          <a
            href={`/api/admin/projects/${id}/html`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 text-xs tracking-[0.08em] uppercase"
            style={{ ...mono, color: 'var(--text-dim)', border: '0.5px solid var(--border)' }}
          >
            Preview ↗
          </a>
          <button
            disabled
            className="px-4 py-2.5 text-xs tracking-[0.08em] uppercase opacity-30 cursor-not-allowed"
            style={{ ...mono, color: 'var(--text-dim)', border: '0.5px solid var(--border)' }}
          >
            Share
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div
        className="grid grid-cols-3 mb-10"
        style={{ border: '0.5px solid var(--border)' }}
      >
        {[
          { label: 'Current revision', value: `v${meta.currentRevision}` },
          { label: 'Sharing', value: meta.shareToken ? 'Public' : 'Private' },
          { label: 'Document ID', value: `ks-ppd-${meta.slug}-v${meta.currentRevision}` },
        ].map(({ label, value }, i) => (
          <div
            key={label}
            className="px-5 py-4"
            style={{ borderRight: i < 2 ? '0.5px solid var(--border)' : 'none' }}
          >
            <p
              className="text-[9px] tracking-[0.12em] uppercase mb-1"
              style={{ ...mono, color: 'var(--text-dim)' }}
            >
              {label}
            </p>
            <p
              className="text-sm"
              style={{ ...mono, color: 'var(--text-primary)' }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Revision history */}
      <div>
        <p
          className="text-[10px] tracking-[0.15em] uppercase mb-4"
          style={{ ...mono, color: 'var(--text-dim)' }}
        >
          Revision history
        </p>
        <div style={{ border: '0.5px solid var(--border)' }}>
          {revisions.map((rev, i) => (
            <div
              key={rev.revision}
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: i < revisions.length - 1 ? '0.5px solid var(--border)' : 'none' }}
            >
              <div className="flex items-center gap-4">
                <span
                  className="text-sm"
                  style={{
                    ...mono,
                    color: rev.revision === meta.currentRevision
                      ? 'var(--accent)'
                      : 'var(--text-primary)',
                  }}
                >
                  v{rev.revision}
                </span>
                {rev.notes && (
                  <span
                    className="text-xs"
                    style={{ ...mono, color: 'var(--text-dim)' }}
                  >
                    {rev.notes}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                {rev.revision === meta.currentRevision && (
                  <span
                    className="text-[9px] tracking-[0.12em] uppercase"
                    style={{ ...mono, color: 'var(--accent)' }}
                  >
                    current
                  </span>
                )}
                <span
                  className="text-[10px]"
                  style={{ ...mono, color: 'var(--text-dim)' }}
                >
                  {rev.createdAt.slice(0, 10)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
