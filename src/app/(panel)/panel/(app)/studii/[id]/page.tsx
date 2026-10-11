import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/panel/inhouse'
import { t } from '@/components/panel/lib/i18n'
import { EntityHistory } from '@/components/panel/screens/history'
import { StudioEditor } from '@/components/panel/screens/studio-editor'
import { Card } from '@/components/panel/ui/card'
import { db } from '@/server/db'
import { cityOptions, getStudioForEdit, toEditForm } from '@/server/services/studioEditor'

export const metadata = { title: 'Студія' }

export default async function StudioEditPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id)
  if (!Number.isInteger(id) || id <= 0) notFound()
  const [s, cities] = await Promise.all([getStudioForEdit(db, id), cityOptions(db)])
  if (!s) notFound()
  return (
    <div className="space-y-5">
      <PageHeader
        title={s.row.name}
        description={[s.city?.name, t(`visibility.${s.row.visibility}`), s.row.ownerVerified ? t('studios.verifiedShort') : null].filter(Boolean).join(' · ')}
        actions={
          <Link href={`/panel/studii/${id}/istoriia`} className="text-sm text-primary hover:underline">
            {t('studios.history')}
          </Link>
        }
      />
      <StudioEditor
        studioId={id}
        initial={toEditForm(s)}
        initialPhotos={s.photos}
        cities={cities.map((c) => ({ id: c.id, name: c.name }))}
        owner={{ about: s.row.ownerAbout, news: s.row.ownerNews, quote: s.row.ownerQuote }}
        revision={s.row.revision}
      />
      <Card className="gap-3 p-4 shadow-xs md:p-5">
        <h2 className="text-base font-semibold">{t('journal.title')}</h2>
        <EntityHistory entity="studio" id={id} />
      </Card>
    </div>
  )
}
