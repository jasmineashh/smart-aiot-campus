import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import {
  getParkingZones,
  getParkingZoneDetails,
  type ParkingZone,
  type ParkingSpace,
} from '../../services/parkingService'
import './ParkingPage.css'
import './ParkingRedesign.css'

interface ParkingPageProps { onBack: () => void }

type ZoneKey = 'P1' | 'P2' | 'P3' | 'P4'
const CAMPUS_AREAS: {
  code: ZoneKey
  name: string
  planned: number
  x: number
  y: number
  color: string
}[] = [
  { code: 'P1', name: 'Main Gate Parking', planned: 200, x: 12.5, y: 37.5, color: '#1265d5' },
  { code: 'P2', name: 'Building G Parking', planned: 150, x: 42.6, y: 70.5, color: '#17713b' },
  { code: 'P3', name: 'Residential Parking', planned: 100, x: 60.4, y: 15.5, color: '#df2480' },
  { code: 'P4', name: 'Administration Parking', planned: 50, x: 22.1, y: 61.4, color: '#6730bf' },
]

// ASP.NET currently serializes the Standard parking-space type as numeric 0.
// Keep other values explicit until their backend enum labels are confirmed.
function displaySpaceType(value: ParkingSpace['type']): string {
  if (String(value).toLowerCase() === '0' || String(value).toLowerCase() === 'standard') return 'Standard'
  if (value === null || value === undefined || String(value).trim() === '') return 'Not specified'
  return typeof value === 'number' ? `Type ${value}` : String(value)
}

function normalizeStatus(value: ParkingSpace['status']): string {
  const values = ['Available', 'Occupied', 'OutOfService', 'Unknown']
  if (typeof value === 'number') return values[value] ?? 'Unknown'
  const name = String(value).toLowerCase().replace(/[^a-z]/g, '')
  return values.find(s => s.toLowerCase() === name) ?? 'Unknown'
}

export default function ParkingPage({ onBack }: ParkingPageProps) {
  const [zones, setZones] = useState<ParkingZone[]>([])
  const [selectedCode, setSelectedCode] = useState<ZoneKey | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const loadZones = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const result = await getParkingZones(signal)
      if (signal?.aborted) return
      setZones(result.filter(z => z.isActive))
      setLastRefreshed(new Date())
    } catch (err) {
      if (!signal?.aborted) setError(err instanceof Error ? err.message : 'Unable to load parking zones.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadZones(controller.signal)
    return () => controller.abort()
  }, [loadZones])

  const area = CAMPUS_AREAS.find(a => a.code === selectedCode)
  const chosenZone = zones.find(z => z.code.toUpperCase() === selectedCode)

  return (
    <div className="p2-page">
      {selectedCode && area ? (
        <ZoneSpacePage
          key={selectedCode}
          area={area}
          zone={chosenZone}
          onBack={() => setSelectedCode(null)}
        />
      ) : (
        <>
          <header className="p2-heading">
            <div>
              <button className="p2-text-button" type="button" onClick={onBack}>← Back to Overview</button>
              <span className="p2-eyebrow">SMART CAMPUS / PARKING</span>
              <h1>Find your parking spot</h1>
              <p>Explore the campus and select a parking area to view individual spaces.</p>
            </div>
            <button className="p2-outline-button" type="button" onClick={() => void loadZones()} disabled={loading}>
              {loading ? 'Loading…' : '↻ Refresh'}
            </button>
          </header>

          <div className="p2-notice" role="note">
            <strong>Development preview</strong> · The map depicts planned parking zones. Availability comes from the database, not live sensors yet.
          </div>

          <CampusMap onChoose={setSelectedCode} />

          {error && <div className="p2-error" role="alert">{error} <button type="button" onClick={() => void loadZones()}>Retry</button></div>}

          <section className="p2-zone-list" aria-labelledby="p2-zone-list-heading">
            <div className="p2-section-top">
              <div><h2 id="p2-zone-list-heading">Campus parking areas</h2><p>Choose a zone to explore its parking spaces.</p></div>
              <span>{zones.length} zones synced</span>
            </div>
            <div className="p2-zone-grid">
              {CAMPUS_AREAS.map(a => {
                const z = zones.find(item => item.code.toUpperCase() === a.code)
                return (
                  <button type="button" className="p2-zone-card" key={a.code} onClick={() => setSelectedCode(a.code)}>
                    <span className="p2-zone-marker" style={{ backgroundColor: a.color }}>{a.code}</span>
                    <strong>{a.name}</strong>
                    <span>{z ? `${z.totalSpaces} total spaces` : `${a.planned} planned spaces · not synced`}</span>
                    <span className="p2-zone-status">
                      {z ? (z.unknownSpaces === z.totalSpaces ? 'Availability not measured' : `${z.availableSpaces} available · ${z.unknownSpaces} unknown`) : 'Database records pending'}
                    </span>
                    <span className="p2-zone-arrow">View spaces →</span>
                  </button>
                )
              })}
            </div>
            {lastRefreshed && <p className="p2-last-refreshed">Last fetched: {lastRefreshed.toLocaleTimeString()}</p>}
          </section>
        </>
      )}
    </div>
  )
}

