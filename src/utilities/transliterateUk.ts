/**
 * Ukrainian → Latin transliteration following the official national rules
 * (Resolution of the Cabinet of Ministers of Ukraine No. 55, 27.01.2010).
 *
 * Special cases:
 * - "зг" → "zgh" (Згорани → Zghorany)
 * - Є, Ї, Й, Ю, Я at the start of a word → Ye, Yi, Y, Yu, Ya; elsewhere → ie, i, i, iu, ia
 * - Soft sign (ь) and apostrophe are dropped
 */

const BASE: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'h',
  ґ: 'g',
  д: 'd',
  е: 'e',
  є: 'ie',
  ж: 'zh',
  з: 'z',
  и: 'y',
  і: 'i',
  ї: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ь: '',
  ю: 'iu',
  я: 'ia',
  // Russian letters that occasionally appear in names
  ё: 'io',
  ы: 'y',
  э: 'e',
  ъ: '',
}

const WORD_START: Record<string, string> = {
  є: 'ye',
  ї: 'yi',
  й: 'y',
  ю: 'yu',
  я: 'ya',
}

const APOSTROPHES = /['’ʼ`‘]/g

const isCyrLetter = (ch: string | undefined): boolean => !!ch && /[а-яґєіїёыэъ]/i.test(ch)

export function transliterateUk(input: string): string {
  const text = input.replace(APOSTROPHES, '')
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const lower = ch.toLowerCase()
    const isUpper = ch !== lower
    let mapped: string | undefined

    if (lower === 'г' && text[i - 1]?.toLowerCase() === 'з') {
      mapped = 'gh'
    } else if (WORD_START[lower] && !isCyrLetter(text[i - 1])) {
      mapped = WORD_START[lower]
    } else if (lower in BASE) {
      mapped = BASE[lower]
    }

    if (mapped === undefined) {
      out += ch
      continue
    }
    if (isUpper && mapped.length > 0) {
      mapped = mapped[0].toUpperCase() + mapped.slice(1)
    }
    out += mapped
  }
  return out
}

/** Latin, lowercase, dash-separated slug from any (Ukrainian or Latin) string. */
export function slugifyUk(input: string, maxLength = 80): string {
  const slug = transliterateUk(input)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug.slice(0, maxLength).replace(/-+$/g, '')
}
