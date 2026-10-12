// Shapes of the public catalogue records (studios, cities) as the pages render them: nested groups (geo, b2b,
// activity, consent) and `{text}[]` lists. src/server/publicShape.ts maps database rows (src/server/db/schema) into
// them; value lists come from src/shared/options.ts.
import type { Confidence, GeoPrecision, StudioFormat, StudioStatus, StudioType } from '@/shared/options'

/** Студії, бренди й майстри. Фільтри списку: місто, тип, згода на запити (consent.requests), робота з HoReCa (b2b.worksWithHoreca). */
export interface Studio {
  id: number;
  name: string;
  /**
   * How people call the studio (titles, slugs, cards, H1); null when `name` already is. Use displayName(s).
   */
  shortName?: string | null;
  /**
   * Лише відомі варіанти: латиницею/кирилицею, Instagram, колишні назви. Заповнює scripts/alt-names.ts; не вигадувати.
   */
  alternateNames?:
    | {
        text: string;
        id?: string | null;
      }[]
    | null;
  type?: StudioType | null;
  city?: (number | null) | City;
  oblast?: string | null;
  address?: string | null;
  /**
   * Заповнює scripts/geocode.ts (OpenStreetMap Nominatim). Точність «населений пункт» — маркер на центрі міста.
   */
  geo?: {
    lat?: number | null;
    lng?: number | null;
    precision?: GeoPrecision | null;
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
  formats?: StudioFormat[] | null;
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
   * Генерується з назви, якщо порожній
   */
  slug?: string | null;
  status?: StudioStatus | null;
  confidence?: Confidence | null;
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
}

export interface City {
  id: number;
  name: string;
  /**
   * Генерується з назви, якщо порожній (транслітерація за правилами 2010 р.)
   */
  slug?: string | null;
  oblast?: string | null;
}
