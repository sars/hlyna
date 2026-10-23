import Link from 'next/link'

import { EmptyState, PageHeader, RefreshButton, StatusBadge } from '@/components/panel/inhouse'
import { formatRelative } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { CHAT_TONE, chatStatusOptions } from '@/components/panel/lib/labels'
import { UrlFilters } from '@/components/panel/screens/url-filters'
import { Card } from '@/components/panel/ui/card'
import { listConversations, usageSince } from '@/chat/server/store'
import { estimateUsd, fmtUsd } from '@/chat/server/pricing'
import { CHAT_STATUS, type ChatStatus } from '@/chat/schema'
import { db } from '@/server/db'

export const metadata = { title: 'Чат' }

export default async function ChatListPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const status = sp.status === 'open' || (CHAT_STATUS as readonly string[]).includes(sp.status ?? '') ? (sp.status as ChatStatus | 'open') : undefined
  const [{ rows, hasMore, next }, u] = await Promise.all([listConversations(db, { status, before: sp.before ? Number(sp.before) : undefined }), usageSince(db, 30)])
  const model = process.env.CHAT_MODEL || 'gpt-5.5'
  const cost = estimateUsd(model, u.input, u.output)
  const spend = t('chat.spend', { conversations: u.conversations, turns: u.turns, input: u.input, output: u.output, cost: cost === null ? model : `${fmtUsd(cost)} (${model})` })
  const more = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])
  if (next) more.set('before', String(next))
  return (
    <div className="space-y-5">
      <PageHeader title={t('chat.title')} description={<>{t('chat.description')}<br />{spend}</>} actions={<RefreshButton />} />
      <UrlFilters filters={[{ kind: 'choice', name: 'status', label: t('chat.status'), allLabel: t('chat.all'), options: [{ value: 'open', label: t('chat.open') }, ...chatStatusOptions] }]} />
      {rows.length ? (
        <Card className="gap-0 divide-y py-0 shadow-xs">
          {rows.map((r) => (
            <Link key={r.id} href={`/panel/chat/${r.id}`} className="flex min-h-11 flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">
                  #{r.id} · {r.page}
                  {r.contact ? ` · ${r.contact}` : ''}
                  {r.requestId ? ` · ${t('chat.request')} #${r.requestId}` : ''}
                </span>
                <span className="truncate text-xs text-muted-foreground">{r.first ?? '—'}</span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-muted-foreground">{t('chat.messages', { count: r.count })}</span>
                <StatusBadge label={t(`chat.status.${r.status}`)} tone={CHAT_TONE[r.status]} />
                <time className="w-24 text-right text-xs text-muted-foreground tabular-nums" dateTime={r.updatedAt}>
                  {formatRelative(r.updatedAt)}
                </time>
              </span>
            </Link>
          ))}
        </Card>
      ) : (
        <EmptyState title={t('chat.empty')} />
      )}
      {hasMore && (
        <Link href={`/panel/chat?${more}`} className="block text-center text-sm text-primary hover:underline">
          {t('action.showMore')}
        </Link>
      )}
    </div>
  )
}
