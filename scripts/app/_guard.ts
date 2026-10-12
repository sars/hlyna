// Every import script on the new stack starts here.
//  • It talks to Postgres through Drizzle only, so a script can never apply a schema migration by accident.
//  • It refuses to touch production unless PROD=1 is set explicitly. «Production» = NODE_ENV=production, the SSH
//    tunnel port we use for prod (15432), the compose service host «db», or HLYNA_ENV=prod.
import 'dotenv/config'
import path from 'node:path'

/** The research folder (AGENTS.md: `../UkraineCeramics`); RESEARCH_DIR overrides. */
export const RESEARCH_DIR = process.env.RESEARCH_DIR ?? path.resolve(process.cwd(), '../UkraineCeramics')

const url = process.env.DATABASE_URL ?? ''
export const isProdTarget = () =>
  process.env.NODE_ENV === 'production' || process.env.HLYNA_ENV === 'prod' || /@(?:127\.0\.0\.1|localhost):15432\//.test(url) || /@db(?::\d+)?\//.test(url)

export function guard(script: string) {
  if (!url) {
    console.error(`${script}: DATABASE_URL is not set`)
    process.exit(2)
  }
  if (isProdTarget() && process.env.PROD !== '1') {
    console.error(`${script}: this looks like production (${url.replace(/\/\/[^@]*@/, '//***@')}). Re-run with PROD=1 if you mean it.`)
    process.exit(2)
  }
  return { dry: process.env.DRY === '1', prod: isProdTarget() }
}

/** One revalidation of the public site after a script wrote something (when SITE_URL and REVALIDATE_SECRET are set). */
export async function revalidateSite(skip = false) {
  const site = process.env.SITE_URL
  const secret = process.env.REVALIDATE_SECRET
  if (skip || !site || !secret) return
  const res = await fetch(`${site.replace(/\/$/, '')}/revalidate?secret=${encodeURIComponent(secret)}`, { method: 'POST' }).catch(() => null)
  console.log('revalidate', res?.status ?? 'failed')
}
