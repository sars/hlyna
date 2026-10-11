import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'

const idOf = (v: unknown): number | null =>
  typeof v === 'number' ? v : v && typeof v === 'object' && 'id' in v ? Number((v as { id: number }).id) : null

/**
 * Approving a claim (status → «Схвалено») creates the studio owner — or adds the studios to the owner chosen
 * in «Існуючий власник» — marks the studios as confirmed by the studio and puts a one-time set-password link
 * on the claim for the admin to send.
 */
const onApprove: CollectionAfterChangeHook = async ({ doc, previousDoc, req, context }) => {
  if (context?.claimApproveDone) return doc
  if (doc.status !== 'approved' || previousDoc?.status === 'approved') return doc

  const studioIds = [doc.studio, ...(doc.otherStudios ?? [])].map(idOf).filter((x): x is number => Boolean(x))
  const existing = idOf(doc.linkToOwner)
  let owner
  if (existing) {
    const cur = await req.payload.findByID({ collection: 'studio-owners', id: existing, depth: 0, req })
    const merged = [...new Set([...(cur.studios ?? []).map(idOf), ...studioIds])].filter((x): x is number => Boolean(x))
    owner = await req.payload.update({
      collection: 'studio-owners',
      id: existing,
      data: { studios: merged, active: true, regenerateLink: !cur.passwordHash },
      depth: 0,
      req,
    })
  } else {
    owner = await req.payload.create({
      collection: 'studio-owners',
      data: { name: doc.name, contact: doc.contact, studios: studioIds, active: true, regenerateLink: true },
      depth: 0,
      req,
    })
  }

  for (const id of studioIds) {
    await req.payload.update({ collection: 'studios', id, data: { ownerVerified: true }, depth: 0, req, context: { ownerSystemEdit: true } })
  }

  await req.payload.update({
    collection: 'claims',
    id: doc.id,
    data: {
      owner: owner.id,
      inviteLink: owner.inviteLink || 'Власник уже має пароль — нове посилання не потрібне. Позначте «Створити нове посилання» у власника, якщо треба.',
    },
    depth: 0,
    req,
    context: { claimApproveDone: true },
  })
  return doc
}

export const Claims: CollectionConfig = {
  slug: 'claims',
  labels: { singular: 'Заявка на профіль', plural: 'Заявки на профіль' },
  access: {
    // Public claims are created by the /kabinet/api/claim route (validated, rate-limited), not through REST.
    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'name',
    group: 'Запити',
    defaultColumns: ['name', 'studio', 'contact', 'status', 'createdAt'],
    description:
      'Перевірка: контакт має збігатися з публічним Instagram, сайтом чи телефоном студії. Якщо не збігається — попросіть власника написати в Instagram «Глини» з акаунта студії. Потім статус «Схвалено» → збережіть → скопіюйте посилання для пароля й надішліть власнику.',
  },
  defaultSort: '-createdAt',
  hooks: { afterChange: [onApprove] },
  fields: [
    {
      name: 'status',
      label: 'Статус',
      type: 'select',
      defaultValue: 'pending',
      required: true,
      index: true,
      options: [
        { label: 'Нова', value: 'pending' },
        { label: 'Схвалено', value: 'approved' },
        { label: 'Відхилено', value: 'rejected' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'rejectReason',
      label: 'Причина відмови',
      type: 'textarea',
      admin: { position: 'sidebar', condition: (data) => data?.status === 'rejected' },
    },
    {
      name: 'inviteLink',
      label: 'Посилання для пароля (надішліть власнику)',
      type: 'text',
      admin: { readOnly: true, condition: (data) => data?.status === 'approved' },
    },
    { name: 'studio', label: 'Студія', type: 'relationship', relationTo: 'studios', required: true },
    { name: 'otherStudios', label: 'Ще профілі цього власника', type: 'relationship', relationTo: 'studios', hasMany: true, maxRows: 5 },
    { name: 'name', label: "Ім'я", type: 'text', required: true },
    { name: 'contact', label: 'Контакт (телефон, Telegram або email)', type: 'text', required: true },
    { name: 'represents', label: 'Підтверджує, що представляє студію', type: 'checkbox', defaultValue: false },
    {
      name: 'linkToOwner',
      label: 'Існуючий власник',
      type: 'relationship',
      relationTo: 'studio-owners',
      admin: { description: 'Якщо ця людина вже має кабінет — оберіть її, і студії додадуться до того самого кабінету.' },
    },
    { name: 'owner', label: 'Кабінет', type: 'relationship', relationTo: 'studio-owners', admin: { readOnly: true } },
    { name: 'notes', label: 'Нотатки', type: 'textarea' },
  ],
  timestamps: true,
}
