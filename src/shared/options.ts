// Value lists shared by the database schema (src/server/db), Zod schemas (src/shared/schemas) and, after the
// Payload cutover, the panel and forms. Labels stay in the Payload collections until then; keep the values in sync
// with src/collections/{Studios,Requests/options,Claims}.ts (the migration verifier fails on any unknown value).

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
