import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { fillCopy, type WaveCopy } from '@/editorial/copy'
import { eventsPageData, eventWhen, type EventItem } from '@/editorial/wave-b/events'
import { currentDates, dropStale, isStale, newYearSeason, sentences } from '@/lib/dates'
import { currentLine, currentNews, currentNote } from '@/lib/present'

// Audit cause 7 (15.10.2026): dates never aged. Pages are ISR with a daily refresh, so these rules run every day.
describe('dates: a past date never reads as current', () => {
  it('drops an announcement the day after its date, not before', () => {
    const s = 'У «Вінку добра» на 17 жовтня 2026 року анонсовано майстер-клас «чашка з блюдцем».'
    expect(isStale(s, '2026-10-17')).toBe(false)
    expect(isStale(s, '2026-10-18')).toBe(true)
    expect(isStale('З 8 жовтня до 1 листопада 2026 року у Верхній виставковій залі триває виставка.', '2026-10-20')).toBe(false)
    expect(isStale('З 8 жовтня до 1 листопада 2026 року у Верхній виставковій залі триває виставка.', '2026-11-02')).toBe(true)
    expect(isStale('розпис чашечки за 380 грн; 10 жовтня 2026 року в розкладі', '2026-10-15')).toBe(true)
  })

  it('keeps history: past tense, «востаннє», the day something was announced', () => {
    expect(isStale('Маркет OOMPA LOOMPAS пройшов 10–11 жовтня 2026 року.', '2027-05-01')).toBe(false)
    expect(isStale('Окремий Маркет кераміки востаннє 22–23 лютого 2025 року.', '2027-05-01')).toBe(false)
    expect(isStale('ҐАVA у дописі 9 жовтня 2026 року оголосила передзамовлення до Різдва.', '2027-05-01')).toBe(false)
    expect(isStale('Цифри знято з вітрин 8 жовтня 2026 року.', '2027-05-01')).toBe(false)
  })

  it('ignores sources, «станом на», starts and yearly dates', () => {
    expect(isStale('Сертифікат коштує від 950 грн (Instagram, 10.10.2026).', '2027-05-01')).toBe(false)
    expect(isStale('Станом на 8 жовтня 2026 року наймолодші — ViraFJewelry і ClaySpiritUA.', '2027-05-01')).toBe(false)
    expect(isStale('З травня 2025 року працює школа «Гончарство в темряві».', '2027-05-01')).toBe(false)
    expect(isStale('Саме Різдво з 2023 року святкують 25 грудня за Законом № 3258-IX.', '2027-05-01')).toBe(false)
  })

  it('ages a month or a season only when the clause says it is going on now', () => {
    expect(isStale('У жовтні 2026 року індивідуальні заняття там ідуть у суботу о 16:00.', '2026-10-31')).toBe(false)
    expect(isStale('У жовтні 2026 року індивідуальні заняття там ідуть у суботу о 16:00.', '2026-11-01')).toBe(true)
    expect(isStale('Восени 2026 року студія веде гончарство з розписом персонажів.', '2026-12-01')).toBe(true)
    expect(isStale('У жовтні 2026 року гончарня показувала парні роботи.', '2027-05-01')).toBe(false)
    expect(isStale('Простір «Галаш»: у жовтні 2026 — OOMPA LOOMPAS.', '2027-05-01')).toBe(false)
    expect(isStale('Прикраси сезону 2026/27 уже продають чи чекати грудня?', '2027-01-06')).toBe(false)
    expect(isStale('Прикраси сезону 2026/27 уже продають чи чекати грудня?', '2027-01-07')).toBe(true)
  })

  it('drops only the stale sentence and splits sentences around «вул.» and «…»', () => {
    expect(sentences('Ярмарок на пл. Ринок тривав з 22 грудня. Фестиваль «Витоки. Форма традиції» пройшов улітку.')).toHaveLength(2)
    const text = 'Майстерня на вул. Коцюбайла приймає щосуботи. На 17 жовтня 2026 року анонсовано МК «чашка з блюдцем». Ціна 900 грн.'
    expect(dropStale(text, '2026-10-20')).toBe('Майстерня на вул. Коцюбайла приймає щосуботи. Ціна 900 грн.')
  })

  it('dates an undated «18.09» in a profile line by its source, and a note by its newest year', () => {
    expect(currentLine('Розклад на вересень: 18.09, 19.09, 23.09 (Instagram, 09.2026)', '2026-09-10')).not.toBe('')
    expect(currentLine('Розклад на вересень: 18.09, 19.09, 23.09 (Instagram, 09.2026)', '2026-10-15')).toBe('')
    expect(currentLine('МК з ліплення 2 год — 900 грн (сайт, 2026)', '2027-05-01')).not.toBe('')
    expect(currentNote('Виставка триває до 11.10. Нова колекція чашок, жовтень 2026.', '2026-10-01', '2026-10-15')).toBe('Нова колекція чашок, жовтень 2026.')
    expect(currentDates('Виставка триває до 11.10.', 2026)[0]).toMatchObject({ end: '2026-10-11', yearFrom: 'context' })
  })

  // Review of 1f26eca, 16.10.2026: four bugs found before deploy.
  it('keeps paragraphs and line breaks: a profile description is split on blank lines', () => {
    const text = 'Перший абзац, ціни 2026 року.\n\nНа 17 жовтня 2026 року анонсовано МК.\n\nТретій абзац.\nДругий рядок.'
    expect(dropStale(text, '2026-10-20')).toBe('Перший абзац, ціни 2026 року.\n\nТретій абзац.\nДругий рядок.')
    expect(dropStale(text, '2026-10-16')).toBe(text)
  })

  it('an undated day before the source month is next year’s (New Year classes, news in December)', () => {
    expect(currentLine('Новорічні МК 27.12, 3.01 — 900 грн (Instagram, 10.2026)', '2026-12-28')).not.toBe('')
    expect(currentLine('Новорічні МК 27.12, 3.01 — 900 грн (Instagram, 10.2026)', '2027-01-04')).toBe('')
    expect(currentNews('Запрошуємо на МК 10 січня!', '2026-12-20', '2026-12-21')).toBe('Запрошуємо на МК 10 січня!')
    expect(currentNews('Запрошуємо на МК 10 січня!', '2026-12-20', '2027-01-11')).toBe('')
    // A September schedule in an October post is still this year's.
    expect(currentLine('Розклад: 18.09, 19.09 (Instagram, 10.2026)', '2026-10-16')).toBe('')
  })

  it('nouns in -ив and states («залишилось», «відкрито») are not history', () => {
    expect(isStale('Зимовий інтенсив 12–14 грудня 2025 року.', '2026-10-16')).toBe(true)
    expect(isStale('МК 10 жовтня 2026 — залишилось 3 місця.', '2026-10-16')).toBe(true)
    expect(isStale('Набір відкрито на курс 1 жовтня 2026 року.', '2026-10-16')).toBe(true)
    expect(isStale('Студія запустила курс 1 жовтня 2026 року.', '2026-10-16')).toBe(false)
  })

  it('a sentence with several dates stays until the last of them', () => {
    expect(isStale('Записатися можна на 12.10 або 20.10.', '2026-10-13', 2026)).toBe(false)
    expect(isStale('Записатися можна на 12.10 або 20.10.', '2026-10-21', 2026)).toBe(true)
  })

  it('takes seasonal titles from the coming season, or the running one until 6 January', () => {
    expect(newYearSeason('2026-10-15')).toEqual({ label: '2026/27', newYear: 2027 })
    expect(newYearSeason('2027-01-06')).toEqual({ label: '2026/27', newYear: 2027 })
    expect(newYearSeason('2027-01-07')).toEqual({ label: '2027/28', newYear: 2028 })
  })

  it('copy: a section or question headed by a past date goes whole', () => {
    const copy: WaveCopy = {
      id: 't', title: 'Календар {year}', metaDescription: 'Опис.', lead: 'Лід.', sources: [],
      sections: [
        { heading: 'Що в розкладі на жовтень 2026', paragraphs: ['Заняття щосуботи.'] },
        { heading: 'Ціни', paragraphs: ['900 грн за дві години. На 17 жовтня 2026 року анонсовано МК.'] },
      ],
      faq: [{ q: 'Що йде в жовтні 2026 року?', a: 'Розпис.' }, { q: 'Скільки коштує?', a: '900 грн.' }],
    }
    const now = fillCopy(copy, {}, '2026-10-15')
    expect(now.title).toBe('Календар 2026')
    expect(now.sections).toHaveLength(2)
    const later = fillCopy(copy, {}, '2026-11-01')
    expect(later.title).toBe('Календар 2026')
    expect(later.sections.map((s) => s.heading)).toEqual(['Ціни'])
    expect(later.sections[0].paragraphs).toEqual(['900 грн за дві години.'])
    expect(later.faq.map((x) => x.q)).toEqual(['Скільки коштує?'])
  })
})

