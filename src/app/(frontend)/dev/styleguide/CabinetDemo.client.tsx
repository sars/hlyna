'use client'

import React, { useState } from 'react'

import { ListEditor } from '@/components/ui/ListEditor.client'
import { PhotoManager } from '@/components/ui/PhotoManager.client'
import type { KabinetPhoto, PriceLine } from '@/shared/kabinet'

// The cabinet's stateful primitives with local state, for /dev/styleguide (blocks 23 and 24). Nothing here talks to the server.

export function ListDemo() {
  const [services, setServices] = useState(['групові майстер-класи з ліплення', 'знайомство з гончарним колом', 'МК для двох'])
  const [prices, setPrices] = useState<PriceLine[]>([{ text: 'Груповий МК, до 7 осіб, 2,5 год — 650 грн/особа', date: '', source: '' }])
  return (
    <div className="grid max-w-[720px] gap-6">
      <ListEditor id="sg-services" heading={<>Послуги · {services.length}</>} noun="послуга" addLabel="+ Додати послугу" placeholder="Напр.: групові майстер-класи з ліплення" items={services} onChange={setServices} />
      <ListEditor kind="price" id="sg-prices" heading={`${prices.length} ціна`} noun="ціна" addLabel="+ Додати ціну" placeholder="Напр.: Дитячий МК, 1,5 год — 500 грн з дитини" items={prices} errors={[undefined, 'Напишіть, що саме й скільки коштує.']} onChange={setPrices} />
    </div>
  )
}

const photo = (id: number, url: string, state: KabinetPhoto['state'] = 'review', caption: string | null = null): KabinetPhoto => ({ id, url, caption, canCaption: state === 'review', state })

export function PhotosDemo({ urls, mode }: { urls: string[]; mode: 'empty' | 'busy' | 'full' }) {
  const photos = mode === 'empty' ? [] : urls.slice(0, mode === 'busy' ? 2 : 5).map((u, i) => photo(i + 1, u, i === 0 ? 'live' : 'review', i === 1 ? 'Чашка «Злива» з серцями' : null))
  return (
    <PhotoManager
      slug="demo"
      initial={photos}
      onStudio={() => undefined}
      preview={mode === 'busy' ? { uploads: [{ phase: 'uploading', progress: 62, url: urls[2] }, { phase: 'heic' }, { phase: 'error' }] } : mode === 'full' ? { removed: [3] } : undefined}
    />
  )
}
