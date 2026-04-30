import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import { TEMPLATE_DIR } from '@/lib/admin/template'

type Ctx = { params: Promise<{ path: string[] }> }

function guardProduction() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Admin not available in production')
  }
}

const MIME: Record<string, string> = {
  css: 'text/css',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
}

export async function GET(_req: Request, ctx: Ctx) {
  guardProduction()
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { path: segments } = await ctx.params
  const base = path.resolve(path.join(TEMPLATE_DIR, 'assets'))
  const filePath = path.resolve(path.join(TEMPLATE_DIR, 'assets', ...segments))
  if (!filePath.startsWith(base + path.sep) && filePath !== base) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const data = await fs.readFile(filePath)
    const ext = segments[segments.length - 1]?.split('.').pop()?.toLowerCase() ?? ''
    const contentType = MIME[ext] ?? 'application/octet-stream'
    return new NextResponse(data, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'private, max-age=3600' },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
