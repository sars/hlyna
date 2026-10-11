import type { Db } from '../db'
import type { Actor } from '../services/audit'
import { approveClaim, rejectClaim, studioWelcomeMessage } from '../services/claims'
import { applyChangeSet, getChangeSet, pendingChangeSetOf } from '../services/changeSets'
import { NotFound, setRequestStatus } from '../services/requests'
import type { RequestStatus } from '../../shared/options'

// What a Telegram button does, as plain functions over the same services the panel uses. The webhook route only
// parses updates and edits messages; tests call these directly.

export type TgButton = { text: string; callback_data?: string; url?: string }
export type TgKeyboard = TgButton[][]

export const siteUrl = () => (process.env.NEXT_PUBLIC_SERVER_URL || 'https://hlyna.com.ua').replace(/\/$/, '')
export const panelUrl = (path: string) => `${siteUrl()}/panel${path}`

/** What to show after a tap: a short toast, an optional new status line + keyboard for the original message, extra messages. */
export type TapResult = { answer: string; mark?: { line: string; keyboard: TgKeyboard }; say?: { text: string; keyboard?: TgKeyboard }[] }

const STATUS_LABEL: Record<RequestStatus, string> = {
  new: 'Новий',
  in_progress: 'В роботі',
  forwarded: 'Передано студіям',
  replied: 'Студія відповіла',
  deal: 'Угода',
  lost: 'Не вийшло',
  closed: 'Закрито',
}
const REQUEST_ACTIONS: Record<string, RequestStatus> = { w: 'in_progress', f: 'forwarded', x: 'closed' }

export const claimKeyboard = (id: number): TgKeyboard => [
  [
    { text: '✅ Схвалити', callback_data: `c:a:${id}` },
    { text: '❌ Відхилити', callback_data: `c:r:${id}` },
  ],
  [{ text: '🔗 Відкрити в панелі', url: panelUrl(`/zayavky/${id}`) }],
]
export const ownerEditKeyboard = (studioId: number, changeSetId: number): TgKeyboard => [
  [
    { text: '👀 Переглянути', url: panelUrl(`/zminy/${changeSetId}`) },
    { text: '✅ Опублікувати', callback_data: `s:p:${studioId}` },
  ],
]
export const requestKeyboard = (id: number): TgKeyboard => [
  [
    { text: '📨 Взято в роботу', callback_data: `r:w:${id}` },
    { text: '✅ Передано студіям', callback_data: `r:f:${id}` },
  ],
  [
    { text: '🗄 Закрити', callback_data: `r:x:${id}` },
    { text: '🔗 В панелі', url: panelUrl(`/zapyty/${id}`) },
  ],
]

export async function tapApproveClaim(db: Db, id: number, actor: Actor): Promise<TapResult> {
  const r = await approveClaim(db, id, actor).catch((e) => (e instanceof NotFound ? null : Promise.reject(e)))
  if (!r) return { answer: 'Заявку не знайдено' }
  if (r.status === 'rejected') return { answer: 'Заявку вже відхилено' }
  const mark = { line: 'Схвалено', keyboard: [[{ text: '🔗 Відкрити в панелі', url: panelUrl(`/zayavky/${id}`) }]] }
  if (r.already) return { answer: 'Вже схвалено', mark }
  return {
    answer: 'Схвалено',
    mark,
    say: r.link
      ? [{ text: `Заявка #${id} схвалена. Надішліть студії це повідомлення:` }, { text: studioWelcomeMessage(r.link) }]
      : [{ text: `Заявка #${id} схвалена. Власник уже має пароль — нове посилання не потрібне.` }],
  }
}

