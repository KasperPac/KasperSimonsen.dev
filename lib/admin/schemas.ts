import { z } from 'zod'

export const MetaSchema = z.object({
  id: z.string(),
  slug: z.string(),
  client: z.string(),
  type: z.literal('ppd'),
  currentRevision: z.number(),
  shareToken: z.string().nullable(),
  pinnedRevision: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Meta = z.infer<typeof MetaSchema>

export const ContentsItemSchema = z.object({
  num: z.string(),
  label: z.string(),
  meta: z.string(),
})

export const SectionSchema = z.object({
  id: z.string(),
  num: z.string(),
  meta: z.string(),
  title: z.string(),
  body: z.string(),
  sectionType: z.string().optional(),
  purpose: z.string().optional(),
})

export const CoverMetaSchema = z.object({
  client: z.string(),
  author: z.string(),
  date: z.string(),
  status: z.string(),
  engagement: z.string(),
  stack: z.string(),
  pages: z.string(),
  documentId: z.string(),
})

export const CoverSchema = z.object({
  eyebrow: z.string(),
  title: z.string(),
  subtitle: z.string(),
  hint: z.string(),
  meta: CoverMetaSchema,
})

export const RevisionSchema = z.object({
  revision: z.number(),
  documentType: z.literal('ppd'),
  cover: CoverSchema,
  contents: z.array(ContentsItemSchema),
  sections: z.array(SectionSchema),
  createdAt: z.string(),
  notes: z.string().optional(),
})

export type Revision = z.infer<typeof RevisionSchema>
export type Cover = z.infer<typeof CoverSchema>
export type CoverMeta = z.infer<typeof CoverMetaSchema>
export type Section = z.infer<typeof SectionSchema>
export type ContentsItem = z.infer<typeof ContentsItemSchema>
