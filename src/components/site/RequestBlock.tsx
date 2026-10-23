import { ChatBox } from '@/components/site/ChatBox'
import { RequestForm } from '@/components/site/RequestForm.client'
import type { ChatKind } from '@/content/chat'
import { chatShown } from '@/server/chatAdapter'

// Where a page asks for the request: the chat unless CHAT_ENABLED=0, then the form. Pages pass both what the chat
// needs (kind, studio, city) and what the form needs (defaultWhat…).
export function RequestBlock({
  page,
  kind,
  studio,
  city,
  classes,
  business,
  form,
}: {
  page: string
  kind: ChatKind
  studio?: { slug: string; name: string }
  city?: string
  classes?: boolean
  business?: boolean
  form?: { defaultWhat?: string; defaultCity?: string; studioName?: string; compact?: boolean }
}) {
  if (chatShown()) return <ChatBox page={page} kind={kind} studio={studio} city={city} classes={classes} business={business} />
  return <RequestForm sourcePage={page} defaultWhat={form?.defaultWhat} defaultCity={form?.defaultCity} studioName={form?.studioName} compact={form?.compact} />
}
