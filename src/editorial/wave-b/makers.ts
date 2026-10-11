// Makers that can appear on wave B lists: studios, brands, makers, schools and heritage workshops that sell or teach.
import { getAllStudios } from '@/lib/catalog'
import { isExhibitingOnly } from '@/lib/present'

const MAKERS = new Set(['studio', 'brand', 'maker', 'school', 'heritage'])
export const makers = async () => (await getAllStudios()).filter((s) => MAKERS.has(s.type ?? '') && !isExhibitingOnly(s))
