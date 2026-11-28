// ==========================================
// PARKING ZONE TYPES
// ==========================================

export interface ParkingZone {
  id: string
  code: string
  name: string
  description: string | null
  zoneType: string
  isActive: boolean
  mapX: number | null
  mapY: number | null
  totalSpaces: number
  availableSpaces: number
  occupiedSpaces: number
  unknownSpaces: number
  outOfServiceSpaces: number
}

export interface ParkingSpace {
  id: string
  spaceNumber: string
  status: string | number
  type: string
  lastUpdatedAt: string | null
}

export interface ParkingZoneDetails {
  id: string
  code: string
  name: string
  description: string | null
  zoneType: string
  isActive: boolean
  mapX: number | null
  mapY: number | null
  spaces: ParkingSpace[]
}

// ==========================================
// VEHICLE TYPES
// ==========================================

export type VehicleApprovalStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'

export type VehicleBodyType =
  | 'Sedan'
  | 'SUV'
  | 'Hatchback'
  | 'Coupe'
  | 'Pickup'
  | 'Van'
  | 'Wagon'
  | 'Convertible'

export interface RegisteredVehicle {
  id: string
  plateNumber: string
  make: string | null
  model: string | null
  color: string | null
  isApproved: boolean
  approvalStatus: VehicleApprovalStatus
  registeredAt: string
  reviewedAt: string | null
  rejectionReason: string | null
}

// ==========================================
// VEHICLE CATALOG TYPES
// ==========================================

export interface VehicleBrand {
  name: string
  models: string[]
}

export interface VehicleColor {
  name: string
  hex: string
}

export interface VehicleModelBodyTypes {
  brand: string
  model: string
  bodyTypes: VehicleBodyType[]
}

export interface VehicleCatalog {
  brands: VehicleBrand[]
  colors: VehicleColor[]
  bodyTypes: VehicleBodyType[]
  modelBodyTypes: VehicleModelBodyTypes[]
}

// ==========================================
// REGISTRATION REQUEST AND RESPONSE
// ==========================================

export interface RegisterVehicleRequest {
  plateNumber: string
  make: string
  model: string
  color: string
}

export interface RegisterVehicleResponse {
  message: string
  vehicle: RegisteredVehicle
}

interface CsrfResponse {
  requestToken: string
}

interface ApiErrorResponse {
  message?: string
}

// ==========================================
// API ERROR HANDLER
// ==========================================

async function getApiError(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const data =
      (await response.json()) as ApiErrorResponse

    if (
      typeof data.message === 'string' &&
      data.message.trim()
    ) {
      return data.message
    }
  } catch {
    // Use fallback for non-JSON responses.
  }

  return fallback
}

// ==========================================
// AUTHENTICATED GET REQUEST
// ==========================================

async function parkingFetch<T>(
  url: string,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    signal,

    headers: {
      Accept: 'application/json',
    },
  })

  if (response.status === 401) {
    throw new Error(
      'Your session has expired. Please sign in again.'
    )
  }

  if (response.status === 403) {
    throw new Error(
      'You do not have permission to view parking data.'
    )
  }

  if (response.status === 404) {
    throw new Error(
      'The requested parking resource could not be found.'
    )
  }

  if (!response.ok) {
    throw new Error(
      await getApiError(
        response,
        'Unable to load parking information.'
      )
    )
  }

  return (await response.json()) as T
}

// ==========================================
// CSRF TOKEN
// ==========================================

async function getParkingCsrfToken():
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
    throw new Error(
      'Unable to secure your request. Please try again.'
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
// PARKING ZONE ENDPOINTS
// ==========================================

export function getParkingZones(
  signal?: AbortSignal
): Promise<ParkingZone[]> {
  return parkingFetch<ParkingZone[]>(
    '/api/parking/zones',
    signal
  )
}

export function getParkingZoneDetails(
  zoneId: string,
  signal?: AbortSignal
): Promise<ParkingZoneDetails> {
  return parkingFetch<ParkingZoneDetails>(
    `/api/parking/zones/${encodeURIComponent(zoneId)}`,
    signal
  )
}

// ==========================================
// MY VEHICLES ENDPOINT
// ==========================================

export function getMyVehicles(
  signal?: AbortSignal
): Promise<RegisteredVehicle[]> {
  return parkingFetch<RegisteredVehicle[]>(
    '/api/parking/my-vehicles',
    signal
  )
}

// ==========================================
// VEHICLE CATALOG ENDPOINT
// ==========================================

export async function getVehicleCatalog(
  signal?: AbortSignal
): Promise<VehicleCatalog> {
  const catalog =
    await parkingFetch<VehicleCatalog>(
      '/api/parking/vehicle-catalog',
      signal
    )

  if (
    !Array.isArray(catalog.brands) ||
    !Array.isArray(catalog.colors) ||
    !Array.isArray(catalog.bodyTypes) ||
    !Array.isArray(catalog.modelBodyTypes)
  ) {
    throw new Error(
      'Vehicle options are temporarily unavailable. ' +
      'Please try again.'
    )
  }

  return catalog
}

// ==========================================
// BODY TYPE SELECTION
// ==========================================

export function getAvailableBodyTypes(
  catalog: VehicleCatalog | null,
  brand: string,
  model: string
): VehicleBodyType[] {
  if (!catalog || !brand || !model) {
    return []
  }

  const selectedBrand = catalog.brands.find(
    item => item.name === brand
  )

  if (
    !selectedBrand ||
    !selectedBrand.models.includes(model)
  ) {
    return []
  }

  const classification =
    catalog.modelBodyTypes.find(
      item =>
        item.brand === brand &&
        item.model === model
    )

  if (
    classification &&
    classification.bodyTypes.length > 0
  ) {
    return classification.bodyTypes
  }

  // If a catalog model has no classification,
  // allow the user to select a supported style.

  return catalog.bodyTypes
}

// ==========================================
// REGISTER VEHICLE ENDPOINT
// ==========================================

export async function registerVehicle(
  vehicle: RegisterVehicleRequest
): Promise<RegisterVehicleResponse> {
  const csrfToken =
    await getParkingCsrfToken()

  const response = await fetch(
    '/api/parking/my-vehicles',
    {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',

      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken,
      },

      body: JSON.stringify({
        plateNumber: vehicle.plateNumber,
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color,
      }),
    }
  )

  if (response.status === 401) {
    throw new Error(
      'Your session has expired. Please sign in again.'
    )
  }

  if (response.status === 403) {
    throw new Error(
      'Your account does not have permission ' +
      'to register vehicles.'
    )
  }

  if (response.status === 409) {
    throw new Error(
      await getApiError(
        response,
        'This license plate is already registered.'
      )
    )
  }

  if (response.status === 400) {
    throw new Error(
      await getApiError(
        response,
        'Please check your vehicle information.'
      )
    )
  }

  if (!response.ok) {
    throw new Error(
      await getApiError(
        response,
        'Unable to register your vehicle. Please try again.'
      )
    )
  }

  return (
    await response.json()
  ) as RegisterVehicleResponse
}
