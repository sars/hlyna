import { notFound } from 'next/navigation'

import { appBackend } from '@/lib/backend'
import type { Metadata } from 'next'

import { t } from '@/components/panel/lib/i18n'
import { SetPasswordForm } from '@/components/panel/screens/sign-in-form'
import { Card, CardContent } from '@/components/panel/ui/card'
import { inviteDetails } from '@/server/auth/kabinet-adapter'

export const metadata: Metadata = { title: 'Пароль' }
export const dynamic = 'force-dynamic'

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  // The panel only exists once the site runs on the new stack (DATA_BACKEND=app); before the cutover it is a 404.
  if (!appBackend()) notFound()
  const token = (await searchParams).token ?? ''
  const invite = token ? await inviteDetails(token) : null
  const ok = invite && invite.role !== 'owner'
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center space-y-5 px-4 py-10">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t('auth.setTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{ok ? t('auth.setDescription') : t('auth.badLink')}</p>
      </div>
      {ok && (
        <Card className="gap-0 py-0 shadow-xs">
          <CardContent className="p-4 sm:p-6">
            <SetPasswordForm token={token} email={invite.email} />
          </CardContent>
        </Card>
      )}
    </main>
  )
}
