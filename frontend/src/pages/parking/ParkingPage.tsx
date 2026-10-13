
import { useCallback, useEffect, useState } from 'react'
import {
  getParkingZones,
  type ParkingZone,
} from '../../services/parkingService'

import './ParkingPage.css'

interface ParkingPageProps {
  onBack: () => void
}

export default function ParkingPage({
  onBack,
}: ParkingPageProps) {
  const [zones, setZones] = useState<ParkingZone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefreshed, setLastRefreshed] =
    useState<Date | null>(null)

  const loadZones = useCallback(async (
    signal?: AbortSignal
  ) => {
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
        err instanceof Error
          ? err.message
          : 'Failed to load parking data.'
      )
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    void loadZones(controller.signal)

    return () => controller.abort()
  }, [loadZones])

  const activeZones = zones.filter(zone => zone.isActive)

  const totalSpaces = activeZones.reduce(
    (sum, zone) => sum + zone.totalSpaces, 0
  )

  const available = activeZones.reduce(
    (sum, zone) => sum + zone.availableSpaces, 0
  )

  const occupied = activeZones.reduce(
    (sum, zone) => sum + zone.occupiedSpaces, 0
  )

  const unknown = activeZones.reduce(
    (sum, zone) => sum + zone.unknownSpaces, 0
  )

  const outOfService = activeZones.reduce(
    (sum, zone) => sum + zone.outOfServiceSpaces, 0
  )

  const occupancyRate = totalSpaces > 0
    ? (occupied / totalSpaces) * 100
    : 0

  const hasData = activeZones.length > 0

  return (
    <div className="parking-page">
      <div className="parking-page-heading">
        <div>
          <button
            type="button"
            className="parking-back"
            onClick={onBack}
          >
            ← Back to Overview
          </button>

          <span className="parking-eyebrow">
            SMART CAMPUS / PARKING
          </span>

          <h1>Smart Parking</h1>

          <p>
            Explore campus parking availability,
            occupancy and parking zones.
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
            Current parking records are synthetic test
            data, not live university sensor readings.
          </p>
        </div>
      </div>

      {error && (
        <div className="parking-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadZones()}
          >
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
            Add parking zones to PostgreSQL to see
            availability information here.
          </p>
        </div>
      ) : (
        <>
          <section className="parking-stats">
            <StatCard
              label="Total Spaces"
              value={totalSpaces}
              symbol="P"
              tone="blue"
            />

            <StatCard
              label="Available"
              value={available}
              symbol="✓"
              tone="green"
            />

            <StatCard
              label="Occupied"
              value={occupied}
              symbol="C"
              tone="orange"
            />

            <StatCard
              label="Unavailable / Unknown"
              value={unknown + outOfService}
              symbol="!"
              tone="gray"
            />
          </section>

          <div className="parking-content-grid">
            <section className="parking-section-card">
              <div className="parking-section-header">
                <div>
                  <h2>Campus Parking Map</h2>
                  <p>
                    University layout and parking areas
                  </p>
                </div>
              </div>

              <div className="parking-map">
                <img
                  src="/campus-map.png"
                  alt="University campus reference map"
                />

                {activeZones
                  .filter(
                    zone =>
                      zone.mapX !== null &&
                      zone.mapY !== null &&
                      zone.mapX >= 0 &&
                      zone.mapX <= 1 &&
                      zone.mapY >= 0 &&
                      zone.mapY <= 1
                  )
                  .map(zone => (
                    <div
                      key={zone.id}
                      className="parking-map-pin"
                      style={{
                        left: `${zone.mapX! * 100}%`,
                        top: `${zone.mapY! * 100}%`,
                      }}
                      title={zone.name}
                    >
                      P
                    </div>
                  ))}
              </div>

              <div className="parking-map-note">
                Parking markers will appear when
                verified zone coordinates are added.
                No fictional locations are shown.
              </div>
            </section>

            <section className="parking-section-card">
              <div className="parking-section-header">
                <div>
                  <h2>Occupancy Overview</h2>
                  <p>Based on current database records</p>
                </div>
              </div>

              <div className="parking-occupancy-value">
                {occupancyRate.toFixed(1)}%
              </div>

              <p className="parking-occupancy-caption">
                Recorded occupied spaces
              </p>

              <div className="parking-progress">
                <div
                  className="parking-progress-fill"
                  style={{
                    width: `${occupancyRate}%`,
                  }}
                />
              </div>

              <div className="parking-occupancy-details">
                <div>
                  <span>Available</span>
                  <strong>{available}</strong>
                </div>
                <div>
                  <span>Occupied</span>
                  <strong>{occupied}</strong>
                </div>
                <div>
                  <span>Unknown</span>
                  <strong>{unknown}</strong>
                </div>
                <div>
                  <span>Out of service</span>
                  <strong>{outOfService}</strong>
                </div>
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
                <p>
                  Availability across campus parking
                  areas
                </p>
              </div>

              <span className="parking-zone-count">
                {activeZones.length} zones
              </span>
            </div>

            <div className="parking-zone-grid">
              {activeZones.map(zone => {
                const availability = zone.totalSpaces > 0
                  ? (
                      zone.availableSpaces /
                      zone.totalSpaces
                    ) * 100
                  : 0

                return (
                  <article
                    className="parking-zone-card"
                    key={zone.id}
                  >
                    <div className="parking-zone-top">
                      <span className="parking-zone-icon">
                        P
                      </span>

                      <span className="parking-zone-type">
                        {zone.zoneType}
                      </span>
                    </div>

                    <h3>{zone.name}</h3>

                    <p>
                      {zone.description ??
                        'Campus parking area'}
                    </p>

                    <div className="parking-zone-numbers">
                      <strong>
                        {zone.availableSpaces}
                      </strong>

                      <span>
                        of {zone.totalSpaces} spaces
                        available
                      </span>
                    </div>

                    <div className="parking-zone-track">
                      <div
                        className="parking-zone-fill"
                        style={{
                          width: `${availability}%`,
                        }}
                      />
                    </div>

                    <div className="parking-zone-bottom">
                      <span>
                        {zone.occupiedSpaces} occupied
                      </span>

                      <strong>
                        {availability.toFixed(0)}% free
                      </strong>
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

function StatCard({
  label,
  value,
  symbol,
  tone,
}: StatCardProps) {
  return (
    <article className="parking-stat-card">
      <span className={`parking-stat-icon ${tone}`}>
        {symbol}
      </span>
      <span className="parking-stat-label">
        {label}
      </span>
      <strong>{value}</strong>
    </article>
  )
}
