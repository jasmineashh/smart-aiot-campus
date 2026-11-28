
import type {
  RegisteredVehicle,
  VehicleApprovalStatus,
} from './parkingService'

// ==========================================
// VEHICLE OWNER INFORMATION
// ==========================================

export interface AdminVehicleOwner {
  id: string
  fullName: string
  universityId: string
  email: string | null
  department: string | null
}

// ==========================================
// ADMINISTRATOR VEHICLE RECORD
// ==========================================

export interface AdminVehicle
  extends RegisteredVehicle {
  reviewedById: string | null
  owner: AdminVehicleOwner

  // Server-calculated approval eligibility.
  canApprove: boolean
  approvalBlockedReason: string | null
}

// ==========================================
// ADMINISTRATOR STATISTICS
// ==========================================

export interface AdminVehicleStatistics {
  total: number
  pending: number
  approved: number
  rejected: number
}

export interface AdminParkingStatistics {
  activeZones: number
  totalSpaces: number
  availableSpaces: number
  occupiedSpaces: number
  unknownSpaces: number
  outOfServiceSpaces: number

  occupancyPercentage: number | null
}

export interface AdminParkingZone {
  id: string
  code: string
  name: string
  totalSpaces: number
  availableSpaces: number
  occupiedSpaces: number
  unknownSpaces: number
  outOfServiceSpaces: number
}

// ==========================================
// RECENT VEHICLE APPROVAL REQUESTS
// ==========================================

export interface RecentVehicleRequest {
  id: string
  plateNumber: string
  make: string | null
  model: string | null
  color: string | null

  approvalStatus: VehicleApprovalStatus

  registeredAt: string

  owner: {
    fullName: string
    universityId: string
    department: string | null
  }
}

// ==========================================
// ADMINISTRATOR OVERVIEW RESPONSE
// ==========================================

export interface AdminOverview {
  vehicles: AdminVehicleStatistics

  parking: AdminParkingStatistics

  zones: AdminParkingZone[]

  recentRequests: RecentVehicleRequest[]

  generatedAt: string
}

// ==========================================
// VEHICLE REVIEW RESPONSE
// ==========================================

export interface VehicleReviewResponse {
  message: string
  vehicle: AdminVehicle
}

interface CsrfResponse {
  requestToken: string
}

interface ApiErrorResponse {
  message?: string
  currentStatus?: VehicleApprovalStatus
}

// ==========================================
// API ERROR CLASS
// ==========================================

export class ParkingAdminApiError extends Error {
  status: number

  currentStatus?: VehicleApprovalStatus

  constructor(
    message: string,
    status: number,
    currentStatus?: VehicleApprovalStatus
  ) {
    super(message)

    this.name = 'ParkingAdminApiError'
    this.status = status
    this.currentStatus = currentStatus
  }
}

// ==========================================
// API ERROR HANDLING
// ==========================================

async function handleApiError(
  response: Response,
  fallback: string
): Promise<never> {
  let message = fallback

  let currentStatus:
    VehicleApprovalStatus | undefined

  switch (response.status) {
    case 400:
      message =
        'Please check the submitted information.'
      break

    case 401:
      message =
        'Your session has expired. Please sign in again.'
      break

    case 403:
      message =
        'You do not have permission to perform this operation.'
      break

    case 404:
      message =
        'The requested record could not be found.'
      break

    case 409:
      message =
        'This registration has already been reviewed. ' +
        'Please refresh the page.'
      break

    case 500:
      message =
        'The server encountered an error. Please try again.'
      break
  }

  try {
    const data =
      (await response.json()) as ApiErrorResponse

    if (
      typeof data.message === 'string' &&
      data.message.trim()
    ) {
      message = data.message
    }

    if (
      data.currentStatus === 'Pending' ||
      data.currentStatus === 'Approved' ||
      data.currentStatus === 'Rejected'
    ) {
      currentStatus = data.currentStatus
    }
  } catch {
    // Preserve the fallback message for
    // empty or non-JSON responses.
  }

  throw new ParkingAdminApiError(
    message,
    response.status,
    currentStatus
  )
}

