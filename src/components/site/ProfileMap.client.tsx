'use client'

import React, { useEffect, useRef, useState } from 'react'

// Small map with one marker on a studio profile. MapLibre and the tiles load only when the block is
// near the viewport; until then (or without WebGL) the placeholder shows the address text.
export function ProfileMap({ lat, lng, address }: { lat: number; lng: number; address: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const [state, setState] = useState<'idle' | 'ready' | 'failed'>('idle')

  useEffect(() => {
    const el = box.current
    if (!el || near) return
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setNear(true), { rootMargin: '300px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [near])

  useEffect(() => {
    if (!near || !box.current) return
    let map: { remove: () => void } | null = null
    let cancelled = false
    ;(async () => {
      // CSS too is loaded on demand, so profiles without a map (or not scrolled to it) fetch nothing.
      const [{ default: maplibregl }] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')])
      if (cancelled || !box.current) return
      try {
        const m = new maplibregl.Map({
          container: box.current,
          style: 'https://tiles.openfreemap.org/styles/positron',
          center: [lng, lat],
          zoom: 15,
          scrollZoom: false,
          cooperativeGestures: window.innerWidth < 640,
          attributionControl: { compact: window.innerWidth < 640, customAttribution: '© OpenStreetMap contributors' },
        })
        map = m
        m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
        new maplibregl.Marker({ color: '#2a4fa8' }).setLngLat([lng, lat]).addTo(m)
        m.on('load', () => {
          for (const l of m.getStyle().layers) {
            if (l.type === 'symbol' && m.getLayoutProperty(l.id, 'text-field')) m.setLayoutProperty(l.id, 'text-field', ['coalesce', ['get', 'name:uk'], ['get', 'name']])
          }
          box.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
          setState('ready')
        })
      } catch {
        setState('failed')
      }
    })()
    return () => {
      cancelled = true
      map?.remove()
    }
  }, [near, lat, lng])

  return (
    <div className="relative h-[200px] w-full overflow-hidden rounded-2xl border border-line bg-card sm:h-[260px]">
      <div ref={box} className="h-full w-full" aria-label={`Мапа: ${address}`} role="img" />
      {state !== 'ready' && (
        <p className="pointer-events-none absolute inset-0 m-0 grid place-items-center px-6 text-center text-sm text-umber">
          {state === 'failed' ? `Мапа не відкрилася в цьому браузері. Адреса: ${address}` : address}
        </p>
      )}
    </div>
  )
}