function CampusMap({ onChoose }: { onChoose: (code: ZoneKey) => void }) {
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [fullMap, setFullMap] = useState(true)
  const drag = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null)

  function changeZoom(value: number) {
    setZoom(current => {
      const next = Math.max(1, Math.min(3, Math.round((current + value) * 100) / 100))
      if (next === 1) setOffset({ x: 0, y: 0 })
      return next
    })
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || zoom === 1) return
    drag.current = { startX: event.clientX, startY: event.clientY, x: offset.x, y: offset.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    setOffset({ x: drag.current.x + event.clientX - drag.current.startX, y: drag.current.y + event.clientY - drag.current.startY })
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <section className="p2-map-card" aria-label="Interactive campus parking map">
      <div className="p2-map-top">
        <div><h2>Campus Parking Map</h2><p>Click P1, P2, P3 or P4 directly on the map.</p></div>
        <div className="p2-map-toggle" role="group" aria-label="Map display">
          <button type="button" aria-pressed={fullMap} className={fullMap ? 'active' : ''} onClick={() => setFullMap(true)}>Full map + index</button>
          <button type="button" aria-pressed={!fullMap} className={!fullMap ? 'active' : ''} onClick={() => setFullMap(false)}>Map only</button>
        </div>
      </div>
      <div className={`p2-map-viewport ${fullMap ? '' : 'p2-map-viewport--focused'}`}>
        <div
          className="p2-map-layer"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, cursor: zoom > 1 ? 'grab' : 'default' }}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
        >
          <img src="/campus-map.png" alt="Illustrated campus map showing P1 Main Gate, P2 Building G, P3 Residential, and P4 Administration parking" draggable={false} />
          {CAMPUS_AREAS.map(a => (
            <button
              key={a.code}
              type="button"
              className="p2-map-hotspot"
              style={{ left: `${a.x}%`, top: `${a.y}%` }}
              title={`Open ${a.name}`}
              aria-label={`Open ${a.name} parking spaces`}
              onPointerDown={event => event.stopPropagation()}
              onClick={() => onChoose(a.code)}
            >
              <span className="p2-screenreader">{a.name}</span>
            </button>
          ))}
        </div>
        <div className="p2-map-controls">
          <button type="button" onClick={() => changeZoom(0.25)} aria-label="Zoom in" disabled={zoom >= 3}>+</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => changeZoom(-0.25)} aria-label="Zoom out" disabled={zoom <= 1}>−</button>
          <button type="button" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }) }}>Reset</button>
        </div>
      </div>
      <p className="p2-map-hint">Use + / − to zoom and drag when zoomed in. Parking labels are clickable. The image is illustrative, not a surveyed site plan.</p>
    </section>
  )
}

