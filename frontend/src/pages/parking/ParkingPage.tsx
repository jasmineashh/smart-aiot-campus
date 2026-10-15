import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import {
  getParkingZones,
  type ParkingZone,
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
                const availability = zone.totalSpaces > 0
                  ? (zone.availableSpaces / zone.totalSpaces) * 100
                  : 0

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
                        style={{ width: `${availability}%` }}
                      />
                    </div>
                    <div className="parking-zone-bottom">
                      <span>{zone.occupiedSpaces} occupied</span>
                      <strong>{availability.toFixed(0)}% free</strong>
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
  const drag = useRef<{
    startX: number
    startY: number
    x: number
    y: number
  } | null>(null)

  const mappedZones = zones.filter(
    zone =>
      zone.isActive &&
      zone.mapX != null &&
      zone.mapY != null &&
      zone.mapX >= 0 && zone.mapX <= 1 &&
      zone.mapY >= 0 && zone.mapY <= 1
  )
  const selectedZone = mappedZones.find(zone => zone.id === selectedId)

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
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || zoom === 1) return

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
          <p>Explore the campus and select parking zones</p>
        </div>
        <span className="parking-map-badge">Campus Explorer</span>
      </div>

      <div className="parking-map parking-map-interactive">
        <div
          className="parking-map-layer"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            cursor: zoom > 1 ? 'grab' : 'default',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <img
            src="/campus-map.png"
            alt="Illustrated AASTMT campus reference map"
            draggable={false}
          />
          {mappedZones.map(zone => (
            <button
              key={zone.id}
              type="button"
              className={`parking-map-pin parking-map-button ${
                selectedId === zone.id ? 'selected' : ''
              }`}
              style={{
                left: `${zone.mapX! * 100}%`,
                top: `${zone.mapY! * 100}%`,
              }}
              aria-label={`View ${zone.name}`}
              title={zone.name}
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
          <button type="button" onClick={resetMap}>Reset</button>
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
          </div>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            aria-label="Close parking details"
          >
            ×
          </button>
        </div>
      ) : (
        <p className="parking-map-note">
          Use + and − to zoom. Drag the image while zoomed in.
          {mappedZones.length === 0
            ? ' Verified parking coordinates have not been added yet.'
            : ' Click a parking marker to view its details.'}
        </p>
      )}
    </section>
  )
}
