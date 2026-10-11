import { APIError, ValidationError, type CollectionBeforeValidateHook } from 'payload'

const TEXT_LIMITS: Record<string, number> = {
  details: 5000,
  quantity: 200,
  deadline: 200,
  city: 120,
  budgetPerItem: 200,
  contactName: 200,
  contactPhoneOrTelegram: 200,
  contactEmail: 254,
  sourcePage: 500,
  studioName: 200,
  studioLinks: 500,
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const validateRequest: CollectionBeforeValidateHook = ({ data, operation, originalDoc, req }) => {
  if (!data) return data

  // Honeypot: bots fill every input. Reject without saving anything.
  if (typeof data.website2 === 'string' && data.website2.trim() !== '') {
    throw new APIError('Запит не прийнято.', 400, undefined, true)
  }
  data.website2 = ''

  // Trim strings and cap lengths
  for (const [key, max] of Object.entries(TEXT_LIMITS)) {
    const value = data[key]
    if (value === undefined || value === null) continue
    if (typeof value !== 'string') {
      data[key] = String(value)
    }
    data[key] = (data[key] as string).trim().slice(0, max)
  }
  if (data.contactEmail === '') data.contactEmail = null

  const merged = { ...(originalDoc || {}), ...data }
  const errors: { path: string; message: string }[] = []

  const phone = typeof merged.contactPhoneOrTelegram === 'string' ? merged.contactPhoneOrTelegram : ''
  const email = typeof merged.contactEmail === 'string' ? merged.contactEmail : ''

  // Public submissions must include a way to reply; admins may edit freely.
  if (operation === 'create' || !req.user) {
    if (!phone && !email) {
      errors.push({
        path: 'contactPhoneOrTelegram',
        message: 'Вкажіть телефон, Telegram або email, щоб ми могли відповісти.',
      })
    }
  }
  if (phone && phone.replace(/[^\p{L}\p{N}]/gu, '').length < 4) {
    errors.push({ path: 'contactPhoneOrTelegram', message: 'Перевірте телефон або Telegram.' })
  }
  if (email && !EMAIL_RE.test(email)) {
    errors.push({ path: 'contactEmail', message: 'Перевірте email.' })
  }

  if (errors.length) {
    throw new ValidationError({ collection: 'requests', errors, req })
  }
  return data
}
