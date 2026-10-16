'use client'

import Link from 'next/link'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { cx } from '@/components/ui/layout'
import type { KabinetPhoto, PhotosOk, SectionState, StudioSummary } from '@/shared/kabinet'
import { MAX_OWNER_PHOTOS } from '@/shared/options'

import { SaveBar } from './SaveBar'
import { looksLikeImage, prepareImage } from './photoProcess'

type Phase = 'waiting' | 'processing' | 'heic' | 'uploading' | 'error'
type PhotoTile = { key: string; kind: 'photo'; photo: KabinetPhoto; removed: boolean }
type UploadTile = { key: string; kind: 'upload'; file: File; ready: File | null; preview: string | null; phase: Phase; progress: number; error: string; retry: boolean }
type Tile = PhotoTile | UploadTile

const ORDINAL = ['перше', 'друге', 'третє', 'четверте', 'п’яте', 'шосте', 'сьоме', 'восьме', 'дев’яте', 'десяте']
const NOT_A_PHOTO = 'Це не фото. Підійдуть JPG, PNG, HEIC'
const ACTIVE: Phase[] = ['waiting', 'processing', 'heic', 'uploading']

type Problem = { kind: 'net' } | { kind: 'fail'; text: string; login?: boolean }

/** Static states for /dev/styleguide: photos shown as removed (by index) and upload tiles frozen in a phase. */
type PreviewStates = { removed?: number[]; uploads?: { phase: Phase; progress?: number; url?: string }[] }

const photoTile = (photo: KabinetPhoto): PhotoTile => ({ key: `p${photo.id}`, kind: 'photo', photo, removed: false })
const isPhoto = (t: Tile): t is PhotoTile => t.kind === 'photo'
const isUpload = (t: Tile): t is UploadTile => t.kind === 'upload'
const count = (n: number) => `${n} фото`

type UploadResult = { ok: true; data: PhotosOk & { photo: KabinetPhoto } } | { ok: false; status: number; error: string } | { aborted: true }

function upload(url: string, file: File, onProgress: (p: number) => void, register: (xhr: XMLHttpRequest) => void): Promise<UploadResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    register(xhr)
    xhr.open('POST', url)
    xhr.responseType = 'json'
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => {
      const body = (xhr.response ?? {}) as Partial<PhotosOk & { photo: KabinetPhoto }> & { error?: string }
      if (xhr.status >= 200 && xhr.status < 300 && body.photo && body.photos && body.studio) resolve({ ok: true, data: body as PhotosOk & { photo: KabinetPhoto } })
      else resolve({ ok: false, status: xhr.status, error: body.error ?? '' })
    }
    xhr.onerror = () => resolve({ ok: false, status: 0, error: '' })
    xhr.onabort = () => resolve({ aborted: true })
    const form = new FormData()
    form.append('file', file)
    xhr.send(form)
  })
}

/**
 * The «Фото» section. Every action saves at once: a file is shrunk in the browser and uploaded as soon as it is picked
 * (one after another), remove / restore / reorder / make main send the whole order. Reorder by drag (mouse; long press on
 * touch) or with ← → and Home on a focused photo. Everything that changes the list on the server (an upload, which
 * appends to it, and the order PUTs) goes through one queue, so no two of those requests are ever in flight together.
 */
