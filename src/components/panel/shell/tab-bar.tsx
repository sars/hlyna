'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import type { StaffRole } from '@/server/auth/roles'
import { t } from '@/components/panel/lib/i18n'
import { cn } from '@/components/panel/lib/utils'
import { isActive, screenLabel, visibleScreens } from './navigation'

/**
 * The phone's navigation: the screens along the bottom, where a thumb reaches. It sits above the home bar
 * (`env(safe-area-inset-bottom)`) and every tab is at least 56 px tall. (Kit: shell/tab-bar.)
 */
export function TabBar({ role }: { role: StaffRole }) {
  const pathname = usePathname() ?? ''
  const items = visibleScreens(role).filter((s) => s.tab)
  return (
    <nav
      aria-label={t('nav.primary')}
      className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {items.map((screen) => {
        const Icon = screen.icon
        const active = isActive(screen, pathname)
        return (
          <Link
            key={screen.href}
            href={screen.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground',
              active && 'text-primary',
            )}
          >
            <Icon className="size-5" aria-hidden />
            {screenLabel(screen)}
          </Link>
        )
      })}
    </nav>
  )
}
