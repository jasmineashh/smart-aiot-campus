import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import {
  getParkingZones,
  getParkingZoneDetails,
  type ParkingZone,
  type ParkingSpace,
} from '../../services/parkingService'

import './ParkingPage.css'

interface ParkingPageProps {
  onBack: () => void
}

export default function ParkingPage({ onBack }: ParkingPageProps) {
  const [zones, setZones] = useState<ParkingZone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const loadZones = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')

    try {
      const data = await getParkingZones(signal)
      if (signal?.aborted) return
      setZones(data)
      setLastRefreshed(new Date())
    } catch (err) {
      if (signal?.aborted) return
      setError(
        err instanceof Error ? err.message : 'Failed to load parking data.'
      )
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadZones(controller.signal)
    return () => controller.abort()
  }, [loadZones])

  const activeZones = zones.filter(zone => zone.isActive)
  const totalSpaces = activeZones.reduce((sum, z) => sum + z.totalSpaces, 0)
  const available = activeZones.reduce((sum, z) => sum + z.availableSpaces, 0)
  const occupied = activeZones.reduce((sum, z) => sum + z.occupiedSpaces, 0)
  const unknown = activeZones.reduce((sum, z) => sum + z.unknownSpaces, 0)
  const outOfService = activeZones.reduce(
    (sum, z) => sum + z.outOfServiceSpaces,
    0
  )
  const measuredSpaces = available + occupied
  const occupancyRate = measuredSpaces > 0
    ? (occupied / measuredSpaces) * 100
    : null
  const hasData = activeZones.length > 0

  return (
    <div className="parking-page">
      <div className="parking-page-heading">
        <div>
          <button type="button" className="parking-back" onClick={onBack}>
            ← Back to Overview
          </button>
          <span className="parking-eyebrow">SMART CAMPUS / PARKING</span>
          <h1>Smart Parking</h1>
          <p>
            Explore campus parking availability, occupancy and parking zones.
          </p>
        </div>
        <button
          type="button"
          className="parking-refresh"
          onClick={() => void loadZones()}
          disabled={loading}
        >
          {loading ? 'Loading...' : '↻ Refresh Data'}
        </button>
      </div>

      <div className="parking-demo-banner">
        <span className="parking-demo-dot" />
        <div>
          <strong>Development Mode</strong>
          <p>
            Current parking records are synthetic test data, not live university
            sensor readings.
          </p>
        </div>
      </div>

      {/* Show the map even when the database has no parking zones. */}
      <CampusParkingMap zones={activeZones} />

      {error && (
        <div className="parking-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void loadZones()}>
            Retry
          </button>
        </div>
      )}

      {loading && !hasData ? (
        <div className="parking-empty" role="status">
          Loading parking information...
        </div>
      ) : !hasData ? (
        <div className="parking-empty">
          <h2>No parking zones yet</h2>
          <p>
            Add parking zones to PostgreSQL to see availability information here.
            The campus map above can still be explored.
          </p>
        </div>
      ) : (
        <>
          <section className="parking-stats">
            <StatCard label="Total Spaces" value={totalSpaces} symbol="P" tone="blue" />
            <StatCard label="Available" value={available} symbol="✓" tone="green" />
            <StatCard label="Occupied" value={occupied} symbol="C" tone="orange" />
            <StatCard
              label="Unavailable / Unknown"
              value={unknown + outOfService}
              symbol="!"
              tone="gray"
            />
          </section>

          <div className="parking-content-grid parking-analytics-only">
            <section className="parking-section-card">
              <div className="parking-section-header">
                <div>
                  <h2>Occupancy Overview</h2>
                  <p>Based on current database records</p>
                </div>
              </div>
              <div className="parking-occupancy-value">
                {occupancyRate === null
                  ? 'Not measured'
                  : `${occupancyRate.toFixed(1)}%`}
              </div>
              <p className="parking-occupancy-caption">Recorded occupied spaces</p>
              <div className="parking-progress">
                <div
                  className="parking-progress-fill"
                  style={{ width: `${occupancyRate ?? 0}%` }}
                />
              </div>
              <div className="parking-occupancy-details">
                <div><span>Available</span><strong>{available}</strong></div>
                <div><span>Occupied</span><strong>{occupied}</strong></div>
                <div><span>Unknown</span><strong>{unknown}</strong></div>
                <div><span>Out of service</span><strong>{outOfService}</strong></div>
              </div>
              <p className="parking-data-time">
                {lastRefreshed
                  ? `Last fetched: ${lastRefreshed.toLocaleTimeString()}`
                  : 'No successful refresh yet'}
              </p>
            </section>
          </div>

          <section className="parking-zones-section">
            <div className="parking-section-header">
              <div>
                <h2>Parking Zones</h2>
                <p>Availability across campus parking areas</p>
              </div>
              <span className="parking-zone-count">{activeZones.length} zones</span>
            </div>
            <div className="parking-zone-grid">
              {activeZones.map(zone => {
                const measured = zone.availableSpaces + zone.occupiedSpaces
                const availability = measured > 0
                  ? (zone.availableSpaces / measured) * 100
                  : null

                return (
                  <article className="parking-zone-card" key={zone.id}>
                    <div className="parking-zone-top">
                      <span className="parking-zone-icon">P</span>
                      <span className="parking-zone-type">{zone.zoneType}</span>
                    </div>
                    <h3>{zone.name}</h3>
                    <p>{zone.description ?? 'Campus parking area'}</p>
                    <div className="parking-zone-numbers">
                      <strong>{zone.availableSpaces}</strong>
                      <span>of {zone.totalSpaces} spaces available</span>
                    </div>
                    <div className="parking-zone-track">
                      <div
                        className="parking-zone-fill"
                        style={{ width: `${availability ?? 0}%` }}
                      />
                    </div>
                    <div className="parking-zone-bottom">
                      <span>{zone.occupiedSpaces} occupied</span>
                      <strong>{availability === null ? 'Not measured' : `${availability.toFixed(0)}% free`}</strong>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
  symbol: string
  tone: 'blue' | 'green' | 'orange' | 'gray'
}

function StatCard({ label, value, symbol, tone }: StatCardProps) {
  return (
    <article className="parking-stat-card">
      <span className={`parking-stat-icon ${tone}`}>{symbol}</span>
      <span className="parking-stat-label">{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function CampusParkingMap({ zones }: { zones: ParkingZone[] }) {
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [selectedId, setSelectedId] = useState<ParkingZone['id'] | null>(null)
  const [placingId, setPlacingId] = useState<string>('')
  const [slotsZoneId, setSlotsZoneId] = useState<string | null>(null)
  // Preview coordinates remain only in memory; database records are not modified.
  const [draftPins, setDraftPins] = useState<Record<string, { x: number; y: number }>>({})
  const imageRef = useRef<HTMLImageElement>(null)
  const drag = useRef<{
    startX: number
    startY: number
    x: number
    y: number
  } | null>(null)

  const activeZones = zones.filter(zone => zone.isActive)
  const mappedZones = activeZones.flatMap(zone => {
    const draft = draftPins[String(zone.id)]
    const x = draft?.x ?? zone.mapX
    const y = draft?.y ?? zone.mapY
    return x != null && y != null && x >= 0 && x <= 1 && y >= 0 && y <= 1
      ? [{ zone, x, y, draft: Boolean(draft) }]
      : []
  })
  const selectedZone = activeZones.find(zone => zone.id === selectedId)

  function zoomIn() {
    setZoom(current => Math.min(3, current + 0.25))
  }

  function zoomOut() {
    setZoom(current => {
      const next = Math.max(1, current - 0.25)
      if (next === 1) setPosition({ x: 0, y: 0 })
      return next
    })
  }

  function resetMap() {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
    setSelectedId(null)
    setPlacingId('')
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return

    if (placingId) {
      const bounds = imageRef.current?.getBoundingClientRect()
      if (!bounds || bounds.width === 0 || bounds.height === 0) return
      const x = (event.clientX - bounds.left) / bounds.width
      const y = (event.clientY - bounds.top) / bounds.height
      if (x < 0 || x > 1 || y < 0 || y > 1) return
      setDraftPins(current => ({ ...current, [placingId]: { x, y } }))
      const selected = activeZones.find(zone => String(zone.id) === placingId)
      setSelectedId(selected?.id ?? null)
      setPlacingId('')
      return
    }

    if (zoom === 1) return
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      x: position.x,
      y: position.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    setPosition({
      x: drag.current.x + event.clientX - drag.current.startX,
      y: drag.current.y + event.clientY - drag.current.startY,
    })
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <section className="parking-section-card parking-interactive-section">
      <div className="parking-section-header">
        <div>
          <h2>Interactive Campus Parking Map</h2>
          <p>Explore the campus and preview parking-zone markers</p>
        </div>
        <span className="parking-map-badge">Campus Explorer</span>
      </div>

      <div className="parking-map-placement">
        <label htmlFor="parking-placement-zone">Place a marker</label>
        <select
          id="parking-placement-zone"
          value={placingId}
          onChange={event => setPlacingId(event.target.value)}
        >
          <option value="">Select a parking zone...</option>
          {activeZones.map(zone => (
            <option key={zone.id} value={String(zone.id)}>
              {zone.name}
            </option>
          ))}
        </select>
        <span>{placingId ? 'Click the correct location on the campus image' : 'Preview only · Nothing saved to database'}</span>
      </div>

      <div className="parking-map parking-map-interactive">
        <div
          className="parking-map-layer"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            cursor: placingId ? 'crosshair' : zoom > 1 ? 'grab' : 'default',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <img
            ref={imageRef}
            src="/campus-map.png"
            alt="Illustrated AASTMT campus reference map"
            draggable={false}
          />
          {mappedZones.map(({ zone, x, y, draft }) => (
            <button
              key={zone.id}
              type="button"
              className={`parking-map-pin parking-map-button ${
                selectedId === zone.id ? 'selected' : ''
              } ${draft ? 'parking-map-pin-draft' : ''}`}
              style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
              aria-label={`View ${zone.name}${draft ? ' (preview)' : ''}`}
              title={`${zone.name}${draft ? ' — preview marker' : ''}`}
              onPointerDown={event => event.stopPropagation()}
              onClick={() => setSelectedId(zone.id)}
            >
              P
            </button>
          ))}
        </div>
        <div className="parking-map-controls">
          <button type="button" onClick={zoomIn} disabled={zoom >= 3} aria-label="Zoom in">+</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={zoomOut} disabled={zoom <= 1} aria-label="Zoom out">−</button>
          <button type="button" onClick={resetMap}>Reset View</button>
        </div>
      </div>

      {selectedZone ? (
        <div className="parking-map-details">
          <div>
            <h3>{selectedZone.name}</h3>
            <p>{selectedZone.description ?? 'Campus parking area'}</p>
            <div className="parking-map-detail-stats">
              <span>Total: {selectedZone.totalSpaces}</span>
              <span>Available: {selectedZone.availableSpaces}</span>
              <span>Occupied: {selectedZone.occupiedSpaces}</span>
              <span>Unknown: {selectedZone.unknownSpaces}</span>
            </div>
            <button
              type="button"
              className="parking-slots-open"
              onClick={() => setSlotsZoneId(String(selectedZone.id))}
            >
              View Parking Spaces →
            </button>
            {draftPins[String(selectedZone.id)] && (
              <p className="parking-map-preview-coordinates">
                Preview position: X={draftPins[String(selectedZone.id)].x.toFixed(4)},
                Y={draftPins[String(selectedZone.id)].y.toFixed(4)} — not saved
              </p>
            )}
          </div>
          <button type="button" onClick={() => setSelectedId(null)} aria-label="Close parking details">×</button>
        </div>
      ) : (
        <p className="parking-map-note">
          Select a parking zone above, then click its location on the image.
          Drag when zoomed in, or use + and − to zoom.
          All newly placed markers are previews only.
        </p>
      )}
      {slotsZoneId && (
        <ParkingSlotsPanel
          zoneId={slotsZoneId}
          onClose={() => setSlotsZoneId(null)}
        />
      )}
      {Object.keys(draftPins).length > 0 && (
        <div className="parking-map-draft-actions">
          <span>{Object.keys(draftPins).length} preview marker(s) placed (not saved)</span>
          <button type="button" onClick={() => setDraftPins({})}>Clear Preview Markers</button>
        </div>
      )}
    </section>
  )
}

// Individual spaces are displayed by their space numbers, not real-world coordinates.
function ParkingSlotsPanel({ zoneId, onClose }: { zoneId: string; onClose: () => void }) {
  const [spaces, setSpaces] = useState<ParkingSpace[]>([])
  const [zoneName, setZoneName] = useState('Parking spaces')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('All')
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setSpaces([])
    setSelectedSpace(null)
    void getParkingZoneDetails(zoneId, controller.signal)
      .then(data => {
        if (controller.signal.aborted) return
        setZoneName(data.name)
        setSpaces(data.spaces)
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Unable to fetch parking spaces.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [zoneId, reload])

  // Supports either enum names or numeric enum values returned by ASP.NET.
  function statusOf(value: ParkingSpace['status']): string {
    const statuses = ['Available', 'Occupied', 'OutOfService', 'Unknown']
    if (typeof value === 'number') return statuses[value] ?? 'Unknown'
    const normalized = String(value).toLowerCase().replace(/[^a-z]/g, '')
    return statuses.find(s => s.toLowerCase() === normalized) ?? 'Unknown'
  }

  const filtered = spaces.filter(space => filter === 'All' || statusOf(space.status) === filter)
  const statuses = ['All', 'Available', 'Occupied', 'Unknown', 'OutOfService']

  return (
    <section className="parking-slots-panel" aria-label={`${zoneName} parking spaces`}>
      <div className="parking-slots-header">
        <div>
          <h3>{zoneName} — Individual Spaces</h3>
          <p>Database records ordered by space number. This is not a physical lot layout.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close individual parking spaces">✕</button>
      </div>
      {loading ? <p role="status">Loading parking spaces...</p> : error ? (
        <div className="parking-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setReload(n => n + 1)}>Retry</button>
        </div>
      ) : (
        <>
          <div className="parking-slot-toolbar">
            <span><strong>{spaces.length}</strong> spaces · <strong>{filtered.length}</strong> shown</span>
            <label>
              Status:
              <select value={filter} onChange={event => { setFilter(event.target.value); setSelectedSpace(null) }}>
                {statuses.map(status => <option key={status} value={status}>{status === 'OutOfService' ? 'Out of service' : status}</option>)}
              </select>
            </label>
          </div>
          {filtered.length === 0 ? <p>No spaces match this filter.</p> : (
            <div className="parking-slot-grid">
              {filtered.map(space => {
                const status = statusOf(space.status)
                return (
                  <button
                    type="button"
                    key={space.id}
                    onClick={() => setSelectedSpace(space)}
                    className={`parking-slot parking-slot--${status.toLowerCase()} ${selectedSpace?.id === space.id ? 'parking-slot--selected' : ''}`}
                    aria-pressed={selectedSpace?.id === space.id}
                    title={`${space.spaceNumber}: ${status}`}
                  >
                    <span aria-hidden="true">▣</span>
                    <strong>{space.spaceNumber}</strong>
                    <small>{status === 'OutOfService' ? 'Out of service' : status}</small>
                  </button>
                )
              })}
            </div>
          )}
          {selectedSpace && (
            <div className="parking-slot-details">
              <strong>{selectedSpace.spaceNumber}</strong>
              <span>Status: {statusOf(selectedSpace.status)}</span>
              <span>Type: {selectedSpace.type}</span>
              <span>Last updated: {selectedSpace.lastUpdatedAt ? new Date(selectedSpace.lastUpdatedAt).toLocaleString() : 'Not recorded'}</span>
              <button type="button" onClick={() => setSelectedSpace(null)}>Close details</button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
