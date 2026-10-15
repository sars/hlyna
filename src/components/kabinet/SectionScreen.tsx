import Link from 'next/link'
import React from 'react'

import { Kicker } from '@/components/ui/Kicker'
import { cx } from '@/components/ui/layout'
import type { SectionExtras, SectionPage, SectionValues } from '@/shared/kabinet'
import { KABINET_SECTIONS, KABINET_SECTION_TITLE, type KabinetSection } from '@/shared/options'

import { PhotoSection } from './PhotoSection.client'
import { SectionEditor } from './SectionEditor.client'
import type { TextSection, TextValues } from './SectionFields.client'

const LEAD: Record<KabinetSection, string> = {
  'pro-studiyu': '',
  posluhy: 'Коротко, по пункту в рядок — так їх читають і люди, і пошук.',
  tsiny: 'Що, скільки триває й скільки коштує. Місяць поруч із ціною каже відвідувачу, що вона свіжа.',
  biznes: 'Кав’ярні, готелі й компанії шукають саме це: від скількох штук, за скільки тижнів і чи буде логотип. Заповніть лише те, що робите.',
  kontakty: 'Лише робочі контакти — вони показуються в профілі.',
  foto: 'Роботи, студія, заняття — до 10. Перше — головне в профілі. Завантажуючи, ви дозволяєте показувати фото на сайті з підписом студії.',
}

/** Short names for «Далі: …» on the save bar. */
const NEXT_NAME: Record<KabinetSection, string> = { 'pro-studiyu': 'про студію', posluhy: 'послуги', tsiny: 'ціни', biznes: 'для бізнесу', kontakty: 'контакти', foto: 'фото' }

// One section as a screen: «← Студія · усі розділи» (phones), «Розділ 3 / 6», the title, a lead and the form.
// The overview page shows the first section this way from lg, with the title one level down (the studio is its h1).
export function SectionScreen({ page, level = 'h1' }: { page: SectionPage; level?: 'h1' | 'h2' }) {
  const { studio, section } = page
  const index = KABINET_SECTIONS.indexOf(section)
  const Title = level
  const lead = LEAD[section]
  const following = KABINET_SECTIONS[index + 1]
  const next = following ? { href: `/kabinet/studiya/${studio.slug}/${following}`, label: NEXT_NAME[following] } : { href: `/kabinet/studiya/${studio.slug}`, label: 'огляд' }
  return (
    <>
      <div className="mb-[18px] lg:hidden">
        <Link href={`/kabinet/studiya/${studio.slug}`} className="kb-back">
          ← {studio.name} · усі розділи
        </Link>
      </div>
      <header className="mb-[18px] grid gap-2">
        <Kicker>Розділ {index + 1} / {KABINET_SECTIONS.length}</Kicker>
        <Title className="m-0 font-display text-[clamp(22px,2.4vw,30px)] leading-[1.12] font-semibold">{KABINET_SECTION_TITLE[section]}</Title>
        {lead && <p className={cx('m-0 max-w-read text-[15.5px] leading-[1.5] text-ink-2', section === 'foto' && 'hidden sm:block')}>{lead}</p>}
      </header>
      {section === 'foto' ? (
        <PhotoSection slug={studio.slug} initial={(page.values as SectionValues['foto']).photos} />
      ) : (
        <SectionEditor slug={studio.slug} section={section as TextSection} initial={page.values as TextValues} extras={page.extras as SectionExtras[TextSection]} next={next} />
      )}
    </>
  )
}
