'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as MlMap, Marker } from 'maplibre-gl'

import { t } from '@/components/panel/lib/i18n'

// A small map with one marker for the studio editor. MapLibre (≈270 KB gz) is imported only when this box scrolls
// into view, and only inside the panel bundle. Same free tiles as the site (OpenFreeMap).

const STYLE = 'https://tiles.openfreemap.org/styles/positron'

export function MapPreview({ lat, lng, onMove }: { lat: number; lng: number; onMove?: (lat: number, lng: number) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MlMap | null>(null)
  const marker = useRef<Marker | null>(null)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const moveRef = useRef(onMove)
  useEffect(() => {
    moveRef.current = onMove
  }, [onMove])

  useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setVisible(true), { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || map.current || !box.current) return
    let cancelled = false
    void (async () => {
      const [{ default: maplibregl }] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')])
      if (cancelled || !box.current) return
      let m: MlMap
      try {
        m = new maplibregl.Map({ container: box.current, style: STYLE, center: [lng, lat], zoom: 15, attributionControl: { compact: true }, cooperativeGestures: true })
      } catch {
        setFailed(true) // no WebGL (old phone, locked-down browser): coordinates stay editable above
        return
      }
      m.on('load', () => setLoading(false))
      const mk = new maplibregl.Marker({ draggable: Boolean(moveRef.current), color: '#b4683f' }).setLngLat([lng, lat]).addTo(m)
      mk.on('dragend', () => {
        const p = mk.getLngLat()
        moveRef.current?.(Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6)))
      })
      map.current = m
      marker.current = mk
    })()
    return () => {
      cancelled = true
    }
    // the map is created once; later coordinate changes move it (next effect)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  useEffect(() => {
    marker.current?.setLngLat([lng, lat])
    map.current?.easeTo({ center: [lng, lat] })
  }, [lat, lng])

  useEffect(() => () => map.current?.remove(), [])

  return (
    <div className="relative h-56 overflow-hidden rounded-lg border bg-muted md:h-64">
      <div ref={box} className="h-full w-full" />
      {(loading || failed) && <p className="absolute inset-0 grid place-items-center px-4 text-center text-xs text-muted-foreground">{failed ? t('editor.mapUnavailable') : t('editor.mapLoading')}</p>}
    </div>
  )
}
