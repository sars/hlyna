import { ChatPanel } from '@/chat/ui/ChatPanel.client'
import { chatOpener, type ChatKind } from '@/content/chat'

// The site's chat block, where the request form stood: openers by kind of page (src/content/chat.ts), the page's
// context for the assistant (studio, city), and the form on /zapyt as the fallback. Server component; the panel
// inside is the client part.
export function ChatBox({ page, kind, studio, city, classes, business, fallbackHref }: { page: string; kind: ChatKind; studio?: { slug: string; name: string }; city?: string; classes?: boolean; business?: boolean; fallbackHref?: string }) {
  const o = chatOpener(kind, { studioName: studio?.name, city, classes, business })
  const context: Record<string, string> = { ...(studio ? { studioSlug: studio.slug, studioName: studio.name } : {}), ...(city ? { city } : {}) }
  return <ChatPanel page={page} kind={kind} context={context} kicker={o.kicker} title={o.title} intro={o.intro} chips={o.chips} fallbackHref={fallbackHref ?? '/zapyt'} />
}