export async function tapRejectClaim(db: Db, id: number, reason: string, actor: Actor): Promise<TapResult> {
  const r = await rejectClaim(db, id, reason, actor).catch((e) => (e instanceof NotFound ? null : Promise.reject(e)))
  if (!r) return { answer: 'Заявку не знайдено' }
  if (r.status === 'approved') return { answer: 'Заявку вже схвалено — відхилити можна лише в панелі' }
  return { answer: 'Відхилено', mark: { line: `Відхилено${reason ? `: ${reason}` : ''}`, keyboard: [[{ text: '🔗 Відкрити в панелі', url: panelUrl(`/zayavky/${id}`) }]] } }
}

/** «Опублікувати»: accept the studio's open change set. With owner text present, ask first (that text needs our rewrite). */
export async function tapPublishOwnerChanges(db: Db, studioId: number, withoutText: boolean, actor: Actor): Promise<TapResult> {
  const csId = await pendingChangeSetOf(db, studioId)
  if (!csId) return { answer: 'Нових змін немає', mark: { line: 'Вже розглянуто', keyboard: [] } }
  const cs = await getChangeSet(db, csId)
  const hasText = Boolean(cs?.fields.some((f) => f.ownerText && f.changed && f.to))
  if (hasText && !withoutText)
    return {
      answer: 'Спершу перепишіть текст або опублікуйте без нього',
      say: [
        {
          text: `${cs!.studio.name}: власник додав текст «своїми словами» — його треба переписати голосом сайту в панелі. Можна прийняти решту змін (ціни, умови, фото) вже зараз — текст лишиться внутрішнім.`,
          keyboard: [[{ text: '✅ Опублікувати без тексту', callback_data: `s:n:${studioId}` }, { text: '👀 Переглянути', url: panelUrl(`/zminy/${csId}`) }]],
        },
      ],
    }
  const r = await applyChangeSet(db, csId, withoutText ? 'all-but-text' : 'all', actor)
  return { answer: r.already ? 'Вже розглянуто' : 'Опубліковано', mark: { line: 'Опубліковано', keyboard: [[{ text: '👀 Профіль', url: `${siteUrl()}/vyrobnyky/${cs!.studio.slug}` }]] } }
}

export async function tapRequestStatus(db: Db, id: number, action: string, actor: Actor): Promise<TapResult> {
  const status = REQUEST_ACTIONS[action]
  if (!status) return { answer: 'Невідома дія' }
  const r = await setRequestStatus(db, id, status, actor).catch((e) => (e instanceof NotFound ? null : Promise.reject(e)))
  if (!r) return { answer: 'Запит не знайдено' }
  const keyboard: TgKeyboard =
    status === 'closed'
      ? [[{ text: '🔗 В панелі', url: panelUrl(`/zapyty/${id}`) }]]
      : [
          [...(status !== 'forwarded' ? [{ text: '✅ Передано студіям', callback_data: `r:f:${id}` }] : []), { text: '🗄 Закрити', callback_data: `r:x:${id}` }],
          [{ text: '🔗 В панелі', url: panelUrl(`/zapyty/${id}`) }],
        ]
  return { answer: STATUS_LABEL[status], mark: { line: `Статус: ${STATUS_LABEL[status]}`, keyboard } }
}

/** Routes callback_data «kind:action:id» to an action. */
export async function handleTap(db: Db, data: string, actor: Actor): Promise<TapResult & { askReason?: number }> {
  const [kind, action, raw] = data.split(':')
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) return { answer: 'Невідома дія' }
  if (kind === 'c' && action === 'a') return tapApproveClaim(db, id, actor)
  if (kind === 'c' && action === 'r') return { answer: 'Напишіть причину', askReason: id }
  if (kind === 'c' && action === 'n') return tapRejectClaim(db, id, '', actor)
  if (kind === 's' && action === 'p') return tapPublishOwnerChanges(db, id, false, actor)
  if (kind === 's' && action === 'n') return tapPublishOwnerChanges(db, id, true, actor)
  if (kind === 'r') return tapRequestStatus(db, id, action ?? '', actor)
  return { answer: 'Невідома дія' }
}
