// URL of the generated share card (see src/app/(frontend)/og/route.tsx).
export function ogImage(p: { title: string; kicker?: string; sub?: string; img?: string }) {
  const q = new URLSearchParams()
  q.set('title', p.title)
  if (p.kicker) q.set('kicker', p.kicker)
  if (p.sub) q.set('sub', p.sub.slice(0, 140))
  if (p.img) q.set('img', p.img)
  return [{ url: `/og?${q.toString()}`, width: 1200, height: 630 }]
}
