// Guide page shape (blocks, sections) and small text helpers shared by the guide configs.
import type { DocPhotoKey } from '../photos'
import { pluralUk } from '@/lib/catalog'
import { type GuideCtx } from '@/editorial/guides'

export type Block =
  | { p: string }
  | { list: string[] }
  | { steps: [string, string][] }
  | { table: { head: string[]; rows: string[][]; links?: (string | null)[] } }
  | { links: { label: string; href: string; note?: string }[] }

export type GuideSection = { id: string; title: string; kicker?: string; blocks: (ctx: GuideCtx) => Block[] }

export type Guide = {
  slug: string
  path: string
  title: string // <title>
  description: string
  h1: string
  kicker: string
  short: string // one line for the guide index and llms.txt
  lead: (ctx: GuideCtx) => string
  verse?: string[]
  photo?: DocPhotoKey
  sections: GuideSection[]
  faq: (ctx: GuideCtx) => { q: string; a: string }[]
  related: { label: string; href: string; note?: string }[]
  form?: { what?: string; studio?: boolean }
}

export const n = (x: number, forms: [string, string, string]) => `${x} ${pluralUk(x, forms)}`
export const inPlaces = (x: number) => n(x, ['місті чи селі', 'містах і селах', 'містах і селах'])