type Area = typeof CAMPUS_AREAS[number]
function ZoneSpacePage({ area, zone, onBack }: { area: Area; zone?: ParkingZone; onBack: () => void }) {
  const [spaces, setSpaces] = useState<ParkingSpace[]>([])
  const [loading, setLoading] = useState(Boolean(zone))
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [view, setView] = useState<'lot' | 'grid'>('lot')
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null)
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    if (!zone) return
    const controller = new AbortController()
    setLoading(true)
    setError('')
    void getParkingZoneDetails(zone.id, controller.signal)
      .then(result => {
        if (!controller.signal.aborted) {
          setSpaces(result.spaces)
          setSelectedSpace(null)
        }
      })
      .catch(err => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load parking spaces.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [zone?.id, refreshCount])

  const counts = {
    available: spaces.filter(s => normalizeStatus(s.status) === 'Available').length,
    occupied: spaces.filter(s => normalizeStatus(s.status) === 'Occupied').length,
    unknown: spaces.filter(s => normalizeStatus(s.status) === 'Unknown').length,
    outOfService: spaces.filter(s => normalizeStatus(s.status) === 'OutOfService').length,
  }
  const shown = spaces.filter(s =>
    (statusFilter === 'All' || normalizeStatus(s.status) === statusFilter) &&
    s.spaceNumber.toLowerCase().includes(search.trim().toLowerCase())
  )

  return (
    <div className="p2-zone-page">
      <button className="p2-text-button" type="button" onClick={onBack}>← Back to Campus Map</button>
      <div className="p2-zone-page-heading">
        <span className="p2-zone-marker" style={{ backgroundColor: area.color }}>{area.code}</span>
        <div><span className="p2-eyebrow">PARKING AREA DETAILS</span><h1>{area.name}</h1><p>Individual parking spaces · database-backed status</p></div>
        {zone && <button className="p2-outline-button" type="button" onClick={() => setRefreshCount(n => n + 1)} disabled={loading}>↻ Refresh</button>}
      </div>
      {!zone ? (
        <div className="p2-empty" role="status">
          <h2>Parking records not synced yet</h2>
          <p>{area.name} has a planned capacity of {area.planned} spaces, but this zone has not been added to the connected database. No availability is shown until records are imported.</p>
        </div>
      ) : (
        <>
          <div className="p2-summary-grid">
            <Summary label="Total spaces" value={zone.totalSpaces} />
            <Summary label="Available" value={zone.availableSpaces} />
            <Summary label="Occupied" value={zone.occupiedSpaces} />
            <Summary label="Unknown" value={zone.unknownSpaces} />
          </div>
          <div className="p2-zone-info">No live occupancy is assumed. Unknown means no verified sensor or camera reading.</div>
          <section className="p2-spaces-card" aria-label={`${area.name} parking spaces`}>
            <div className="p2-section-top">
              <div><h2>Select a parking space</h2><p>Search or filter by current recorded status.</p></div>
              <span>{loading ? 'Loading…' : `${shown.length} of ${spaces.length} shown`}</span>
            </div>
            <div className="p3-lot-toolbar">
              <div className="p3-view-switch" role="group" aria-label="Parking display mode">
                <button type="button" className={view === 'lot' ? 'active' : ''} aria-pressed={view === 'lot'} onClick={() => setView('lot')}>▤ Lot view</button>
                <button type="button" className={view === 'grid' ? 'active' : ''} aria-pressed={view === 'grid'} onClick={() => setView('grid')}>▦ Grid view</button>
              </div>
              <span className="p3-lot-disclaimer">Illustrative row arrangement — not a surveyed parking layout</span>
            </div>
            <div className="p2-space-filters">
              <label>Search space<input type="search" value={search} placeholder={`e.g. ${area.code}-025`} onChange={e => { setSearch(e.target.value); setSelectedSpace(null) }} /></label>
              <label>Status<select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setSelectedSpace(null) }}>
                {['All', 'Available', 'Occupied', 'Unknown', 'OutOfService'].map(s => <option key={s} value={s}>{s === 'OutOfService' ? 'Out of service' : s}</option>)}
              </select></label>
            </div>
            {error ? <div className="p2-error" role="alert">{error} <button type="button" onClick={() => setRefreshCount(n => n + 1)}>Retry</button></div>
              : loading ? <p role="status">Loading parking spaces…</p>
              : shown.length === 0 ? <div className="p2-empty">No spaces match the current filters.</div>
              : view === 'lot' ? (
                  <div className="p4-lot-workspace">
                    <ParkingLotLayout
                      area={area}
                      spaces={spaces}
                      shownIds={new Set(shown.map(s => s.id))}
                      searchTerm={search}
                      selectedId={selectedSpace?.id ?? null}
                      onSelect={setSelectedSpace}
                    />
                    <aside className="p4-info-sidebar" aria-label="Parking lot information">
                      <section className="p4-info-card">
                        <span className="p4-sidebar-eyebrow">SPACE INSPECTOR</span>
                        <h3>{selectedSpace ? selectedSpace.spaceNumber : 'Select a parking bay'}</h3>
                        {selectedSpace ? (
                          <>
                            <span className={`p4-status-pill p4-status--${normalizeStatus(selectedSpace.status).toLowerCase()}`}>
                              {normalizeStatus(selectedSpace.status) === 'OutOfService' ? 'Out of service' : normalizeStatus(selectedSpace.status)}
                            </span>
                            <dl className="p4-space-meta">
                              <div><dt>Zone</dt><dd>{area.name}</dd></div>
                              <div><dt>Space type</dt><dd>{displaySpaceType(selectedSpace.type)}</dd></div>
                              <div><dt>Last updated</dt><dd>{selectedSpace.lastUpdatedAt ? new Date(selectedSpace.lastUpdatedAt).toLocaleString() : 'Not recorded'}</dd></div>
                            </dl>
                            <button className="p4-clear-space" type="button" onClick={() => setSelectedSpace(null)}>Clear selection</button>
                          </>
                        ) : <p>Click any numbered bay in the lot to inspect its recorded status. Selecting a bay does not reserve it.</p>}
                      </section>
                      <section className="p4-info-card">
                        <span className="p4-sidebar-eyebrow">STATUS LEGEND</span>
                        <h3>Parking status</h3>
                        <ul className="p4-status-list">
                          <li><i className="p4-dot p4-dot--available"/> Available <strong>{counts.available}</strong></li>
                          <li><i className="p4-dot p4-dot--occupied"/> Occupied <strong>{counts.occupied}</strong></li>
                          <li><i className="p4-dot p4-dot--unknown"/> Unknown <strong>{counts.unknown}</strong></li>
                          <li><i className="p4-dot p4-dot--outofservice"/> Out of service <strong>{counts.outOfService}</strong></li>
                        </ul>
                        <p className="p4-legend-footnote">All data comes from your campus database; the row drawing is illustrative.</p>
                      </section>
                    </aside>
                  </div>
                ) : <div className="p2-space-grid">
                  {shown.map(s => {
                    const status = normalizeStatus(s.status)
                    return <button
                      key={s.id}
                      type="button"
                      aria-pressed={selectedSpace?.id === s.id}
                      className={`p2-space p2-space--${status.toLowerCase()} ${selectedSpace?.id === s.id ? 'p2-space--chosen' : ''}`}
                      onClick={() => setSelectedSpace(s)}
                    ><span className="p2-space-icon">▣</span><strong>{s.spaceNumber}</strong><small>{status === 'OutOfService' ? 'Out of service' : status}</small></button>
                  })}
                </div>}
            {view === 'grid' && selectedSpace && <div className="p2-space-details">
              <strong>{selectedSpace.spaceNumber}</strong>
              <span>Status: {normalizeStatus(selectedSpace.status)}</span>
              <span>Type: {displaySpaceType(selectedSpace.type)}</span>
              <span>Updated: {selectedSpace.lastUpdatedAt ? new Date(selectedSpace.lastUpdatedAt).toLocaleString() : 'Not recorded'}</span>
              <button type="button" onClick={() => setSelectedSpace(null)}>Close</button>
            </div>}
            {view === 'grid' && <div className="p2-key" aria-label="Parking status legend">
              <span>🟢 Available ({counts.available})</span><span>🟠 Occupied ({counts.occupied})</span><span>⚪ Unknown ({counts.unknown})</span><span>⚫ Out of service ({counts.outOfService})</span>
            </div>}
          </section>
        </>
      )}
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="p2-summary"><strong>{value}</strong><span>{label}</span></div>
}


