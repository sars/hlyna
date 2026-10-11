// Ids of written pages that have copy (generated lists, cheap to import anywhere — e.g. navigation).
import { liveWaveIds } from '@/content/waveA/live'
import { liveWaveBIds } from '@/content/waveB/live'
import { liveWaveCIds } from '@/content/waveC/live'

const live = new Set([...liveWaveIds, ...liveWaveBIds, ...liveWaveCIds])
export const hasWrittenCopy = (id: string) => live.has(id)
