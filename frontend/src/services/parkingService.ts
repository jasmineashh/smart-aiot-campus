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

async function parkingFetch<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
    headers: { Accept: 'application/json' },
  })
  if (response.status === 401) throw new Error('Your session has expired. Please sign in again.')
  if (response.status === 403) throw new Error('You do not have permission to view parking data.')
  if (response.status === 404) throw new Error('This parking zone could not be found.')
  if (!response.ok) throw new Error('Unable to load parking information.')
  return (await response.json()) as T
}

export function getParkingZones(signal?: AbortSignal): Promise<ParkingZone[]> {
  return parkingFetch<ParkingZone[]>('/api/parking/zones', signal)
}

export function getParkingZoneDetails(zoneId: string, signal?: AbortSignal): Promise<ParkingZoneDetails> {
  return parkingFetch<ParkingZoneDetails>(`/api/parking/zones/${encodeURIComponent(zoneId)}`, signal)
}

export interface RegisteredVehicle {
  id: string
  plateNumber: string
  make: string | null
  model: string | null
  color: string | null
  isApproved: boolean
  registeredAt: string
}

export function getMyVehicles(
  signal?: AbortSignal
): Promise<RegisteredVehicle[]> {
  return parkingFetch<RegisteredVehicle[]>(
    '/api/parking/my-vehicles',
    signal
  )
}

