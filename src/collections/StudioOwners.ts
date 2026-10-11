import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { newToken } from '../lib/ownerAuth'
import { siteUrl } from '../lib/telegram'

const INVITE_DAYS = 7

// Ticking «Нове посилання» (or creating an owner from an approved claim) issues a one-time set-password link.
// Only the token's hash is stored for checking; the full link is kept in `inviteLink` for the admin to copy and send.
const issueInvite: CollectionBeforeChangeHook = ({ data }) => {
  if (data?.regenerateLink) {
    const { token, hash } = newToken()
    data.inviteTokenHash = hash
    data.inviteExpires = new Date(Date.now() + INVITE_DAYS * 86400_000).toISOString()
    data.inviteLink = `${siteUrl()}/kabinet/parol?token=${token}`
    data.regenerateLink = false
  }
  return data
}

/**
 * Studio owners: people who manage their studios' profiles in /kabinet.
 * Not a Payload auth collection on purpose — owners never get access to the admin or the REST API.
 * Created from an approved claim (collection `claims`); admins only.
 */
export const StudioOwners: CollectionConfig = {
  slug: 'studio-owners',
  labels: { singular: 'Власник студії', plural: 'Власники студій' },
  access: {
    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'name',
    group: 'Каталог',
    defaultColumns: ['name', 'login', 'studios', 'active', 'lastLoginAt'],
    description:
      'Хто керує профілями в кабінеті /kabinet. Посилання для пароля дійсне 7 днів і спрацьовує один раз — надішліть його власнику самі (Instagram, Telegram, email).',
  },
  hooks: { beforeChange: [issueInvite] },
  fields: [
    { name: 'name', label: "Ім'я", type: 'text', required: true },
    {
      name: 'login',
      label: 'Логін (email або телефон)',
      type: 'text',
      unique: true,
      index: true,
      admin: { description: 'Власник обирає логін сам, коли встановлює пароль.' },
    },
    { name: 'contact', label: 'Контакт із заявки', type: 'text' },
    {
      name: 'studios',
      label: 'Студії',
      type: 'relationship',
      relationTo: 'studios',
      hasMany: true,
    },
    { name: 'active', label: 'Активний', type: 'checkbox', defaultValue: true },
    {
      name: 'regenerateLink',
      label: 'Створити нове посилання для пароля',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Позначте й збережіть: з’явиться нове посилання (старе перестане діяти).' },
    },
    {
      name: 'inviteLink',
      label: 'Посилання для пароля (надішліть власнику)',
      type: 'text',
      admin: { readOnly: true },
    },
    { name: 'inviteExpires', label: 'Посилання дійсне до', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'inviteTokenHash', type: 'text', admin: { hidden: true } },
    { name: 'passwordHash', type: 'text', admin: { hidden: true } },
    { name: 'failedLogins', type: 'number', defaultValue: 0, admin: { hidden: true } },
    { name: 'lockUntil', type: 'date', admin: { hidden: true } },
    { name: 'lastLoginAt', label: 'Останній вхід', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
  ],
  timestamps: true,
}
