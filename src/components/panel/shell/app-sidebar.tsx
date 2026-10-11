'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import type { StaffRole } from '@/server/auth/roles'
import { t } from '@/components/panel/lib/i18n'
import { cn } from '@/components/panel/lib/utils'
import { isActive, screenLabel, visibleScreens } from './navigation'

/** The desktop navigation: a fixed column, always there, never collapsing. (Kit: shell/app-sidebar.) */
export function AppSidebar({ role, footer }: { role: StaffRole; footer?: ReactNode }) {
  const pathname = usePathname() ?? ''
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r bg-card md:sticky md:top-0 md:flex md:h-dvh">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">г</span>
        <span className="truncate font-semibold tracking-tight">{t('app.name')}</span>
      </div>
      <nav aria-label={t('nav.primary')} className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {visibleScreens(role).map((screen) => {
          const Icon = screen.icon
          const active = isActive(screen, pathname)
          return (
            <Link
              key={screen.href}
              href={screen.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                active && 'bg-muted font-medium text-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden />
              {screenLabel(screen)}
            </Link>
          )
        })}
      </nav>
      {footer && <div className="border-t p-2">{footer}</div>}
    </aside>
  )
}
