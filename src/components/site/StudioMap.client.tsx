'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import type { GeoJSONSource, Map as MlMap, MapGeoJSONFeature } from 'maplibre-gl'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import type { MapFilter, MapProps } from '@/lib/mapData'

// Map of studios on /mapa. MapLibre + OpenFreeMap tiles (free, no key). The library is loaded after the
// page renders; data comes from /mapa/studios.geojson. Studios with an exact address are clustered points;
// studios known only by town sit together on the town centre (one marker with a count and a list).

type Feature = { type: 'Feature'; geometry: { type: 'Point'; coordinates: [number, number] }; properties: MapProps }
type FC = { type: 'FeatureCollection'; features: Feature[] }

const C = { terra: '#b4683f', cobalt: '#2a4fa8', ochre: '#d9a441', ink: '#2a2018', card: '#fbf3ea' }
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function towns(features: Feature[]): FC {
  const by = new Map<string, Feature[]>()
  for (const f of features) if (!f.properties.precise) by.set(f.properties.citySlug, [...(by.get(f.properties.citySlug) ?? []), f])
  return {
    type: 'FeatureCollection',
    features: [...by.values()].map((fs) => ({
      type: 'Feature',
      geometry: fs[0].geometry,
      properties: { ...fs[0].properties, name: fs[0].properties.city, n: fs.length, list: JSON.stringify(fs.map((f) => [f.properties.slug, f.properties.name, f.properties.type])) } as unknown as MapProps,
    })),
  }
}