// ==========================================
// AUTHENTICATED ADMINISTRATOR GET REQUEST
// ==========================================

async function adminFetch<T>(
  path: string,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(
    `/api/parking/admin${path}`,
    {
      method: 'GET',

      credentials: 'same-origin',

      cache: 'no-store',

      signal,

      headers: {
        Accept: 'application/json',
      },
    }
  )

  if (!response.ok) {
    return handleApiError(
      response,
      'Unable to load parking management information.'
    )
  }

  return (await response.json()) as T
}

// ==========================================
// OBTAIN FRESH CSRF TOKEN
// ==========================================

async function getAdminCsrfToken():
  Promise<string> {
  const response = await fetch(
    '/api/auth/csrf',
    {
      method: 'GET',

      credentials: 'same-origin',

      cache: 'no-store',

      headers: {
        Accept: 'application/json',
      },
    }
  )

  if (!response.ok) {
    return handleApiError(
      response,
      'Unable to secure the request.'
    )
  }

  const data =
    (await response.json()) as CsrfResponse

  if (
    typeof data.requestToken !== 'string' ||
    !data.requestToken.trim()
  ) {
    throw new Error(
      'Unable to obtain a valid request token.'
    )
  }

  return data.requestToken
}

// ==========================================
// AUTHENTICATED ADMINISTRATOR POST REQUEST
// ==========================================

async function adminPost<T>(
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const csrfToken =
    await getAdminCsrfToken()

  const headers: Record<string, string> = {
    Accept: 'application/json',

    'X-CSRF-TOKEN': csrfToken,
  }

  if (body !== undefined) {
    headers['Content-Type'] =
      'application/json'
  }

  const response = await fetch(
    `/api/parking/admin${path}`,
    {
      method: 'POST',

      credentials: 'same-origin',

      cache: 'no-store',

      headers,

      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
    }
  )

  if (!response.ok) {
    return handleApiError(
      response,
      'Unable to complete the vehicle review.'
    )
  }

  return (await response.json()) as T
}

// ==========================================
// GET ADMINISTRATOR OVERVIEW
// ==========================================

export function getAdminOverview(
  signal?: AbortSignal
): Promise<AdminOverview> {
  return adminFetch<AdminOverview>(
    '/overview',
    signal
  )
}

// ==========================================
// GET ALL REGISTERED VEHICLES
// ==========================================

export function getAdminVehicles(
  signal?: AbortSignal
): Promise<AdminVehicle[]> {
  return adminFetch<AdminVehicle[]>(
    '/vehicles',
    signal
  )
}

// ==========================================
// APPROVE A PENDING VEHICLE
// ==========================================

export function approveVehicle(
  vehicleId: string
): Promise<VehicleReviewResponse> {
  const id = vehicleId.trim()

  if (!id) {
    return Promise.reject(
      new Error(
        'A valid vehicle registration is required.'
      )
    )
  }

  return adminPost<VehicleReviewResponse>(
    `/vehicles/${encodeURIComponent(id)}/approve`
  )
}

// ==========================================
// REJECT A PENDING VEHICLE
// ==========================================

export function rejectVehicle(
  vehicleId: string,
  reason: string
): Promise<VehicleReviewResponse> {
  const id = vehicleId.trim()

  const cleanReason =
    reason.trim()

  if (!id) {
    return Promise.reject(
      new Error(
        'A valid vehicle registration is required.'
      )
    )
  }

  if (!cleanReason) {
    return Promise.reject(
      new Error(
        'Please provide a rejection reason.'
      )
    )
  }

  if (cleanReason.length > 500) {
    return Promise.reject(
      new Error(
        'The rejection reason must not exceed 500 characters.'
      )
    )
  }

  return adminPost<VehicleReviewResponse>(
    `/vehicles/${encodeURIComponent(id)}/reject`,

    {
      reason: cleanReason,
    }
  )
}
