import Link from 'next/link'

import { EmptyState, PageHeader, RefreshButton, StatusBadge } from '@/components/panel/inhouse'
import { formatRelative } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { UrlFilters } from '@/components/panel/screens/url-filters'
import { Card } from '@/components/panel/ui/card'
import { panelUserOrRedirect } from '@/server/auth/guards'
import { db } from '@/server/db'
import { listUsers } from '@/server/services/users'

export const metadata = { title: 'Користувачі' }

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await panelUserOrRedirect('admin')
  const sp = await searchParams
  const kind = sp.kind === 'staff' ? 'staff' : 'owner'
  const rows = await listUsers(db, { kind, q: sp.q, active: sp.active === 'on' ? true : sp.active === 'off' ? false : undefined })
  const tab = (k: 'owner' | 'staff', label: string) => (
    <Link href={`/panel/korystuvachi?kind=${k}`} aria-current={kind === k ? 'page' : undefined} className={`inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium ${kind === k ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
      {label}
    </Link>
  )
  return (
    <div className="space-y-5">
      <PageHeader
        title={t('users.title')}
        description={t('users.description')}
        actions={
          <>
            <Link href={`/panel/korystuvachi/nove?kind=${kind}`} className="text-sm text-primary hover:underline">
              {kind === 'staff' ? t('users.newStaff') : t('users.newOwner')}
            </Link>
            <RefreshButton />
          </>
        }
      />
      <nav className="flex gap-1">
        {tab('owner', t('users.owners'))}
        {tab('staff', t('users.staff'))}
      </nav>
      <UrlFilters
        filters={[
          { kind: 'search', name: 'q', label: t('users.search') },
          { kind: 'choice', name: 'active', label: t('users.active'), allLabel: t('studios.all'), options: [{ value: 'on', label: t('users.on') }, { value: 'off', label: t('users.off') }] },
        ]}
      />
      {rows.length ? (
        <Card className="gap-0 divide-y py-0 shadow-xs">
          {rows.map((u) => (
            <Link key={u.id} href={`/panel/korystuvachi/${u.id}`} className="flex min-h-11 flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{u.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[t(`role.${u.role}`), u.login ?? (u.email.endsWith('.invalid') ? null : u.email), u.studios.join(', ')].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                {u.lastLoginAt ? formatRelative(u.lastLoginAt) : t('users.never')}
                <StatusBadge label={u.active ? t('users.on') : t('users.off')} tone={u.active ? 'good' : 'bad'} />
              </span>
            </Link>
          ))}
        </Card>
      ) : (
        <EmptyState title={t('users.empty')} />
      )}
    </div>
  )
}
