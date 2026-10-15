// Where a studio appears in a ranked top (written pages and topic pages): its profile links back there.
import { copies } from '@/content/waveB'
import { topics } from '@/content/topics'
import type { TopCategory } from '@/editorial/copy'
import { WAVE_B, type WaveBId } from '@/editorial/wave-b'

const has = (tops: TopCategory[] | undefined, slug: string) => !!tops?.some((c) => c.items.some((x) => x.slug === slug))

/** Pages whose top lists this studio, as links: wave B selections first, then topic pages (corporate, certificates…). */
export function topsForStudio(slug: string): { label: string; href: string }[] {
  const out: { label: string; href: string }[] = []
  for (const [id, copy] of Object.entries(copies)) {
    const meta = WAVE_B[id as WaveBId]
    if (meta && has(copy.tops, slug)) out.push({ label: meta.crumb, href: meta.path })
  }
  for (const t of Object.values(topics)) if (has(t.tops, slug)) out.push({ label: t.crumb, href: t.path })
  return out
}
