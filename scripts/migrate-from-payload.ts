/**
 * Copy all data from Payload's tables (schema `public`) into our schema `app`, preserving ids.
 *   DATABASE_URL=postgres://localhost/hlyna pnpm exec tsx scripts/migrate-from-payload.ts
 * Idempotent: one transaction that truncates app.* and refills it, then resets the id sequences. Reads Payload
 * tables with plain SQL (no Payload runtime), so it keeps working after Payload is removed from the code.
 * Apply the drizzle migrations first (pnpm exec drizzle-kit migrate). Writes a report to MIGRATION_REPORT
 * (default ./migration-report.json).
 */
import fs from 'node:fs'

import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool, type PoolClient } from 'pg'

import { eq } from 'drizzle-orm'

import * as s from '../src/server/db/schema'
import { toLegacyStudio } from '../src/server/legacy'

type AppDb = NodePgDatabase<typeof s>

const REPORT = process.env.MIGRATION_REPORT || 'migration-report.json'
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

type Row = Record<string, any>
const q = async (c: PoolClient, sql: string, params: unknown[] = []) => (await c.query(sql, params)).rows as Row[]
const groupBy = <T extends Row>(rows: T[], key: string) => {
  const m = new Map<number, T[]>()
  for (const r of rows) {
    const k = r[key] as number
    const a = m.get(k)
    if (a) a.push(r)
    else m.set(k, [r])
  }
  return m
}
// Payload stores counts in `numeric`; refuse to silently drop fractions.
const int = (v: unknown, what: string) => {
  if (v === null || v === undefined) return null
  const n = Number(v)
  if (!Number.isInteger(n)) throw new Error(`${what}: non-integer value ${v}`)
  return n
}
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))
const ts = (v: unknown) => (v === null || v === undefined ? null : new Date(v as string).toISOString())
const ordered = (rows: Row[] | undefined, field: string, orderKey = '_order') =>
  (rows ?? []).sort((a, b) => a[orderKey] - b[orderKey]).map((r) => r[field] as string)

// Lexical rich text → plain text (Payload media captions); only paragraphs of text nodes are expected.
function lexicalToText(v: unknown): string | null {
  if (!v || typeof v !== 'object') return null
  const out: string[] = []
  const walk = (n: any) => {
    if (n?.type === 'text' && typeof n.text === 'string') out.push(n.text)
    for (const ch of n?.children ?? []) walk(ch)
    if (n?.type === 'paragraph') out.push('\n')
  }
  walk((v as any).root)
  const text = out.join('').replace(/\n+$/, '').trim()
  return text || null
}

const ownerUserId = (id: number) => `owner_${id}`
const adminUserId = (id: number) => `admin_${id}`

