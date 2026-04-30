import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import { getDocument, getCurrentRevision, updateMeta } from '@/lib/admin/documents'
import { MetaSchema } from '@/lib/admin/schemas'

type Ctx = RouteContext<'/api/admin/projects/[id]'>

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
    const [meta, revision] = await Promise.all([
      getDocument(id),
      getCurrentRevision(id),
    ])
    return NextResponse.json({ meta, revision })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  guardProduction()
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await ctx.params
  const body = await req.json()
  const allowed = MetaSchema.partial().parse(body)
  const updated = await updateMeta(id, allowed)
  return NextResponse.json(updated)
}
