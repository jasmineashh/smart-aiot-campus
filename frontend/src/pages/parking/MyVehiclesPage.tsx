import { useEffect, useState } from 'react'

import {
  getMyVehicles,
  type RegisteredVehicle,
  type VehicleApprovalStatus,
} from '../../services/parkingService'

import VehicleRegistrationForm from './VehicleRegistrationForm'

import './MyVehiclesPage.css'

// ==========================================
// APPROVAL STATUS HELPERS
// ==========================================

function getVehicleStatus(
  vehicle: RegisteredVehicle
): VehicleApprovalStatus {
  // Compatibility with older vehicle responses.
  return (
    vehicle.approvalStatus ??
    (vehicle.isApproved ? 'Approved' : 'Pending')
  )
}

function getStatusLabel(
  status: VehicleApprovalStatus
): string {
  switch (status) {
    case 'Approved':
      return 'Approved'

    case 'Rejected':
      return 'Rejected'

    default:
      return 'Pending approval'
  }
}

function getStatusMessage(
  status: VehicleApprovalStatus
): string {
  switch (status) {
    case 'Approved':
      return 'Vehicle registration approved'

    case 'Rejected':
      return 'Vehicle registration rejected'

    default:
      return 'Awaiting administrator approval'
  }
}

function getStatusColor(
  status: VehicleApprovalStatus
): string {
  switch (status) {
    case 'Approved':
      return 'green'

    case 'Rejected':
      return 'red'

    default:
      return 'orange'
  }
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Not available'
  }

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ==========================================
// MY VEHICLES PAGE
// ==========================================

