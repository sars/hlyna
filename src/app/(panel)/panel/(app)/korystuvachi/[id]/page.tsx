import { notFound } from 'next/navigation'

import { PageHeader, StatusBadge } from '@/components/panel/inhouse'
import { formatDateTime } from '@/components/panel/lib/format'
import { t } from '@/components/panel/lib/i18n'
import { EntityHistory } from '@/components/panel/screens/history'
import { NewUserForm, UserActions } from '@/components/panel/screens/user-tools'
import { Card } from '@/components/panel/ui/card'
import { panelUserOrRedirect } from '@/server/auth/guards'
import { db } from '@/server/db'
import { getUser } from '@/server/services/users'

export const metadata = { title: 'Користувач' }

const device = (ua: string | null) => {
  if (!ua) return '—'
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : ''
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : ''
  return [br, os].filter(Boolean).join(', ') || ua.slice(0, 40)
}

export default async function UserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await panelUserOrRedirect('admin')
  const { id } = await params
  if (id === 'nove') {
    const kind = (await searchParams).kind === 'staff' ? 'staff' : 'owner'
    return (
      <div className="space-y-5">
        <PageHeader title={kind === 'staff' ? t('users.newStaff') : t('users.newOwner')} description={t('users.description')} />
        <Card className="p-4 shadow-xs md:p-5">
          <NewUserForm kind={kind} />
        </Card>
      </div>
    )
  }
  const u = await getUser(db, id)
  if (!u) notFound()
  const invite = u.lastInvite
  return (
    <div className="space-y-5">
      <PageHeader title={u.name} description={[t(`role.${u.role}`), u.displayUsername ?? u.email, u.contact].filter(Boolean).join(' · ')} actions={<StatusBadge label={u.active ? t('users.on') : t('users.off')} tone={u.active ? 'good' : 'bad'} />} />
      <Card className="gap-1 p-4 text-sm shadow-xs md:p-5">
        <p>
          {t('users.lastLogin')}: {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : t('users.never')}
          {u.lockUntil && new Date(u.lockUntil) > new Date() ? ` · ${t('users.locked', { time: formatDateTime(u.lockUntil) })}` : ''}
        </p>
        {invite && (
          <p className="text-muted-foreground">
            {t('users.lastInvite', { created: formatDateTime(invite.createdAt), state: invite.usedAt ? t('users.inviteUsed') : t('users.inviteOpen', { date: formatDateTime(invite.expiresAt) }) })}
          </p>
        )}
      </Card>
      <Card className="p-4 shadow-xs md:p-5">
        <UserActions
          id={u.id}
          role={u.role}
          active={u.active}
          isSelf={u.id === me.id}
          studios={u.owned.map((s) => ({ id: s.id, name: s.name, city: s.city }))}
          sessions={u.sessions.map((s) => ({ id: s.id, label: `${device(s.userAgent)} · ${s.ip ?? '—'} · ${formatDateTime(s.updatedAt)}` }))}
        />
      </Card>
      <Card className="gap-3 p-4 shadow-xs md:p-5">
        <h2 className="text-base font-semibold">{t('journal.title')}</h2>
        <EntityHistory entity="user" id={u.id} />
      </Card>
    </div>
  )
}
