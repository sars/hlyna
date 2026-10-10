import type { CollectionBeforeChangeHook } from 'payload'

export const computeCommission: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const amount = data.dealAmount !== undefined ? data.dealAmount : originalDoc?.dealAmount
  if (typeof amount === 'number' && Number.isFinite(amount) && amount > 0) {
    data.commission5 = Math.round(amount * 5) / 100
  } else {
    data.commission5 = null
  }
  return data
}