export default function MyVehiclesPage() {
  const [vehicles, setVehicles] =
    useState<RegisteredVehicle[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const [refreshKey, setRefreshKey] =
    useState(0)

  const [showRegistration, setShowRegistration] =
    useState(false)

  const [successMessage, setSuccessMessage] =
    useState('')

  // ==========================================
  // LOAD REGISTERED VEHICLES
  // ==========================================

  useEffect(() => {
    const controller = new AbortController()

    async function loadVehicles() {
      setLoading(true)
      setError(null)

      try {
        const data = await getMyVehicles(
          controller.signal
        )

        if (!controller.signal.aborted) {
          setVehicles(data)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load your vehicles.'
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadVehicles()

    return () => controller.abort()
  }, [refreshKey])

  // ==========================================
  // VEHICLE STATISTICS
  // ==========================================

  const approvedCount = vehicles.filter(
    vehicle =>
      getVehicleStatus(vehicle) === 'Approved'
  ).length

  const pendingCount = vehicles.filter(
    vehicle =>
      getVehicleStatus(vehicle) === 'Pending'
  ).length

  const rejectedCount = vehicles.filter(
    vehicle =>
      getVehicleStatus(vehicle) === 'Rejected'
  ).length

  // ==========================================
  // SUCCESSFUL REGISTRATION CALLBACK
  // ==========================================

  function handleVehicleRegistered(
    vehicle: RegisteredVehicle,
    message: string
  ) {
    // Immediately show the newly registered vehicle.
    setVehicles(current => [
      vehicle,
      ...current.filter(
        item => item.id !== vehicle.id
      ),
    ])

    setSuccessMessage(message)
    setShowRegistration(false)

    // Retrieve authoritative data from the backend.
    setRefreshKey(key => key + 1)
  }

  function openRegistration() {
    setSuccessMessage('')
    setShowRegistration(true)
  }

  // ==========================================
  // PAGE INTERFACE
  // ==========================================

  return (
    <div className="mv-page">
      {/* PAGE HEADER */}

      <header className="mv-header">
        <div>
          <span className="mv-eyebrow">
            SMART PARKING
          </span>

          <h1>My Vehicles</h1>

          <p>
            Register and manage vehicles linked
            to your university account and track
            their campus access approval status.
          </p>
        </div>

        <div className="mv-header-actions">
          <button
            className="mv-refresh"
            type="button"
            disabled={loading}
            onClick={() =>
              setRefreshKey(key => key + 1)
            }
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>

          <button
            className="mv-register-btn"
            type="button"
            aria-expanded={showRegistration}
            disabled={showRegistration}
            onClick={openRegistration}
          >
            {showRegistration
              ? 'Registration Open'
              : '+ Register Vehicle'}
          </button>
        </div>
      </header>

      {/* SUCCESS NOTIFICATION */}

      {successMessage && (
        <div
          className="mv-success"
          role="status"
        >
          <div className="mv-success-icon">
            ✓
          </div>

          <div className="mv-success-content">
            <strong>
              Vehicle registered successfully
            </strong>

            <p>{successMessage}</p>
          </div>

          <button
            className="mv-success-close"
            type="button"
            aria-label="Dismiss success message"
            onClick={() =>
              setSuccessMessage('')
            }
          >
            ×
          </button>
        </div>
      )}

      {/* VEHICLE REGISTRATION FORM */}

      {showRegistration && (
        <VehicleRegistrationForm
          onClose={() =>
            setShowRegistration(false)
          }
          onRegistered={handleVehicleRegistered}
        />
      )}

      {/* VEHICLE STATISTICS */}

      <section
        className="mv-stats"
        aria-label="Vehicle registration statistics"
      >
        <div className="mv-stat">
          <span>Total Vehicles</span>

          <strong>
            {vehicles.length}
          </strong>
        </div>

        <div className="mv-stat">
          <span>Approved</span>

          <strong className="mv-green">
            {approvedCount}
          </strong>
        </div>

        <div className="mv-stat">
          <span>Pending</span>

          <strong className="mv-orange">
            {pendingCount}
          </strong>
        </div>

        <div className="mv-stat">
          <span>Rejected</span>

          <strong className="mv-red">
            {rejectedCount}
          </strong>
        </div>
      </section>

      {/* REGISTERED VEHICLES */}

      <section className="mv-section">
        <div className="mv-section-title">
          <div>
            <h2>Registered Vehicles</h2>

            <p>
              Vehicles linked to your
              university account.
            </p>
          </div>
        </div>

        {/* LOADING STATE */}

        {loading && (
          <div
            className="mv-message"
            role="status"
          >
            Loading your vehicles...
          </div>
        )}

        {/* ERROR STATE */}

        {!loading && error && (
          <div
            className="mv-message mv-error"
            role="alert"
          >
            <p>{error}</p>

            <button
              type="button"
              onClick={() =>
                setRefreshKey(key => key + 1)
              }
            >
              Try Again
            </button>
          </div>
        )}

        {/* EMPTY STATE */}

        {!loading &&
          !error &&
          vehicles.length === 0 && (
            <div className="mv-message">
              <div className="mv-empty-icon">
                P
              </div>

              <h3>No vehicles registered</h3>

              <p>
                You don't currently have any
                vehicles linked to your
                university account.
              </p>

              <button
                type="button"
                className="mv-register-btn"
                disabled={showRegistration}
                onClick={openRegistration}
              >
                + Register Your First Vehicle
              </button>
            </div>
          )}

        {/* VEHICLE CARDS */}

        {!loading &&
          !error &&
          vehicles.length > 0 && (
            <div className="mv-grid">
              {vehicles.map(vehicle => {
                const status =
                  getVehicleStatus(vehicle)

                const statusClass =
                  status.toLowerCase()

                const statusColor =
                  getStatusColor(status)

                return (
                  <article
                    className="mv-card"
                    key={vehicle.id}
                  >
                    {/* VEHICLE HEADER */}

                    <div className="mv-card-top">
                      <div>
                        <span className="mv-card-label">
                          REGISTERED VEHICLE
                        </span>

                        <h3>
                          {[
                            vehicle.make,
                            vehicle.model,
                          ]
                            .filter(Boolean)
                            .join(' ') ||
                            'Registered Vehicle'}
                        </h3>
                      </div>

                      <span
                        className={
                          `mv-badge ${statusClass}`
                        }
                      >
                        {getStatusLabel(status)}
                      </span>
                    </div>

                    {/* EGYPTIAN LICENSE PLATE */}

                    <div className="mv-plate">
                      <div className="mv-plate-header">
                        <span>EGYPT</span>

                        <span lang="ar">
                          مصر
                        </span>
                      </div>

                      <div
                        className="mv-plate-number"
                        dir="auto"
                      >
                        {vehicle.plateNumber}
                      </div>
                    </div>

                    {/* VEHICLE INFORMATION */}

                    <div className="mv-details">
                      <div>
                        <span>Brand</span>

                        <strong>
                          {vehicle.make || '—'}
                        </strong>
                      </div>

                      <div>
                        <span>Model</span>

                        <strong>
                          {vehicle.model || '—'}
                        </strong>
                      </div>

                      <div>
                        <span>Color</span>

                        <strong>
                          {vehicle.color || '—'}
                        </strong>
                      </div>

                      <div>
                        <span>Registered</span>

                        <strong>
                          {formatDate(
                            vehicle.registeredAt
                          )}
                        </strong>
                      </div>

                      {vehicle.reviewedAt && (
                        <div>
                          <span>Reviewed</span>

                          <strong>
                            {formatDate(
                              vehicle.reviewedAt
                            )}
                          </strong>
                        </div>
                      )}
                    </div>

                    {/* REJECTION REASON */}

                    {status === 'Rejected' && (
                      <div className="mv-rejection">
                        <strong>
                          Rejection reason
                        </strong>

                        <p>
                          {vehicle.rejectionReason ||
                            'No reason was provided.'}
                        </p>
                      </div>
                    )}

                    {/* APPROVAL STATUS FOOTER */}

                    <div className="mv-card-footer">
                      <span
                        className={
                          `mv-dot ${statusColor}`
                        }
                      />

                      {getStatusMessage(status)}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
      </section>
    </div>
  )
}
