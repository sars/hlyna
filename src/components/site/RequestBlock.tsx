import { ChatBox } from '@/components/site/ChatBox'
import { RequestForm } from '@/components/site/RequestForm.client'
import type { ChatKind } from '@/content/chat'
import { chatEnabled } from '@/server/chatAdapter'

// Where a page asks for the request: the chat when it is configured (OPENAI_API_KEY, CHAT_ENABLED), otherwise the
// form. Pages pass both what the chat needs (kind, studio, city) and what the form needs (defaultWhat…).
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
  if (chatEnabled()) return <ChatBox page={page} kind={kind} studio={studio} city={city} classes={classes} business={business} />
  return <RequestForm sourcePage={page} defaultWhat={form?.defaultWhat} defaultCity={form?.defaultCity} studioName={form?.studioName} compact={form?.compact} />
}
