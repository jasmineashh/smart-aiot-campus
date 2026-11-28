
import { useEffect, useState } from 'react'
import {
  getAdminOverview,
  ParkingAdminApiError,
} from '../../services/parkingAdminService'
import type {
  AdminOverview,
  AdminParkingZone,
} from '../../services/parkingAdminService'
import './AdminOverviewPage.css'

interface AdminOverviewPageProps {
  onViewVehicles?: () => void
}

type OverviewState =
  | { status: 'loading' }
  | { status: 'success'; data: AdminOverview }
  | { status: 'error'; message: string }

interface ParkingBreakdownProps {
  total: number
  available: number
  occupied: number
  unknown: number
  outOfService: number
}

const numberFormatter = new Intl.NumberFormat('en-US')

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Africa/Cairo',
})

function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

function formatDate(value: string): string {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? 'Not recorded'
    : dateFormatter.format(date)
}

function formatOccupancy(value: number | null): string {
  if (value === null) {
    return 'N/A'
  }

  return `${value.toFixed(1)}%`
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ParkingAdminApiError) {
    if (error.status === 401) {
      return 'Your session has expired. Please sign in again.'
    }

    if (error.status === 403) {
      return 'You do not have permission to view this dashboard.'
    }

    return error.message
  }

  return 'Unable to load the parking overview. Please try again.'
}

