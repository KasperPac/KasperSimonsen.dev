import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { MetaSchema, RevisionSchema, type Meta, type Revision } from './schemas'

export const DOCUMENTS_ROOT = path.join(process.cwd(), 'content', 'documents')

function generateId(): string {
  return 'doc_' + randomUUID().replace(/-/g, '').slice(0, 8)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

export async function listDocuments(): Promise<Meta[]> {
  let entries
  try {
    entries = await fs.readdir(DOCUMENTS_ROOT, { withFileTypes: true })
  } catch {
    return []
  }
  const metas: Meta[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    try {
      const raw = await fs.readFile(
        path.join(DOCUMENTS_ROOT, entry.name, 'meta.json'),
        'utf-8'
      )
      metas.push(MetaSchema.parse(JSON.parse(raw)))
    } catch {
      // skip malformed
    }
  }
  return metas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getDocument(id: string): Promise<Meta> {
  const raw = await fs.readFile(
    path.join(DOCUMENTS_ROOT, id, 'meta.json'),
    'utf-8'
  )
  return MetaSchema.parse(JSON.parse(raw))
}

export async function getRevision(id: string, n: number): Promise<Revision> {
  const raw = await fs.readFile(
    path.join(DOCUMENTS_ROOT, id, 'revisions', `v${n}.json`),
    'utf-8'
  )
  return RevisionSchema.parse(JSON.parse(raw))
}

export async function getCurrentRevision(id: string): Promise<Revision> {
  const meta = await getDocument(id)
  return getRevision(id, meta.currentRevision)
}

export async function createDocument(opts: {
  client: string
  slug?: string
}): Promise<string> {
  const id = generateId()
  const slug = opts.slug || slugify(opts.client)
  const now = new Date().toISOString()
  const dir = path.join(DOCUMENTS_ROOT, id)

  await fs.mkdir(path.join(dir, 'revisions'), { recursive: true })
  await fs.mkdir(path.join(dir, 'assets'), { recursive: true })

  const meta: Meta = {
    id,
    slug,
    client: opts.client,
    type: 'ppd',
    currentRevision: 1,
    shareToken: null,
    pinnedRevision: null,
    createdAt: now,
    updatedAt: now,
  }

  const revision: Revision = {
    revision: 1,
    documentType: 'ppd',
    cover: {
      eyebrow: slug,
      title: '',
      subtitle: '',
      hint: 'Project Planning Document — v1.0 · Draft',
      meta: {
        client: opts.client,
        author: 'Kasper Simonsen',
        date: now.slice(0, 10),
        status: 'Draft',
        engagement: '',
        stack: '',
        pages: '—',
        documentId: `ks-ppd-${slug}-v1`,
      },
    },
    contents: [],
    sections: [],
    createdAt: now,
  }

  await fs.writeFile(
    path.join(dir, 'meta.json'),
    JSON.stringify(meta, null, 2)
  )
  await fs.writeFile(
    path.join(dir, 'revisions', 'v1.json'),
    JSON.stringify(revision, null, 2)
  )

  return id
}

export async function updateMeta(
  id: string,
  updates: Partial<Meta>
): Promise<Meta> {
  const meta = await getDocument(id)
  const updated = MetaSchema.parse({
    ...meta,
    ...updates,
    updatedAt: new Date().toISOString(),
  })
  await fs.writeFile(
    path.join(DOCUMENTS_ROOT, id, 'meta.json'),
    JSON.stringify(updated, null, 2)
  )
  return updated
}

export async function listRevisions(
  id: string
): Promise<Array<{ revision: number; createdAt: string; notes?: string }>> {
  const dir = path.join(DOCUMENTS_ROOT, id, 'revisions')
  let files: string[]
  try {
    files = await fs.readdir(dir)
  } catch {
    return []
  }
  const results: Array<{ revision: number; createdAt: string; notes?: string }> = []
  for (const f of files.filter((f) => /^v\d+\.json$/.test(f))) {
    try {
      const raw = await fs.readFile(path.join(dir, f), 'utf-8')
      const { revision, createdAt, notes } = JSON.parse(raw)
      results.push({ revision, createdAt, notes })
    } catch {}
  }
  return results.sort((a, b) => b.revision - a.revision)
}

export async function saveRevision(
  id: string,
  data: Omit<Revision, 'revision' | 'createdAt'>,
  note?: string
): Promise<number> {
  const meta = await getDocument(id)
  const nextN = meta.currentRevision + 1
  const now = new Date().toISOString()

  const revision: Revision = RevisionSchema.parse({
    ...data,
    revision: nextN,
    createdAt: now,
    notes: note,
  })

  await fs.writeFile(
    path.join(DOCUMENTS_ROOT, id, 'revisions', `v${nextN}.json`),
    JSON.stringify(revision, null, 2)
  )
  await updateMeta(id, { currentRevision: nextN })
  return nextN
}
