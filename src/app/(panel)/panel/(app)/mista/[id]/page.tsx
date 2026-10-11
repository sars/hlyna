import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/panel/inhouse'
import { formatDate } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { CityForm } from '@/components/panel/screens/city-form'
import { EntityHistory } from '@/components/panel/screens/history'
import { Card } from '@/components/panel/ui/card'
import { db } from '@/server/db'
import { getCity } from '@/server/services/cities'

export const metadata = { title: 'Місто' }

export default async function CityPage({ params }: { params: Promise<{ id: string }> }) {
  const raw = (await params).id
  if (raw === 'nove')
    return (
      <div className="space-y-5">
        <PageHeader title={t('cities.new')} description={t('cities.description')} />
        <Card className="p-4 shadow-xs md:p-5">
          <CityForm initial={{ name: '', slug: '', oblast: null, locative: null, population: null, isOver100k: null }} />
        </Card>
      </div>
    )
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) notFound()
  const c = await getCity(db, id)
  if (!c) notFound()
  return (
    <div className="space-y-5">
      <PageHeader
        title={c.name}
        description={c.locative ?? `у м. ${c.name}`}
        actions={
          <Link href={`/panel/studii?city=${id}`} className="text-sm text-primary hover:underline">
            {t('nav.studios')}
          </Link>
        }
      />
      <Card className="p-4 shadow-xs md:p-5">
        <CityForm id={id} initial={{ name: c.name, slug: c.slug, oblast: c.oblast, locative: c.locative, population: c.population, isOver100k: c.isOver100k }} />
      </Card>
      {c.oldSlugs.length > 0 && (
        <Card className="gap-2 p-4 shadow-xs md:p-5">
          <h2 className="text-sm font-semibold">{t('cities.oldSlugs')}</h2>
          <ul className="text-xs text-muted-foreground">
            {c.oldSlugs.map((o) => (
              <li key={o.slug}>
                <code>{o.slug}</code> · {formatDate(o.changedAt)}
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card className="gap-3 p-4 shadow-xs md:p-5">
        <h2 className="text-base font-semibold">{t('journal.title')}</h2>
        <EntityHistory entity="city" id={id} />
      </Card>
    </div>
  )
}
