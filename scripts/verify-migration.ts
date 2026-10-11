/**
 * Field-by-field check of the `app` schema against what Payload's Local API returns for the same database.
 *   DATABASE_URL=postgres://localhost/hlyna_prodcopy PAYLOAD_SECRET=x PAYLOAD_MIGRATING=true NODE_ENV=development \
 *     pnpm payload run scripts/verify-migration.ts
 * PAYLOAD_MIGRATING=true keeps Payload from pushing its dev schema or running migrations, so this only reads.
 * Compares every studio, city, request, claim and owner (plus row counts); exits 1 on any mismatch.
 * DRAFT_LAB=1 additionally answers the design question «does saving an owner draft of a published studio change
 * the main row?» — it WRITES, so run it only on a scratch copy (VERIFY_ALLOW_WRITE=1 required).
 */
import fs from 'node:fs'

import { getPayload } from 'payload'
import config from '@payload-config'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

import * as s from '../src/server/db/schema'
import { toLegacyCity, toLegacyClaim, toLegacyRequest, toLegacyStudio } from '../src/server/legacy'

const OUT = process.env.VERIFY_REPORT || 'verify-report.json'
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool, { schema: s })
// Read-only on purpose: Payload pushes its dev schema unless PAYLOAD_MIGRATING=true, and runs pending migrations
// whenever NODE_ENV=production (that once hit production from a script). Refuse both.
if (process.env.NODE_ENV === 'production' || process.env.PAYLOAD_MIGRATING !== 'true') {
  console.error('verify-migration: run with NODE_ENV=development PAYLOAD_MIGRATING=true (read-only).')
  process.exit(2)
}
const payload = await getPayload({ config })

const groupBy = <T, K>(xs: T[], key: (x: T) => K) => {
  const m = new Map<K, T[]>()
  for (const x of xs) m.set(key(x), [...(m.get(key(x)) ?? []), x])
  return m
}

// Normalise both sides: drop Payload's array row ids, null ≡ undefined ≡ [], timestamps as ISO.
function norm(v: unknown): unknown {
  if (v === undefined || v === null) return null
  // Payload returns null for an empty localized array (services/products) and [] for the others; both mean empty.
  if (Array.isArray(v)) return v.length ? v.map(norm) : null
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (k === 'id' && typeof val === 'string') continue // array row ids
      out[k] = norm(val)
    }
    return out
  }
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return new Date(v).toISOString()
  return v
}
function diff(a: unknown, b: unknown, path = ''): string[] {
  if (JSON.stringify(a) === JSON.stringify(b)) return []
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)])
    return [...keys].flatMap((k) => diff((a as any)[k], (b as any)[k], path ? `${path}.${k}` : k))
  }
  return [`${path}: payload=${JSON.stringify(a)?.slice(0, 160)} app=${JSON.stringify(b)?.slice(0, 160)}`]
}
const pick = <T extends Record<string, unknown>>(o: T, drop: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !drop.includes(k)))

const report: Record<string, unknown> = { database: process.env.DATABASE_URL, at: new Date().toISOString() }
const problems: string[] = []

// ---------- studios
const pStudios = (await payload.find({ collection: 'studios', depth: 0, limit: 0, pagination: false, overrideAccess: true, showHiddenFields: true })).docs
const aStudios = await db.select().from(s.studios)
const aPrices = await db.select().from(s.studioPrices)
const aPhotos = await db.select().from(s.studioPhotos)
const pricesBy = groupBy(aPrices, (p) => p.studioId)
const photosBy = groupBy(aPhotos, (p) => p.studioId)
const aById = new Map(aStudios.map((x) => [x.id, x]))
let studioFieldsChecked = 0
for (const p of pStudios) {
  const a = aById.get(p.id)
  if (!a) {
    problems.push(`studio ${p.id} missing in app`)
    continue
  }
  const legacy = toLegacyStudio(a, pricesBy.get(a.id) ?? [], (photosBy.get(a.id) ?? []).sort((x, y) => x.position - y.position).map((x) => x.mediaId))
  // pendingOwnerChanges is derived from change_sets in the new model; compare it separately.
  const left = norm(pick(p as any, ['pendingOwnerChanges']))
  const right = norm(legacy)
  const d = diff(left, right)
  studioFieldsChecked += Object.keys(left as object).length
  for (const x of d) problems.push(`studio ${p.id} ${p.slug}: ${x}`)
}
if (aStudios.length !== pStudios.length) problems.push(`studio count payload=${pStudios.length} app=${aStudios.length}`)
// An owner's unpublished draft of a published studio lives only in _studios_v (latest, draft); Payload never
// changes the main row for it (confirmed by DRAFT_LAB). Each such draft must have become a pending change set.
const draftsOfPublished = (
  await pool.query(
    `select v.parent_id from _studios_v v join studios st on st.id = v.parent_id where v.latest and v.version__status = 'draft' and st._status = 'published' order by 1`,
  )
).rows.map((r) => r.parent_id as number)
const openSets = (await db.select().from(s.changeSets)).filter((c) => c.status === 'pending').map((c) => c.studioId).sort((a, b) => a - b)
if (JSON.stringify(draftsOfPublished) !== JSON.stringify(openSets))
  problems.push(`owner drafts of published studios ${JSON.stringify(draftsOfPublished)} vs app pending change_sets ${JSON.stringify(openSets)}`)
