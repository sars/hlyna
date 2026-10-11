import { notFound } from 'next/navigation'

import { appBackend } from '@/lib/backend'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { t } from '@/components/panel/lib/i18n'
import { SignInForm } from '@/components/panel/screens/sign-in-form'
import { Card, CardContent } from '@/components/panel/ui/card'
import { currentUser } from '@/server/auth/guards'
import { isStaff } from '@/server/auth/roles'

export const metadata: Metadata = { title: 'Вхід' }
export const dynamic = 'force-dynamic'

export default async function SignInPage() {
  // The panel only exists once the site runs on the new stack (DATA_BACKEND=app); before the cutover it is a 404.
  if (!appBackend()) notFound()
  const me = await currentUser(await headers())
  if (me && isStaff(me.role)) redirect('/panel')
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center space-y-5 px-4 py-10">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t('auth.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('auth.description')}</p>
      </div>
      <Card className="gap-0 py-0 shadow-xs">
        <CardContent className="p-4 sm:p-6">
          <Suspense>
            <SignInForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  )
}
