import { NextResponse } from 'next/server'

import { jsonBody, kabinetApi } from '@/server/api/kabinetRoute'
import { db } from '@/server/db'
import { saveSection } from '@/server/services/kabinet'
import { KABINET_SECTIONS } from '@/shared/options'

// Saves one section of the studio from /kabinet: its keys are merged into the studio's pending change set for an editor
// to review and publish in /panel. Photos have their own routes (../photos).
export async function POST(req: Request, { params }: { params: Promise<{ slug: string; section: string }> }) {
  const { slug, section } = await params
  if (section === 'foto' || !(KABINET_SECTIONS as readonly string[]).includes(section)) return NextResponse.json({ error: 'Розділ не знайдено.' }, { status: 404 })
  return kabinetApi(req, { key: 'edit', max: 60 }, async (u) =>
    saveSection(db, { userId: u.id, ownerName: u.name, slug, section: section as Exclude<(typeof KABINET_SECTIONS)[number], 'foto'>, data: await jsonBody(req) }),
  )
}
