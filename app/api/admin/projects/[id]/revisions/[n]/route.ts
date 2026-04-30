import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import { getRevision } from '@/lib/admin/documents'

type Ctx = RouteContext<'/api/admin/projects/[id]/revisions/[n]'>

export async function GET(_req: Request, ctx: Ctx) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Admin not available in production')
  }
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id, n } = await ctx.params
  const revision = await getRevision(id, parseInt(n))
  return NextResponse.json(revision)
}
