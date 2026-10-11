'use client'

import { Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import type { StaffRole } from '@/server/auth/roles'
import { t } from '@/components/panel/lib/i18n'
import { cn } from '@/components/panel/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/panel/ui/sheet'
import { isActive, screenLabel, visibleScreens } from './navigation'

/**
 * The phone's navigation: four screens along the bottom, where a thumb reaches, and «Ще» for the rest. It sits above
 * the home bar (`env(safe-area-inset-bottom)`) and every tab is at least 56 px tall. (Kit: shell/tab-bar.)
 */
export function TabBar({ role }: { role: StaffRole }) {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)
  const all = visibleScreens(role)
  const items = all.filter((s) => s.tab)
  const rest = all.filter((s) => !s.tab)
  const restActive = rest.some((s) => isActive(s, pathname))
  const tab = 'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground'
  return (
    <nav aria-label={t('nav.primary')} className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {items.map((screen) => {
        const Icon = screen.icon
        const active = isActive(screen, pathname)
        return (
          <Link key={screen.href} href={screen.href} aria-current={active ? 'page' : undefined} className={cn(tab, active && 'text-primary')}>
            <Icon className="size-5" aria-hidden />
            {screenLabel(screen)}
          </Link>
        )
      })}
      {rest.length > 0 && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className={cn(tab, restActive && 'text-primary')}>
            <Menu className="size-5" aria-hidden />
            {t('nav.more')}
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <SheetHeader>
              <SheetTitle>{t('nav.more')}</SheetTitle>
            </SheetHeader>
            <ul className="grid grid-cols-3 gap-2 px-4">
              {rest.map((screen) => {
                const Icon = screen.icon
                const active = isActive(screen, pathname)
                return (
                  <li key={screen.href}>
                    <Link
                      href={screen.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={cn('flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-lg border text-xs font-medium', active ? 'border-primary text-primary' : 'text-foreground')}
                    >
                      <Icon className="size-5" aria-hidden />
                      {screenLabel(screen)}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </SheetContent>
        </Sheet>
      )}
    </nav>
  )
}
