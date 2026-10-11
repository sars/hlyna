// One sentence, one place: screens call t('requests.title') and never hold the words. (Kit: lib/i18n, adapted:
// Ukrainian only for now; English would be a second file beside uk.ts.)
import { uk, type Strings } from './uk'

export type TextKey = keyof Strings
export type TextParams = Record<string, string | number>

const strings: Record<string, unknown> = uk
const plural = new Intl.PluralRules('uk-UA')

/** The sentence for a key with {name} filled in; a missing key returns the key (a blemish, not an outage). */
export function t(key: TextKey | (string & {}), params?: TextParams): string {
  const entry = strings[key]
  let text: string
  if (typeof entry === 'string') text = entry
  else if (entry && typeof entry === 'object') {
    const forms = entry as Partial<Record<Intl.LDMLPluralRule, string>>
    text = forms[plural.select(Number(params?.count ?? 0))] ?? forms.other ?? String(key)
  } else return String(key)
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (params[name] === undefined ? whole : String(params[name])))
}
