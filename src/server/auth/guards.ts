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
export const requireOwner = (headers: Headers) => access.requireOwner(getAuth(), db, headers)
export const requireOwnerOf = (headers: Headers, studioId: number) => access.requireOwnerOf(getAuth(), db, headers, studioId)
export const ownedStudioIds = (userId: string) => access.ownedStudioIds(db, userId)

/** For /panel layouts and pages: signed-out people go to the panel login, owners to their cabinet. */
export async function panelUserOrRedirect(role: StaffRole = 'editor') {
  try {
    return await access.requireRole(getAuth(), db, await nextHeaders(), role)
  } catch (e) {
    if (e instanceof access.AuthError) redirect(e.status === 401 ? '/panel/vhid' : '/kabinet')
    throw e
  }
}

/** For /kabinet pages: signed-out people go to the cabinet login. */
export async function ownerOrRedirect() {
  try {
    return await access.requireOwner(getAuth(), db, await nextHeaders())
  } catch (e) {
    if (e instanceof access.AuthError) redirect('/kabinet/vhid')
    throw e
  }
}

/** Route handler wrapper: turns AuthError into a 401/403 JSON response. */
export function withAuthErrors<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await handler(...args)
    } catch (e) {
      if (e instanceof access.AuthError) return access.authErrorResponse(e)
      throw e
    }
  }
}
