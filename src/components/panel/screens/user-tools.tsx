'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Choice, ConfirmDialog, FormField } from '@/components/panel/inhouse'
import { api } from '@/components/panel/lib/api'
import { t } from '@/components/panel/lib/i18n'
import { Button } from '@/components/panel/ui/button'
import { Input } from '@/components/panel/ui/input'
import { CopyBlock } from './claim-actions'

type Pick = { id: number; name: string; city?: string | null }
type InviteResult = { link: string; message: string }

/** Search studios by name, other names, slug or Instagram; pick several. */
export function StudioPicker({ value, onChange }: { value: Pick[]; onChange: (v: Pick[]) => void }) {
  const [q, setQ] = useState('')
  const [found, setFound] = useState<Pick[]>([])
  const seq = useRef(0)
  useEffect(() => {
    if (q.trim().length < 2) return
    const n = ++seq.current
    const timer = setTimeout(async () => {
      const res = await api<Pick[]>(`/studios/search?q=${encodeURIComponent(q.trim())}`).catch(() => [])
      if (n === seq.current) setFound(res)
    }, 250)
    return () => clearTimeout(timer)
  }, [q])
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((s) => (
            <li key={s.id} className="flex items-center gap-1 rounded-md border px-2 py-1 text-sm">
              {s.name}
              {s.city ? <span className="text-xs text-muted-foreground">· {s.city}</span> : null}
              <button type="button" className="ml-1 min-h-6 min-w-6 text-muted-foreground hover:text-foreground" aria-label={`× ${s.name}`} onClick={() => onChange(value.filter((c) => c.id !== s.id))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('users.addStudio')} aria-label={t('users.addStudio')} className="h-9" />
      {q.trim().length >= 2 && found.length > 0 && (
        <ul className="divide-y rounded-md border">
          {found
            .filter((f) => !value.some((c) => c.id === f.id))
            .map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-between px-3 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    onChange([...value, f])
                    setQ('')
                  }}
                >
                  <span className="truncate">{f.name}</span>
                  <span className="text-xs text-muted-foreground">{f.city}</span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}

function InviteShown({ result }: { result: InviteResult }) {
  return (
    <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <p className="text-sm font-medium">{t('users.inviteReady')}</p>
      <CopyBlock label={t('claims.linkTitle')} text={result.link} />
      <CopyBlock label={t('users.message')} text={result.message} />
    </div>
  )
}

/** New team member or new owner. After creation the one-time link is shown once. */
export function NewUserForm({ kind }: { kind: 'staff' | 'owner' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [contact, setContact] = useState('')
  const [role, setRole] = useState<'admin' | 'editor'>('editor')
  const [studios, setStudios] = useState<Pick[]>([])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<(InviteResult & { id: string }) | null>(null)
  if (result)
    return (
      <div className="space-y-3">
        <InviteShown result={result} />
        <Button variant="outline" onClick={() => router.push(`/panel/korystuvachi/${result.id}`)}>
          {t('action.open')}
        </Button>
      </div>
    )
  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
          const r =
            kind === 'staff'
              ? await api<InviteResult & { id: string }>('/users/staff', { body: { name, email, role } })
              : await api<InviteResult & { id: string }>('/users/owners', { body: { name, contact: contact || null, studioIds: studios.map((s) => s.id) } })
          setResult(r)
          router.refresh()
        } catch (err) {
          toast.error((err as Error).message)
        } finally {
          setBusy(false)
        }
      }}
    >
      <FormField id="u-name" label={t('users.name')}>
        <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} required className="h-9" />
      </FormField>
      {kind === 'staff' ? (
        <>
          <FormField id="u-email" label={t('users.email')}>
            <Input id="u-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-9" />
          </FormField>
          <FormField id="u-role" label={t('users.role')}>
            <Choice id="u-role" value={role} onChange={(v) => setRole(v as 'admin' | 'editor')} options={[{ value: 'editor', label: t('role.editor') }, { value: 'admin', label: t('role.admin') }]} className="w-full" />
          </FormField>
        </>
      ) : (
        <>
          <FormField id="u-contact" label={t('users.contact')}>
            <Input id="u-contact" value={contact} onChange={(e) => setContact(e.target.value)} className="h-9" />
          </FormField>
          <div className="space-y-1.5 md:col-span-2">
            <p className="text-sm font-medium">{t('users.studios')}</p>
            <StudioPicker value={studios} onChange={setStudios} />
          </div>
        </>
      )}
      <div className="md:col-span-2">
        <Button type="submit" disabled={busy || !name.trim() || (kind === 'owner' && !studios.length)}>
          {busy ? t('action.saving') : t('users.invite')}
        </Button>
      </div>
    </form>
  )
}

