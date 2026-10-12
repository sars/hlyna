// The one place numbers, dates and amounts become text in the panel. Nothing else may call Intl.
// (Adapted from brocoders/inhouse-ai-starter-kit, MIT: the panel has one locale and one time zone, so the
// FormatProvider is gone and the settings are constants.)

type FormatSettings = { locale: string; timeZone: string }

const current: FormatSettings = { locale: 'uk-UA', timeZone: 'Europe/Kyiv' }

// Intl formatters are expensive to build and cheap to keep, and a list redraws
// thousands of cells; one per shape, thrown away when the settings change.
const caches = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat>();
function dateFormat(key: string, options: Intl.DateTimeFormatOptions) {
  let made = caches.get(key) as Intl.DateTimeFormat | undefined;
  if (!made) {
    made = new Intl.DateTimeFormat(current.locale, {
      timeZone: current.timeZone,
      // A calendar-day format passes its own `timeZone: 'UTC'`, which wins.
      ...options,
    });
    caches.set(key, made);
  }
  return made;
}
function numberFormat(key: string, options: Intl.NumberFormatOptions) {
  let made = caches.get(key) as Intl.NumberFormat | undefined;
  if (!made) {
    made = new Intl.NumberFormat(current.locale, options);
    caches.set(key, made);
  }
  return made;
}

const CALENDAR_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * An instant or a calendar day as "18 Sept 2026".
 *
 * The two are different things and are formatted differently. An instant is
 * shown on the day it falls on in the app's time zone. A calendar day — a due
 * day, `2026-09-18` — has no time and no zone: it is the 18th everywhere, so
 * it is formatted as midnight UTC in UTC and never passes through the app's
 * zone at all. Going through the zone, even from midday, puts it on the 19th
 * anywhere more than twelve hours ahead of UTC.
 */
export function formatDate(value: string | Date | null | undefined): string {
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  const day = typeof value === 'string' ? CALENDAR_DAY.exec(value) : null;
  if (day) {
    const at = new Date(Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3])));
    // Date.UTC rolls 30 February over into March; a day that does not exist
    // is not a day, and saying "2 Mar" for it would be inventing one.
    if (Number.isNaN(at.getTime()) || at.toISOString().slice(0, 10) !== value) return '—';
    return dateFormat('calendar-day', { ...options, timeZone: 'UTC' }).format(at);
  }
  const date = toDate(value);
  if (!date) return '—';
  return dateFormat('date', options).format(date);
}

/** An instant as "18 Sept 2026, 14:05", in the app's time zone. */
export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return '—';
  return dateFormat('datetime', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const relativeUnits: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 3600_000],
  ['month', 30 * 24 * 3600_000],
  ['day', 24 * 3600_000],
  ['hour', 3600_000],
  ['minute', 60_000],
  ['second', 1000],
];

/** "2 hours ago", "in 3 days". How a history line says when. */
export function formatRelative(
  value: string | Date | null | undefined,
  now: Date = new Date(),
): string {
  const date = toDate(value);
  if (!date) return '—';
  const difference = date.getTime() - now.getTime();
  const format = new Intl.RelativeTimeFormat(current.locale, {
    numeric: 'auto',
    style: 'short',
  });
  for (const [unit, size] of relativeUnits) {
    if (Math.abs(difference) >= size || unit === 'second')
      return format.format(Math.round(difference / size), unit);
  }
  return format.format(0, 'second');
}

/** A count of things. Never an amount of money — that is formatAmount. */
export function formatNumber(value: number, fractionDigits = 0): string {
  return numberFormat(`n${fractionDigits}`, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}


/**
 * An amount held as a whole number of its smallest unit — cents, grams,
 * minutes — shown the way that unit is written.
 *
 * Amounts are integers everywhere in this kit, because a price that is a
 * floating-point number eventually adds up to the wrong total. With a currency
 * the currency's own number of decimals is used; without one the number is
 * shown as it is, optionally with a unit after it.
 */
export function formatAmount(
  minor: number,
  currency?: string | undefined,
  options?: { unit?: string; exponent?: number } | undefined,
): string {
  if (currency) {
    const digits = currencyDigits(currency);
    return numberFormat(`c${currency}`, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).format(minor / 10 ** digits);
  }
  const exponent = options?.exponent ?? 0;
  const text = numberFormat(`a${exponent}`, {
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(minor / 10 ** exponent);
  return options?.unit ? `${text} ${options.unit}` : text;
}

const digitsByCurrency = new Map<string, number>();
function currencyDigits(currency: string): number {
  let digits = digitsByCurrency.get(currency);
  if (digits === undefined) {
    digits =
      new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? 2;
    digitsByCurrency.set(currency, digits);
  }
  return digits;
}





function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  // A calendar day has no time of day. Midday UTC is as neutral as an instant
  // can be, but it is still an instant: formatDate never sends a
  // calendar day through here, and nothing that needs its exact date should.
  const date = CALENDAR_DAY.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
