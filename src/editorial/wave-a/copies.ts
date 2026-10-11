// Wave A copy loaded from src/content/waveA (synced by scripts/sync-wave-a.mjs).
import { copies } from '@/content/waveA'
import type { WaveCopy } from '@/editorial/copy'

export const waveCopy = (id: string): WaveCopy | null => (copies as Record<string, WaveCopy>)[id] ?? null
export const hasCopy = (id: string) => Boolean(waveCopy(id))
