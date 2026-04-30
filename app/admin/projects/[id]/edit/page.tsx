import { notFound } from 'next/navigation'
import { getDocument, getCurrentRevision } from '@/lib/admin/documents'
import Editor from './Editor'

type Params = Promise<{ id: string }>

export default async function EditPage({ params }: { params: Params }) {
  const { id } = await params
  let meta, revision
  try {
    ;[meta, revision] = await Promise.all([
      getDocument(id),
      getCurrentRevision(id),
    ])
  } catch {
    notFound()
  }
  return <Editor meta={meta} initialRevision={revision} />
}
