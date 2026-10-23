import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import React from 'react'

import { conjunction, formatDayMonth, joinList } from '@/components/kabinet/format'
import { TelegramUnlink } from '@/components/kabinet/TelegramUnlink.client'
import { Button } from '@/components/ui/Button'
import { Kicker } from '@/components/ui/Kicker'
import { cx, wrap } from '@/components/ui/layout'
import { MoreLink } from '@/components/ui/MoreLink'
import { Note } from '@/components/ui/Note'
import { Meter } from '@/components/ui/SectionRow'
import { StatusTag } from '@/components/ui/StatusTag'
import { kabinetOwner } from '@/lib/kabinetData'
import type { StudioSummary } from '@/shared/kabinet'

export const metadata: Metadata = { title: 'Ваші студії' }

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

function Studio({ s }: { s: StudioSummary }) {
  const base = `/kabinet/studiya/${s.slug}`
  const review = s.sections.filter((x) => x.state === 'review')
  const first = s.missing[0]
  return (
    <li className="kb-stud">
      <p className="m-0 font-mono text-[11px] leading-[1.4] tracking-[.06em] text-ink-2 uppercase">{s.kicker}</p>
      <h2 className="kb-stud-n">
        <Link href={base} className="text-ink no-underline hover:text-cobalt">
          {s.name}
        </Link>
      </h2>
      <Meter filled={s.filled} total={s.total} aside={s.reviewSince ? <StatusTag state="review">на перевірці · {formatDayMonth(s.reviewSince)}</StatusTag> : <StatusTag state="live" />} />
      <p className="kb-miss">
        {s.missing.length ? (
          <>
            Бракує:{' '}
            {s.missing.map((m, i) => (
              <React.Fragment key={m.section}>
                {i > 0 && (i === s.missing.length - 1 ? ` ${conjunction(s.missing[i - 1].label, m.label)} ` : ', ')}
                <Link href={`${base}/${m.section}`}>{m.label}</Link>
              </React.Fragment>
            ))}
            .
          </>
        ) : (
          'Усе заповнено.'
        )}
        {review.length > 0 && ` На перевірці: ${joinList(review.map((x) => lower(x.title)))}.`}
      </p>
      <div className="kb-stud-acts flex flex-wrap items-center gap-x-[18px] gap-y-1">
        <Button size="sm" href={first ? `${base}/${first.section}` : base}>
          {first ? 'Заповнити профіль' : 'Редагувати профіль'}
        </Button>
        <MoreLink href={s.profileUrl} arrow>
          Профіль на сайті
        </MoreLink>
        {s.openOrders > 0 && (
          <MoreLink href={`${base}/zamovlennia`} arrow>
            Замовлень відкрито: {s.openOrders}
          </MoreLink>
        )}
      </div>
    </li>
  )
}

export default async function Kabinet() {
  const owner = await kabinetOwner()
  if (!owner) redirect('/kabinet/vhid')
  const { studios, telegram } = owner
  return (
    <main className={cx(wrap, 'flex-1 pt-hero pb-section')}>
      <div className="grid max-w-[860px] gap-4">
        <header className="grid gap-2">
          <Kicker>Кабінет студії</Kicker>
          <h1 className="m-0 font-display text-[clamp(24px,3.2vw,40px)] leading-[1.08] font-semibold tracking-[-.01em]">{studios.length === 1 ? 'Ваша студія' : 'Ваші студії'}</h1>
          <p className="m-0 max-w-read text-[16px] leading-[1.5] text-ink-2 sm:text-[17px]">
            Усе, що ви зміните, ми переглянемо й опублікуємо — зазвичай протягом доби. Профіль безкоштовний; повний профіль із фото, цінами й умовами для бізнесу частіше отримує запити від кав’ярень, готелів і компаній.
          </p>
        </header>
        {studios.length > 0 ? (
          <ul className="m-0 grid list-none border-t-2 border-ink p-0">
            {studios.map((s) => (
              <Studio key={s.id} s={s} />
            ))}
          </ul>
        ) : (
          <p className="m-0 text-ink-2">
            До кабінету ще не додано студій. <Link href="/zapyt?vid=studiya">Напишіть нам</Link>.
          </p>
        )}
        <section aria-label="Сповіщення про замовлення" className="grid gap-2.5 border-t-2 border-ink pt-4">
          <Kicker>Сповіщення про замовлення</Kicker>
          {telegram.linked ? (
            <>
              <p className="m-0 max-w-read text-[15.5px] leading-[1.5]">Telegram підключено: нові замовлення приходять вам у бот.</p>
              <div>
                <TelegramUnlink />
              </div>
            </>
          ) : telegram.link ? (
            <>
              <p className="m-0 max-w-read text-[15.5px] leading-[1.5]">Підключіть Telegram, щоб нові замовлення з крамниці приходили вам одразу, з кнопками «Підтвердити» і «Відправлено».</p>
              <div>
                <a href={telegram.link} target="_blank" rel="noopener" className="ui-btn" data-variant="ink" data-size="sm">
                  Підключити Telegram
                </a>
              </div>
            </>
          ) : (
            <Note>Підключення Telegram ще не налаштоване. Замовлення все одно видно тут, у кабінеті.</Note>
          )}
        </section>
      </div>
    </main>
  )
}
