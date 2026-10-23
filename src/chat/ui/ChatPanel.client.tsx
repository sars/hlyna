'use client'

import React, { useCallback, useEffect, useEffectEvent, useId, useRef, useState } from 'react'

import type { PublicConversation, PublicMessage } from '../server/http'

// The chat as the visitor sees it: a cobalt block where the request form stood. Inline on a desktop column; on a
// phone the first tap into the field opens the same thread full-screen in a native <dialog>. State is one array of
// messages: the assistant streams into it over fetch (POST …/message, SSE body), a person's replies and status
// changes arrive over EventSource (GET …/events). No model call happens until the visitor writes.

export type ChatPanelProps = {
  page: string
  kind: string
  /** The thread this panel belongs to (one open conversation per visitor and thread). */
  thread: string
  context?: Record<string, string>
  kicker: string
  title: string
  intro: string
  chips: string[]
  /** Where to go without JavaScript or when the chat is down. */
  fallbackHref: string
  api?: string
}

export const OPEN_EVENT = 'hl:chat-open'
const TEMP_ID = 1e9

type Role = PublicMessage['role']
const WHO: Record<Role, string> = { visitor: 'Ви', assistant: 'Глина · помічник', human: 'Людина з Глини', system: '' }

const timeOf = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
}

const URL_RE = /https?:\/\/[^\s<>()«»"']+[^\s<>()«»"'.,:;!?]/g
/** «1 600 грн» and «3–8 тижнів» stay on one line. */
const tidy = (t: string) => t.replace(/(\d)\s(?=\d{3}(?!\d))/g, '$1\u00a0').replace(/(\d)\s(грн|тижн|год|хв|осіб|шт)/g, '$1\u00a0$2')
function Linked({ text: raw }: { text: string }) {
  const text = tidy(raw)
  const out: React.ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(URL_RE)) {
    const i = m.index ?? 0
    if (i > last) out.push(text.slice(last, i))
    const href = m[0]
    let label = href.replace(/^https?:\/\//, '')
    if (label.length > 48) label = `${label.slice(0, 46)}…`
    out.push(
      <a key={i} href={href} target={href.startsWith(location.origin) ? undefined : '_blank'} rel="noopener">
        {label}
      </a>,
    )
    last = i + href.length
  }
  out.push(text.slice(last))
  return <>{out}</>
}

/** Reads an SSE body from fetch: `event:` + `data:` blocks, one callback per block. */
async function readSse(res: Response, onEvent: (event: string, data: unknown) => void) {
  const reader = res.body?.getReader()
  if (!reader) return
  const dec = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let i: number
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, i)
      buf = buf.slice(i + 2)
      let event = 'message'
      let data = ''
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data += line.slice(5).trim()
      }
      if (!data) continue
      try {
        onEvent(event, JSON.parse(data))
      } catch {}
    }
  }
}

const isPhone = () => typeof window !== 'undefined' && !window.matchMedia('(min-width: 60rem)').matches

