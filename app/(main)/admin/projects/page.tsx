import Link from 'next/link'
import { listDocuments } from '@/lib/admin/documents'
import type { Meta } from '@/lib/admin/schemas'

const mono = { fontFamily: 'var(--font-mono, ui-monospace, monospace)' }

function ProjectCard({ doc }: { doc: Meta }) {
  return (
    <Link
      href={`/admin/projects/${doc.id}`}
      className="block p-5 transition-colors hover:border-[var(--text-dim)]"
      style={{ border: '0.5px solid var(--border)' }}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p
            className="text-[10px] tracking-[0.12em] uppercase mb-1"
            style={{ ...mono, color: 'var(--text-dim)' }}
          >
            {doc.type}
          </p>
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
          >
            {doc.client}
          </p>
        </div>
        <span
          className="text-[10px] tracking-[0.08em] uppercase shrink-0 mt-0.5"
          style={{ ...mono, color: doc.shareToken ? 'var(--health)' : 'var(--text-dim)' }}
        >
          {doc.shareToken ? '● shared' : '○ private'}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span
          className="text-[10px] tracking-[0.08em]"
          style={{ ...mono, color: 'var(--text-dim)' }}
        >
          {doc.slug}
        </span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span
          className="text-[10px] tracking-[0.08em]"
          style={{ ...mono, color: 'var(--text-dim)' }}
        >
          v{doc.currentRevision}
        </span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span
          className="text-[10px] tracking-[0.08em]"
          style={{ ...mono, color: 'var(--text-dim)' }}
        >
          {doc.updatedAt.slice(0, 10)}
        </span>
      </div>
    </Link>
  )
}

export default async function AdminProjectsPage() {
  const docs = await listDocuments()

  return (
    <div className="px-6 md:px-10 py-10">
      <div className="flex items-center justify-between mb-10">
        <div>
          <p
            className="text-[10px] tracking-[0.15em] uppercase mb-2"
            style={{ ...mono, color: 'var(--text-dim)' }}
          >
            {docs.length} {docs.length === 1 ? 'document' : 'documents'}
          </p>
          <h1
            className="font-black uppercase leading-none"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(36px, 5vw, 56px)',
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
            }}
          >
            Projects
          </h1>
        </div>
        <Link
          href="/admin/projects/new"
          className="flex items-center gap-2 px-4 py-2.5 text-xs tracking-[0.08em] uppercase transition-colors"
          style={{
            ...mono,
            color: 'var(--accent)',
            border: '0.5px solid var(--accent)',
            background: 'rgba(255,90,31,0.04)',
          }}
        >
          + New project
        </Link>
      </div>

      {docs.length === 0 ? (
        <div
          className="py-20 text-center"
          style={{ border: '0.5px solid var(--border)' }}
        >
          <p
            className="text-xs tracking-[0.1em] uppercase mb-4"
            style={{ ...mono, color: 'var(--text-dim)' }}
          >
            No projects yet
          </p>
          <Link
            href="/admin/projects/new"
            className="text-xs tracking-[0.08em] uppercase"
            style={{ ...mono, color: 'var(--accent)' }}
          >
            Create your first project →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {docs.map((doc) => (
            <ProjectCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  )
}