report.ownerDrafts = draftsOfPublished

// ---------- cities
const pCities = (await payload.find({ collection: 'cities', depth: 0, limit: 0, pagination: false, overrideAccess: true })).docs
const aCities = new Map((await db.select().from(s.cities)).map((c) => [c.id, c]))
for (const p of pCities) {
  const a = aCities.get(p.id)
  if (!a) problems.push(`city ${p.id} missing`)
  else for (const x of diff(norm(p), norm(toLegacyCity(a)))) problems.push(`city ${p.id}: ${x}`)
}

// ---------- requests (website2 is a honeypot, always empty, not migrated)
const pReq = (await payload.find({ collection: 'requests', depth: 0, limit: 0, pagination: false, overrideAccess: true, showHiddenFields: true })).docs
const aReq = new Map((await db.select().from(s.requests)).map((r) => [r.id, r]))
const aReqStudios = groupBy(await db.select().from(s.requestStudios), (r) => r.requestId)
for (const p of pReq) {
  const a = aReq.get(p.id)
  if (!a) {
    problems.push(`request ${p.id} missing`)
    continue
  }
  if ((p as any).website2) problems.push(`request ${p.id}: honeypot website2 is non-empty and not migrated`)
  const legacy = toLegacyRequest(a, (aReqStudios.get(a.id) ?? []).sort((x, y) => x.position - y.position).map((x) => x.studioId))
  for (const x of diff(norm(pick(p as any, ['website2'])), norm(legacy))) problems.push(`request ${p.id}: ${x}`)
}

// ---------- owners and claims
const aUsers = await db.select().from(s.user)
const legacyOwnerId = (userId: string | null) => (userId ? Number(aUsers.find((u) => u.id === userId)?.legacyId?.replace('owner:', '')) || null : null)
const pClaims = (await payload.find({ collection: 'claims', depth: 0, limit: 0, pagination: false, overrideAccess: true, showHiddenFields: true })).docs
const aClaims = new Map((await db.select().from(s.claims)).map((c) => [c.id, c]))
const aClaimStudios = groupBy(await db.select().from(s.claimStudios), (c) => c.claimId)
for (const p of pClaims) {
  const a = aClaims.get(p.id)
  if (!a) {
    problems.push(`claim ${p.id} missing`)
    continue
  }
  const cs = (aClaimStudios.get(a.id) ?? []).sort((x, y) => x.position - y.position)
  const legacy = toLegacyClaim(a, cs.find((x) => x.isMain)?.studioId ?? null, cs.filter((x) => !x.isMain).map((x) => x.studioId), legacyOwnerId)
  // inviteLink is not carried over on the claim (the owner's unused link moves to app.invite_links)
  for (const x of diff(norm(pick(p as any, ['inviteLink'])), norm(legacy))) problems.push(`claim ${p.id}: ${x}`)
}
const pOwners = (await payload.find({ collection: 'studio-owners', depth: 0, limit: 0, pagination: false, overrideAccess: true, showHiddenFields: true })).docs
const aAccounts = await db.select().from(s.account)
const aStudioOwner = await db.select().from(s.studioOwner)
const aInvites = await db.select().from(s.inviteLinks)
for (const p of pOwners as any[]) {
  const u = aUsers.find((x) => x.legacyId === `owner:${p.id}`)
  if (!u) {
    problems.push(`owner ${p.id} missing`)
    continue
  }
  const acc = aAccounts.find((x) => x.userId === u.id)
  const studiosOfOwner = aStudioOwner.filter((x) => x.userId === u.id).sort((x, y) => x.position - y.position).map((x) => x.studioId)
  const expect = {
    name: p.name,
    login: p.login ?? null,
    contact: p.contact ?? null,
    active: p.active ?? true,
    passwordHash: p.passwordHash ?? null,
    failedLogins: p.failedLogins ?? 0,
    lockUntil: p.lockUntil ?? null,
    lastLoginAt: p.lastLoginAt ?? null,
    studios: (p.studios ?? []).map((x: any) => (typeof x === 'object' ? x.id : x)),
    inviteTokenHash: p.passwordHash ? null : p.inviteExpires && new Date(p.inviteExpires) > new Date() ? p.inviteTokenHash : null,
  }
  const got = {
    name: u.name,
    login: u.displayUsername ?? null,
    contact: u.contact ?? null,
    active: u.active,
    passwordHash: acc?.password ?? null,
    failedLogins: u.failedLogins,
    lockUntil: u.lockUntil?.toISOString() ?? null,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    studios: studiosOfOwner,
    inviteTokenHash: aInvites.find((x) => x.userId === u.id)?.tokenHash ?? null,
  }
  for (const x of diff(norm(expect), norm(got))) problems.push(`owner ${p.id}: ${x}`)
}
const pUsers = (await payload.find({ collection: 'users', depth: 0, limit: 0, pagination: false, overrideAccess: true })).docs
for (const p of pUsers) {
  const u = aUsers.find((x) => x.legacyId === `admin:${p.id}`)
  if (!u) problems.push(`admin ${p.id} missing`)
  else if (u.email !== p.email.toLowerCase() || u.role !== 'admin') problems.push(`admin ${p.id}: email/role differ`)
}