export function PhotoManager({ slug, initial, sectionState, onStudio: setStudio, preview }: { slug: string; initial: KabinetPhoto[]; sectionState?: SectionState; onStudio: (studio: StudioSummary) => void; preview?: PreviewStates }) {
  const max = MAX_OWNER_PHOTOS
  const base = `/kabinet/api/studio/${slug}/photos`
  const [tiles, setTilesState] = useState<Tile[]>(() => [
    ...initial.map((p, i) => ({ ...photoTile(p), removed: !!preview?.removed?.includes(i) })),
    ...(preview?.uploads ?? []).map((u, i): UploadTile => ({ key: `demo${i}`, kind: 'upload', file: new File([], 'demo.jpg'), ready: null, preview: u.url ?? null, phase: u.phase, progress: u.progress ?? 0, error: u.phase === 'error' ? 'Не вдалося завантажити' : '', retry: u.phase === 'error' })),
  ])
  const tilesRef = useRef<Tile[]>(tiles)
  const setTiles = useCallback((fn: (t: Tile[]) => Tile[]) => {
    tilesRef.current = fn(tilesRef.current)
    setTilesState(tilesRef.current)
  }, [])
  const [problem, setProblem] = useState<Problem | null>(null)
  const [notice, setNotice] = useState('')
  const [announce, setAnnounce] = useState('')
  const [saves, setSaves] = useState(0)
  const [batch, setBatch] = useState({ total: 0, done: 0 })
  const [captionFor, setCaptionFor] = useState<number | null>(null)
  const [captions, setCaptions] = useState<Record<number, string>>({})
  const [over, setOver] = useState(false)
  const [drag, setDrag] = useState<{ x: number; y: number; url: string; to: number | null; from: number } | null>(null)
  const uid = React.useId()
  const inputId = `${uid}-file`
  const grid = useRef<HTMLUListElement>(null)
  const focusKey = useRef<string | null>(null)
  const xhrs = useRef(new Map<string, XMLHttpRequest>())
  const queue = useRef<Promise<void>>(Promise.resolve())
  const prep = useRef<Promise<void>>(Promise.resolve())
  const putState = useRef<'idle' | 'wait' | 'queued'>('idle')
  const putTimer = useRef<number | null>(null)
  // Uploads cancelled after the server had the whole file (their photo is taken off the list when the answer comes), and ids to keep «known» to the next PUT.
  const cancelled = useRef(new Set<string>())
  const extraKnown = useRef(new Set<number>())
  const capField = useRef<HTMLDivElement>(null)
  const capInput = useRef<HTMLInputElement>(null)
  const skipBlur = useRef(false)
  const dragState = useRef<{ key: string; sx: number; sy: number; x: number; y: number; touch: boolean; active: boolean; timer: number | null; scroller: number | null; from: number; to: number | null } | null>(null)

  const photos = tiles.filter(isPhoto)
  const shown = photos.filter((t) => !t.removed)
  const uploads = tiles.filter(isUpload)
  const inFlight = uploads.filter((t) => ACTIVE.includes(t.phase))
  const failed = uploads.filter((t) => t.phase === 'error' && t.retry)
  const used = shown.length + inFlight.length
  const full = used >= max
  const reviewCount = shown.filter((t) => t.photo.state === 'review').length
  const busy = saves > 0 || inFlight.length > 0

  // Leaving while a file is on its way or a change is not yet sent loses it.
  useEffect(() => {
    if (!busy) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy])

  // A caption field that has just opened is brought to the middle of the screen (clear of the sticky bar) with the cursor in it.
  useEffect(() => {
    if (captionFor === null) return
    capField.current?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    capInput.current?.focus({ preventScroll: true })
  }, [captionFor])

  useEffect(() => {
    if (!focusKey.current) return
    const el = document.querySelector<HTMLElement>(`[data-tile="${focusKey.current}"]`)
    focusKey.current = null
    el?.focus()
  })

  // Touch drag: once a long press has armed it, the page must not scroll under the finger.
  useEffect(() => {
    const stop = (e: TouchEvent) => dragState.current?.active && e.cancelable && e.preventDefault()
    document.addEventListener('touchmove', stop, { passive: false })
    const urls = tilesRef
    return () => {
      document.removeEventListener('touchmove', stop)
      for (const t of urls.current) if (isUpload(t) && t.preview) URL.revokeObjectURL(t.preview)
    }
  }, [])

  const patchUpload = useCallback((key: string, patch: Partial<UploadTile>) => setTiles((ts) => ts.map((t) => (t.key === key && isUpload(t) ? { ...t, ...patch } : t))), [setTiles])

  // Merge the server's list into what is on screen (fields of known photos; the local order and removed tiles stay).
  // A photo the page has no tile for (added meanwhile, e.g. from another tab) comes in after the last photo.
  const mergeServer = useCallback(
    (list: KabinetPhoto[]) =>
      setTiles((ts) => {
        const merged = ts.map((t) => (isPhoto(t) ? { ...t, photo: list.find((p) => p.id === t.photo.id) ?? t.photo } : t))
        const have = new Set(merged.filter(isPhoto).map((t) => t.photo.id))
        const extra = list.filter((p) => !have.has(p.id)).map(photoTile)
        if (!extra.length) return merged
        merged.splice(merged.map(isPhoto).lastIndexOf(true) + 1, 0, ...extra)
        return merged
      }),
    [setTiles],
  )

  const failProblem = useCallback((status: number, error: string) => {
    setProblem(status === 401 ? { kind: 'fail', text: 'Сеанс завершився.', login: true } : { kind: 'fail', text: error || 'Не вдалося зберегти. Спробуйте ще раз.' })
  }, [])

  // One queue for the requests that change the photo list: each job starts when the one before it has answered.
  const enqueue = useCallback((job: () => Promise<void>) => {
    queue.current = queue.current.then(job).catch(() => undefined)
  }, [])

  // The server refused the order (the review was closed meanwhile, a photo is gone): show what it has now.
  const resync = useCallback(async () => {
    try {
      const res = await fetch(base)
      const json = (await res.json().catch(() => ({}))) as Partial<PhotosOk> & { error?: string }
      if (res.ok && json.photos && json.studio) {
        extraKnown.current.clear()
        setTiles((ts) => [...json.photos!.map(photoTile), ...ts.filter(isUpload)])
        setStudio(json.studio)
        setNotice('Список фото оновився — перевірте порядок.')
      } else failProblem(res.status, json.error ?? '')
    } catch {
      setProblem({ kind: 'net' })
    }
  }, [base, setTiles, setStudio, failProblem])

  // Sends the whole order as it is when the request's turn comes; repeated calls before that make one request. Keyboard
  // moves wait half a second so a run of arrow presses is one request.
  const persistOrder = useCallback(
    (delay = 0) => {
      setProblem(null)
      if (putState.current === 'queued') return
      if (putState.current === 'wait') {
        if (putTimer.current) window.clearTimeout(putTimer.current)
      } else setSaves((n) => n + 1)
      putState.current = 'wait'
      putTimer.current = window.setTimeout(() => {
        putTimer.current = null
        putState.current = 'queued'
        enqueue(async () => {
          putState.current = 'idle'
          const ps = tilesRef.current.filter(isPhoto)
          const order = ps.filter((t) => !t.removed).map((t) => t.photo.id)
          const known = [...new Set([...ps.map((t) => t.photo.id), ...extraKnown.current])]
          try {
            const res = await fetch(base, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order, known }) })
            const json = (await res.json().catch(() => ({}))) as Partial<PhotosOk> & { error?: string }
            if (res.ok && json.photos && json.studio) {
              extraKnown.current.clear()
              mergeServer(json.photos)
              setStudio(json.studio)
            } else if (res.status === 400) await resync()
            else failProblem(res.status, json.error ?? '')
          } catch {
            setProblem({ kind: 'net' })
          } finally {
            setSaves((n) => n - 1)
          }
        })
      }, delay)
    },
    [base, enqueue, mergeServer, resync, setStudio, failProblem],
  )

  // Sends one prepared file (the server appends it to the list, so this runs in the queue).
  const send = useCallback(
    async (key: string) => {
      const get = () => tilesRef.current.find((t): t is UploadTile => t.key === key && isUpload(t))
      const t = get()
      if (!t?.ready || t.phase !== 'waiting') return
      patchUpload(key, { phase: 'uploading', progress: 0, preview: t.preview ?? URL.createObjectURL(t.ready) })
      const res = await upload(base, t.ready, (progress) => patchUpload(key, { progress }), (xhr) => xhrs.current.set(key, xhr))
      xhrs.current.delete(key)
      const gone = cancelled.current.delete(key)
      if ('aborted' in res) return
      if (gone) {
        // «Скасувати» came after the server had the whole file: it saved the photo, so send the order without it.
        if (res.ok && !tilesRef.current.some((x) => isPhoto(x) && x.photo.id === res.data.photo.id)) {
          extraKnown.current.add(res.data.photo.id)
          persistOrder()
        }
        return
      }
      if (!res.ok) {
        if (res.status === 401) failProblem(401, '')
        // A 400 means the server refused this file: trying the same file again is pointless.
        patchUpload(key, { phase: 'error', error: res.status === 400 && res.error && res.error.length <= 70 ? res.error : 'Не вдалося завантажити', retry: res.status !== 400 })
        return
      }
      const { photo, photos: list, studio: next } = res.data
      setTiles((ts) => {
        const old = ts.find((x) => x.key === key)
        if (old && isUpload(old) && old.preview) URL.revokeObjectURL(old.preview)
        const rest = ts.filter((x) => x.key !== key).map((x) => (isPhoto(x) ? { ...x, photo: list.find((p) => p.id === x.photo.id) ?? x.photo } : x))
        // The same picture picked again comes back as the photo that is already there: show that one, do not add a copy.
        if (rest.some((x) => isPhoto(x) && x.photo.id === photo.id)) return rest.map((x) => (isPhoto(x) && x.photo.id === photo.id ? { ...x, photo, removed: false } : x))
        // The server appends new photos in the order they arrive: put the tile after the last photo, before waiting uploads.
        const lastPhoto = rest.map(isPhoto).lastIndexOf(true)
        const out = rest.slice()
        out.splice(lastPhoto + 1, 0, photoTile(photo))
        return out
      })
      setStudio(next)
      setBatch((b) => ({ ...b, done: b.done + 1 }))
    },
    [base, patchUpload, setTiles, setStudio, failProblem, persistOrder],
  )

  // One file at a time is shrunk (memory), then queued for sending behind whatever the queue is doing.
  const prepare = useCallback(
    async (key: string) => {
      const get = () => tilesRef.current.find((t): t is UploadTile => t.key === key && isUpload(t))
      const t = get()
      if (!t || t.phase !== 'waiting') return
      let ready = t.ready
      if (!ready) {
        patchUpload(key, { phase: 'processing', error: '' })
        try {
          ready = await prepareImage(t.file, () => patchUpload(key, { phase: 'heic' }))
        } catch {
          patchUpload(key, { phase: 'error', error: 'Не вдалося прочитати файл. Спробуйте інший', retry: false })
          if (!tilesRef.current.some((x) => isUpload(x) && ACTIVE.includes(x.phase))) setBatch({ total: 0, done: 0 })
          return
        }
      }
      if (!get()) return // cancelled meanwhile
      patchUpload(key, { ready, phase: 'waiting' })
      enqueue(async () => {
        await send(key)
        if (!tilesRef.current.some((x) => isUpload(x) && ACTIVE.includes(x.phase))) setBatch({ total: 0, done: 0 })
      })
    },
    [patchUpload, enqueue, send],
  )

  const startUpload = useCallback(
    (key: string) => {
      prep.current = prep.current.then(() => prepare(key)).catch(() => undefined)
    },
    [prepare],
  )

  const addFiles = useCallback(
    (files: File[]) => {
      if (!files.length) return
      setProblem(null)
      const images = files.filter(looksLikeImage)
      const others = files.filter((f) => !looksLikeImage(f))
      const taken = tilesRef.current.filter((t) => (isPhoto(t) && !t.removed) || (isUpload(t) && ACTIVE.includes(t.phase))).length
      const free = Math.max(0, max - taken)
      const take = images.slice(0, free)
      if (images.length > free) setNotice(free === 0 ? `У профілі вже ${max} фото — це максимум. Приберіть одне, щоб додати нове.` : `Додали ${free} з ${images.length}: у профілі максимум ${max} фото`)
      else setNotice('')
      const mk = (file: File, phase: Phase, error = ''): UploadTile => ({ key: `u${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind: 'upload', file, ready: null, preview: null, phase, progress: 0, error, retry: false })
      const queued = take.map((f) => mk(f, 'waiting'))
      const add = [...queued, ...others.slice(0, 3).map((f) => mk(f, 'error', NOT_A_PHOTO))]
      if (!add.length) return
      setTiles((ts) => [...ts, ...add])
      if (take.length) setBatch((b) => ({ total: b.total + take.length, done: b.total === 0 ? 0 : b.done }))
      for (const q of queued) startUpload(q.key)
    },
    [max, startUpload, setTiles],
  )

  function retry(key: string) {
    const t = tilesRef.current.find((x): x is UploadTile => x.key === key && isUpload(x))
    if (!t) return
    if (used >= max) return setNotice(`У профілі вже ${max} фото — це максимум. Приберіть одне, щоб додати нове.`)
    setNotice('')
    patchUpload(key, { phase: 'waiting', error: '', progress: 0 })
    setBatch((b) => ({ total: b.total + 1, done: b.done }))
    startUpload(key)
  }

  function dropUpload(key: string) {
    const t = tilesRef.current.find((x): x is UploadTile => x.key === key && isUpload(x))
    if (t?.phase === 'uploading' && t.progress >= 100) cancelled.current.add(key)
    else xhrs.current.get(key)?.abort()
    xhrs.current.delete(key)
    setTiles((ts) => {
      const dropped = ts.find((x) => x.key === key)
      if (dropped && isUpload(dropped) && dropped.preview) URL.revokeObjectURL(dropped.preview)
      return ts.filter((x) => x.key !== key)
    })
    setBatch((b) => (b.total > 0 ? { total: b.total - 1, done: b.done } : b))
  }

  function setRemoved(key: string, removed: boolean) {
    setNotice('')
    setTiles((ts) => ts.map((t) => (t.key === key && isPhoto(t) ? { ...t, removed } : t)))
    focusKey.current = key
    persistOrder()
  }

  // Move a photo tile to another place among the photo tiles; the upload tiles stay behind the photos.
  const move = useCallback(
    (key: string, to: number, delay = 0) => {
      const ps = tilesRef.current.filter(isPhoto)
      const from = ps.findIndex((t) => t.key === key)
      const target = Math.max(0, Math.min(ps.length - 1, to))
      if (from < 0 || from === target) return
      const next = ps.slice()
      const [m] = next.splice(from, 1)
      next.splice(target, 0, m)
      setTiles((ts) => [...next, ...ts.filter(isUpload)])
      const visible = next.filter((t) => !t.removed)
      const n = visible.findIndex((t) => t.key === key)
      const was = ps.filter((t) => !t.removed).findIndex((t) => t.key === key)
      if (n >= 0) setAnnounce(n === 0 ? `Фото ${was + 1} тепер головне` : `Фото ${was + 1} тепер ${ORDINAL[n] ?? n + 1}`)
      focusKey.current = key
      setNotice('')
      persistOrder(delay)
    },
    [persistOrder, setTiles],
  )

  function onKey(e: React.KeyboardEvent, key: string) {
    if (e.target !== e.currentTarget) return
    const i = tilesRef.current.filter(isPhoto).findIndex((t) => t.key === key)
    if (e.key === 'ArrowLeft') move(key, i - 1, 500)
    else if (e.key === 'ArrowRight') move(key, i + 1, 500)
    else if (e.key === 'Home') move(key, 0, 500)
    else return
    e.preventDefault()
  }

  // Pointer drag with a floating copy of the photo; the drop target is the photo under the pointer.
  function onPointerDown(e: React.PointerEvent, t: PhotoTile) {
    if (t.removed || (e.pointerType === 'mouse' && e.button !== 0) || (e.target as HTMLElement).closest('button, input, textarea, a')) return
    const touch = e.pointerType !== 'mouse'
    const from = tilesRef.current.filter(isPhoto).findIndex((x) => x.key === t.key)
    const s = { key: t.key, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, touch, active: false, timer: null as number | null, scroller: null as number | null, from, to: null as number | null }
    dragState.current = s
    const activate = () => {
      s.active = true
      if (touch) navigator.vibrate?.(12)
      setDrag({ x: s.x, y: s.y, url: t.photo.url, to: null, from })
      s.scroller = window.setInterval(() => {
        if (s.y < 70) window.scrollBy(0, -12)
        else if (s.y > window.innerHeight - 70) window.scrollBy(0, 12)
      }, 16)
    }
    if (touch) s.timer = window.setTimeout(activate, 380)
    const end = (commit: boolean) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      if (s.timer) window.clearTimeout(s.timer)
      if (s.scroller) window.clearInterval(s.scroller)
      const to = s.to
      const wasActive = s.active
      dragState.current = null
      setDrag(null)
      if (commit && wasActive && to !== null && to !== from) move(t.key, to)
    }
    const onMove = (ev: PointerEvent) => {
      s.x = ev.clientX
      s.y = ev.clientY
      const dist = Math.hypot(s.x - s.sx, s.y - s.sy)
      if (!s.active) {
        if (touch ? dist > 10 : dist > 5) {
          if (touch) end(false) // the finger moved before the long press: it is a scroll
          else activate()
        }
        if (!s.active) return
      }
      const el = document.elementFromPoint(s.x, s.y)?.closest<HTMLElement>('[data-photo-idx]')
      s.to = el ? Number(el.dataset.photoIdx) : null
      setDrag((d) => (d ? { ...d, x: s.x, y: s.y, to: s.to } : d))
    }
    const onUp = () => end(true)
    const onCancel = () => end(false)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
  }

  async function saveCaption(t: PhotoTile) {
    const value = (captions[t.photo.id] ?? t.photo.caption ?? '').trim()
    if (value === (t.photo.caption ?? '')) return
    setProblem(null)
    setSaves((n) => n + 1)
    try {
      const res = await fetch(`${base}/${t.photo.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caption: value }) })
      const json = (await res.json().catch(() => ({}))) as { photo?: KabinetPhoto; error?: string }
      if (res.ok && json.photo) {
        const p = json.photo
        setTiles((ts) => ts.map((x) => (isPhoto(x) && x.photo.id === p.id ? { ...x, photo: p } : x)))
      } else failProblem(res.status, json.error ?? '')
    } catch {
      setProblem({ kind: 'net' })
    } finally {
      setSaves((n) => n - 1)
    }
  }

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []))
    e.target.value = ''
  }
  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes('Files')

  // Numbers on the tiles: photos in order (without the removed), then the uploads in flight.
  const numbered = [...shown.map((t) => t.key), ...inFlight.map((t) => t.key)]
  const numberOf = (key: string) => numbered.indexOf(key) + 1

  const picker = (variant: 'zone' | 'bottom') => (
    <div className="ui-pz" data-zone={variant === 'zone' ? '' : undefined} data-bottom={variant === 'bottom' ? '' : undefined} data-over={variant === 'zone' && over ? '' : undefined}>
      <label htmlFor={inputId} className="ui-btn ui-pick" data-variant="ghost">
        {variant === 'zone' || shown.length + uploads.length === 0 ? 'Вибрати фото' : 'Додати ще фото'}
      </label>
      {variant === 'zone' ? (
        <p className="ui-pz-hint m-0">або перетягніть сюди · JPG, PNG, HEIC · великі зменшимо самі</p>
      ) : (
        <p className="ui-pz-consent m-0">Завантажуючи фото, ви дозволяєте показ на сайті.</p>
      )}
    </div>
  )

  let status: React.ReactNode
  let tone: 'error' | undefined
  if (problem?.kind === 'net') {
    tone = 'error'
    status = (
      <>
        Не вдалося зберегти — немає зв’язку.{' '}
        <button type="button" onClick={() => persistOrder()}>
          Спробувати ще раз
        </button>
      </>
    )
  } else if (problem) {
    tone = 'error'
    status = problem.login ? (
      <>
        {problem.text} <Link href="/kabinet/vhid">Увійдіть знову</Link>.
      </>
    ) : (
      problem.text
    )
  } else if (busy) {
    status = (
      <>
        Зберігаємо…
        {reviewCount > 0 && (
          <>
            {' '}
            <b>{count(reviewCount)}</b> вже на перевірці
          </>
        )}
      </>
    )
  } else if (notice) status = notice
  else if (failed.length) {
    tone = 'error'
    status = failed.length === 1 ? 'Одне фото не завантажилось — натисніть «Ще раз» на ньому.' : `${failed.length} фото не завантажились — натисніть «Ще раз» на них.`
  } else if (!shown.length) status = 'Фото зберігаються самі, одразу після вибору'
  else if (reviewCount > 0 || sectionState === 'review')
    status = (
      <>
        <b>Збережено</b> · опублікуємо після перевірки
      </>
    )
  else
    status = (
      <>
        <b>Збережено</b> · на сайті
      </>
    )

  const captionTile = photos.find((t) => t.photo.id === captionFor && !t.removed)
  const countLine = inFlight.length ? (
    <>
      Завантажуємо <b>{batch.done} / {Math.max(batch.total, batch.done + inFlight.length)}</b>
    </>
  ) : (
    <>
      <b>{count(shown.length)}</b>
      {shown.length > 0 && <> · {reviewCount > 0 ? 'на перевірці' : 'на сайті'}</>}
    </>
  )

  return (
    <div className="flex flex-1 flex-col">
      <div
        className="ui-photos pb-7"
        onDragOver={(e) => {
          if (!hasFiles(e)) return
          e.preventDefault()
          if (!full) setOver(true)
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false)
        }}
        onDrop={(e) => {
          if (!hasFiles(e)) return
          e.preventDefault()
          setOver(false)
          addFiles(Array.from(e.dataTransfer.files))
        }}
      >
        <input id={inputId} className="ui-pick-input" type="file" accept="image/*,.heic,.heif" multiple disabled={full} onChange={onFiles} />
        <p className="sr-only" aria-live="polite">{announce}</p>

        {tiles.length === 0 && (
          <div className="ui-pempty">
            <h3>У профілі ще немає фото</h3>
            <p>Додайте до {max}: роботи, студію, заняття. Підійдуть знімки просто з телефону — великі й HEIC ми зменшимо самі. Перше стане головним у профілі.</p>
          </div>
        )}

        {!full && picker('zone')}

        {tiles.length > 0 && (
          <>
            <div className="ui-pcount">
              <span>{countLine}</span>
              <span>до {max}</span>
            </div>
            <ul ref={grid} className="ui-pgrid" aria-label="Фото профілю">
              {tiles.map((t) => {
                if (isPhoto(t)) {
                  const n = numberOf(t.key)
                  const photoIdx = photos.findIndex((x) => x.key === t.key)
                  const caption = t.photo.caption
                  const label = t.removed ? 'Фото прибрано' : `Фото ${n} з ${shown.length}${caption ? `: ${caption}` : ''}`
                  const dropSide = drag && drag.to === photoIdx && drag.from !== photoIdx ? (drag.to > drag.from ? 'after' : 'before') : undefined
                  return (
                    <li
                      key={t.key}
                      className="ui-pt"
                      data-tile={t.key}
                      data-photo-idx={photoIdx}
                      data-photo={t.removed ? undefined : ''}
                      data-main={n === 1 && !t.removed ? '' : undefined}
                      data-gone={t.removed ? '' : undefined}
                      data-dragging={drag && drag.from === photoIdx ? '' : undefined}
                      data-drop={dropSide}
                      tabIndex={t.removed ? undefined : 0}
                      aria-label={label}
                      onKeyDown={(e) => onKey(e, t.key)}
                      onPointerDown={(e) => onPointerDown(e, t)}
                    >
                      <div className="ui-pt-im" onContextMenu={(e) => e.preventDefault()}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.photo.url} alt="" draggable={false} />
                        {t.removed ? <span className="ui-pt-lbl">Прибрано</span> : <span className="ui-pt-n">{n === 1 ? 'Головне' : n}</span>}
                        {!t.removed && t.photo.state === 'review' && <span className="ui-pt-st">перевірка</span>}
                      </div>
                      <div className="ui-pt-a">
                        {t.removed ? (
                          <button type="button" data-primary="" onClick={() => setRemoved(t.key, false)}>
                            Повернути
                          </button>
                        ) : (
                          <>
                            {n !== 1 && (
                              <button type="button" data-primary="" onClick={() => move(t.key, 0)}>
                                Головне
                              </button>
                            )}
                            {t.photo.canCaption && (
                              <button type="button" aria-expanded={captionFor === t.photo.id} onClick={() => setCaptionFor(captionFor === t.photo.id ? null : t.photo.id)}>
                                Підпис
                              </button>
                            )}
                            <button type="button" onClick={() => setRemoved(t.key, true)}>
                              Прибрати
                            </button>
                          </>
                        )}
                      </div>
                      {caption && !t.removed && <p className="ui-pt-cap m-0">{caption}</p>}
                    </li>
                  )
                }
                const err = t.phase === 'error'
                return (
                  <li key={t.key} className="ui-pt" data-tile={t.key} aria-label={err ? t.error : `Завантажуємо фото ${numberOf(t.key)}`}>
                    <div className="ui-pt-im" data-busy={!err && t.preview ? '' : undefined} data-err={err ? '' : undefined}>
                      {t.preview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.preview} alt="" draggable={false} />
                      )}
                      {!err && <span className="ui-pt-n">{numberOf(t.key)}</span>}
                      {err ? (
                        <span className="ui-pt-lbl" role="alert">
                          <span>
                            {t.error}
                            {t.retry && (
                              <>
                                <br />
                                <button type="button" onClick={() => retry(t.key)}>
                                  Ще раз
                                </button>
                              </>
                            )}
                          </span>
                        </span>
                      ) : (
                        t.phase !== 'uploading' && <span className="ui-pt-lbl">{t.phase === 'heic' ? 'Зменшуємо HEIC → JPG' : t.phase === 'processing' ? 'Зменшуємо…' : 'Чекає черги'}</span>
                      )}
                      {t.phase === 'uploading' && (
                        <span className="ui-pt-prog" role="progressbar" aria-label="Завантаження" aria-valuemin={0} aria-valuemax={100} aria-valuenow={t.progress}>
                          <i style={{ width: `${t.progress}%` }} />
                        </span>
                      )}
                    </div>
                    <div className="ui-pt-a">
                      <button type="button" onClick={() => dropUpload(t.key)}>
                        {err ? 'Прибрати' : 'Скасувати'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}

        {captionTile && (
          <div className="ui-pt-capf" ref={capField}>
            <label htmlFor={`${inputId}-cap`} className="text-[14px] leading-[1.3] font-medium">
              Підпис до {numberOf(captionTile.key) === 1 ? 'головного фото' : `фото ${numberOf(captionTile.key)}`}
              <span className="ui-opt">необов’язково</span>
            </label>
            <input
              id={`${inputId}-cap`}
              ref={capInput}
              key={captionTile.key}
              className="ui-box"
              data-size="sm"
              autoComplete="off"
              aria-describedby={`${inputId}-cap-h`}
              value={captions[captionTile.photo.id] ?? captionTile.photo.caption ?? ''}
              placeholder="Що на фото: напр. миска після другого випалу"
              onChange={(e) => setCaptions((c) => ({ ...c, [captionTile.photo.id]: e.target.value }))}
              onBlur={() => {
                if (skipBlur.current) skipBlur.current = false
                else void saveCaption(captionTile)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.currentTarget.blur()
                } else if (e.key === 'Escape') {
                  // Closes without saving what was typed; the focus goes back to the tile's «Підпис».
                  e.preventDefault()
                  const id = captionTile.photo.id
                  setCaptions((c) => Object.fromEntries(Object.entries(c).filter(([k]) => Number(k) !== id)))
                  const btn = document.querySelector<HTMLElement>(`[data-tile="${captionTile.key}"] button[aria-expanded]`)
                  if (btn) {
                    skipBlur.current = true
                    btn.focus()
                  }
                  setCaptionFor(null)
                }
              }}
            />
            <span className="ui-hint" id={`${inputId}-cap-h`}>
              Якщо не підпишете — підпише редактор.
            </span>
          </div>
        )}

        {!full && picker('bottom')}
        {full && <p className="ui-pnote m-0">У профілі максимум {max} фото. Приберіть одне, щоб додати нове.</p>}
        {shown.length > 0 && <p className={cx('ui-pnote m-0')}>Порядок — як у профілі: перетягніть фото (на телефоні — утримайте) або виділіть його й натисніть ← →. Підпис необов’язковий — допише редактор.</p>}
        {inFlight.length > 0 && <p className="ui-pnote m-0">Поки вантажиться — можна йти далі: фото доїдуть самі. Помилка стосується лише одного файла; натисніть «Ще раз» або виберіть інший.</p>}
      </div>
      <SaveBar busy={busy} tone={tone} status={status} action={<span className="ui-savebar-n" aria-label={`Фото в профілі: ${used} з ${max}`}>{used} / {max}</span>} />
      {drag && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="ui-pghost" src={drag.url} alt="" style={{ left: drag.x - 48, top: drag.y - 48 }} />
      )}
    </div>
  )
}
