
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  getAdminVehicles,
  approveVehicle,
  rejectVehicle,
  ParkingAdminApiError,
} from '../../services/parkingAdminService'

import type {
  AdminVehicle,
} from '../../services/parkingAdminService'

import type {
  VehicleApprovalStatus,
} from '../../services/parkingService'

import './AdminVehiclesPage.css'

type FilterStatus = 'All' | VehicleApprovalStatus

type ReviewAction = 'approve' | 'reject'

interface ReviewSelection {
  vehicle: AdminVehicle
  action: ReviewAction
}

type VehicleState =
  | { status: 'loading' }
  | { status: 'success'; vehicles: AdminVehicle[] }
  | { status: 'error'; message: string }

const statusFilters: FilterStatus[] = [
  'All',
  'Pending',
  'Approved',
  'Rejected',
]

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Africa/Cairo',
})

function formatDate(value: string | null): string {
  if (!value) {
    return 'Not recorded'
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? 'Not recorded'
    : dateFormatter.format(date)
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(
      /[٠-٩]/g,
      digit => String(digit.charCodeAt(0) - 0x0660),
    )
    .replace(
      /[۰-۹]/g,
      digit => String(digit.charCodeAt(0) - 0x06f0),
    )
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[\s\-ـ|]+/g, '')
}

function getVehicleName(vehicle: AdminVehicle): string {
  return (
    [vehicle.make, vehicle.model]
      .filter(Boolean)
      .join(' ') || 'Vehicle not specified'
  )
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred. Please try again.'
}

