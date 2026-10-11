'use client'

import { Check, ExternalLink, LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Avatar, AvatarFallback } from '@/components/panel/ui/avatar'
import { Button } from '@/components/panel/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/panel/ui/dropdown-menu'
import { t } from '@/components/panel/lib/i18n'
import { useTheme, type ThemeChoice } from '@/components/panel/lib/theme'
import { cn } from '@/components/panel/lib/utils'

export type Me = { name: string; email: string; role: 'admin' | 'editor' }

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.length ? parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') : '·'
}

const themeOptions: { value: ThemeChoice; labelKey: 'theme.light' | 'theme.dark' | 'theme.system'; icon: typeof Sun }[] = [
  { value: 'light', labelKey: 'theme.light', icon: Sun },
  { value: 'dark', labelKey: 'theme.dark', icon: Moon },
  { value: 'system', labelKey: 'theme.system', icon: Monitor },
]

/** Who is signed in, the theme, the site and the way out. (Kit: shell/user-menu, adapted for Next.) */
export function UserMenu({ me, className }: { me: Me; className?: string }) {
  const theme = useTheme()
  const router = useRouter()
  const signOut = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => null)
    router.replace('/panel/vhid')
    router.refresh()
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className={cn('h-auto max-w-full justify-start gap-2 px-2 py-1.5', className)} />}>
        <Avatar className="size-7">
          <AvatarFallback className="text-xs">{initials(me.name)}</AvatarFallback>
        </Avatar>
        <span className="flex min-w-0 flex-col items-start">
          <span className="w-full truncate text-sm font-medium">{me.name}</span>
          <span className="text-xs text-muted-foreground">{t(`role.${me.role}`)}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{me.email}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<a href="/" target="_blank" rel="noopener" />}>
          <ExternalLink className="size-4" aria-hidden />
          {t('nav.site')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t('theme.label')}</DropdownMenuLabel>
        {themeOptions.map((o) => {
          const Icon = o.icon
          return (
            <DropdownMenuItem key={o.value} closeOnClick={false} onClick={() => theme.set(o.value)}>
              <Icon className="size-4" aria-hidden />
              {t(o.labelKey)}
              {theme.choice === o.value && <Check className="ml-auto size-4" aria-hidden />}
            </DropdownMenuItem>
          )
        })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOut className="size-4" aria-hidden />
          {t('action.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
