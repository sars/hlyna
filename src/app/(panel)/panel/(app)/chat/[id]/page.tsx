import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageHeader, StatusBadge } from '@/components/panel/inhouse'
import { formatDateTime } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { CHAT_TONE } from '@/components/panel/lib/labels'
import { Card, CardContent } from '@/components/panel/ui/card'
import { getTranscript } from '@/chat/server/store'
import { db } from '@/server/db'

export const metadata = { title: 'Чат' }

const ROLE_CLASS: Record<string, string> = { visitor: 'border-l-primary', assistant: 'border-l-muted-foreground/40', human: 'border-l-emerald-500', system: 'border-l-transparent text-muted-foreground' }

export default async function ChatTranscriptPage({ params }: { params: Promise<{ id: string }> }) {
  const tr = await getTranscript(db, Number((await params).id))
  if (!tr) notFound()
  const { conversation: c, messages, events } = tr
  const facts = [
    [t('chat.page'), c.lastPage ?? c.page],
    [t('chat.contact'), c.contact ? `${c.contactType ?? ''} ${c.contact}`.trim() : '—'],
    [t('chat.request'), c.requestId ? `#${c.requestId}` : '—'],
    ['Telegram', c.visitorTgChatId ? 'так' : '—'],
    ['', t('chat.turns', { count: c.turns })],
    ['', t('chat.tokens', { input: c.inputTokens, output: c.outputTokens })],
  ].filter(([, v]) => v)
  return (
    <div className="space-y-5">
      <Link href="/panel/chat" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> {t('nav.chat')}
      </Link>
      <PageHeader title={t('chat.detail', { id: c.id })} description={formatDateTime(c.createdAt)} actions={<StatusBadge label={t(`chat.status.${c.status}`)} tone={CHAT_TONE[c.status]} />} />
      <Card className="gap-0 py-0 shadow-xs">
        <CardContent className="p-4 sm:p-6">
          <dl className="grid gap-1 text-sm sm:grid-cols-2">
            {facts.map(([k, v], i) => (
              <div key={i} className="flex gap-2">
                {k && <dt className="text-muted-foreground">{k}:</dt>}
                <dd className="min-w-0 break-words">{v}</dd>
              </div>
            ))}
          </dl>
          {c.requestId && (
            <Link href={`/panel/zapyty/${c.requestId}`} className="mt-2 inline-block text-sm text-primary hover:underline">
              {t('chat.request')} #{c.requestId} →
            </Link>
          )}
        </CardContent>
      </Card>
      <Card className="gap-0 py-0 shadow-xs">
        <CardContent className="grid gap-3 p-4 sm:p-6">
          {messages.map((m) => (
            <div key={m.id} className={`border-l-2 pl-3 ${ROLE_CLASS[m.role] ?? ''}`}>
              <div className="text-xs text-muted-foreground">
                {t(`chat.role.${m.role}`)} · {formatDateTime(m.createdAt)}
                {m.meta && 'tools' in m.meta && Array.isArray(m.meta.tools) && m.meta.tools.length > 0 ? ` · ${(m.meta.tools as { name: string }[]).map((x) => x.name).join(', ')}` : ''}
              </div>
              <p className="m-0 text-sm break-words whitespace-pre-line">{m.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      {events.length > 0 && (
        <Card className="gap-0 py-0 shadow-xs">
          <CardContent className="p-4 sm:p-6">
            <h2 className="mb-2 text-sm font-semibold">{t('chat.events')}</h2>
            <ul className="m-0 grid list-none gap-1 p-0 text-xs text-muted-foreground">
              {events.map((e) => (
                <li key={e.id}>
                  {formatDateTime(e.createdAt)} · {e.type}
                  {e.data && 'reason' in e.data ? ` · ${String(e.data.reason)}` : ''}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
