import 'server-only'

import { APIError } from 'better-auth/api'

import { db } from '../db'
import { getAuth } from './index'
import { ownedStudioIds } from './access'
import { consumeInvite, findInvite } from './invites'
import { isEmailLogin } from './login'

// What /kabinet needs from auth, in the shape of today's ownerAuth/kabinet helpers, so phase 3 can swap the
// cabinet over route by route. Sign-in goes through Better Auth itself (rate limit, lockout hooks, session row,
// cookie); these functions only adapt inputs and outputs.

// Errors thrown by our hooks (lockout, switched-off account) arrive as exceptions on the server API;
// turn them into the same JSON responses the HTTP endpoint gives.
async function asResponse(call: () => Promise<Response>): Promise<Response> {
  try {
    return await call()
  } catch (e) {
    if (e instanceof APIError) return Response.json({ message: e.message, code: e.body?.code }, { status: e.statusCode })
    throw e
  }
}

/** Owner sign-in with an email or phone login. Returns Better Auth's response (Set-Cookie on success). */
export function signInOwner(login: string, password: string, headers: Headers): Promise<Response> {
  return asResponse(() => getAuth().api.signInUsername({ body: { username: login, password, rememberMe: true }, headers, asResponse: true }))
}

/** Staff sign-in for /panel (email + password). */
export function signInStaff(email: string, password: string, headers: Headers): Promise<Response> {
  return asResponse(() => getAuth().api.signInEmail({ body: { email, password, rememberMe: true }, headers, asResponse: true }))
}

export function signOut(headers: Headers): Promise<Response> {
  return getAuth().api.signOut({ headers, asResponse: true })
}

export const inviteDetails = (token: string) => findInvite(db, token)

/** The set-password page: use the one-time link, then sign the person straight in. */
export async function setPasswordAndSignIn(opts: { token: string; login: string; password: string; headers: Headers }): Promise<Response> {
  const done = await consumeInvite(db, opts)
  return isEmailLogin(done.login) && done.role !== 'owner'
    ? signInStaff(done.login, opts.password, opts.headers)
    : signInOwner(done.login, opts.password, opts.headers)
}

export async function currentOwnerWithStudios(headers: Headers) {
  const s = await getAuth().api.getSession({ headers })
  if (!s) return null
  return { userId: s.user.id, name: s.user.name, studioIds: await ownedStudioIds(db, s.user.id) }
}
