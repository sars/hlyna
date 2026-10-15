// What people type for each format tag (src/shared/options.ts) and for a few cities whose other names do not fold to the
// Ukrainian one (normalize.ts already joins Львов/Lviv/Львів, Киев/Kyiv/Київ, Одесса/Odesa/Одеса and the like).
// Russian and English words are understood here and never shown: results always carry the Ukrainian titles.
import type { StudioFormat } from '@/shared/options'

export const CONCEPT_WORDS: Record<StudioFormat, string> = {
  wheel: 'гончарне коло гончарний круг wheel',
  handbuilding: 'ліплення ліпка ліпити handbuilding',
  painting: 'розпис розписати малювання painting',
  kids: 'діти дитячий дитина школярі детский kids children',
  couples: 'двох двоє пара пари побачення романтичний свидание date couple',
  courses: 'курси навчання обучение course',
  certificates: 'сертифікат подарунковий certificate voucher',
  'corporate-workshop': 'корпоратив корпоративний тімбілдинг тимбилдинг teambuilding',
  'corporate-gifts': 'корпоративні подарунки подарунок подарок мерч gift',
  logo: 'логотип лого брендування брендований мерч logo',
  horeca: 'ресторан кафе кавярня кофейня готель гостиница hotel horeca хорека заклад',
  'new-year': 'новий рік новорічний різдво різдвяний ялинкові christmas',
}

/** City slug → names that do not fold to the Ukrainian one. */
export const CITY_ALIASES: Record<string, string> = {
  mykolaiv: 'николаев',
  kropyvnytskyi: 'кировоград кропивницкий',
  dnipro: 'днепропетровск',
  'ivano-frankivsk': 'франик франковск',
  'bila-tserkva': 'белая церковь',
  'kryvyi-rih': 'кривой рог',
}

// Words that say «ceramics» or «a class» and nothing else: a result is not marked down for missing them.
export const GENERIC = new Set(
  'кераміка кераміки кераміку керамічний керамічні глина глини майстер клас класи майстеркласи мк студія студії гончарство гончарства ceramics pottery'.split(' '),
)

// Words that join others («майстер-клас у Львові», «де купити»).
export const STOP = new Set('у в на і й та з із зі до по для де як що the in and for и с где'.split(' '))
