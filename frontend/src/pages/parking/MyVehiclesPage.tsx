
import { useEffect, useState } from 'react'
import {
  getMyVehicles,
  type RegisteredVehicle,
} from '../../services/parkingService'
import VehicleRegistrationForm from './VehicleRegistrationForm'
import './MyVehiclesPage.css'

export default function MyVehiclesPage() {
  const [vehicles, setVehicles] = useState<RegisteredVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showRegistration, setShowRegistration] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadVehicles() {
      setLoading(true)
      setError(null)

      try {
        const data = await getMyVehicles(controller.signal)

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

  const approvedCount = vehicles.filter(
    vehicle => vehicle.isApproved
  ).length

  const pendingCount = vehicles.length - approvedCount

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
            View your registered vehicles and their
            university access approval status.
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
            onClick={() =>
              setShowRegistration(value => !value)
            }
          >
            {showRegistration
              ? 'Close Registration'
              : '+ Register Vehicle'}
          </button>
        </div>
      </header>

      {/* VEHICLE REGISTRATION FORM */}
      {showRegistration && (
        <VehicleRegistrationForm
          onClose={() => setShowRegistration(false)}
        />
      )}

      {/* VEHICLE STATISTICS */}
      <section className="mv-stats">
        <div className="mv-stat">
          <span>Total Vehicles</span>
          <strong>{vehicles.length}</strong>
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
      </section>

      {/* REGISTERED VEHICLES */}
      <section className="mv-section">
        <div className="mv-section-title">
          <div>
            <h2>Registered Vehicles</h2>

            <p>
              Vehicles linked to your university account.
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
                You don't currently have any vehicles
                linked to your university account.
              </p>

              <button
                type="button"
                className="mv-register-btn"
                onClick={() => setShowRegistration(true)}
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
              {vehicles.map(vehicle => (
                <article
                  className="mv-card"
                  key={vehicle.id}
                >
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
                        vehicle.isApproved
                          ? 'mv-badge approved'
                          : 'mv-badge pending'
                      }
                    >
                      {vehicle.isApproved
                        ? 'Approved'
                        : 'Pending approval'}
                    </span>
                  </div>

                  {/* EGYPTIAN LICENSE PLATE */}
                  <div className="mv-plate">
                    <div className="mv-plate-header">
                      <span>EGYPT</span>
                      <span lang="ar">مصر</span>
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
                      <span>Make</span>
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
                  </div>

                  {/* APPROVAL STATUS */}
                  <div className="mv-card-footer">
                    <span
                      className={
                        vehicle.isApproved
                          ? 'mv-dot green'
                          : 'mv-dot orange'
                      }
                    />

                    {vehicle.isApproved
                      ? 'Vehicle registration approved'
                      : 'Awaiting administrator approval'}
                  </div>
                </article>
              ))}
            </div>
          )}
      </section>
    </div>
  )
}