/** The actions on one person: link, role, access, studios (owners), sessions. */
export function UserActions({
  id,
  role,
  active,
  isSelf,
  studios,
  sessions,
}: {
  id: string
  role: 'admin' | 'editor' | 'owner'
  active: boolean
  isSelf: boolean
  studios: Pick[]
  sessions: { id: string; label: string }[]
}) {
  const router = useRouter()
  const [invite, setInvite] = useState<InviteResult | null>(null)
  const [chosen, setChosen] = useState<Pick[]>(studios)
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    try {
      await fn()
      toast.success(ok)
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const studiosDirty = JSON.stringify(chosen.map((c) => c.id)) !== JSON.stringify(studios.map((c) => c.id))
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy || !active}
          onClick={async () => {
            setBusy(true)
            try {
              setInvite(await api<InviteResult>(`/users/${id}/invite`, { body: {} }))
            } catch (e) {
              toast.error((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          {t('users.invite')}
        </Button>
        <p className="text-xs text-muted-foreground">{t('users.inviteHint')}</p>
        {invite && <InviteShown result={invite} />}
      </section>

      {role === 'owner' && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t('users.studios')}</h3>
          <StudioPicker value={chosen} onChange={setChosen} />
          {studiosDirty && (
            <Button type="button" disabled={busy} onClick={() => run(() => api(`/users/${id}/studios`, { method: 'PUT', body: { studioIds: chosen.map((c) => c.id) } }), t('editor.saved'))}>
              {t('users.saveStudios')}
            </Button>
          )}
        </section>
      )}

      <section className="flex flex-wrap gap-2">
        {role !== 'owner' && !isSelf && (
          <Button type="button" variant="outline" disabled={busy} onClick={() => run(() => api(`/users/${id}`, { method: 'PATCH', body: { role: role === 'admin' ? 'editor' : 'admin' } }), t('editor.saved'))}>
            {role === 'admin' ? t('users.makeEditor') : t('users.makeAdmin')}
          </Button>
        )}
        {!isSelf &&
          (active ? (
            <ConfirmDialog
              trigger={
                <Button type="button" variant="destructive" disabled={busy}>
                  {t('users.deactivate')}
                </Button>
              }
              title={t('users.deactivateTitle')}
              body={t('users.deactivateBody')}
              confirmLabel={t('users.deactivate')}
              destructive
              onConfirm={() => run(() => api(`/users/${id}`, { method: 'PATCH', body: { active: false } }), t('editor.saved'))}
            />
          ) : (
            <Button type="button" variant="outline" disabled={busy} onClick={() => run(() => api(`/users/${id}`, { method: 'PATCH', body: { active: true } }), t('editor.saved'))}>
              {t('users.activate')}
            </Button>
          ))}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t('users.sessions')}</h3>
        {sessions.length ? (
          <ul className="divide-y rounded-md border">
            {sessions.map((s) => (
              <li key={s.id} className="flex min-h-11 items-center justify-between gap-3 px-3 text-xs">
                <span className="min-w-0 truncate">{s.label}</span>
                <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => run(() => api(`/users/${id}/sessions/${s.id}`, { method: 'DELETE' }), t('editor.saved'))}>
                  {t('users.revoke')}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">{t('users.noSessions')}</p>
        )}
        {sessions.length > 1 && (
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => run(() => api(`/users/${id}/sessions`, { method: 'DELETE' }), t('editor.saved'))}>
            {t('users.revokeAll')}
          </Button>
        )}
      </section>
    </div>
  )
}
