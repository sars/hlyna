import { notFound } from 'next/navigation'

import { appBackend } from '@/lib/backend'
import type { ReactNode } from 'react'

import { AppSidebar } from '@/components/panel/shell/app-sidebar'
import { PullToRefresh } from '@/components/panel/shell/pull-to-refresh'
import { TabBar } from '@/components/panel/shell/tab-bar'
import { UserMenu } from '@/components/panel/shell/user-menu'
import { panelUserOrRedirect } from '@/server/auth/guards'

export const dynamic = 'force-dynamic'

/** Everything behind the sign-in: staff only (owners are sent to their cabinet). */
export default async function PanelAppLayout({ children }: { children: ReactNode }) {
  // The panel only exists once the site runs on the new stack (DATA_BACKEND=app); before the cutover it is a 404.
  if (!appBackend()) notFound()
  const me = await panelUserOrRedirect('editor')
  const role = me.role === 'admin' ? 'admin' : 'editor'
  const menu = <UserMenu me={{ name: me.name, email: me.email, role }} className="w-full" />
  return (
    <div className="flex min-h-dvh">
      <AppSidebar role={role} footer={menu} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-card/95 px-4 backdrop-blur md:hidden">
          <span className="font-semibold tracking-tight">Глина</span>
          <UserMenu me={{ name: me.name, email: me.email, role }} />
        </header>
        <PullToRefresh />
        <main className="mx-auto w-full max-w-5xl px-4 pt-5 pb-24 md:px-8 md:pt-8 md:pb-10">{children}</main>
      </div>
      <TabBar role={role} />
    </div>
  )
}
