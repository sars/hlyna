// Cheap, reliable consistency checks over studio rows (docs/reviews/2026-10-17-fact-fixes.md). Pure functions: the read-only
// script scripts/app/check-data.ts feeds them the database, tests/int/dataChecks.int.spec.ts feeds them examples.
// Every rule here came from a real error and is quiet on the current data; a rule that needs judgement does not belong here.

export type CheckRow = {
  slug: string
  name: string
  type: string | null
  city: string | null
  visibility: string
  summary: string | null
  publicDescription: string | null
  descriptionInternal: string | null
  recentNote: string | null
  instagram: string | null
  facebook: string | null
  website: string | null
}

export type Issue = { slug: string; rule: 'legacy-needs-death' | 'birthplace-as-city' | 'instagram-format' | 'instagram-not-own' | 'handle-in-name' | 'duplicate-instagram' | 'link-format'; text: string }

// «Спадщина» is type `legacy`; `heritage` is «Традиційна майстерня» and is for living folk masters too (decisions.md 17.10.2026).
// A person in «Спадщина» needs a sourced death in the text (a year range, «помер(ла)», «пішла з життя», a dated «— 23.07.2026»);
// museums, centres, traditions and factories are not persons and need none.
const DEATH = /помер|пішл?а з життя|пішов з життя|†|\((?:\d{1,2}\.\d{1,2}\.)?(?:18|19)\d\d\s*[–—-]\s*(?:\d{1,2}\.\d{1,2}\.)?(?:19|20)\d\d\)|[—–-]\s*\d{1,2}\.\d{1,2}\.(?:19|20)\d\d/iu
const NOT_A_PERSON = /музей|museum|осередок|центр|традиці|фабрик|кераміка|свищик|галере|кав.?ярн|школа|гурток|\bГО\b/iu

// «Кераміст у Вінниці, закінчив…»: a role phrase followed straight by «у/в <place>» reads as where the person works. When the
// research said «нар. 1962 у Вінниці» and a cleanup dropped only «нар. 1962», the birthplace became a workplace (11.10.2026).
const ROLE = '(?:кераміст\\p{L}*|художни\\p{L}+|живопис\\p{L}+|скульптор\\p{L}*|педагог\\p{L}*|майстр\\p{L}+|майстер|гончар\\p{L}*|графік\\p{L}*|дизайнер\\p{L}*|декоративн\\p{L}+|кераміки|народної|творчості|мистецтва)'
const LEAD = new RegExp(`^${ROLE}(?:(?:\\s*,\\s*|\\s+(?:і|й|та)\\s+|\\s*-\\s*|\\s+)${ROLE})*\\s+(?:у|в)\\s+(?:с\\.\\s*|м\\.\\s*|смт\\s+)?([А-ЯІЇЄҐ][а-яіїєґ'’-]+)`, 'iu')
const key = (s: string) => s.toLowerCase().replace(/[іїє]/g, 'и').slice(0, 3)

// A note that says the linked account belongs to someone else («Цей Instagram належить британській ініціативі») means the link is wrong.
const NOT_OWN = /(?:instagram|акаунт|профіль)[^.]{0,40}належить|не є (?:його|її|їхнім) (?:особист|акаунт)|чужий (?:акаунт|instagram)/iu
const IG_URL = /^https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/i
const igHandle = (u: string | null) => (u?.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1] ?? '').toLowerCase()
const HTTP_URL = /^https?:\/\/\S+\.\S+$/i

export function checkStudios(rows: CheckRow[]): Issue[] {
  const out: Issue[] = []
  const add = (r: CheckRow, rule: Issue['rule'], text: string) => out.push({ slug: r.slug, rule, text })
  const publicByHandle = new Map<string, string[]>()
  for (const r of rows) {
    if (r.type === 'legacy') {
      const text = [r.name, r.summary, r.publicDescription, r.descriptionInternal].filter(Boolean).join(' ')
      if (!NOT_A_PERSON.test(`${r.name} ${r.summary ?? ''}`) && !DEATH.test(text)) add(r, 'legacy-needs-death', 'тип «Спадщина» (legacy) у людини без підтвердженої смерті в тексті: живий майстер має бути «Майстер» (maker) чи «Традиційна майстерня» (heritage)')
    }
    if (r.city)
      for (const [field, t] of [['description_internal', r.descriptionInternal], ['summary', r.summary], ['public_description', r.publicDescription]] as const) {
        const place = t?.trim().match(LEAD)?.[1]
        if (place && key(place) !== key(r.city)) add(r, 'birthplace-as-city', `${field}: «${t!.trim().slice(0, 70)}…» називає «${place}», а місто профілю — ${r.city} (місце народження чи навчання не є місцем роботи: пиши «народився(лась) у …»)`)
      }
    if (r.instagram && !IG_URL.test(r.instagram.trim())) add(r, 'instagram-format', `Instagram має бути посиланням на акаунт (https://www.instagram.com/<логін>/), а не «${r.instagram.slice(0, 60)}»`)
    if (r.instagram && NOT_OWN.test([r.recentNote, r.descriptionInternal, r.summary, r.publicDescription].filter(Boolean).join(' '))) add(r, 'instagram-not-own', 'у тексті сказано, що Instagram профілю належить комусь іншому: прибери посилання (4rom_people, 17.10.2026)')
    for (const [f, v] of [['website', r.website], ['facebook', r.facebook]] as const) if (v && !HTTP_URL.test(v.trim())) add(r, 'link-format', `${f} має бути абсолютним http(s)-посиланням, а не «${v.slice(0, 60)}»`)
    const own = igHandle(r.instagram)
    for (const m of r.name.matchAll(/\(([A-Za-z0-9]+_[A-Za-z0-9._]*)\)/g)) if (m[1]!.toLowerCase() !== own) add(r, 'handle-in-name', `у назві логін «${m[1]}», якого немає в Instagram профілю (${r.instagram || 'порожньо'}): чужий акаунт у назві`)
    if (own && r.visibility === 'public') publicByHandle.set(own, [...(publicByHandle.get(own) ?? []), r.slug])
  }
  for (const [h, slugs] of publicByHandle) if (slugs.length > 1) for (const slug of slugs) out.push({ slug, rule: 'duplicate-instagram', text: `@${h} стоїть у кількох публічних профілях: ${slugs.join(', ')}` })
  return out
}
