import { NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import { getDocument, getCurrentRevision } from '@/lib/admin/documents'
import { generateHtml } from '@/lib/admin/template'

type Ctx = { params: Promise<{ id: string }> }

function guardProduction() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Admin not available in production')
  }
}

function runWeasyprint(input: string, output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('python3', ['-m', 'weasyprint', input, output], (err, _stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message))
      else resolve()
    })
  })
}

export async function POST(_req: Request, ctx: Ctx) {
  guardProduction()
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await ctx.params
  const uid = randomUUID().replace(/-/g, '').slice(0, 8)
  const tmpIn = path.join(tmpdir(), `ks-ppd-${uid}.html`)
  const tmpOut = path.join(tmpdir(), `ks-ppd-${uid}.pdf`)

  try {
    const [meta, revision] = await Promise.all([
      getDocument(id),
      getCurrentRevision(id),
    ])
    const html = await generateHtml(revision, id, 'pdf')
    await fs.writeFile(tmpIn, html, 'utf-8')
    await runWeasyprint(tmpIn, tmpOut)
    const pdf = await fs.readFile(tmpOut)
    const filename = `ks-ppd-${meta.slug}-v${revision.revision}.pdf`
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Render failed'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    await Promise.allSettled([
      fs.unlink(tmpIn).catch(() => {}),
      fs.unlink(tmpOut).catch(() => {}),
    ])
  }
}
