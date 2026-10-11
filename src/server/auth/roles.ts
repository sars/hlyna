import type { UserRole } from '../../shared/options'

// Staff ranks: an admin may do anything an editor may. Owners are not staff: they only reach /kabinet.
const STAFF_RANK: Record<UserRole, number> = { owner: 0, editor: 1, admin: 2 }

export type StaffRole = Exclude<UserRole, 'owner'>
export const isStaff = (role: UserRole) => STAFF_RANK[role] > 0
export const hasStaffRole = (actual: UserRole, required: StaffRole) => STAFF_RANK[actual] >= STAFF_RANK[required]

// Session lifetime by role (design §3.6): staff a week, owners a month, both renewed after a day of use.
export const SESSION_SECONDS: Record<UserRole, number> = { admin: 7 * 86400, editor: 7 * 86400, owner: 30 * 86400 }

// Account lockout after repeated wrong passwords (same numbers as /kabinet today).
export const LOCK_AFTER_FAILURES = 5
export const LOCK_MINUTES = 15
