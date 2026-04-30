import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import { getCurrentRevision } from '@/lib/admin/documents'
import { generateHtml } from '@/lib/admin/template'

type Ctx = { params: Promise<{ id: string }> }

function guardProduction() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Admin not available in production')
  }
}

export async function GET(_req: Request, ctx: Ctx) {
  guardProduction()
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await ctx.params
  try {
    const revision = await getCurrentRevision(id)
    const html = await generateHtml(revision, id, 'preview')
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
