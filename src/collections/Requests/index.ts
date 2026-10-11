import type { CollectionAfterOperationHook, CollectionConfig, FieldAccess } from 'payload'

import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'
import { computeCommission } from './hooks/computeCommission'
import { notifyTelegram } from './hooks/notifyTelegram'
import { validateRequest } from './hooks/validateRequest'
import { REQUEST_STATUS_OPTIONS, REQUEST_WHAT_OPTIONS } from './options'

export { REQUEST_STATUS_OPTIONS, REQUEST_WHAT_OPTIONS }

/** Internal fields: the public form cannot set them (values are dropped on create). */
const adminOnly: { create: FieldAccess; update: FieldAccess } = {
  create: ({ req }) => Boolean(req.user),
  update: ({ req }) => Boolean(req.user),
}

/**
 * The public form only needs to know the request was saved: a create without a logged-in user
 * answers with the id alone, so internal fields (status, studiosSent, commission5, notes…) never leave the server.
 */
export const publicCreateResponse: CollectionAfterOperationHook = ({ operation, req, result }) => {
  if (operation !== 'create' || req.user || !result || typeof result !== 'object') return result
  return { id: (result as { id: number }).id } as typeof result
}

export const Requests: CollectionConfig = {
  slug: 'requests',
  labels: {
    singular: 'Запит',
    plural: 'Запити',
  },
  access: {
    create: anyone,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'contactName',
    group: 'Запити',
    defaultColumns: ['what', 'contactName', 'city', 'quantity', 'status', 'createdAt'],
    listSearchableFields: ['contactName', 'contactEmail', 'contactPhoneOrTelegram', 'details', 'city'],
  },
  defaultSort: '-createdAt',
  hooks: {
    beforeValidate: [validateRequest],
    beforeChange: [computeCommission],
    afterChange: [notifyTelegram],
    afterOperation: [publicCreateResponse],
  },
  fields: [
    {
      name: 'what',
      label: 'Що потрібно',
      type: 'select',
      required: true,
      options: [...REQUEST_WHAT_OPTIONS],
    },
    { name: 'details', label: 'Деталі', type: 'textarea' },
    {
      type: 'row',
      admin: { condition: (data) => data?.what === 'studio' },
      fields: [
        { name: 'studioName', label: 'Назва студії', type: 'text', admin: { width: '33%' } },
        { name: 'studioLinks', label: 'Instagram / сайт', type: 'text', admin: { width: '33%' } },
        { name: 'photoConsent', label: 'Згода на фото', type: 'checkbox', defaultValue: false, admin: { width: '33%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'quantity', label: 'Кількість', type: 'text', admin: { width: '33%' } },
        { name: 'deadline', label: 'Термін', type: 'text', admin: { width: '33%' } },
        { name: 'budgetPerItem', label: 'Бюджет за одиницю', type: 'text', admin: { width: '33%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'city', label: 'Місто', type: 'text', admin: { width: '50%' } },
        { name: 'logo', label: 'Потрібен логотип', type: 'checkbox', defaultValue: false, admin: { width: '50%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'contactName', label: "Ім'я", type: 'text', admin: { width: '33%' } },
        {
          name: 'contactPhoneOrTelegram',
          label: 'Телефон або Telegram',
          type: 'text',
          admin: { width: '33%' },
        },
        { name: 'contactEmail', label: 'Email', type: 'email', admin: { width: '33%' } },
      ],
    },
    {
      name: 'sourcePage',
      label: 'Сторінка, з якої надіслано',
      type: 'text',
      admin: { readOnly: true },
    },
    {
      // Honeypot: real users never see or fill this field; any value means a bot.
      name: 'website2',
      type: 'text',
      admin: { hidden: true },
    },
    // Internal workflow (sidebar)
    {
      name: 'status',
      label: 'Статус',
      type: 'select',
      options: [...REQUEST_STATUS_OPTIONS],
      defaultValue: 'new',
      required: true,
      index: true,
      access: adminOnly,
      admin: { position: 'sidebar' },
    },
    {
      name: 'studiosSent',
      label: 'Кому переслано',
      type: 'relationship',
      relationTo: 'studios',
      hasMany: true,
      access: adminOnly,
      admin: { position: 'sidebar' },
    },
    {
      name: 'dealAmount',
      label: 'Сума угоди, грн',
      type: 'number',
      min: 0,
      access: adminOnly,
      admin: { position: 'sidebar' },
    },
    {
      name: 'commission5',
      label: 'Комісія 5%, грн',
      type: 'number',
      access: adminOnly,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Рахується автоматично: 5% від суми угоди',
      },
    },
    {
      name: 'notes',
      label: 'Нотатки',
      type: 'textarea',
      access: adminOnly,
      admin: { position: 'sidebar' },
    },
  ],
}
