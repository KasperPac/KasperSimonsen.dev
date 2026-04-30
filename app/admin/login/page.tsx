import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import AdminLoginForm from './LoginForm'

export const metadata = { robots: { index: false, follow: false } }

export default async function AdminLoginPage() {
  if (process.env.NODE_ENV === 'production') redirect('/')

  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  const secret = process.env.ADMIN_SECRET
  if (token && secret && token === secret) redirect('/admin/projects')

  const mono = 'font-mono'

  return (
    <div className="flex-1 px-6 md:px-10 py-16 max-w-2xl">
      <p
        className={`${mono} text-[10px] tracking-[0.18em] uppercase mb-8`}
        style={{ color: 'var(--accent)' }}
      >
        — admin
      </p>
      <h1
        className="font-black uppercase leading-none mb-10"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(48px, 8vw, 80px)',
          letterSpacing: '-0.04em',
          color: 'var(--text-primary)',
        }}
      >
        ADMIN
      </h1>
      <AdminLoginForm />
    </div>
  )
}
