// The panel's screens, once. The sidebar on a desktop and the tab bar on a phone are two ways of showing this
// one list; adding a screen is one line here. (Adapted from brocoders/inhouse-ai-starter-kit, MIT.)
import { ClipboardList, FilePenLine, House, ScrollText, UserCheck, type LucideIcon } from 'lucide-react'

import type { StaffRole } from '@/server/auth/roles'
import { t, type TextKey } from '@/components/panel/lib/i18n'

export type Screen = {
  href: string
  labelKey: TextKey
  icon: LucideIcon
  /** Admins only (editors don't see it). */
  adminOnly?: boolean
  /** Shown in the phone tab bar (at most five). */
  tab?: boolean
}

export const screens: Screen[] = [
  { href: '/panel', labelKey: 'nav.overview', icon: House, tab: true },
  { href: '/panel/zapyty', labelKey: 'nav.requests', icon: ClipboardList, tab: true },
  { href: '/panel/zayavky', labelKey: 'nav.claims', icon: UserCheck, tab: true },
  { href: '/panel/zminy', labelKey: 'nav.changes', icon: FilePenLine, tab: true },
  { href: '/panel/zhurnal', labelKey: 'nav.journal', icon: ScrollText, tab: true },
]

export const visibleScreens = (role: StaffRole) => screens.filter((s) => !s.adminOnly || role === 'admin')
export const screenLabel = (s: Screen) => t(s.labelKey)
/** /panel matches only itself; every other screen also owns its sub-pages. */
export const isActive = (s: Screen, pathname: string) =>
  s.href === '/panel' ? pathname === '/panel' : pathname === s.href || pathname.startsWith(`${s.href}/`)