export default function AdminVehiclesPage() {
  const [state, setState] = useState<VehicleState>({
    status: 'loading',
  })

  const [refreshVersion, setRefreshVersion] = useState(0)

  const [query, setQuery] = useState('')

  const [filter, setFilter] =
    useState<FilterStatus>('All')

  const [selection, setSelection] =
    useState<ReviewSelection | null>(null)

  const [rejectionReason, setRejectionReason] =
    useState('')

  const [reviewing, setReviewing] = useState(false)

  const [reviewError, setReviewError] = useState('')

  const [feedback, setFeedback] = useState('')

  const [feedbackType, setFeedbackType] =
    useState<'success' | 'error'>('success')

  const reviewLock = useRef(false)

  const reviewPanelRef = useRef<HTMLDivElement>(null)

  // ==========================================
  // LOAD VEHICLES FROM THE SERVER
  // ==========================================

  useEffect(() => {
    const controller = new AbortController()

    async function loadVehicles() {
      try {
        const vehicles = await getAdminVehicles(
          controller.signal,
        )

        if (!controller.signal.aborted) {
          setState({
            status: 'success',
            vehicles,
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

    void loadVehicles()

    return () => {
      controller.abort()
    }
  }, [refreshVersion])

  useEffect(() => {
    if (selection) {
      reviewPanelRef.current?.focus()
      reviewPanelRef.current?.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
      })
    }
  }, [selection])

  function refreshVehicles() {
    setState({ status: 'loading' })
    setRefreshVersion(previous => previous + 1)
  }

  function handleRefresh() {
    if (reviewLock.current) {
      return
    }

    setSelection(null)
    setRejectionReason('')
    setReviewError('')
    setFeedback('')

    refreshVehicles()
  }

  // ==========================================
  // STATISTICS AND SEARCH
  // ==========================================

  const vehicles = useMemo(
    () =>
      state.status === 'success'
        ? state.vehicles
        : [],
    [state],
  )

  const statistics = useMemo(
    () => ({
      total: vehicles.length,

      pending: vehicles.filter(
        vehicle => vehicle.approvalStatus === 'Pending',
      ).length,

      approved: vehicles.filter(
        vehicle => vehicle.approvalStatus === 'Approved',
      ).length,

      rejected: vehicles.filter(
        vehicle => vehicle.approvalStatus === 'Rejected',
      ).length,
    }),
    [vehicles],
  )

  const filteredVehicles = useMemo(() => {
    const searchTerm = normalizeSearch(query.trim())

    return vehicles.filter(vehicle => {
      const matchesStatus =
        filter === 'All' ||
        vehicle.approvalStatus === filter

      const searchable = normalizeSearch(
        [
          vehicle.plateNumber,
          vehicle.make,
          vehicle.model,
          vehicle.color,
          vehicle.owner.fullName,
          vehicle.owner.universityId,
          vehicle.owner.department,
        ]
          .filter(Boolean)
          .join(' '),
      )

      const matchesSearch =
        !searchTerm || searchable.includes(searchTerm)

      return matchesStatus && matchesSearch
    })
  }, [vehicles, filter, query])

  const filterCounts: Record<FilterStatus, number> = {
    All: statistics.total,
    Pending: statistics.pending,
    Approved: statistics.approved,
    Rejected: statistics.rejected,
  }

  // ==========================================
  // OPEN REVIEW CONFIRMATION
  // ==========================================

  function openReview(
    vehicle: AdminVehicle,
    action: ReviewAction,
  ) {
    if (
      reviewLock.current ||
      selection ||
      vehicle.approvalStatus !== 'Pending'
    ) {
      return
    }

    if (
      action === 'approve' &&
      vehicle.canApprove !== true
    ) {
      return
    }

    setFeedback('')
    setReviewError('')
    setRejectionReason('')

    setSelection({
      vehicle,
      action,
    })
  }

  function cancelReview() {
    if (reviewLock.current) {
      return
    }

    setSelection(null)
    setRejectionReason('')
    setReviewError('')
  }

  // ==========================================
  // SUBMIT REAL REVIEW DECISION
  // ==========================================

  async function confirmReview() {
    if (!selection || reviewLock.current) {
      return
    }

    const { vehicle, action } = selection

    const cleanReason = rejectionReason.trim()

    if (
      vehicle.approvalStatus !== 'Pending' ||
      (action === 'approve' &&
        vehicle.canApprove !== true)
    ) {
      setReviewError(
        'This vehicle is not eligible for this action.',
      )

      return
    }

    if (
      action === 'reject' &&
      !cleanReason
    ) {
      setReviewError(
        'Please provide a rejection reason.',
      )

      return
    }

    if (cleanReason.length > 500) {
      setReviewError(
        'The rejection reason must not exceed 500 characters.',
      )

      return
    }

    reviewLock.current = true

    setReviewing(true)
    setReviewError('')
    setFeedback('')

    try {
      const response =
        action === 'approve'
          ? await approveVehicle(vehicle.id)
          : await rejectVehicle(vehicle.id, cleanReason)

      // Only report success after the server confirms
      // that the decision has been persisted.

      setFeedbackType('success')
      setFeedback(response.message)

      setSelection(null)
      setRejectionReason('')

      // Retrieve authoritative statistics and statuses.
      refreshVehicles()
    } catch (error: unknown) {
      const message = getErrorMessage(error)

      if (
        error instanceof ParkingAdminApiError &&
        (
          error.status === 400 ||
          error.status === 401 ||
          error.status === 403 ||
          error.status === 404 ||
          error.status === 409
        )
      ) {
        setSelection(null)
        setRejectionReason('')

        setFeedbackType('error')
        setFeedback(message)

        // Eligibility or authorization may have changed.
        refreshVehicles()
      } else {
        // A network/server failure does not guarantee
        // that the review was never persisted.

        setSelection(null)
        setRejectionReason('')

        setFeedbackType('error')

        setFeedback(
          `${message} Refresh the records before attempting another review.`,
        )

        refreshVehicles()
      }
    } finally {
      reviewLock.current = false
      setReviewing(false)
    }
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <section
      className="av-page"
      aria-labelledby="av-page-title"
      aria-busy={state.status === 'loading'}
    >
      <header className="av-header">
        <div>
          <p className="av-eyebrow">
            Parking management
          </p>

          <h1 id="av-page-title">
            Vehicle Management
          </h1>

          <p className="av-subtitle">
            Review and manage university vehicle
            registration requests.
          </p>
        </div>

        <button
          type="button"
          className="av-refresh"
          disabled={
            state.status === 'loading' ||
            reviewing ||
            selection !== null
          }
          onClick={handleRefresh}
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
            <path d="M6 7a7 7 0 0 1 12-1l2 6" />
            <path d="m4 12 2 6a7 7 0 0 0 12-1" />
          </svg>

          {state.status === 'loading'
            ? 'Loading...'
            : 'Refresh'}
        </button>
      </header>

      {feedback && (
        <div
          className={`av-feedback av-feedback-${feedbackType}`}
          role={
            feedbackType === 'error'
              ? 'alert'
              : 'status'
          }
        >
          <span>{feedback}</span>

          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setFeedback('')}
          >
            ×
          </button>
        </div>
      )}

      {state.status === 'loading' && (
        <div
          className="av-state-panel"
          role="status"
        >
          <span
            className="av-spinner"
            aria-hidden="true"
          />

          <h2>Loading vehicles</h2>

          <p>
            Retrieving current vehicle registrations.
          </p>
        </div>
      )}

      {state.status === 'error' && (
        <div
          className="av-state-panel av-error-panel"
          role="alert"
        >
          <h2>Unable to load vehicles</h2>

          <p>{state.message}</p>

          <button
            type="button"
            className="av-primary"
            onClick={handleRefresh}
          >
            Try again
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <>
          <section
            className="av-stats"
            aria-label="Vehicle registration statistics"
          >
            {[
              {
                label: 'Total vehicles',
                value: statistics.total,
                variant: 'total',
              },
              {
                label: 'Pending requests',
                value: statistics.pending,
                variant: 'pending',
              },
              {
                label: 'Approved vehicles',
                value: statistics.approved,
                variant: 'approved',
              },
              {
                label: 'Rejected vehicles',
                value: statistics.rejected,
                variant: 'rejected',
              },
            ].map(stat => (
              <article
                className={`av-stat av-stat-${stat.variant}`}
                key={stat.variant}
              >
                <span>{stat.label}</span>

                <strong>{stat.value}</strong>
              </article>
            ))}
          </section>

          {/* REVIEW CONFIRMATION PANEL */}

          {selection && (
            <div
              ref={reviewPanelRef}
              tabIndex={-1}
              className={`av-review-panel av-review-${selection.action}`}
              role="region"
              aria-labelledby="av-review-title"
              aria-busy={reviewing}
            >
              <div className="av-review-heading">
                <div>
                  <p className="av-eyebrow">
                    Confirm registration review
                  </p>

                  <h2 id="av-review-title">
                    {selection.action === 'approve'
                      ? 'Approve vehicle registration?'
                      : 'Reject vehicle registration?'}
                  </h2>
                </div>
              </div>

              <div className="av-review-vehicle">
                <div>
                  <span>Vehicle</span>
                  <strong>
                    {getVehicleName(selection.vehicle)}
                  </strong>
                </div>

                <div>
                  <span>License plate</span>
                  <strong>
                    <bdi>
                      {selection.vehicle.plateNumber}
                    </bdi>
                  </strong>
                </div>

                <div>
                  <span>Registered owner</span>
                  <strong>
                    {selection.vehicle.owner.fullName}
                  </strong>
                  <small>
                    {selection.vehicle.owner.universityId}
                  </small>
                </div>
              </div>

              <p className="av-review-description">
                {selection.action === 'approve'
                  ? 'This registration will be marked as approved and the decision will be saved to the vehicle record.'
                  : 'This registration will be marked as rejected. The owner will be able to view the rejection reason.'}
              </p>

              <p className="av-review-notice">
                This review decision cannot currently
                be reversed.
              </p>

              {selection.action === 'reject' && (
                <div className="av-reason-field">
                  <label htmlFor="av-rejection-reason">
                    Rejection reason
                    <span aria-hidden="true"> *</span>
                  </label>

                  <textarea
                    id="av-rejection-reason"
                    value={rejectionReason}
                    maxLength={500}
                    rows={4}
                    required
                    disabled={reviewing}
                    placeholder="Explain why this vehicle registration is being rejected..."
                    aria-describedby="av-reason-count"
                    onChange={event => {
                      setRejectionReason(event.target.value)
                      setReviewError('')
                    }}
                  />

                  <span
                    className="av-character-count"
                    id="av-reason-count"
                  >
                    {rejectionReason.length}/500 characters
                  </span>
                </div>
              )}

              {reviewError && (
                <p
                  className="av-review-error"
                  role="alert"
                >
                  {reviewError}
                </p>
              )}

              <div className="av-review-actions">
                <button
                  type="button"
                  className="av-secondary"
                  disabled={reviewing}
                  onClick={cancelReview}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className={
                    selection.action === 'approve'
                      ? 'av-confirm-approve'
                      : 'av-confirm-reject'
                  }
                  disabled={
                    reviewing ||
                    (
                      selection.action === 'reject' &&
                      (
                        !rejectionReason.trim() ||
                        rejectionReason.trim().length > 500
                      )
                    )
                  }
                  onClick={() => void confirmReview()}
                >
                  {reviewing
                    ? 'Saving decision...'
                    : selection.action === 'approve'
                      ? 'Confirm approval'
                      : 'Confirm rejection'}
                </button>
              </div>
            </div>
          )}

          {/* VEHICLE REGISTRATION TABLE */}

          <section
            className="av-section"
            aria-labelledby="av-registrations-heading"
          >
            <div className="av-section-heading">
              <div>
                <h2 id="av-registrations-heading">
                  Vehicle Registrations
                </h2>

                <p>
                  Search and review registered vehicles.
                </p>
              </div>

              <span className="av-result-count">
                {filteredVehicles.length} of{' '}
                {vehicles.length} vehicles
              </span>
            </div>

            <div className="av-toolbar">
              <div className="av-search-field">
                <label htmlFor="av-search">
                  Search vehicles
                </label>

                <div className="av-search-input">
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <circle cx="10.5" cy="10.5" r="6.5" />
                    <path d="m16 16 4 4" />
                  </svg>

                  <input
                    id="av-search"
                    type="search"
                    value={query}
                    disabled={selection !== null}
                    placeholder="Plate, vehicle, owner or university ID..."
                    onChange={event =>
                      setQuery(event.target.value)
                    }
                  />
                </div>
              </div>

              <div
                className="av-filters"
                role="group"
                aria-label="Filter by approval status"
              >
                {statusFilters.map(status => (
                  <button
                    key={status}
                    type="button"
                    className={`av-filter ${
                      filter === status
                        ? 'av-filter-active'
                        : ''
                    }`}
                    aria-pressed={filter === status}
                    disabled={selection !== null}
                    onClick={() => setFilter(status)}
                  >
                    {status}

                    <span>
                      {filterCounts[status]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {filteredVehicles.length === 0 ? (
              <div className="av-empty-state">
                <h3>
                  {vehicles.length === 0
                    ? 'No vehicle registrations'
                    : 'No matching vehicles'}
                </h3>

                <p>
                  {vehicles.length === 0
                    ? 'Vehicle registrations will appear here when submitted.'
                    : 'Try changing the search or approval status filter.'}
                </p>

                {vehicles.length > 0 && (
                  <button
                    type="button"
                    className="av-secondary"
                    onClick={() => {
                      setQuery('')
                      setFilter('All')
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="av-table-wrap">
                <table className="av-table">
                  <thead>
                    <tr>
                      <th scope="col">Vehicle</th>
                      <th scope="col">Registered owner</th>
                      <th scope="col">Registration date</th>
                      <th scope="col">Status</th>
                      <th scope="col">Review details</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredVehicles.map(vehicle => (
                      <tr key={vehicle.id}>
                        <td>
                          <div className="av-vehicle-name">
                            {getVehicleName(vehicle)}
                          </div>

                          <bdi className="av-plate">
                            {vehicle.plateNumber}
                          </bdi>

                          <span className="av-secondary-text">
                            {vehicle.color || 'Color not recorded'}
                          </span>
                        </td>

                        <td>
                          <strong className="av-owner-name">
                            {vehicle.owner.fullName}
                          </strong>

                          <span className="av-secondary-text">
                            {vehicle.owner.universityId}
                          </span>

                          {vehicle.owner.department && (
                            <span className="av-secondary-text">
                              {vehicle.owner.department}
                            </span>
                          )}
                        </td>

                        <td>
                          <time dateTime={vehicle.registeredAt}>
                            {formatDate(vehicle.registeredAt)}
                          </time>
                        </td>

                        <td>
                          <span
                            className={`av-status av-status-${vehicle.approvalStatus.toLowerCase()}`}
                          >
                            {vehicle.approvalStatus}
                          </span>
                        </td>

                        <td className="av-review-details">
                          {vehicle.approvalStatus === 'Pending' ? (
                            vehicle.canApprove === true ? (
                              <span className="av-eligible">
                                Eligible for review
                              </span>
                            ) : (
                              <div className="av-blocked">
                                <strong>
                                  Approval unavailable
                                </strong>

                                <span>
                                  {vehicle.approvalBlockedReason ||
                                    'Approval eligibility could not be verified.'}
                                </span>
                              </div>
                            )
                          ) : (
                            <>
                              <span className="av-secondary-text">
                                Reviewed
                              </span>

                              {vehicle.reviewedAt ? (
                                <time dateTime={vehicle.reviewedAt}>
                                  {formatDate(vehicle.reviewedAt)}
                                </time>
                              ) : (
                                <span>Not recorded</span>
                              )}

                              {vehicle.approvalStatus === 'Rejected' &&
                                vehicle.rejectionReason && (
                                  <div className="av-rejection-note">
                                    <strong>
                                      Rejection reason
                                    </strong>

                                    <p>
                                      {vehicle.rejectionReason}
                                    </p>
                                  </div>
                                )}
                            </>
                          )}
                        </td>

                        <td>
                          {vehicle.approvalStatus === 'Pending' ? (
                            <div className="av-actions">
                              <button
                                type="button"
                                className="av-approve"
                                disabled={
                                  vehicle.canApprove !== true ||
                                  selection !== null ||
                                  reviewing
                                }
                                aria-label={`Approve ${vehicle.plateNumber}`}
                                onClick={() =>
                                  openReview(vehicle, 'approve')
                                }
                              >
                                Approve
                              </button>

                              <button
                                type="button"
                                className="av-reject"
                                disabled={
                                  selection !== null ||
                                  reviewing
                                }
                                aria-label={`Reject ${vehicle.plateNumber}`}
                                onClick={() =>
                                  openReview(vehicle, 'reject')
                                }
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="av-reviewed-label">
                              Review completed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  )
}
