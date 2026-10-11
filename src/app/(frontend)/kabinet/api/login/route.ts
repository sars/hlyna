import { kabinetAuthResponse } from '@/lib/kabinetAuthResponse'
import { signInOwner } from '@/server/auth/kabinet-adapter'

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, string> | null
  const res = await signInOwner(String(body?.login ?? '').trim(), String(body?.password ?? ''), req.headers)
  return kabinetAuthResponse(res)
}
