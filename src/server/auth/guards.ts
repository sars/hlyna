import 'server-only'

import { headers as nextHeaders } from 'next/headers'
import { redirect } from 'next/navigation'

import { db } from '../db'
import { getAuth } from './index'
import * as access from './access'
import type { StaffRole } from './roles'

// The app's guards: access.ts bound to the app's Better Auth and database, plus Next helpers that redirect.
// `server-only` makes a client import of this file a build error.

export { AuthError, authErrorResponse, type SignedInUser } from './access'

export const currentUser = (headers: Headers) => access.currentUser(getAuth(), db, headers)
export const requireRole = (headers: Headers, role: StaffRole) => access.requireRole(getAuth(), db, headers, role)

/** For /panel layouts and pages: signed-out people go to the panel login, owners to their cabinet. */
export async function panelUserOrRedirect(role: StaffRole = 'editor') {
  try {
    return await access.requireRole(getAuth(), db, await nextHeaders(), role)
  } catch (e) {
    if (e instanceof access.AuthError) redirect(e.status === 401 ? '/panel/vhid' : '/kabinet')
    throw e
  }
}