export function StudioMap({ filters }: { filters: readonly { key: MapFilter; label: string }[] }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MlMap | null>(null)
  const [all, setAll] = useState<Feature[] | null>(null)
  const [active, setActive] = useState<MapFilter[]>([])
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [city, setCity] = useState<string | null>(null)
  const popupRef = useRef<{ remove: () => void } | null>(null)

  const shown = useMemo(() => (all ?? []).filter((f) => active.every((a) => f.properties.f.includes(a))), [all, active])
  const cityName = city ? all?.find((f) => f.properties.citySlug === city)?.properties.city : undefined
  const inCityShown = city ? shown.filter((f) => f.properties.citySlug === city).length : 0
  const inCityAll = city ? (all ?? []).filter((f) => f.properties.citySlug === city).length : 0

  // ?misto=<city> zooms to a city and opens its entry in the list below; ?f=wheel,kids restores filters.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const c = q.get('misto')
    const f = (q.get('f') ?? '').split(',').filter((k) => filters.some((x) => x.key === k)) as MapFilter[]
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from the URL after hydration */
    if (c) setCity(c)
    if (f.length) setActive(f)
    /* eslint-enable react-hooks/set-state-in-effect */
    if (c) {
      const el = document.getElementById(`misto-${c}`) as HTMLDetailsElement | null
      if (el) el.open = true
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') popupRef.current?.remove()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filters])

  // Keep the filters in the address so a filtered map can be shared.
  useEffect(() => {
    const u = new URL(window.location.href)
    if (active.length) u.searchParams.set('f', active.join(','))
    else u.searchParams.delete('f')
    window.history.replaceState(null, '', u.toString())
  }, [active])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [{ default: maplibregl }, data] = await Promise.all([import('maplibre-gl'), fetch('/mapa/studios.geojson').then((r) => r.json() as Promise<FC>)])
      if (cancelled || !box.current) return
      setAll(data.features)
      let m: MlMap
      try {
        m = new maplibregl.Map({
        container: box.current,
        style: 'https://tiles.openfreemap.org/styles/positron',
        center: [31.2, 48.8],
        zoom: window.innerWidth < 640 ? 4.4 : 5.2,
        attributionControl: { compact: true, customAttribution: '© OpenStreetMap contributors' },
        cooperativeGestures: window.innerWidth < 640,
        })
      } catch {
        setFailed(true) // no WebGL: the list below the map still works
        return
      }
      map.current = m
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
      m.on('load', () => {
        // Place names in Ukrainian where OSM has them (the base style shows local/Latin names).
        for (const l of m.getStyle().layers) {
          if (l.type === 'symbol' && m.getLayoutProperty(l.id, 'text-field')) m.setLayoutProperty(l.id, 'text-field', ['coalesce', ['get', 'name:uk'], ['get', 'name']])
        }
        m.addSource('studios', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterRadius: 42, clusterMaxZoom: 13 })
        m.addSource('towns', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        m.addLayer({ id: 'towns', type: 'circle', source: 'towns', paint: { 'circle-color': C.ochre, 'circle-radius': ['interpolate', ['linear'], ['get', 'n'], 1, 9, 20, 18], 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } })
        m.addLayer({ id: 'towns-n', type: 'symbol', source: 'towns', layout: { 'text-field': ['to-string', ['get', 'n']], 'text-size': 12, 'text-font': ['Noto Sans Bold'] }, paint: { 'text-color': C.ink } })
        m.addLayer({ id: 'clusters', type: 'circle', source: 'studios', filter: ['has', 'point_count'], paint: { 'circle-color': C.terra, 'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 40, 24], 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } })
        m.addLayer({ id: 'clusters-n', type: 'symbol', source: 'studios', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12, 'text-font': ['Noto Sans Bold'] }, paint: { 'text-color': '#fff' } })
        m.addLayer({ id: 'points', type: 'circle', source: 'studios', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': C.cobalt, 'circle-radius': 7, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } })

        const popup = (lngLat: [number, number], html: string) => {
          popupRef.current?.remove()
          const p = new maplibregl.Popup({ maxWidth: '300px', closeButton: true }).setLngLat(lngLat).setHTML(html).addTo(m)
          popupRef.current = p
          return p
        }
        m.on('click', 'clusters', async (e) => {
          const f = e.features![0] as MapGeoJSONFeature
          const zoom = await (m.getSource('studios') as GeoJSONSource).getClusterExpansionZoom(f.properties.cluster_id as number)
          m.easeTo({ center: (f.geometry as unknown as { coordinates: [number, number] }).coordinates, zoom })
        })
        m.on('click', 'points', (e) => {
          const p = e.features![0].properties as unknown as MapProps & { f: string }
          const chips = (JSON.parse(String(p.f)) as MapFilter[]).map((k) => filters.find((x) => x.key === k)?.label).filter(Boolean)
          popup((e.features![0].geometry as unknown as { coordinates: [number, number] }).coordinates,
            `<div class="map-pop"><b><a href="/vyrobnyky/${esc(p.slug)}">${esc(p.name)}</a></b><div>${esc(p.type)} · ${esc(p.city)}</div>${p.address ? `<div>${esc(p.address)}</div>` : ''}${chips.length ? `<div class="map-chips">${chips.map((c) => `<span>${esc(c!)}</span>`).join('')}</div>` : ''}</div>`)
        })
        m.on('click', 'towns', (e) => {
          const p = e.features![0].properties as unknown as { name: string; n: number; list: string; citySlug: string }
          const list = JSON.parse(p.list) as [string, string, string][]
          popup((e.features![0].geometry as unknown as { coordinates: [number, number] }).coordinates,
            `<div class="map-pop"><b>${esc(p.name)}</b><div>Адреса не вказана — показано центр населеного пункту</div><ul>${list.slice(0, 12).map(([s, n, t]) => `<li><a href="/vyrobnyky/${esc(s)}">${esc(n)}</a> <small>${esc(t)}</small></li>`).join('')}</ul>${list.length > 12 ? `<div>і ще ${list.length - 12}</div>` : ''}</div>`)
        })
        for (const id of ['clusters', 'points', 'towns']) {
          m.on('mouseenter', id, () => (m.getCanvas().style.cursor = 'pointer'))
          m.on('mouseleave', id, () => (m.getCanvas().style.cursor = ''))
        }
        box.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
        setReady(true)

        const city = new URLSearchParams(window.location.search).get('misto')
        const inCity = city ? data.features.filter((f) => f.properties.citySlug === city) : []
        if (inCity.length) {
          const b = new maplibregl.LngLatBounds()
          for (const f of inCity) b.extend(f.geometry.coordinates)
          m.fitBounds(b, { padding: 60, maxZoom: 12, duration: 0 })
        }
      })
    })()
    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
    }
  }, [filters])

  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    ;(m.getSource('studios') as GeoJSONSource).setData({ type: 'FeatureCollection', features: shown.filter((f) => f.properties.precise) } as never)
    ;(m.getSource('towns') as GeoJSONSource).setData(towns(shown) as never)
  }, [shown, ready])

  const toggle = (k: MapFilter) => setActive((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]))

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Фільтри мапи">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={active.includes(f.key)}
            onClick={() => toggle(f.key)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap ${active.includes(f.key) ? 'border-cobalt bg-cobalt text-white' : 'border-line bg-card text-ink hover:border-cobalt'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <p className="m-0 text-sm text-umber" aria-live="polite">
        {failed
          ? 'Мапа не відкрилася в цьому браузері (потрібен WebGL) — нижче той самий перелік за містами.'
          : all
            ? cityName
              ? `${cityName}: ${inCityShown} з ${inCityAll} · по Україні: ${shown.length} з ${all.length}`
              : `На мапі: ${shown.length} з ${all.length}`
            : 'Завантажуємо мапу…'}
        {active.length > 0 && (
          <button type="button" onClick={() => setActive([])} className="ml-3 text-cobalt underline">
            скинути фільтри
          </button>
        )}
      </p>
      <div ref={box} className="h-[60vh] min-h-[360px] w-full overflow-hidden rounded-2xl border border-line bg-card lg:h-[68vh] lg:max-h-[720px]" />
      <p className="m-0 text-[13px] text-umber">
        <span className="mr-3 inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full" style={{ background: C.cobalt }} /> студія за адресою</span>
        <span className="mr-3 inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full" style={{ background: C.terra }} /> кілька поруч</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full" style={{ background: C.ochre }} /> адреса невідома — центр міста</span>
      </p>
    </div>
  )
}