// Conceptual sections only: each section displays up to 10 bays above and below a lane.
// These sections do not encode surveyed physical positions or driving directions.
const SECTION_SIZES: Record<ZoneKey, number[]> = {
  P1: Array(10).fill(20),                  // 200 spaces, ten sections
  P2: [...Array(7).fill(20), 10],         // 150 spaces, eight sections
  P3: Array(5).fill(20),                  // 100 spaces, five sections
  P4: [20, 20, 10],                       // 50 spaces, three sections
}

function ParkingLotLayout({ area, spaces, shownIds, searchTerm, selectedId, onSelect }: {
  area: Area
  spaces: ParkingSpace[]
  shownIds: Set<ParkingSpace['id']>
  searchTerm: string
  selectedId: ParkingSpace['id'] | null
  onSelect: (space: ParkingSpace) => void
}) {
  const targetRef = useRef<HTMLButtonElement | null>(null)
  const ordered = [...spaces].sort((a, b) =>
    a.spaceNumber.localeCompare(b.spaceNumber, undefined, { numeric: true })
  )

  const sections: ParkingSpace[][] = []
  let cursor = 0
  for (const size of SECTION_SIZES[area.code]) {
    const section = ordered.slice(cursor, cursor + size)
    if (section.length) sections.push(section)
    cursor += size
  }
  // Keep additional spaces visible if capacities increase later.
  while (cursor < ordered.length) {
    sections.push(ordered.slice(cursor, cursor + 20))
    cursor += 20
  }

  const query = searchTerm.trim().toLowerCase()
  const searchMatch = query
    ? ordered.find(s => shownIds.has(s.id) && s.spaceNumber.toLowerCase() === query)
      ?? ordered.find(s => shownIds.has(s.id) && s.spaceNumber.toLowerCase().startsWith(query))
    : undefined
  const targetId = searchMatch?.id ?? null

  useEffect(() => {
    if (!targetId) return
    targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
  }, [targetId])

  function bay(space: ParkingSpace) {
    const status = normalizeStatus(space.status)
    const selected = selectedId === space.id
    const matches = shownIds.has(space.id)
    const searchTarget = targetId === space.id
    return (
      <button
        ref={node => { if (searchTarget) targetRef.current = node }}
        key={space.id}
        type="button"
        aria-label={`${space.spaceNumber}, ${status}${matches ? '' : ', does not match filter'}`}
        aria-pressed={selected}
        disabled={!matches}
        title={`${space.spaceNumber} · ${status}`}
        className={`p3-bay p3-bay--${status.toLowerCase()} ${selected ? 'p3-bay--selected' : ''} ${searchTarget ? 'p3-bay--search-target' : ''} ${matches ? '' : 'p3-bay--filtered'}`}
        onClick={() => onSelect(space)}
      >
        <span className="p3-bay-number">{space.spaceNumber}</span>
        {status === 'Occupied' ? (
          <span className="p3-bay-car" aria-hidden="true">🚘</span>
        ) : (
          <span className="p3-bay-symbol" aria-hidden="true">{status === 'Available' ? '✓' : status === 'OutOfService' ? '×' : '·'}</span>
        )}
      </button>
    )
  }

  return (
    <div className={`p3-lot p3-lot--${area.code.toLowerCase()}`}>
      <div className="p4-gate-row">
        <span className="p4-gate p4-gate--entry">↙ Entry</span>
        <span className="p4-gate-label">{area.code} · Illustrative layout</span>
        <span className="p4-gate p4-gate--exit">Exit ↗</span>
      </div>
      <div className="p3-lot-scroll" aria-label="Parking sections">
        {sections.map((section, index) => {
          const split = Math.ceil(section.length / 2)
          const upper = section.slice(0, split)
          const lower = section.slice(split)
          return (
            <section className="p3-parking-block" key={`${area.code}-${index}`} aria-label={`Parking section ${index + 1}`}>
              <div className="p3-block-label">
                <span>SECTION {String(index + 1).padStart(2, '0')}</span>
                <span>{section.length} bays</span>
              </div>
              <div className="p3-bay-row">{upper.map(bay)}</div>
              <div className="p3-drive-aisle" aria-label="Illustrative driving lane">
                <span className="p3-aisle-direction">←</span>
                <span className="p3-aisle-dashes" />
                <span className="p3-aisle-title">DRIVING LANE</span>
                <span className="p3-aisle-dashes" />
                <span className="p3-aisle-direction">→</span>
              </div>
              <div className="p3-bay-row">{lower.map(bay)}</div>
            </section>
          )
        })}
      </div>
      <p className="p3-lot-footnote">
        Search highlights the matching bay and brings it into view. Other bays stay visible for context.
        Layout and entry/exit markers are illustrative only; statuses and labels come from the database.
      </p>
    </div>
  )
}
