import type { ReactNode } from 'react'
import Link from 'next/link'

const mono = { fontFamily: 'var(--font-mono, ui-monospace, monospace)' }

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 flex flex-col" style={{ borderTop: '0.5px solid var(--border)' }}>
      {/* Admin sub-nav */}
      <div
        className="flex items-center gap-6 px-6 md:px-10 py-3"
        style={{ borderBottom: '0.5px solid var(--border)', background: 'rgba(0,0,0,0.3)' }}
      >
        <span
          className="text-[10px] tracking-[0.15em] uppercase"
          style={{ ...mono, color: 'var(--accent)' }}
        >
          admin
        </span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <Link
          href="/admin/projects"
          className="text-[10px] tracking-[0.1em] uppercase transition-colors"
          style={{ ...mono, color: 'var(--text-dim)' }}
        >
          Projects
        </Link>
      </div>

      {children}
    </div>
  )
}
