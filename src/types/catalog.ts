// Shapes of the public catalogue records (studios, cities, media), as the site has always rendered them.
// Originally generated from the Payload collections; kept by hand since the move to the app schema
// (src/server/db/schema) — src/server/legacy.ts maps database rows into these shapes.

/**
 * Студії, бренди й майстри. Фільтри списку: місто, тип, згода на запити (consent.requests), робота з HoReCa (b2b.worksWithHoreca).
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "studios".
 */
export interface Studio {
  id: number;
  name: string;
  /**
   * Лише відомі варіанти: латиницею/кирилицею, Instagram, колишні назви. Заповнює scripts/alt-names.ts; не вигадувати.
   */
  alternateNames?:
    | {
        text: string;
        id?: string | null;
      }[]
    | null;
  type?: ('studio' | 'brand' | 'maker' | 'school' | 'shop' | 'supplier' | 'heritage' | 'other') | null;
  city?: (number | null) | City;
  oblast?: string | null;
  address?: string | null;
  /**
   * Заповнює scripts/geocode.ts (OpenStreetMap Nominatim). Точність «населений пункт» — маркер на центрі міста.
   */
  geo?: {
    lat?: number | null;
    lng?: number | null;
    precision?: ('address' | 'street' | 'settlement') | null;
    geocodedAt?: string | null;
    source?: string | null;
  };
  summary?: string | null;
  /**
   * Показується на сайті. Якщо порожньо — показуємо «Опис (з досліджень)».
   */
  publicDescription?: string | null;
  ownerAbout?: string | null;
  ownerNews?: string | null;
  /**
   * Показується як «Студія про себе: “…”» лише після позначки «Цитату схвалено».
   */
  ownerQuote?: string | null;
  ownerQuoteApproved?: boolean | null;
  /**
   * Абзац своїми словами за останніми постами. Оновлює scripts/import-ig.ts; можна редагувати.
   */
  recentNote?: string | null;
  description?: string | null;
  /**
   * Фільтри для сторінок «Гончарне коло», «Для дітей», «Чашки з логотипом» тощо.
   */
  formats?:
    | (
        | 'wheel'
        | 'handbuilding'
        | 'painting'
        | 'kids'
        | 'couples'
        | 'courses'
        | 'certificates'
        | 'corporate-workshop'
        | 'corporate-gifts'
        | 'logo'
        | 'horeca'
        | 'new-year'
      )[]
    | null;
  services?:
    | {
        text: string;
        id?: string | null;
      }[]
    | null;
  products?:
    | {
        text: string;
        id?: string | null;
      }[]
    | null;
  prices?:
    | {
        text: string;
        source?: string | null;
        /**
         * Напр. «жовтень 2026»
         */
        date?: string | null;
        id?: string | null;
      }[]
    | null;
  photos?: (number | Media)[] | null;
  instagram?: string | null;
  website?: string | null;
  facebook?: string | null;
  phone?: string | null;
  email?: string | null;
  otherLinks?:
    | {
        url: string;
        id?: string | null;
      }[]
    | null;
  salesChannels?:
    | {
        text: string;
        id?: string | null;
      }[]
    | null;
  b2b?: {
    minOrder?: string | null;
    leadTime?: string | null;
    logoMethods?:
      | {
          text: string;
          id?: string | null;
        }[]
      | null;
    foodSafe?: boolean | null;
    dishwasherSafe?: boolean | null;
    worksWithHoreca?: boolean | null;
    worksWithCorporate?: boolean | null;
  };
  activity?: {
    lastPostDate?: string | null;
    posts90d?: number | null;
    followers?: number | null;
    websiteAlive?: boolean | null;
    etsySales?: number | null;
    checkedAt?: string | null;
    /**
     * Показуються на сторінці студії (вбудовування підвантажується при прокрутці).
     */
    instagramPosts?:
      | {
          url: string;
          id?: string | null;
        }[]
      | null;
  };
  consent?: {
    photos?: boolean | null;
    requests?: boolean | null;
    contactedAt?: string | null;
    notes?: string | null;
  };
  /**
   * Ставиться, коли схвалено заявку власника (колекція «Заявки на профіль»).
   */
  ownerVerified?: boolean | null;
  /**
   * Власник зберіг чернетку в кабінеті. Перегляньте її й натисніть «Опублікувати» — позначка зніметься сама.
   */
  pendingOwnerChanges?: boolean | null;
  /**
   * Генерується з назви, якщо порожній
   */
  slug?: string | null;
  status?: ('active' | 'unclear' | 'closed' | 'relocated') | null;
  confidence?: ('high' | 'medium' | 'low') | null;
  sources?:
    | {
        url: string;
        id?: string | null;
      }[]
    | null;
  /**
   * Стабільний хеш назви та міста для повторних імпортів
   */
  sourceId?: string | null;
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}

/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "cities".
 */
export interface City {
  id: number;
  name: string;
  /**
   * Генерується з назви, якщо порожній (транслітерація за правилами 2010 р.)
   */
  slug?: string | null;
  oblast?: string | null;
  population?: number | null;
  isOver100k?: boolean | null;
  updatedAt: string;
  createdAt: string;
}

/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "media".
 */
export interface Media {
  id: number;
  alt?: string | null;
  caption?: {
    root: {
      type: string;
      children: {
        type: any;
        version: number;
        [k: string]: unknown;
      }[];
      direction: ('ltr' | 'rtl') | null;
      format: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | '';
      indent: number;
      version: number;
    };
    [k: string]: unknown;
  } | null;
  updatedAt: string;
  createdAt: string;
  url?: string | null;
  thumbnailURL?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  filesize?: number | null;
  width?: number | null;
  height?: number | null;
  focalX?: number | null;
  focalY?: number | null;
  sizes?: {
    thumbnail?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    square?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    small?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    medium?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    large?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    xlarge?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    og?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
  };
}
