// Small formatters for the cabinet. All times are Kyiv time, so the server render and the browser agree.

const TZ = 'Europe/Kyiv'

function parts(d: Date, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('uk-UA', { timeZone: TZ, ...opts }).formatToParts(d)
}
const get = (ps: Intl.DateTimeFormatPart[], t: string) => ps.find((p) => p.type === t)?.value ?? ''

/** «14.10» */
export function formatDayMonth(iso: string): string {
  const ps = parts(new Date(iso), { day: '2-digit', month: '2-digit' })
  return `${get(ps, 'day')}.${get(ps, 'month')}`
}

/** «14:02» */
export function formatTime(when: Date | number | string): string {
  const ps = parts(new Date(when), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  return `${get(ps, 'hour')}:${get(ps, 'minute')}`
}

/** «16 жовтня, 14:20» */
export function formatWhen(when: Date | number | string): string {
  const d = new Date(when)
  const ps = parts(d, { day: 'numeric', month: 'long' })
  return `${get(ps, 'day')} ${get(ps, 'month')}, ${formatTime(d)}`
}

/** Ukrainian plural: one, few, many («1 нова ціна», «2 нові ціни», «5 нових цін»). */
export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

/** The DOM id of a field by its value key («prices.2.text» → «kb-prices-2-text»); the forms and the error links agree on it. */
export const fieldId = (key: string) => `kb-${key.replace(/\./g, '-')}`

const VOWELS = 'аеєиіїоуюя'

/** The conjunction before the last item by euphony: «й» after a vowel before a consonant, else «і». */
export function conjunction(prev: string, next: string): 'й' | 'і' {
  const a = prev.trim().slice(-1).toLowerCase()
  const b = next.trim().charAt(0).toLowerCase()
  return VOWELS.includes(a) && !VOWELS.includes(b) ? 'й' : 'і'
}

/** «фото, умов для бізнесу й телефону». */
export function joinList(items: string[]): string {
  if (items.length < 2) return items[0] ?? ''
  const last = items[items.length - 1]
  return `${items.slice(0, -1).join(', ')} ${conjunction(items[items.length - 2], last)} ${last}`
}
