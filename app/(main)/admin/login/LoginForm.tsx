'use client'

import { useState } from 'react'

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

export default function AdminLoginForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        window.location.href = '/admin/projects'
      } else {
        const data = await res.json()
        setError(data.error ?? 'Login failed')
        setPending(false)
      }
    } catch {
      setError('Network error')
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" style={{ maxWidth: 360 }}>
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-[10px] tracking-[0.12em] uppercase"
          style={{ ...mono, color: 'var(--text-dim)' }}
        >
          Password
        </label>
        <input
          id="password"
          required
          autoFocus
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={inputStyle}
          disabled={pending}
        />
      </div>

      {error && (
        <p className="text-xs" style={{ ...mono, color: 'var(--accent)' }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-3 px-5 py-3 text-xs tracking-[0.08em] uppercase transition-colors disabled:opacity-50"
        style={{
          ...mono,
          color: 'var(--accent)',
          border: '0.5px solid var(--accent)',
          background: 'rgba(255,90,31,0.04)',
          cursor: pending ? 'not-allowed' : 'pointer',
        }}
      >
        {pending ? 'Signing in…' : 'Sign in →'}
      </button>
    </form>
  )
}