function ParkingBreakdown({
  total,
  available,
  occupied,
  unknown,
  outOfService,
}: ParkingBreakdownProps) {
  const segments = [
    {
      label: 'Available',
      value: available,
      className: 'available',
    },
    {
      label: 'Occupied',
      value: occupied,
      className: 'occupied',
    },
    {
      label: 'Unknown',
      value: unknown,
      className: 'unknown',
    },
    {
      label: 'Out of service',
      value: outOfService,
      className: 'out-of-service',
    },
  ]

  const description = segments
    .map((segment) => `${segment.label}: ${segment.value}`)
    .join(', ')

  return (
    <div className="pao-breakdown">
      <div
        className="pao-parking-bar"
        role="img"
        aria-label={`${total} parking spaces. ${description}`}
      >
        {total > 0 &&
          segments
            .filter((segment) => segment.value > 0)
            .map((segment) => (
              <span
                key={segment.className}
                className={`pao-bar-segment pao-${segment.className}`}
                style={{
                  width: `${(segment.value / total) * 100}%`,
                }}
                title={`${segment.label}: ${segment.value}`}
              />
            ))}
      </div>

      <div className="pao-legend">
        {segments.map((segment) => (
          <div
            className="pao-legend-item"
            key={segment.className}
          >
            <span
              className={`pao-legend-dot pao-${segment.className}`}
              aria-hidden="true"
            />
            <span>{segment.label}</span>
            <strong>{formatNumber(segment.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function ParkingZoneRow({
  zone,
}: {
  zone: AdminParkingZone
}) {
  const knownSpaces =
    zone.availableSpaces + zone.occupiedSpaces

  const occupancy =
    knownSpaces > 0
      ? (zone.occupiedSpaces / knownSpaces) * 100
      : null

  return (
    <article className="pao-zone">
      <div className="pao-zone-header">
        <div className="pao-zone-identity">
          <span className="pao-zone-code">{zone.code}</span>

          <div>
            <h3>{zone.name}</h3>
            <p>{formatNumber(zone.totalSpaces)} parking spaces</p>
          </div>
        </div>

        <div className="pao-zone-occupancy">
          <strong>{formatOccupancy(occupancy)}</strong>
          <span>Occupancy</span>
        </div>
      </div>

      <ParkingBreakdown
        total={zone.totalSpaces}
        available={zone.availableSpaces}
        occupied={zone.occupiedSpaces}
        unknown={zone.unknownSpaces}
        outOfService={zone.outOfServiceSpaces}
      />
    </article>
  )
}

export default function AdminOverviewPage({
  onViewVehicles,
}: AdminOverviewPageProps) {
  const [state, setState] = useState<OverviewState>({
    status: 'loading',
  })

  const [refreshVersion, setRefreshVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadOverview() {
      try {
        const data = await getAdminOverview(controller.signal)

        if (!controller.signal.aborted) {
          setState({
            status: 'success',
            data,
          })
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message: getErrorMessage(error),
          })
        }
      }
    }

    void loadOverview()

    return () => {
      controller.abort()
    }
  }, [refreshVersion])

  function refreshOverview() {
    setState({ status: 'loading' })
    setRefreshVersion((previous) => previous + 1)
  }

  const isLoading = state.status === 'loading'

  return (
    <section
      className="pao-page"
      aria-labelledby="pao-page-title"
      aria-busy={isLoading}
    >
      <header className="pao-page-header">
        <div>
          <p className="pao-eyebrow">Parking management</p>

          <h1 id="pao-page-title">Operations Overview</h1>

          <p className="pao-subtitle">
            Monitor vehicle registration requests and campus
            parking availability.
          </p>
        </div>

        <div className="pao-header-actions">
          {state.status === 'success' && (
            <span className="pao-last-updated">
              Last updated:{' '}
              <time dateTime={state.data.generatedAt}>
                {formatDate(state.data.generatedAt)}
              </time>
            </span>
          )}

          <button
            type="button"
            className="pao-refresh-button"
            onClick={refreshOverview}
            disabled={isLoading}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 7v5h-5" />
              <path d="M4 17v-5h5" />
              <path d="M6.1 7a7 7 0 0 1 11.6-1L20 12" />
              <path d="M4 12l2.3 6A7 7 0 0 0 17.9 17" />
            </svg>

            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </header>

      {state.status === 'loading' && (
        <div className="pao-state-panel" role="status">
          <span className="pao-spinner" aria-hidden="true" />

          <h2>Loading parking overview</h2>

          <p>Retrieving current parking and vehicle information.</p>
        </div>
      )}

      {state.status === 'error' && (
        <div
          className="pao-state-panel pao-error-panel"
          role="alert"
        >
          <h2>Unable to load overview</h2>

          <p>{state.message}</p>

          <button
            type="button"
            className="pao-primary-button"
            onClick={refreshOverview}
          >
            Try again
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <>
          <section
            className="pao-section"
            aria-labelledby="pao-vehicle-heading"
          >
            <div className="pao-section-heading">
              <div>
                <h2 id="pao-vehicle-heading">
                  Vehicle Registration
                </h2>

                <p>
                  Registration requests and their current
                  approval status.
                </p>
              </div>
            </div>

            <div className="pao-stat-grid">
              {[
                {
                  label: 'Total vehicles',
                  value: state.data.vehicles.total,
                  variant: 'total',
                  description: 'All registered vehicle records',
                },
                {
                  label: 'Pending requests',
                  value: state.data.vehicles.pending,
                  variant: 'pending',
                  description: 'Awaiting administrator review',
                },
                {
                  label: 'Approved vehicles',
                  value: state.data.vehicles.approved,
                  variant: 'approved',
                  description: 'Approved registrations',
                },
                {
                  label: 'Rejected vehicles',
                  value: state.data.vehicles.rejected,
                  variant: 'rejected',
                  description: 'Rejected registration requests',
                },
              ].map((stat) => (
                <article
                  className={`pao-stat-card pao-stat-${stat.variant}`}
                  key={stat.variant}
                >
                  <span className="pao-stat-label">
                    {stat.label}
                  </span>

                  <strong className="pao-stat-value">
                    {formatNumber(stat.value)}
                  </strong>

                  <p>{stat.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section
            className="pao-section"
            aria-labelledby="pao-capacity-heading"
          >
            <div className="pao-section-heading">
              <div>
                <h2 id="pao-capacity-heading">
                  Campus Parking
                </h2>

                <p>
                  Capacity and availability across active
                  parking zones.
                </p>
              </div>
            </div>

            <div className="pao-panel pao-capacity-panel">
              <div className="pao-capacity-grid">
                <div>
                  <span>Total parking spaces</span>

                  <strong>
                    {formatNumber(state.data.parking.totalSpaces)}
                  </strong>
                </div>

                <div>
                  <span>Active zones</span>

                  <strong>
                    {formatNumber(state.data.parking.activeZones)}
                  </strong>
                </div>

                <div>
                  <span>Available spaces</span>

                  <strong className="pao-text-available">
                    {formatNumber(
                      state.data.parking.availableSpaces,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Occupancy rate</span>

                  <strong>
                    {formatOccupancy(
                      state.data.parking.occupancyPercentage,
                    )}
                  </strong>
                </div>
              </div>

              <ParkingBreakdown
                total={state.data.parking.totalSpaces}
                available={state.data.parking.availableSpaces}
                occupied={state.data.parking.occupiedSpaces}
                unknown={state.data.parking.unknownSpaces}
                outOfService={
                  state.data.parking.outOfServiceSpaces
                }
              />

              {state.data.parking.occupancyPercentage === null ? (
                <div className="pao-information">
                  Occupancy is not currently reported because
                  no spaces have a known available or occupied
                  status.
                </div>
              ) : (
                <div className="pao-information">
                  Occupancy is calculated using spaces with a
                  known available or occupied status. Unknown
                  and out-of-service spaces are excluded.
                </div>
              )}
            </div>
          </section>

          <section
            className="pao-section"
            aria-labelledby="pao-zones-heading"
          >
            <div className="pao-section-heading">
              <div>
                <h2 id="pao-zones-heading">Parking Zones</h2>

                <p>Availability and occupancy by location.</p>
              </div>
            </div>

            <div className="pao-panel pao-zones-panel">
              {state.data.zones.length === 0 ? (
                <div className="pao-empty-state">
                  No active parking zones found.
                </div>
              ) : (
                state.data.zones.map((zone) => (
                  <ParkingZoneRow
                    key={zone.id}
                    zone={zone}
                  />
                ))
              )}
            </div>
          </section>

          <section
            className="pao-section"
            aria-labelledby="pao-requests-heading"
          >
            <div className="pao-section-heading">
              <div>
                <h2 id="pao-requests-heading">
                  Recent Pending Requests
                </h2>

                <p>
                  Latest vehicle registrations awaiting review.
                </p>
              </div>

              {onViewVehicles && (
                <button
                  type="button"
                  className="pao-primary-button"
                  onClick={onViewVehicles}
                >
                  View all vehicles
                </button>
              )}
            </div>

            <div className="pao-panel">
              {state.data.recentRequests.length === 0 ? (
                <div className="pao-empty-state">
                  <h3>No pending requests</h3>

                  <p>
                    There are currently no recent vehicle
                    registrations awaiting review.
                  </p>
                </div>
              ) : (
                <div className="pao-table-container">
                  <table className="pao-table">
                    <thead>
                      <tr>
                        <th scope="col">Vehicle</th>
                        <th scope="col">License plate</th>
                        <th scope="col">Owner</th>
                        <th scope="col">Registered</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {state.data.recentRequests.map((request) => {
                        const vehicleName =
                          [request.make, request.model]
                            .filter(Boolean)
                            .join(' ') || 'Vehicle not specified'

                        return (
                          <tr key={request.id}>
                            <td>
                              <div className="pao-table-primary">
                                {vehicleName}
                              </div>

                              <div className="pao-table-secondary">
                                {request.color || 'Color not recorded'}
                              </div>
                            </td>

                            <td>
                              <bdi className="pao-license-plate">
                                {request.plateNumber}
                              </bdi>
                            </td>

                            <td>
                              <div className="pao-table-primary">
                                {request.owner.fullName}
                              </div>

                              <div className="pao-table-secondary">
                                {request.owner.universityId}
                              </div>

                              {request.owner.department && (
                                <div className="pao-table-secondary">
                                  {request.owner.department}
                                </div>
                              )}
                            </td>

                            <td>
                              <time dateTime={request.registeredAt}>
                                {formatDate(request.registeredAt)}
                              </time>
                            </td>

                            <td>
                              <span
                                className={`pao-status pao-status-${request.approvalStatus.toLowerCase()}`}
                              >
                                {request.approvalStatus}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </section>
  )
}
