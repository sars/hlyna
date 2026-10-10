import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { authenticatedOrPublished } from '../access/authenticatedOrPublished'
import { ensureUniqueSlug } from '../hooks/ensureUniqueSlug'
import { revalidateCatalogAfterChange, revalidateCatalogAfterDelete } from '../hooks/revalidateCatalog'

export const STUDIO_TYPES = [
  { label: 'Студія', value: 'studio' },
  { label: 'Бренд', value: 'brand' },
  { label: 'Майстер / авторка', value: 'maker' },
  { label: 'Школа / курси', value: 'school' },
  { label: 'Магазин', value: 'shop' },
  { label: 'Постачальник', value: 'supplier' },
  { label: 'Традиційне ремесло', value: 'heritage' },
  { label: 'Інше', value: 'other' },
] as const

export const STUDIO_STATUSES = [
  { label: 'Активна', value: 'active' },
  { label: 'Невідомо', value: 'unclear' },
  { label: 'Закрита', value: 'closed' },
  { label: 'Переїхала', value: 'relocated' },
] as const

export const Studios: CollectionConfig = {
  slug: 'studios',
  labels: {
    singular: 'Студія / майстер',
    plural: 'Студії та майстри',
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'name',
    group: 'Каталог',
    defaultColumns: ['name', 'type', 'city', 'status', 'instagram', 'confidence', 'updatedAt'],
    listSearchableFields: ['name', 'slug', 'instagram', 'website'],
    description:
      'Студії, бренди й майстри. Фільтри списку: місто, тип, згода на запити (consent.requests), робота з HoReCa (b2b.worksWithHoreca).',
  },
  defaultSort: 'name',
  versions: {
    drafts: true,
    maxPerDoc: 10,
  },
  hooks: {
    beforeValidate: [ensureUniqueSlug({ collection: 'studios', from: 'name' })],
    afterChange: [revalidateCatalogAfterChange],
    afterDelete: [revalidateCatalogAfterDelete],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Основне',
          fields: [
            { name: 'name', label: 'Назва', type: 'text', required: true },
            {
              type: 'row',
              fields: [
                {
                  name: 'type',
                  label: 'Тип',
                  type: 'select',
                  options: [...STUDIO_TYPES],
                  defaultValue: 'studio',
                  index: true,
                  admin: { width: '33%' },
                },
                {
                  name: 'city',
                  label: 'Місто',
                  type: 'relationship',
                  relationTo: 'cities',
                  index: true,
                  admin: { width: '33%' },
                },
                { name: 'oblast', label: 'Область', type: 'text', admin: { width: '33%' } },
              ],
            },
            { name: 'address', label: 'Адреса', type: 'text' },
            {
              name: 'summary',
              label: 'Короткий опис для карток і пошуку (до 160 символів)',
              type: 'text',
              localized: true,
              maxLength: 200,
            },
            {
              name: 'publicDescription',
              label: 'Опис для сайту (голос сайту, лише факти)',
              type: 'textarea',
              localized: true,
              admin: { description: 'Показується на сайті. Якщо порожньо — показуємо «Опис (з досліджень)».' },
            },
            {
              name: 'description',
              label: 'Опис (з досліджень, внутрішній)',
              type: 'textarea',
              localized: true,
            },
            {
              name: 'services',
              label: 'Послуги',
              type: 'array',
              localized: true,
              labels: { singular: 'Послуга', plural: 'Послуги' },
              fields: [{ name: 'text', label: 'Текст', type: 'text', required: true }],
            },
            {
              name: 'products',
              label: 'Продукція',
              type: 'array',
              localized: true,
              labels: { singular: 'Виріб', plural: 'Продукція' },
              fields: [{ name: 'text', label: 'Текст', type: 'text', required: true }],
            },
            {
              name: 'prices',
              label: 'Ціни',
              type: 'array',
              labels: { singular: 'Ціна', plural: 'Ціни' },
              fields: [
                { name: 'text', label: 'Ціна (текст)', type: 'text', required: true },
                {
                  type: 'row',
                  fields: [
                    { name: 'source', label: 'Джерело', type: 'text', admin: { width: '50%' } },
                    {
                      name: 'date',
                      label: 'Дата / період',
                      type: 'text',
                      admin: { width: '50%', description: 'Напр. «жовтень 2026»' },
                    },
                  ],
                },
              ],
            },
            {
              name: 'photos',
              label: 'Фото (лише за згодою)',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
            },
          ],
        },
        {
          label: 'Контакти',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'instagram', label: 'Instagram', type: 'text', admin: { width: '50%' } },
                { name: 'website', label: 'Сайт', type: 'text', admin: { width: '50%' } },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'facebook', label: 'Facebook', type: 'text', admin: { width: '50%' } },
                { name: 'phone', label: 'Телефон', type: 'text', admin: { width: '25%' } },
                { name: 'email', label: 'Email', type: 'text', admin: { width: '25%' } },
              ],
            },
            {
              name: 'otherLinks',
              label: 'Інші посилання',
              type: 'array',
              labels: { singular: 'Посилання', plural: 'Посилання' },
              fields: [{ name: 'url', label: 'URL', type: 'text', required: true }],
            },
            {
              name: 'salesChannels',
              label: 'Де продає',
              type: 'array',
              labels: { singular: 'Канал', plural: 'Канали продажу' },
              fields: [{ name: 'text', label: 'Текст', type: 'text', required: true }],
            },
          ],
        },
        {
          label: 'B2B',
          fields: [
            {
              name: 'b2b',
              label: 'Для бізнесу',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'minOrder', label: 'Мінімальне замовлення', type: 'text', admin: { width: '50%' } },
                    { name: 'leadTime', label: 'Термін виготовлення', type: 'text', admin: { width: '50%' } },
                  ],
                },
                {
                  name: 'logoMethods',
                  label: 'Способи нанесення логотипу',
                  type: 'array',
                  labels: { singular: 'Спосіб', plural: 'Способи' },
                  fields: [{ name: 'text', label: 'Текст', type: 'text', required: true }],
                },
                { name: 'foodSafe', label: 'Безпечно для їжі', type: 'checkbox', defaultValue: false },
                { name: 'dishwasherSafe', label: 'Можна в посудомийку', type: 'checkbox', defaultValue: false },
                {
                  name: 'worksWithHoreca',
                  label: 'Працює з HoReCa',
                  type: 'checkbox',
                  defaultValue: false,
                  index: true,
                },
                {
                  name: 'worksWithCorporate',
                  label: 'Корпоративні замовлення',
                  type: 'checkbox',
                  defaultValue: false,
                },
              ],
            },
          ],
        },
        {
          label: 'Активність',
          fields: [
            {
              name: 'activity',
              label: 'Активність',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'lastPostDate', label: 'Останній пост', type: 'date', admin: { width: '33%' } },
                    { name: 'posts90d', label: 'Постів за 90 днів', type: 'number', admin: { width: '33%' } },
                    { name: 'followers', label: 'Підписників', type: 'number', admin: { width: '33%' } },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'websiteAlive', label: 'Сайт працює', type: 'checkbox', admin: { width: '33%' } },
                    { name: 'etsySales', label: 'Продажів на Etsy', type: 'number', admin: { width: '33%' } },
                    { name: 'checkedAt', label: 'Перевірено', type: 'date', admin: { width: '33%' } },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Згода',
          fields: [
            {
              name: 'consent',
              label: 'Згода студії',
              type: 'group',
              fields: [
                { name: 'photos', label: 'Згода на фото', type: 'checkbox', defaultValue: false },
                {
                  name: 'requests',
                  label: 'Згода отримувати запити',
                  type: 'checkbox',
                  defaultValue: false,
                  index: true,
                },
                { name: 'contactedAt', label: 'Дата контакту', type: 'date' },
                { name: 'notes', label: 'Нотатки', type: 'textarea' },
              ],
            },
          ],
        },
      ],
    },
    // Sidebar
    {
      name: 'slug',
      label: 'Slug (латиницею)',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Генерується з назви, якщо порожній',
      },
    },
    {
      name: 'status',
      label: 'Статус',
      type: 'select',
      options: [...STUDIO_STATUSES],
      // Avoid clashing with the drafts `_status` enum (enum_studios_status)
      enumName: 'enum_studios_activity_status',
      defaultValue: 'unclear',
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'confidence',
      label: 'Достовірність даних',
      type: 'select',
      options: [
        { label: 'Висока', value: 'high' },
        { label: 'Середня', value: 'medium' },
        { label: 'Низька', value: 'low' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'sources',
      label: 'Джерела',
      type: 'array',
      labels: { singular: 'Джерело', plural: 'Джерела' },
      admin: { position: 'sidebar', initCollapsed: true },
      fields: [{ name: 'url', label: 'URL', type: 'text', required: true }],
    },
    {
      name: 'sourceId',
      label: 'ID імпорту',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Стабільний хеш назви та міста для повторних імпортів',
      },
    },
  ],
}
