import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { ensureUniqueSlug } from '../hooks/ensureUniqueSlug'

export const Cities: CollectionConfig = {
  slug: 'cities',
  labels: {
    singular: 'Місто',
    plural: 'Міста',
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'oblast', 'population', 'isOver100k'],
    listSearchableFields: ['name', 'slug'],
    group: 'Каталог',
  },
  defaultSort: 'name',
  hooks: {
    beforeValidate: [ensureUniqueSlug({ collection: 'cities', from: 'name' })],
  },
  fields: [
    {
      name: 'name',
      label: 'Назва',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'slug',
      label: 'Slug (латиницею)',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Генерується з назви, якщо порожній (транслітерація за правилами 2010 р.)',
      },
    },
    {
      name: 'oblast',
      label: 'Область',
      type: 'text',
    },
    {
      name: 'population',
      label: 'Населення',
      type: 'number',
      min: 0,
    },
    {
      name: 'isOver100k',
      label: 'Понад 100 тис. мешканців',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
}
