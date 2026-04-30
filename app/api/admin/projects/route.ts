import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import { listDocuments, createDocument, slugify } from '@/lib/admin/documents'

function guardProduction() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Admin not available in production')
  }
}

export async function GET() {
  guardProduction()
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const docs = await listDocuments()
  return NextResponse.json(docs)
}

export async function POST(request: Request) {
  guardProduction()
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const client = (body.client as string)?.trim()
  if (!client) {
    return NextResponse.json({ error: 'client is required' }, { status: 400 })
  }

  const slug = body.slug ? (body.slug as string).trim() : slugify(client)
  const id = await createDocument({ client, slug })
  return NextResponse.json({ id }, { status: 201 })
}