export function ChatPanel(p: ChatPanelProps) {
  const api = p.api ?? '/api/chat'
  const uid = useId()
  const [conv, setConv] = useState<PublicConversation | null>(null)
  const [messages, setMessages] = useState<PublicMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [streaming, setStreaming] = useState<string | null>(null) // null: not answering; '': answering, nothing yet
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [contactDraft, setContactDraft] = useState('')
  const [contactBusy, setContactBusy] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const inlineArea = useRef<HTMLTextAreaElement>(null)
  const dialogArea = useRef<HTMLTextAreaElement>(null)
  const inlineScroll = useRef<HTMLDivElement>(null)
  const dialogScroll = useRef<HTMLDivElement>(null)
  const lastId = useRef(0)
  const restored = useRef(false)
  const seenState = useRef<{ waiting: boolean; contact: boolean; request: boolean }>({ waiting: false, contact: false, request: false })

  // GA4 when the host's tag is on the page (window.gtag); never personal data.
  const track = useCallback((name: string, params?: Record<string, string | number | undefined>) => {
    const gtag = (window as { gtag?: (...args: unknown[]) => void }).gtag
    gtag?.('event', name, params)
  }, [])
  const busy = sending || streaming !== null

  // ---------- state helpers
  const append = useCallback((m: PublicMessage) => {
    setMessages((prev) => {
      if (prev.some((x) => x.id === m.id)) return prev
      // The stored copy of a line shown optimistically (temp id) replaces it, whichever stream brings it first.
      const rest = m.role === 'visitor' ? prev.filter((x) => !(x.id >= TEMP_ID && x.role === 'visitor' && x.text === m.text)) : prev
      return [...rest, m].sort((a, b) => a.id - b.id)
    })
    if (m.id > lastId.current && m.id < TEMP_ID) lastId.current = m.id
  }, [])
  const applyState = useCallback(
    (c: PublicConversation) => {
      setConv(c)
      const s = seenState.current
      if (c.status === 'waiting' && !s.waiting) {
        s.waiting = true
        track('chat_handoff', { page_kind: p.kind })
      }
      if (c.hasContact && !s.contact) {
        s.contact = true
        track('chat_contact', { page_kind: p.kind })
      }
      if (c.requestId && !s.request) {
        s.request = true
        track('chat_request', { page_kind: p.kind })
      }
    },
    [p.kind, track],
  )

  // ---------- restore an open conversation (cookie) once
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    fetch(`${api}/current?thread=${encodeURIComponent(p.thread)}`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { conversation: PublicConversation | null; messages?: PublicMessage[] } | null) => {
        if (!d?.conversation) return
        applyState(d.conversation)
        for (const m of d.messages ?? []) append(m)
      })
      .catch(() => {})
  }, [api, append, applyState, p.thread])

  // ---------- a person's replies and status, while there is a conversation
  useEffect(() => {
    if (!conv) return
    let es: EventSource | null = null
    let stopped = false
    const connect = () => {
      if (stopped) return
      es = new EventSource(`${api}/${conv.id}/events?after=${lastId.current}`)
      es.addEventListener('message', (e) => append(JSON.parse((e as MessageEvent).data)))
      es.addEventListener('state', (e) => applyState(JSON.parse((e as MessageEvent).data)))
      es.onerror = () => {
        es?.close()
        if (!stopped) setTimeout(connect, 4000)
      }
    }
    connect()
    return () => {
      stopped = true
      es?.close()
    }
  }, [api, conv?.id, append, applyState]) // eslint-disable-line react-hooks/exhaustive-deps -- reconnect only when the conversation changes

  // ---------- scrolling: the newest line stays in view
  useEffect(() => {
    for (const el of [inlineScroll.current, dialogScroll.current]) if (el) el.scrollTop = el.scrollHeight
  }, [messages, streaming, expanded])

  // ---------- phone: open and close the full-screen dialog
  const openDialog = useCallback(() => {
    const d = dialog.current
    if (!d || d.open || !isPhone()) return
    d.showModal()
    document.body.style.overflow = 'hidden'
    setExpanded(true)
    track('chat_open', { page_kind: p.kind, where: 'phone' })
    setTimeout(() => dialogArea.current?.focus({ preventScroll: true }), 50)
  }, [p.kind, track])
  const closeDialog = useCallback(() => {
    dialog.current?.close()
  }, [])
  const onDialogClose = () => {
    document.body.style.overflow = ''
    setExpanded(false)
  }
  const fromBar = useEffectEvent(() => {
    if (isPhone()) openDialog()
    else inlineArea.current?.focus()
  })
  useEffect(() => {
    const h = () => fromBar()
    window.addEventListener(OPEN_EVENT, h)
    return () => window.removeEventListener(OPEN_EVENT, h)
  }, [])

  // ---------- sending
  const send = useCallback(
    async (text: string) => {
      const clean = text.trim()
      if (!clean || busy) return
      setError(null)
      setDraft('')
      for (const el of [inlineArea.current, dialogArea.current]) if (el) el.style.height = 'auto'
      setSending(true)
      try {
        let c = conv
        if (!c) {
          const r = await fetch(`${api}/open`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ page: p.page, kind: p.kind, thread: p.thread, context: p.context ?? {} }) })
          if (!r.ok) throw new Error('open')
          const d = (await r.json()) as { conversation: PublicConversation; messages: PublicMessage[] }
          c = d.conversation
          applyState(c)
          for (const m of d.messages) append(m)
          track('chat_open', { page_kind: p.kind, where: 'first_message' })
        }
        if (!messages.some((m) => m.role === 'visitor')) track('chat_first_message', { page_kind: p.kind })
        const temp: PublicMessage = { id: TEMP_ID + Date.now(), role: 'visitor', text: clean, at: new Date().toISOString() }
        setMessages((prev) => [...prev, temp])
        setStreaming('')
        const res = await fetch(`${api}/${c.id}/message`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: clean, page: p.page }) })
        if (!res.ok) {
          const d = (await res.json().catch(() => ({}))) as { error?: string }
          setMessages((prev) => prev.filter((m) => m.id !== temp.id))
          setStreaming(null)
          setError(d.error ?? 'Не вдалося надіслати. Спробуйте ще раз.')
          return
        }
        let acc = ''
        await readSse(res, (event, data) => {
          if (event === 'delta') {
            acc += (data as { text: string }).text
            setStreaming(acc)
          } else if (event === 'visitor') {
            append(data as PublicMessage)
          } else if (event === 'done') {
            const d = data as { assistant: PublicMessage | null; conversation: PublicConversation }
            if (d.assistant) append(d.assistant)
            applyState(d.conversation)
          } else if (event === 'error') {
            setError((data as { error: string }).error)
          }
        })
        setStreaming(null)
      } catch {
        setStreaming(null)
        setError('Зв’язок перервався. Спробуйте ще раз.')
      } finally {
        setSending(false)
      }
    },
    [api, append, applyState, busy, conv, messages, p.context, p.kind, p.page, p.thread, track],
  )

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void send(draft)
    }
  }
  const autosize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const show = (d: { conversation: PublicConversation; messages: PublicMessage[] }) => {
    setStreaming(null)
    setError(null)
    setMessages([])
    lastId.current = 0
    seenState.current = { waiting: false, contact: false, request: false }
    applyState(d.conversation)
    for (const m of d.messages) append(m)
  }
  /** «＋ нова»: a fresh thread for this page; the old ones stay in the list. */
  const startNew = async () => {
    if (busy) return
    const r = await fetch(`${api}/open`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ page: p.page, kind: p.kind, thread: p.thread, fresh: true, context: p.context ?? {} }) }).catch(() => null)
    if (r?.ok) show((await r.json()) as { conversation: PublicConversation; messages: PublicMessage[] })
  }
  /** Another thread from the list, shown here without leaving the page. */
  const openThread = async (id: string) => {
    if (busy || id === conv?.id) return
    const r = await fetch(`${api}/${id}`, { credentials: 'same-origin' }).catch(() => null)
    if (r?.ok) show((await r.json()) as { conversation: PublicConversation; messages: PublicMessage[] })
  }

  const saveContact = async () => {
    if (!conv || contactBusy) return
    const value = contactDraft.trim()
    if (value.length < 4) return
    setContactBusy(true)
    try {
      const type = /@.+\./.test(value) && !value.startsWith('@') ? 'email' : value.startsWith('@') ? 'telegram' : 'phone'
      const r = await fetch(`${api}/${conv.id}/contact`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type, value }) })
      if (!r.ok) {
        setError('Перевірте контакт.')
        return
      }
      const d = (await r.json()) as { conversation: PublicConversation; message: PublicMessage }
      applyState(d.conversation)
      append(d.message)
      setContactDraft('')
    } finally {
      setContactBusy(false)
    }
  }

  // ---------- pieces
  const status =
    !conv || conv.status === 'ai'
      ? conv?.humanOnline
        ? 'Помічник відповідає одразу · людина з Глини на зв’язку'
        : 'Помічник відповідає одразу · людина з Глини підключиться, якщо треба'
      : conv.status === 'waiting'
        ? conv.humanOnline
          ? 'Чекаємо людину з Глини, вона на зв’язку'
          : 'Передано людині з Глини, відповість сьогодні'
        : conv.status === 'human'
          ? 'Людина з Глини на зв’язку'
          : 'Розмову завершено. Напишіть, якщо з’явиться питання'
  const hasThread = messages.length > 0 || streaming !== null
  // The page's greeting opens only its own thread; another thread shown here starts with its own lines.
  const ownThread = !conv || conv.thread === p.thread
  const threads = conv?.threads ?? []
  // An empty thread is «нова»; two threads with one name are told apart by their time.
  const labelOf = (t: { id: string; label: string; at: string; count: number }) => (t.count === 0 ? `${t.label} · нова` : threads.filter((x) => x.label === t.label && x.count > 0).length > 1 ? `${t.label} · ${timeOf(t.at)}` : t.label)

  const opener = (
    <li className="hl-chat-row" data-role="assistant">
      <div className="hl-chat-who">{WHO.assistant}</div>
      <p className="hl-chat-text">
        <span>{p.title}</span> {p.intro}
      </p>
    </li>
  )

  const thread = (
    <ol className="hl-chat-thread m-0 list-none p-0" aria-live="polite" aria-relevant="additions">
      {ownThread && opener}
      {messages.map((m) => (
        <li key={m.id} className="hl-chat-row" data-role={m.role}>
          {m.role !== 'system' && (
            <div className="hl-chat-who">
              {WHO[m.role]} · {timeOf(m.at)}
            </div>
          )}
          <p className="hl-chat-text">
            <Linked text={m.text} />
          </p>
        </li>
      ))}
      {streaming !== null && (
        <li className="hl-chat-row" data-role="assistant">
          <div className="hl-chat-who">
            {WHO.assistant}
            {streaming === '' && (
              <span className="hl-chat-dots" aria-label="пише">
                <i />
                <i />
                <i />
              </span>
            )}
          </div>
          {streaming !== '' && (
            <p className="hl-chat-text">
              <Linked text={streaming} />
              <span className="hl-chat-cursor" aria-hidden />
            </p>
          )}
        </li>
      )}
    </ol>
  )

  const waitingExtras = conv && (conv.status === 'waiting' || conv.status === 'human') && (
    <div className="grid gap-2.5">
      {conv.telegramLink && !conv.telegram && (
        <a href={conv.telegramLink} target="_blank" rel="noopener" className="ui-btn" data-variant="paper" data-size="sm" onClick={() => track('chat_telegram', { page_kind: p.kind })}>
          Продовжити в Telegram <span className="ui-arrow" aria-hidden>→</span>
        </a>
      )}
      {!conv.hasContact && (
        <form
          className="hl-chat-composer"
          onSubmit={(e) => {
            e.preventDefault()
            void saveContact()
          }}
        >
          <textarea rows={1} value={contactDraft} onChange={(e) => setContactDraft(e.target.value)} placeholder="Телефон, @telegram або пошта" aria-label="Контакт для відповіді" inputMode="text" autoComplete="tel" />
          <button type="submit" className="ui-btn" data-variant="ink" data-size="sm" disabled={contactBusy || contactDraft.trim().length < 4}>
            Зберегти
          </button>
        </form>
      )}
    </div>
  )

  const composer = (ref: React.RefObject<HTMLTextAreaElement | null>, where: 'inline' | 'dialog') => (
    <form
      className="hl-chat-composer"
      onSubmit={(e) => {
        e.preventDefault()
        void send(draft)
      }}
    >
      <textarea
        ref={ref}
        id={`${uid}-${where}`}
        name="text"
        rows={1}
        value={draft}
        placeholder={conv?.status === 'human' ? 'Людині з Глини…' : 'Повідомлення…'}
        aria-label="Ваше повідомлення"
        maxLength={2000}
        onChange={(e) => {
          setDraft(e.target.value)
          autosize(e.target)
        }}
        onKeyDown={onKey}
        onFocus={where === 'inline' ? openDialog : undefined}
        disabled={busy && where === 'inline' && expanded}
      />
      <button type="submit" className="ui-btn" data-variant="ink" disabled={busy} aria-label="Надіслати">
        {busy ? '…' : (
          <>
            <span className="max-sm:hidden">Надіслати</span>
            <span className="sm:hidden" aria-hidden>→</span>
          </>
        )}
      </button>
    </form>
  )

  const chips = !hasThread && p.chips.length > 0 && (
    <div className="hl-chips">
      {p.chips.map((c) => (
        <button key={c} type="button" className="hl-chip" onClick={() => void send(c)} disabled={busy}>
          {c}
        </button>
      ))}
    </div>
  )

  const errorLine = error && (
    <p className="m-0 text-[13px] text-peach" role="alert">
      {error}{' '}
      <a href={p.fallbackHref} className="underline underline-offset-[3px]">
        Форма запиту
      </a>
    </p>
  )

  // The thread list: this page's thread and the others, switched here; «＋ нова» starts another on this page.
  const threadRow = conv && threads.length > 0 && (
    <nav className="hl-threads" aria-label="Ваші розмови">
      {threads.map((t) => (
        <button key={t.id} type="button" className="hl-thread" aria-current={t.id === conv.id ? 'true' : undefined} onClick={() => void openThread(t.id)} disabled={busy}>
          {labelOf(t)}
        </button>
      ))}
      {messages.length > 0 && (
        <button type="button" className="hl-thread" data-new="" onClick={() => void startNew()} disabled={busy}>
          + нова
        </button>
      )}
    </nav>
  )

  const footNote = (
    <p className="hl-chat-note m-0">
      Для замовника безкоштовно · <a href={p.fallbackHref}>форма замість чату</a>
    </p>
  )

  return (
    <>
      <section id="zapyt-forma" data-chat="" data-tone="cobalt" aria-label="Чат з Глиною" className="group/tone grid gap-3.5 bg-cobalt p-[clamp(18px,2.4vw,28px)] text-paper">
        <header className="grid gap-2 border-b border-rule-on-dark pb-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="font-mono text-kicker leading-[1.4] uppercase text-paper">{p.kicker}</span>
            <span className="hl-chat-note">{status}</span>
          </div>
          {threadRow}
        </header>
        <div ref={inlineScroll} className={hasThread ? 'hl-chat-scroll' : undefined}>
          {thread}
        </div>
        {chips}
        {!expanded && waitingExtras}
        {composer(inlineArea, 'inline')}
        {errorLine}
        {footNote}
        <noscript>
          <p className="m-0 text-[15px]">
            Чат працює з JavaScript. <a href={p.fallbackHref} className="underline">Напишіть через форму запиту</a>.
          </p>
        </noscript>
      </section>

      <dialog ref={dialog} className="hl-chat-dlg" aria-label="Чат з Глиною" onClose={onDialogClose}>
        {expanded && (
          <>
            <div className="hl-chat-dlg-top">
              <div className="grid min-w-0 gap-0.5">
                <strong className="truncate font-display text-[15px] font-semibold">{p.kicker}</strong>
                <span className="hl-chat-note truncate">{status}</span>
              </div>
              <button type="button" onClick={closeDialog}>
                Закрити
              </button>
            </div>
            {threadRow && <div className="px-gutter pt-2">{threadRow}</div>}
            <div ref={dialogScroll} className="hl-chat-dlg-body">
              {thread}
              {chips && <div className="mt-3">{chips}</div>}
            </div>
            <div className="hl-chat-dlg-foot">
              {waitingExtras}
              {composer(dialogArea, 'dialog')}
              {errorLine}
            </div>
          </>
        )}
      </dialog>
    </>
  )
}
