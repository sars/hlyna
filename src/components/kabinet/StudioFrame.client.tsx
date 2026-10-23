'use client'

import Link from 'next/link'
import React, { createContext, useContext, useState } from 'react'

import { Kicker } from '@/components/ui/Kicker'
import { cx } from '@/components/ui/layout'
import { Meter, SectionRow, SectionRows } from '@/components/ui/SectionRow'
import { StatusTag } from '@/components/ui/StatusTag'
import type { StudioSummary } from '@/shared/kabinet'
import type { KabinetSection } from '@/shared/options'

import { joinList } from './format'

type Ctx = { studio: StudioSummary; setStudio: (s: StudioSummary) => void }
const StudioContext = createContext<Ctx | null>(null)

/** The studio as the page last heard of it: the server's summary at load, then whatever a save or a photo action returned. */
export function useStudio(): Ctx {
  const c = useContext(StudioContext)
  if (!c) throw new Error('useStudio outside StudioFrame')
  return c
}

// The studio overview and the editor share this frame: below lg the overview is a page of section rows and each
// section is its own screen; from lg the rows are a sticky navigation on the left and the section (the first one on
// the overview) is on the right. One markup serves both, so nothing flashes or loads twice.
export function StudioFrame({ initial, mode, current, children }: { initial: StudioSummary; mode: 'overview' | 'section'; current?: KabinetSection | 'zamovlennia'; children: React.ReactNode }) {
  const [studio, setStudio] = useState(initial)
  const overview = mode === 'overview'
  const Name = overview ? 'h1' : 'p'
  return (
    <StudioContext.Provider value={{ studio, setStudio }}>
      <div className="grid flex-1 content-start gap-5 lg:grid-cols-[300px_minmax(0,720px)] lg:gap-x-[clamp(28px,4vw,64px)] lg:gap-y-0">
        <Link href="/kabinet" className={cx('kb-back justify-self-start lg:col-span-2 lg:mb-5', !overview && 'hidden lg:inline-flex')}>
          ← Кабінет
        </Link>
        <aside className={cx('ui-side grid content-start gap-3.5 lg:sticky lg:top-5 lg:self-start', !overview && 'hidden lg:grid')}>
          <div className="grid gap-2">
            <Kicker>{studio.kicker}</Kicker>
            <Name className="m-0 font-display text-[clamp(26px,3.2vw,40px)] leading-[1.08] font-semibold tracking-[-.01em] [overflow-wrap:anywhere]">{studio.name}</Name>
          </div>
          <Meter
            filled={studio.filled}
            total={studio.total}
            short
            aside={
              <Link href={studio.profileUrl} className="font-display text-[12.5px] leading-none font-semibold tracking-[.04em] whitespace-nowrap text-ink uppercase no-underline hover:text-cobalt">
                На сайті →
              </Link>
            }
          />
          {overview && studio.missing.length > 0 && <p className="m-0 text-[14.5px] leading-[1.45] lg:hidden">Бракує: {joinList(studio.missing.map((m) => m.label))}.</p>}
          <SectionRows label="Розділи профілю">
            {studio.sections.map((s, i) => (
              <SectionRow
                key={s.key}
                href={`/kabinet/studiya/${studio.slug}/${s.key}`}
                title={s.title}
                line={s.line}
                state={s.state}
                section={s.key}
                current={!overview && s.key === current}
                lgCurrent={overview && i === 0}
              />
            ))}
            <li>
              <Link href={`/kabinet/studiya/${studio.slug}/zamovlennia`} className="ui-srow" aria-current={current === 'zamovlennia' ? 'page' : undefined}>
                <span className="ui-srow-n">Замовлення</span>
                <span className="ui-srow-l">{studio.openOrders > 0 ? `${studio.openOrders} відкритих` : 'немає відкритих'}</span>
                <StatusTag state={studio.openOrders > 0 ? 'review' : 'live'}>{studio.openOrders > 0 ? 'відкриті' : 'крамниця'}</StatusTag>
                <span className="ui-srow-go" aria-hidden>→</span>
              </Link>
            </li>
          </SectionRows>
          <p className="m-0 hidden text-[14px] leading-[1.45] text-ink-2 lg:block">Усе, що збережете, ми переглянемо й опублікуємо протягом доби. На сайті до того — попередня версія.</p>
        </aside>
        <div className={cx('flex min-w-0 flex-col', overview && 'hidden lg:flex')}>{children}</div>
      </div>
    </StudioContext.Provider>
  )
}
