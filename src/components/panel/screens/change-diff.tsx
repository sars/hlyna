import { t } from '@/components/panel/lib/i18n'

// How one field of an owner change set reads: plain values side by side, lists as added/removed lines,
// prices as lines with their source, business terms per term, photos as thumbnails.

type Price = { text: string; source: string | null; dateText: string | null }
type Media = { id: number; fileName: string; alt: string | null; status: string; variants: Record<string, { file: string | null } | undefined> | null }

const mediaSrc = (m: Media) => `/api/media/file/${encodeURIComponent(m.variants?.thumbnail?.file ?? m.fileName)}`

const SHOW = 5

function Lines({ from, to }: { from: string[]; to: string[] }) {
  const removed = from.filter((x) => !to.includes(x))
  const added = to.filter((x) => !from.includes(x))
  const kept = to.filter((x) => from.includes(x))
  return (
    <ul className="space-y-1 text-sm">
      {added.map((x) => (
        <li key={`+${x}`} className="rounded bg-positive/10 px-2 py-1">+ {x}</li>
      ))}
      {removed.slice(0, SHOW).map((x) => (
        <li key={`-${x}`} className="rounded bg-negative/10 px-2 py-1 line-through decoration-negative/60">− {x}</li>
      ))}
      {removed.length > SHOW && (
        <li>
          <details className="rounded bg-negative/5 px-2 py-1">
            <summary className="cursor-pointer text-xs text-negative">{t('changes.moreRemoved', { count: removed.length - SHOW })}</summary>
            <ul className="mt-1 space-y-1">
              {removed.slice(SHOW).map((x) => (
                <li key={`-${x}`} className="line-through decoration-negative/60">− {x}</li>
              ))}
            </ul>
          </details>
        </li>
      )}
      {kept.length > 0 && <li className="px-2 text-xs text-muted-foreground">{t('changes.same')}: {kept.length}</li>}
    </ul>
  )
}

function Plain({ from, to }: { from: unknown; to: unknown }) {
  const show = (v: unknown) => (v === null || v === undefined || v === '' ? <span className="text-muted-foreground">{t('history.empty')}</span> : typeof v === 'boolean' ? (v ? t('history.yes') : t('history.no')) : String(v))
  return (
    <div className="grid gap-2 text-sm sm:grid-cols-2">
      <div className="min-w-0 rounded-md border bg-muted/30 p-2">
        <p className="mb-1 text-xs text-muted-foreground">{t('changes.from')}</p>
        <p className="break-words whitespace-pre-line">{show(from)}</p>
      </div>
      <div className="min-w-0 rounded-md border border-primary/30 p-2">
        <p className="mb-1 text-xs text-muted-foreground">{t('changes.to')}</p>
        <p className="break-words whitespace-pre-line">{show(to)}</p>
      </div>
    </div>
  )
}

export function FieldDiff({ field, from, to, media }: { field: string; from: unknown; to: unknown; media: Media[] }) {
  if (field === 'prices') {
    const line = (p: Price) => [p.text, [p.source, p.dateText].filter(Boolean).join(', ')].filter(Boolean).join(' — ')
    return <Lines from={(from as Price[]).map(line)} to={(to as Price[]).map(line)} />
  }
  if (field === 'services' || field === 'products' || field === 'instagramPosts') return <Lines from={from as string[]} to={to as string[]} />
  if (field === 'b2b') {
    const a = from as Record<string, unknown>
    const b = to as Record<string, unknown>
    const keys = ['minOrder', 'leadTime', 'logoMethods', 'foodSafe', 'dishwasherSafe', 'worksWithHoreca', 'worksWithCorporate'].filter((k) => JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null))
    return (
      <div className="space-y-2">
        {keys.map((k) => (
          <div key={k} className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t(`b2b.${k}`)}</p>
            <Plain from={Array.isArray(a[k]) ? (a[k] as string[]).join(', ') : a[k]} to={Array.isArray(b[k]) ? (b[k] as string[]).join(', ') : b[k]} />
          </div>
        ))}
      </div>
    )
  }
  if (field === 'photos') {
    const byId = new Map(media.map((m) => [m.id, m]))
    const before = new Set(from as number[])
    return (
      <ul className="flex flex-wrap gap-2">
        {(to as number[]).map((id) => {
          const m = byId.get(id)
          return (
            <li key={id} className="w-28 space-y-1">
              {m ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaSrc(m)} alt={m.alt ?? ''} className="aspect-square w-28 rounded-md border object-cover" loading="lazy" />
              ) : (
                <div className="aspect-square w-28 rounded-md border bg-muted" />
              )}
              <p className="truncate text-xs text-muted-foreground" title={m?.alt ?? undefined}>
                {before.has(id) ? m?.alt : `${t('changes.photoPending')}: ${m?.alt ?? ''}`}
              </p>
            </li>
          )
        })}
      </ul>
    )
  }
  return <Plain from={from} to={to} />
}