async function main() {
  const client = await pool.connect()
  const report: Record<string, unknown> = { startedAt: new Date().toISOString(), database: process.env.DATABASE_URL?.replace(/:[^:@/]+@/, ':***@') }
  try {
    await client.query('BEGIN')
    const db = drizzle(client, { schema: s })

    // Locales: only 'uk' exists; anything else would be silently lost, so stop.
    const otherLocales = await q(
      client,
      `select (select count(*) from studios_locales where _locale <> 'uk') + (select count(*) from cities_locales where _locale <> 'uk')
        + (select count(*) from studios_services where _locale <> 'uk') + (select count(*) from studios_products where _locale <> 'uk') as n`,
    )
    if (Number(otherLocales[0].n) > 0) throw new Error('non-uk locale rows found; extend the migrator before continuing')

    await client.query(`TRUNCATE app.studio_revisions, app.change_sets, app.audit_log, app.jobs, app.import_runs,
      app.claim_studios, app.claims, app.request_studios, app.requests, app.studio_owner, app.invite_links,
      app.session, app.account, app.verification, app.rate_limit, app."user",
      app.studio_photos, app.studio_prices, app.studio_slug_history, app.studios, app.media, app.cities RESTART IDENTITY CASCADE`)

    // ---------- cities
    const cityRows = await q(client, `select c.*, l.name from cities c left join cities_locales l on l._parent_id = c.id and l._locale = 'uk' order by c.id`)
    if (cityRows.length)
      await db.insert(s.cities).values(
        cityRows.map((c) => ({
          id: c.id,
          slug: c.slug,
          name: c.name ?? c.slug,
          oblast: c.oblast,
          population: int(c.population, `city ${c.id} population`),
          isOver100k: c.is_over100k,
          createdAt: ts(c.created_at)!,
          updatedAt: ts(c.updated_at)!,
          createdBy: 'migration',
          updatedBy: 'migration',
        })),
      )

    // ---------- media
    const mediaRows = await q(client, `select * from media order by id`)
    const SIZES = ['thumbnail', 'square', 'small', 'medium', 'large', 'xlarge', 'og']
    if (mediaRows.length)
      await db.insert(s.media).values(
        mediaRows.map((m) => ({
          id: m.id,
          fileName: m.filename,
          mime: m.mime_type,
          size: int(m.filesize, `media ${m.id} size`),
          width: int(m.width, `media ${m.id} width`),
          height: int(m.height, `media ${m.id} height`),
          alt: m.alt,
          caption: lexicalToText(m.caption),
          focalX: num(m.focal_x),
          focalY: num(m.focal_y),
          variants: Object.fromEntries(
            SIZES.filter((k) => m[`sizes_${k}_filename`]).map((k) => [
              k,
              {
                file: m[`sizes_${k}_filename`],
                width: num(m[`sizes_${k}_width`]),
                height: num(m[`sizes_${k}_height`]),
                size: num(m[`sizes_${k}_filesize`]),
                mime: m[`sizes_${k}_mime_type`],
              },
            ]),
          ),
          status: 'active' as const,
          createdAt: ts(m.created_at)!,
          updatedAt: ts(m.updated_at)!,
          createdBy: 'migration',
          updatedBy: 'migration',
        })),
      )

    // ---------- studios (main rows = the current published or draft document)
    const [main, locales, alt, formats, services, products, prices, channels, links, sources, igPosts, logoMethods, rels] = await Promise.all([
      q(client, `select * from studios order by id`),
      q(client, `select * from studios_locales where _locale = 'uk'`),
      q(client, `select * from studios_alternate_names`),
      q(client, `select * from studios_formats`),
      q(client, `select * from studios_services where _locale = 'uk'`),
      q(client, `select * from studios_products where _locale = 'uk'`),
      q(client, `select * from studios_prices`),
      q(client, `select * from studios_sales_channels`),
      q(client, `select * from studios_other_links`),
      q(client, `select * from studios_sources`),
      q(client, `select * from studios_activity_instagram_posts`),
      q(client, `select * from studios_b2b_logo_methods`),
      q(client, `select * from studios_rels`),
    ])
    const loc = new Map(locales.map((l) => [l._parent_id as number, l]))
    const by = {
      alt: groupBy(alt, '_parent_id'),
      formats: groupBy(formats, 'parent_id'),
      services: groupBy(services, '_parent_id'),
      products: groupBy(products, '_parent_id'),
      prices: groupBy(prices, '_parent_id'),
      channels: groupBy(channels, '_parent_id'),
      links: groupBy(links, '_parent_id'),
      sources: groupBy(sources, '_parent_id'),
      igPosts: groupBy(igPosts, '_parent_id'),
      logoMethods: groupBy(logoMethods, '_parent_id'),
      rels: groupBy(rels, 'parent_id'),
    }
    const unknownRelPaths = rels.filter((r) => r.path !== 'photos')
    if (unknownRelPaths.length) throw new Error(`studios_rels has unknown paths: ${[...new Set(unknownRelPaths.map((r) => r.path))].join(', ')}`)

    // Version history (for revisions and the revision counter)
    const versions = await q(client, `select id, parent_id, created_at, latest, version__status from _studios_v order by parent_id, created_at, id`)
    const versionsByStudio = groupBy(versions, 'parent_id')

    const studioValues = main.map((r) => {
      const l = loc.get(r.id)
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        type: r.type,
        status: r.status,
        visibility: r._status === 'published' ? ('public' as const) : ('hidden' as const),
        confidence: r.confidence,
        sourceId: r.source_id,
        revision: Math.max(1, versionsByStudio.get(r.id)?.length ?? 1),
        cityId: r.city_id,
        oblast: r.oblast,
        address: r.address,
        geoLat: num(r.geo_lat),
        geoLng: num(r.geo_lng),
        geoPrecision: r.geo_precision,
        geoGeocodedAt: ts(r.geo_geocoded_at),
        geoSource: r.geo_source,
        summary: l?.summary ?? null,
        publicDescription: l?.public_description ?? null,
        recentNote: l?.recent_note ?? null,
        descriptionInternal: l?.description ?? null,
        ownerAbout: r.owner_about,
        ownerNews: r.owner_news,
        ownerQuote: r.owner_quote,
        ownerQuoteApproved: r.owner_quote_approved,
        instagram: r.instagram,
        website: r.website,
        facebook: r.facebook,
        phone: r.phone,
        email: r.email,
        b2bMinOrder: r.b2b_min_order,
        b2bLeadTime: r.b2b_lead_time,
        b2bFoodSafe: r.b2b_food_safe,
        b2bDishwasherSafe: r.b2b_dishwasher_safe,
        b2bWorksWithHoreca: r.b2b_works_with_horeca,
        b2bWorksWithCorporate: r.b2b_works_with_corporate,
        activityLastPostDate: ts(r.activity_last_post_date),
        activityPosts90d: int(r.activity_posts90d, `studio ${r.id} posts90d`),
        activityFollowers: int(r.activity_followers, `studio ${r.id} followers`),
        activityWebsiteAlive: r.activity_website_alive,
        activityEtsySales: int(r.activity_etsy_sales, `studio ${r.id} etsySales`),
        activityCheckedAt: ts(r.activity_checked_at),
        consentPhotos: r.consent_photos,
        consentRequests: r.consent_requests,
        consentContactedAt: ts(r.consent_contacted_at),
        consentNotes: r.consent_notes,
        ownerVerified: r.owner_verified,
        alternateNames: ordered(by.alt.get(r.id), 'text'),
        formats: ordered(by.formats.get(r.id), 'value', 'order'),
        services: ordered(by.services.get(r.id), 'text'),
        products: ordered(by.products.get(r.id), 'text'),
        salesChannels: ordered(by.channels.get(r.id), 'text'),
        otherLinks: ordered(by.links.get(r.id), 'url'),
        sources: ordered(by.sources.get(r.id), 'url'),
        instagramPosts: ordered(by.igPosts.get(r.id), 'url'),
        b2bLogoMethods: ordered(by.logoMethods.get(r.id), 'text'),
        createdAt: ts(r.created_at)!,
        updatedAt: ts(r.updated_at)!,
        createdBy: 'migration',
        updatedBy: 'migration',
      }
    })
    for (let i = 0; i < studioValues.length; i += 200) await db.insert(s.studios).values(studioValues.slice(i, i + 200))

    const priceValues = main.flatMap((r) =>
      (by.prices.get(r.id) ?? [])
        .sort((a, b) => a._order - b._order)
        .map((p, i) => ({ studioId: r.id, position: i, text: p.text, source: p.source, dateText: p.date })),
    )
    for (let i = 0; i < priceValues.length; i += 500) await db.insert(s.studioPrices).values(priceValues.slice(i, i + 500))

    const photoValues = main.flatMap((r) =>
      (by.rels.get(r.id) ?? []).sort((a, b) => a.order - b.order).map((p, i) => ({ studioId: r.id, mediaId: p.media_id, position: i })),
    )
    if (photoValues.length) await db.insert(s.studioPhotos).values(photoValues)

    // ---------- revisions from Payload versions (full snapshots in the legacy document shape)
    const revisionCount = await migrateVersions(client, db)

    // ---------- people: Payload admins and studio owners → Better Auth users
    const admins = await q(client, `select * from users order by id`)
    const owners = await q(client, `select * from studio_owners order by id`)
    const ownerRels = await q(client, `select * from studio_owners_rels where path = 'studios'`)
    const userValues = [
      ...admins.map((u) => ({
        id: adminUserId(u.id),
        name: u.name || u.email,
        email: String(u.email).toLowerCase(),
        emailVerified: true,
        role: 'admin' as const,
        active: true,
        failedLogins: int(u.login_attempts, `user ${u.id} attempts`) ?? 0,
        lockUntil: u.lock_until ? new Date(u.lock_until) : null,
        createdAt: new Date(u.created_at),
        updatedAt: new Date(u.updated_at),
        legacyId: `admin:${u.id}`,
      })),
      ...owners.map((o) => {
        const login = (o.login as string | null)?.trim() || null
        const isEmail = !!login && login.includes('@')
        return {
          id: ownerUserId(o.id),
          name: o.name,
          email: isEmail ? login!.toLowerCase() : `owner-${o.id}@owners.hlyna.invalid`,
          emailVerified: false,
          username: login ? login.toLowerCase() : null,
          displayUsername: login,
          role: 'owner' as const,
          active: o.active ?? true,
          contact: o.contact,
          failedLogins: int(o.failed_logins, `owner ${o.id} failedLogins`) ?? 0,
          lockUntil: o.lock_until ? new Date(o.lock_until) : null,
          lastLoginAt: o.last_login_at ? new Date(o.last_login_at) : null,
          createdAt: new Date(o.created_at),
          updatedAt: new Date(o.updated_at),
          legacyId: `owner:${o.id}`,
        }
      }),
    ]
    if (userValues.length) await db.insert(s.user).values(userValues)
    // Owner passwords keep their scrypt$salt$key hash; Payload admin passwords (pbkdf2) are not carried over.
    const accountValues = owners
      .filter((o) => o.password_hash)
      .map((o) => ({
        id: `acc_${ownerUserId(o.id)}`,
        accountId: ownerUserId(o.id),
        providerId: 'credential',
        userId: ownerUserId(o.id),
        password: o.password_hash,
        createdAt: new Date(o.created_at),
        updatedAt: new Date(o.updated_at),
      }))
    if (accountValues.length) await db.insert(s.account).values(accountValues)
    const studioOwnerValues = ownerRels
      .sort((a, b) => a.order - b.order)
      .map((r, i) => ({ userId: ownerUserId(r.parent_id), studioId: r.studios_id, position: r.order ?? i, grantedBy: 'migration' }))
    if (studioOwnerValues.length) await db.insert(s.studioOwner).values(studioOwnerValues)
    // Unused, unexpired password links keep working (same token hash) so nobody has to be sent a new one.
    const invites = owners.filter((o) => o.invite_token_hash && o.invite_expires && new Date(o.invite_expires) > new Date() && !o.password_hash)
    if (invites.length)
      await db.insert(s.inviteLinks).values(
        invites.map((o) => ({
          id: `inv_${ownerUserId(o.id)}`,
          userId: ownerUserId(o.id),
          tokenHash: o.invite_token_hash,
          link: o.invite_link,
          expiresAt: new Date(o.invite_expires),
          createdBy: 'migration',
        })),
      )

    // ---------- requests
    const reqRows = await q(client, `select * from requests order by id`)
    const reqRels = await q(client, `select * from requests_rels`)
    const badReqPaths = reqRels.filter((r) => r.path !== 'studiosSent')
    if (badReqPaths.length) throw new Error(`requests_rels has unknown paths: ${[...new Set(badReqPaths.map((r) => r.path))]}`)
    if (reqRows.length)
      await db.insert(s.requests).values(
        reqRows.map((r) => ({
          id: r.id,
          what: r.what,
          details: r.details,
          studioName: r.studio_name,
          studioLinks: r.studio_links,
          photoConsent: r.photo_consent,
          quantity: r.quantity,
          deadline: r.deadline,
          budgetPerItem: r.budget_per_item,
          city: r.city,
          logo: r.logo,
          contactName: r.contact_name,
          contactPhoneOrTelegram: r.contact_phone_or_telegram,
          contactEmail: r.contact_email,
          sourcePage: r.source_page,
          status: r.status ?? 'new',
          dealAmountKop: r.deal_amount === null ? null : Math.round(Number(r.deal_amount) * 100),
          notes: r.notes,
          createdAt: ts(r.created_at)!,
          updatedAt: ts(r.updated_at)!,
          createdBy: 'migration',
          updatedBy: 'migration',
        })),
      )
    const requestStudioValues = reqRels.sort((a, b) => a.order - b.order).map((r) => ({ requestId: r.parent_id, studioId: r.studios_id, position: r.order }))
    if (requestStudioValues.length) await db.insert(s.requestStudios).values(requestStudioValues)

    // ---------- claims
    const claimRows = await q(client, `select * from claims order by id`)
    const claimRels = await q(client, `select * from claims_rels`)
    const badClaimPaths = claimRels.filter((r) => r.path !== 'otherStudios')
    if (badClaimPaths.length) throw new Error(`claims_rels has unknown paths: ${[...new Set(badClaimPaths.map((r) => r.path))]}`)
    if (claimRows.length)
      await db.insert(s.claims).values(
        claimRows.map((c) => ({
          id: c.id,
          status: c.status,
          name: c.name,
          contact: c.contact,
          represents: c.represents,
          rejectReason: c.reject_reason,
          linkToOwnerId: c.link_to_owner_id ? ownerUserId(c.link_to_owner_id) : null,
          ownerId: c.owner_id ? ownerUserId(c.owner_id) : null,
          notes: c.notes,
          createdAt: ts(c.created_at)!,
          updatedAt: ts(c.updated_at)!,
          createdBy: 'migration',
          updatedBy: 'migration',
        })),
      )
    const claimStudioValues = [
      ...claimRows.filter((c) => c.studio_id).map((c) => ({ claimId: c.id, studioId: c.studio_id, isMain: true, position: 0 })),
      ...claimRels
        .sort((a, b) => a.order - b.order)
        .map((r) => ({ claimId: r.parent_id, studioId: r.studios_id, isMain: false, position: r.order })),
    ]
    // a studio listed both as main and in otherStudios would collide on the PK; keep the main entry
    const seen = new Set<string>()
    const uniqueClaimStudios = claimStudioValues.filter((v) => {
      const k = `${v.claimId}:${v.studioId}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    if (uniqueClaimStudios.length) await db.insert(s.claimStudios).values(uniqueClaimStudios)

    // ---------- owner drafts of published studios → pending change sets
    const pendingChanges = await migrateOwnerDrafts(client, db)

    // ---------- sequences
    for (const t of ['cities', 'studios', 'studio_prices', 'media', 'requests', 'claims', 'studio_revisions', 'change_sets']) {
      await client.query(`select setval(pg_get_serial_sequence('app.${t}', 'id'), greatest((select coalesce(max(id), 0) from app.${t}), 1), (select count(*) > 0 from app.${t}))`)
    }

    await client.query('COMMIT')

    const counts = async (sql: string) => Number((await q(client, sql))[0].n)
    report.counts = {
      payload: {
        cities: cityRows.length,
        studios: main.length,
        studiosPublished: main.filter((r) => r._status === 'published').length,
        prices: prices.length,
        services: services.length,
        products: products.length,
        formats: formats.length,
        alternateNames: alt.length,
        photos: rels.length,
        media: mediaRows.length,
        versions: versions.length,
        requests: reqRows.length,
        claims: claimRows.length,
        owners: owners.length,
        admins: admins.length,
      },
      app: {
        cities: await counts(`select count(*) n from app.cities`),
        studios: await counts(`select count(*) n from app.studios`),
        studiosPublic: await counts(`select count(*) n from app.studios where visibility = 'public'`),
        prices: await counts(`select count(*) n from app.studio_prices`),
        services: await counts(`select coalesce(sum(cardinality(services)),0) n from app.studios`),
        products: await counts(`select coalesce(sum(cardinality(products)),0) n from app.studios`),
        formats: await counts(`select coalesce(sum(cardinality(formats)),0) n from app.studios`),
        alternateNames: await counts(`select coalesce(sum(cardinality(alternate_names)),0) n from app.studios`),
        photos: await counts(`select count(*) n from app.studio_photos`),
        media: await counts(`select count(*) n from app.media`),
        revisions: revisionCount,
        requests: await counts(`select count(*) n from app.requests`),
        claims: await counts(`select count(*) n from app.claims`),
        owners: await counts(`select count(*) n from app."user" where role = 'owner'`),
        admins: await counts(`select count(*) n from app."user" where role = 'admin'`),
        changeSets: pendingChanges,
        invites: invites.length,
      },
    }
    const p = (report.counts as any).payload, a = (report.counts as any).app
    const mismatches = Object.keys(p)
      .filter((k) => k in a || k === 'studiosPublished' || k === 'versions')
      .map((k) => [k, p[k], k === 'studiosPublished' ? a.studiosPublic : k === 'versions' ? a.revisions : a[k]])
      .filter(([, x, y]) => x !== y)
    report.countMismatches = mismatches
    report.finishedAt = new Date().toISOString()
    fs.writeFileSync(REPORT, JSON.stringify(report, null, 2))
    console.log(JSON.stringify(report.counts, null, 2))
    if (mismatches.length) {
      console.error('COUNT MISMATCHES', mismatches)
      process.exitCode = 1
    } else console.log('counts match')
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
    await pool.end()
  }
}

// Each Payload version becomes a revision snapshot (legacy document shape). Payload keeps the last 10 per studio.
async function migrateVersions(client: PoolClient, db: AppDb) {
  const [vs, vloc, vArr] = await Promise.all([
    q(client, `select * from _studios_v order by parent_id, created_at, id`),
    q(client, `select * from _studios_v_locales where _locale = 'uk'`),
    Promise.all(
      [
        ['alternateNames', '_studios_v_version_alternate_names', 'text'],
        ['formats', '_studios_v_version_formats', 'value'],
        ['services', '_studios_v_version_services', 'text'],
        ['products', '_studios_v_version_products', 'text'],
        ['salesChannels', '_studios_v_version_sales_channels', 'text'],
        ['otherLinks', '_studios_v_version_other_links', 'url'],
        ['sources', '_studios_v_version_sources', 'url'],
        ['instagramPosts', '_studios_v_version_activity_instagram_posts', 'url'],
        ['logoMethods', '_studios_v_version_b2b_logo_methods', 'text'],
      ].map(async ([key, table, field]) => {
        const rows = await q(client, `select * from ${table}${table.endsWith('services') || table.endsWith('products') ? ` where _locale = 'uk'` : ''}`)
        const parentKey = key === 'formats' ? 'parent_id' : '_parent_id'
        const orderKey = key === 'formats' ? 'order' : '_order'
        const g = groupBy(rows, parentKey)
        return [key, (id: number) => ordered(g.get(id), field, orderKey)] as const
      }),
    ),
  ])
  const vprices = groupBy(await q(client, `select * from _studios_v_version_prices`), '_parent_id')
  const vrels = groupBy(await q(client, `select * from _studios_v_rels where path = 'version.photos'`), 'parent_id')
  const vl = new Map(vloc.map((l) => [l._parent_id as number, l]))
  const arr = Object.fromEntries(vArr) as Record<string, (id: number) => string[]>
  const counter = new Map<number, number>()
  const values = vs.map((v) => {
    const n = (counter.get(v.parent_id) ?? 0) + 1
    counter.set(v.parent_id, n)
    const l = vl.get(v.id)
    const texts = (xs: string[]) => xs.map((text) => ({ text }))
    const urls = (xs: string[]) => xs.map((url) => ({ url }))
    const snapshot = {
      name: v.version_name,
      type: v.version_type,
      city: v.version_city_id,
      oblast: v.version_oblast,
      address: v.version_address,
      geo: { lat: num(v.version_geo_lat), lng: num(v.version_geo_lng), precision: v.version_geo_precision, geocodedAt: ts(v.version_geo_geocoded_at), source: v.version_geo_source },
      summary: l?.version_summary ?? null,
      publicDescription: l?.version_public_description ?? null,
      recentNote: l?.version_recent_note ?? null,
      description: l?.version_description ?? null,
      ownerAbout: v.version_owner_about,
      ownerNews: v.version_owner_news,
      ownerQuote: v.version_owner_quote,
      ownerQuoteApproved: v.version_owner_quote_approved,
      alternateNames: texts(arr.alternateNames(v.id)),
      formats: arr.formats(v.id),
      services: texts(arr.services(v.id)),
      products: texts(arr.products(v.id)),
      prices: (vprices.get(v.id) ?? []).sort((a, b) => a._order - b._order).map((p) => ({ text: p.text, source: p.source, date: p.date })),
      photos: (vrels.get(v.id) ?? []).sort((a, b) => a.order - b.order).map((r) => r.media_id),
      instagram: v.version_instagram,
      website: v.version_website,
      facebook: v.version_facebook,
      phone: v.version_phone,
      email: v.version_email,
      otherLinks: urls(arr.otherLinks(v.id)),
      salesChannels: texts(arr.salesChannels(v.id)),
      b2b: {
        minOrder: v.version_b2b_min_order,
        leadTime: v.version_b2b_lead_time,
        logoMethods: texts(arr.logoMethods(v.id)),
        foodSafe: v.version_b2b_food_safe,
        dishwasherSafe: v.version_b2b_dishwasher_safe,
        worksWithHoreca: v.version_b2b_works_with_horeca,
        worksWithCorporate: v.version_b2b_works_with_corporate,
      },
      activity: {
        lastPostDate: ts(v.version_activity_last_post_date),
        posts90d: num(v.version_activity_posts90d),
        followers: num(v.version_activity_followers),
        websiteAlive: v.version_activity_website_alive,
        etsySales: num(v.version_activity_etsy_sales),
        checkedAt: ts(v.version_activity_checked_at),
        instagramPosts: urls(arr.instagramPosts(v.id)),
      },
      consent: { photos: v.version_consent_photos, requests: v.version_consent_requests, contactedAt: ts(v.version_consent_contacted_at), notes: v.version_consent_notes },
      ownerVerified: v.version_owner_verified,
      pendingOwnerChanges: v.version_pending_owner_changes,
      slug: v.version_slug,
      status: v.version_status,
      confidence: v.version_confidence,
      sources: urls(arr.sources(v.id)),
      sourceId: v.version_source_id,
      _status: v.version__status,
    }
    return {
      studioId: v.parent_id as number,
      revision: n,
      snapshot,
      actorId: null,
      source: 'payload-version',
      note: `payload version ${v.id}${v.latest ? ' (latest)' : ''}${v.version__status === 'draft' ? ' draft' : ''}`,
      createdAt: ts(v.created_at)!,
    }
  })
  for (let i = 0; i < values.length; i += 300) await db.insert(s.studioRevisions).values(values.slice(i, i + 300))
  return values.length
}

// Owner-editable fields (the cabinet whitelist). An owner's unpublished draft of a published studio lives only in
// _studios_v (latest = true, status draft); the main row keeps the published data. Turn each into a pending change set.
const OWNER_FIELDS = [
  'ownerAbout', 'ownerNews', 'ownerQuote', 'ownerQuoteApproved', 'services', 'products', 'prices', 'address', 'website', 'instagram', 'phone',
  'email', 'facebook', 'b2b', 'photos', 'activity.instagramPosts', 'consent.photos',
]
async function migrateOwnerDrafts(client: PoolClient, db: AppDb) {
  const rows = await q(
    client,
    `select v.parent_id, r.snapshot, r.revision from _studios_v v join studios st on st.id = v.parent_id
      join app.studio_revisions r on r.studio_id = v.parent_id and r.note like 'payload version ' || v.id || '%'
     where v.latest and v.version__status = 'draft' and st._status = 'published'`,
  )
  if (!rows.length) return 0
  const values = []
  for (const r of rows) {
    const snap = r.snapshot as Record<string, any>
    // Compare with the published data now in app.studios: keep only the fields the owner actually changed.
    const [row] = await db.select().from(s.studios).where(eq(s.studios.id, r.parent_id))
    const prices = await db.select().from(s.studioPrices).where(eq(s.studioPrices.studioId, r.parent_id))
    const photos = await db.select().from(s.studioPhotos).where(eq(s.studioPhotos.studioId, r.parent_id))
    const current = toLegacyStudio(row, prices, photos.map((p) => p.mediaId)) as Record<string, any>
    // Payload fills defaults when it saves a draft (false checkboxes, '' texts), so unset ≡ false ≡ '' ≡ [] here;
    // snapshots come back from jsonb with sorted keys, so compare canonically.
    const canon = (v: unknown): unknown => {
      if (v === false || v === '' || v === undefined || v === null || (Array.isArray(v) && v.length === 0)) return null
      if (Array.isArray(v)) return v.map(canon)
      if (typeof v === 'object') return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canon((v as any)[k])]))
      return v
    }
    const strip = (v: unknown) => JSON.stringify(canon(v))
    const proposed: Record<string, unknown> = {}
    for (const f of OWNER_FIELDS) {
      const [a, b] = f.split('.')
      const next = b ? snap[a]?.[b] : snap[a]
      const now = b ? current[a]?.[b] : current[a]
      if (strip(next) !== strip(now)) proposed[f] = next
    }
    values.push({ studioId: r.parent_id as number, authorId: null, status: 'pending' as const, baseRevision: r.revision as number, proposed })
  }
  await db.insert(s.changeSets).values(values)
  return values.length
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