// ---------- versions → revisions
const pv = Number((await pool.query('select count(*) n from _studios_v')).rows[0].n)
const av = Number((await pool.query('select count(*) n from app.studio_revisions')).rows[0].n)
if (pv !== av) problems.push(`versions payload=${pv} revisions app=${av}`)

report.checked = { studios: pStudios.length, studioFields: studioFieldsChecked, cities: pCities.length, requests: pReq.length, claims: pClaims.length, owners: pOwners.length, admins: pUsers.length, versions: pv }
report.problems = problems

// ---------- DRAFT_LAB: what happens to the main row when an owner draft of a published studio is saved
if (process.env.DRAFT_LAB === '1') {
  if (process.env.VERIFY_ALLOW_WRITE !== '1') throw new Error('DRAFT_LAB writes; set VERIFY_ALLOW_WRITE=1 and use a scratch database')
  const target = pStudios.find((p) => p._status === 'published')!
  const before = (await pool.query('select owner_about, pending_owner_changes, _status, updated_at from studios where id = $1', [target.id])).rows[0]
  await payload.update({
    collection: 'studios',
    id: target.id,
    data: { ownerAbout: 'DRAFT-LAB owner text', pendingOwnerChanges: true },
    draft: true,
    overrideAccess: true,
    context: { disableRevalidate: true },
  })
  const after = (await pool.query('select owner_about, pending_owner_changes, _status, updated_at from studios where id = $1', [target.id])).rows[0]
  const latest = (await pool.query('select version_owner_about, version__status, latest from _studios_v where parent_id = $1 order by created_at desc limit 1', [target.id])).rows[0]
  const published = await payload.findByID({ collection: 'studios', id: target.id, depth: 0, overrideAccess: true, showHiddenFields: true })
  const asDraft = await payload.findByID({ collection: 'studios', id: target.id, depth: 0, draft: true, overrideAccess: true, showHiddenFields: true })
  report.draftLab = {
    studio: `${target.id} ${target.slug}`,
    mainRowBefore: before,
    mainRowAfter: after,
    latestVersion: latest,
    findWithoutDraft_ownerAbout: (published as any).ownerAbout,
    findWithDraft_ownerAbout: (asDraft as any).ownerAbout,
    mainRowChanged: before.owner_about !== after.owner_about || before.pending_owner_changes !== after.pending_owner_changes,
  }
}

fs.writeFileSync(OUT, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report.checked))
if (report.draftLab) console.log('draftLab', JSON.stringify(report.draftLab, null, 1))
console.log(problems.length ? `PROBLEMS: ${problems.length}\n${problems.slice(0, 40).join('\n')}` : 'no mismatches')
await pool.end()
process.exit(problems.length ? 1 : 0)