describe('events: upcoming, running, then past', () => {
  const udiw: EventItem = {
    name: 'UDIW', kind: 'design_week', recurrence: 'seasonal', dates: '2024-04-01..2024-04-07; 2026-10-10..2026-10-11', nextDate: '2026-10-10',
    city: 'Київ', venue: '', status: 'upcoming', entry: '', participation: '', link: '', months: 'Зазвичай: квітень, жовтень',
  }
  const bazaar: EventItem = { ...udiw, name: 'Оплески Базар', recurrence: 'irregular', dates: '2026-10-11 (14:00–20:00)', nextDate: '2026-10-11', months: '' }

  it('says when as of today', () => {
    expect(eventWhen(udiw, '2026-10-01')).toBe('Дата: 10.10.2026')
    expect(eventWhen(udiw, '2026-10-11')).toBe('Триває до 11.10.2026')
    expect(eventWhen(udiw, '2026-10-15')).toBe('Зазвичай: квітень, жовтень; востаннє 10–11.10.2026')
    expect(eventWhen(bazaar, '2026-10-15')).toBe('Відбулася 11.10.2026')
  })

  it('moves events that are over out of «Найближчі»', async () => {
    const d = await eventsPageData('2026-10-15')
    expect(d.upcoming.every((e) => eventWhen(e, '2026-10-15').startsWith('Дата') || eventWhen(e, '2026-10-15').startsWith('Триває') || eventWhen(e, '2026-10-15').startsWith('Орієнтовно'))).toBe(true)
    expect(d.past.length).toBeGreaterThan(0)
    expect(d.past.every((e) => eventWhen(e, '2026-10-15').startsWith('Відбулася'))).toBe(true)
  })
})

// Every dated announcement in written copy carries its year, so it can age; a «24 жовтня» with no year would stay
// forever. Yearly dates (Різдво, Миколай, Новий рік, the gift peak) are the exception.
describe('content: announced dates carry a year', () => {
  const root = path.join(process.cwd(), 'src/content')
  const files: string[] = []
  const walk = (d: string) => fs.readdirSync(d).forEach((f) => (fs.statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : f.endsWith('.json') && files.push(path.join(d, f))))
  walk(root)
  const strings = (v: unknown): string[] => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [])
  const YEARLY = /Різдв|Микола|Святвечір|Нов\p{L}* рік|свят|вихідн|пік/iu

  it.each(files.filter((f) => !/\/(cases|waveB\/events|waveB\/museums|waveC\/newyear)/.test(f)).map((f) => [path.relative(root, f), f]))('%s', (_name, file) => {
    const undated = strings(JSON.parse(fs.readFileSync(file, 'utf8')))
      .flatMap(sentences)
      .filter((s) => currentDates(s, 2026).some((p) => p.yearFrom === 'context') && !YEARLY.test(s))
    expect(undated).toEqual([])
  })
})
