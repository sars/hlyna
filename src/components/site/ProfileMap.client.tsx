'use client'

import React, { useEffect, useRef, useState } from 'react'

import { MapFrame } from '@/components/ui/MapFrame'

// Small map with one marker on a studio profile. MapLibre and the tiles load only when the block is
// near the viewport. The address stands once, in the block's note: the placeholder does not repeat it.
export function ProfileMap({ lat, lng }: { lat: number; lng: number }) {
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
        new maplibregl.Marker({ color: '#1d3ec6' }).setLngLat([lng, lat]).addTo(m)
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
    <MapFrame height="profile" fallback={state === 'failed' ? 'Мапа не відкрилася в цьому браузері' : undefined}>
      <div ref={box} className="h-full w-full" aria-label="Мапа з позначкою студії" role="img" />
    </MapFrame>
  )
}
