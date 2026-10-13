
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

export async function getParkingZones(
  signal?: AbortSignal
): Promise<ParkingZone[]> {
  const response = await fetch('/api/parking/zones', {
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

  if (!response.ok) {
    throw new Error(
      'Unable to load parking information.'
    )
  }

  return (await response.json()) as ParkingZone[]
}
