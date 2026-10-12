import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const NIGERIA = [[4.2, 2.6], [13.9, 14.7]]

/**
 * Leaflet map drawing circle markers (no marker image assets to bundle).
 * points: [{ lat, lon, weight? }]. A single point zooms in; many points fit to bounds.
 */
export default function MapView({ points, height = 320, label = 'Map' }) {
  const el = useRef(null)
  const map = useRef(null)
  const layer = useRef(null)

  useEffect(() => {
    map.current = L.map(el.current, { scrollWheelZoom: false }).fitBounds(NIGERIA)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    return () => { map.current.remove(); map.current = null }
  }, [])

  useEffect(() => {
    if (!map.current) return
    layer.current.clearLayers()
    const valid = (points || []).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
    const max = Math.max(1, ...valid.map((p) => p.weight || 1))
    valid.forEach((p) => {
      L.circleMarker([p.lat, p.lon], {
        radius: valid.length === 1 ? 10 : 5 + 14 * ((p.weight || 1) / max),
        color: '#0b4a2e', weight: 1, fillColor: '#1d7a4d', fillOpacity: 0.55,
      }).bindTooltip(p.weight ? `${p.weight} events` : 'Event location').addTo(layer.current)
    })
    if (valid.length === 1) map.current.setView([valid[0].lat, valid[0].lon], 13)
    else if (valid.length > 1) map.current.fitBounds(L.latLngBounds(valid.map((p) => [p.lat, p.lon])).pad(0.2), { maxZoom: 9 })
    else map.current.fitBounds(NIGERIA)
  }, [points])

  return <div ref={el} className="map" style={{ height }} role="img" aria-label={label} />
}
