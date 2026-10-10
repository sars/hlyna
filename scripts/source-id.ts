import { createHash } from 'node:crypto'

// Stable id of a research entry: hash of normalised name + city (shared by import and tagging scripts).
export const normalize = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[«»"'’ʼ`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

export const sourceIdFor = (name: string, city: string): string =>
  createHash('sha1')
    .update(`${normalize(name)}|${normalize(city)}`)
    .digest('hex')
    .slice(0, 16)
