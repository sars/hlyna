// Value lists shared by the database schema (src/server/db), the Zod schemas (src/shared/schemas), the catalogue
// types (src/types/catalog.ts), the panel and the forms. The enums in Postgres are built from these arrays.

export const STUDIO_TYPES = ['studio', 'brand', 'maker', 'school', 'shop', 'supplier', 'heritage', 'legacy', 'other'] as const
export const STUDIO_STATUSES = ['active', 'unclear', 'closed', 'relocated'] as const
export const STUDIO_VISIBILITY = ['public', 'hidden'] as const
export const CONFIDENCE = ['high', 'medium', 'low'] as const
export const GEO_PRECISION = ['address', 'street', 'settlement'] as const
export const STUDIO_FORMATS = [
  'wheel',
  'handbuilding',
  'painting',
  'kids',
  'couples',
  'courses',
  'certificates',
  'corporate-workshop',
  'corporate-gifts',
  'logo',
  'horeca',
  'new-year',
] as const

export const REQUEST_WHAT = ['tableware', 'logo-mugs', 'corporate-gifts', 'corporate-workshop', 'master-class', 'other', 'studio'] as const
export const REQUEST_STATUS = ['new', 'in_progress', 'forwarded', 'replied', 'deal', 'lost', 'closed'] as const

export const CLAIM_STATUS = ['pending', 'approved', 'rejected'] as const
export const CHANGE_SET_STATUS = ['pending', 'applied', 'partially_applied', 'rejected', 'superseded'] as const
export const USER_ROLES = ['admin', 'editor', 'owner'] as const
export const MEDIA_STATUS = ['active', 'pending', 'orphan'] as const

export type StudioType = (typeof STUDIO_TYPES)[number]
export type StudioStatus = (typeof STUDIO_STATUSES)[number]
export type Confidence = (typeof CONFIDENCE)[number]
export type GeoPrecision = (typeof GEO_PRECISION)[number]
export type StudioFormat = (typeof STUDIO_FORMATS)[number]
export type RequestWhat = (typeof REQUEST_WHAT)[number]
export type RequestStatus = (typeof REQUEST_STATUS)[number]
export type UserRole = (typeof USER_ROLES)[number]

export const REQUEST_WHAT_LABEL: Record<RequestWhat, string> = {
  tableware: 'Посуд для закладу',
  'logo-mugs': 'Чашки з логотипом',
  'corporate-gifts': 'Корпоративні подарунки',
  'corporate-workshop': 'Корпоратив з ліплення з глини',
  'master-class': 'Майстер-клас',
  other: 'Інше',
  studio: 'Студія: додати / оновити профіль',
}

/** Studio and city slugs: Latin letters, digits and single hyphens (the panel, the schemas and the editor agree). */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
/** Photos an owner may attach to a profile (cabinet form and the service that applies the change). */
export const MAX_OWNER_PHOTOS = 10
/**
 * Oblast (as written in cities.oblast) → the slug of its centre. A centre's city page covers the whole oblast
 * («Тернопіль і область»; owner, 15.10.2026); Kyiv's page covers Kyiv oblast too. Donetsk, Luhansk and Crimea are left
 * out: their centres are occupied and the catalogue has no studio there, so their towns stay on no city page.
 */
export const OBLAST_CENTRES: Record<string, string> = {
  'м. Київ (спецстатус)': 'kyiv',
  Київська: 'kyiv',
  Вінницька: 'vinnytsia',
  Волинська: 'lutsk',
  Дніпропетровська: 'dnipro',
  Житомирська: 'zhytomyr',
  Закарпатська: 'uzhhorod',
  Запорізька: 'zaporizhzhia',
  'Івано-Франківська': 'ivano-frankivsk',
  Кіровоградська: 'kropyvnytskyi',
  Львівська: 'lviv',
  Миколаївська: 'mykolaiv',
  Одеська: 'odesa',
  Полтавська: 'poltava',
  Рівненська: 'rivne',
  Сумська: 'sumy',
  Тернопільська: 'ternopil',
  Харківська: 'kharkiv',
  Херсонська: 'kherson',
  Хмельницька: 'khmelnytskyi',
  Черкаська: 'cherkasy',
  Чернівецька: 'chernivtsi',
  Чернігівська: 'chernihiv',
}
