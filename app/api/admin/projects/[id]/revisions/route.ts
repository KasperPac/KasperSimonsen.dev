import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import { saveRevision } from '@/lib/admin/documents'
import { RevisionSchema } from '@/lib/admin/schemas'

type Ctx = RouteContext<'/api/admin/projects/[id]/revisions'>

function guardProduction() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Admin not available in production')
  }
}

export async function POST(req: Request, ctx: Ctx) {
  guardProduction()
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await ctx.params
  const body = await req.json()

  const { notes, ...data } = body
  const parsed = RevisionSchema.omit({ revision: true, createdAt: true, notes: true }).parse(data)
  const revision = await saveRevision(id, parsed, notes)
  return NextResponse.json({ revision }, { status: 201 })
}
