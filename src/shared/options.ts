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

// Items: one piece or series a studio offers (app.items). The rule that shows and hides them: src/server/services/items.ts.
/**
 * Item categories: the first six are the product topic pages (/vyrobnyky/vyrib/<slug>, src/content/topics/products.ts);
 * «svichky» and «sertyfikaty» exist only in the shop (/kramnytsia/<category>).
 */
export const ITEM_CATEGORIES = ['chashky', 'tarilky-i-mysky', 'vazy-i-dekor', 'svitylnyky', 'prykrasy', 'plytka-i-panno', 'svichky', 'sertyfikaty'] as const
export type ItemCategory = (typeof ITEM_CATEGORIES)[number]
/** Category names as the shop shows them (headings, chips, breadcrumbs). */
export const ITEM_CATEGORY_LABEL: Record<ItemCategory, string> = {
  chashky: 'Чашки й горнята',
  'tarilky-i-mysky': 'Тарілки й миски',
  'vazy-i-dekor': 'Вази й декор',
  svitylnyky: 'Світильники',
  prykrasy: 'Прикраси',
  'plytka-i-panno': 'Плитка й панно',
  svichky: 'Свічки в кераміці',
  sertyfikaty: 'Подарункові сертифікати',
}
/** ship — a parcel from the studio; digital — a gift certificate sent by email, no delivery step. */
export const ITEM_FULFILLMENT = ['ship', 'digital'] as const
/** Where an item was read: an Instagram post or highlight (every studio), or the shop of a studio that agreed to the 10 % (partners only). */
export const ITEM_SOURCES = ['instagram', 'shop'] as const
/** piece — one of a kind; series — the studio repeats it; to_order — made when someone orders. */
export const ITEM_KINDS = ['piece', 'series', 'to_order'] as const
export const ITEM_AVAILABILITY = ['in_stock', 'to_order', 'unknown', 'sold'] as const
export const ITEM_HIDDEN_REASONS = ['stale', 'no_date', 'sold', 'gone', 'season_over', 'studio_hidden', 'manual'] as const
/** What one check of an item saw (app.item_checks). */
export const ITEM_SIGNALS = ['none', 'available', 'sold', 'gone', 'price_changed', 'caption_changed', 'reposted'] as const
/** Seasonal items show until the season's end, whatever the post's age: the month and day of the first hidden day. */
export const ITEM_SEASON_END = { halloween: '11-01', xmas: '01-08' } as const

// Shop orders (app.orders): one order per studio per checkout; the studio handles it, we see every one (docs/shop/PLAN.md).
/** new → confirmed → in_progress → shipped → done; cancelled from any state. The 10 % is counted on «done». */
export const ORDER_STATUS = ['new', 'confirmed', 'in_progress', 'shipped', 'done', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUS)[number]
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: 'Нове',
  confirmed: 'Підтверджено',
  in_progress: 'В роботі',
  shipped: 'Відправлено',
  done: 'Виконано',
  cancelled: 'Скасовано',
}
/** How the parcel travels; «none» for digital items (a certificate by email). */
export const DELIVERY_METHODS = ['np_branch', 'np_postomat', 'np_courier', 'ukrposhta', 'pickup', 'none'] as const
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number]
export const DELIVERY_METHOD_LABEL: Record<DeliveryMethod, string> = {
  np_branch: 'Нова пошта, відділення',
  np_postomat: 'Нова пошта, поштомат',
  np_courier: 'Нова пошта, кур’єр',
  ukrposhta: 'Укрпошта',
  pickup: 'Самовивіз із майстерні',
  none: 'Без доставки',
}
/** transfer — the studio sends its card or account after confirming; on_delivery — cash on delivery; card_online — reserved for a provider. */
export const PAYMENT_METHODS = ['transfer', 'on_delivery', 'card_online'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  transfer: 'Переказ після підтвердження',
  on_delivery: 'Накладений платіж',
  card_online: 'Карткою онлайн',
}
export const PAYMENT_STATUS = ['unpaid', 'paid', 'refunded'] as const
export type PaymentStatus = (typeof PAYMENT_STATUS)[number]
/** What a studio offers in the shop (studios.shop_terms); null means the defaults in src/lib/shop.ts. */
export type ShopTerms = {
  delivery?: Exclude<DeliveryMethod, 'none'>[]
  payment?: Exclude<PaymentMethod, 'card_online'>[]
  /** Where to collect a pickup order; the profile address when empty. */
  pickupAddress?: string
  /** One sentence about shipping cost or packing, e.g. «Доставка за тарифами Нової пошти, пакуємо в гофрокартон». */
  deliveryNote?: string
  /** Return terms when they differ from the default 14 days. */
  returnsNote?: string
}

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
/** The studio cabinet's sections, in order (URL segment → title). Each one saves on its own; «foto» saves per action. */
export const KABINET_SECTIONS = ['pro-studiyu', 'posluhy', 'tsiny', 'biznes', 'kontakty', 'foto'] as const
export type KabinetSection = (typeof KABINET_SECTIONS)[number]
export const KABINET_SECTION_TITLE: Record<KabinetSection, string> = {
  'pro-studiyu': 'Про студію',
  posluhy: 'Послуги й вироби',
  tsiny: 'Ціни',
  biznes: 'Для бізнесу',
  kontakty: 'Контакти й Instagram',
  foto: 'Фото',
}
/** Ways to put a logo on a piece, offered as chips in the cabinet; anything else is kept as the owner's own text. */
export const LOGO_METHODS = ['Штамп у глині', 'Деколь', 'Ручний розпис', 'Гравіювання'] as const
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
