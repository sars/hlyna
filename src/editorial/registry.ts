// One list of the written (editorial) pages that are live, whatever wave built them: the sitemap, llms.txt and
// the section index pages read it from here. A page is live when its copy exists (and, for format × city pages,
// when the city still has enough places).
import { liveWavePages } from './wave-a'
import { liveWaveBPages } from './wave-b'
import { liveWaveCPages } from './wave-c'
import { liveCasePages } from './cases'

export type WrittenPage = { id?: string; path: string; section?: string | null; title: string; summary: string }

export async function liveWrittenPages(): Promise<WrittenPage[]> {
  return [...(await liveWavePages()), ...(await liveWaveBPages()), ...(await liveWaveCPages()), ...liveCasePages()]
}
