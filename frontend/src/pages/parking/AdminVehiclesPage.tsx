import { useMemo, useState } from 'react'
import './AdminVehiclesPage.css'

type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected'
type FilterStatus = 'All' | ApprovalStatus

type DemoVehicle = {
  id: string
  plateNumber: string
  brand: string
  model: string
  color: string
  owner: string
  universityId: string
  role: 'Student' | 'Professor' | 'Staff'
  status: ApprovalStatus
}

const SAMPLE_VEHICLES: DemoVehicle[] = [
  { id: 'demo-1', plateNumber: 'س ب ج ١٢٣٤', brand: 'Hyundai', model: 'Elantra', color: 'Silver', owner: 'Demo Student', universityId: 'TEST0001', role: 'Student', status: 'Pending' },
  { id: 'demo-2', plateNumber: 'ن د ر ٥٦٧٨', brand: 'Kia', model: 'Sportage', color: 'Black', owner: 'Demo Professor', universityId: 'TEST-PRO-001', role: 'Professor', status: 'Approved' },
  { id: 'demo-3', plateNumber: 'م س ع ٢٤٦٨', brand: 'Toyota', model: 'Corolla', color: 'White', owner: 'Demo Staff', universityId: 'TEST-STA-001', role: 'Staff', status: 'Pending' },
  { id: 'demo-4', plateNumber: 'ق ل ٣٤٥٦', brand: 'Nissan', model: 'Sunny', color: 'Blue', owner: 'Demo Student Two', universityId: 'TEST0002', role: 'Student', status: 'Pending' },
]

function normalizeSearch(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/\s+/g, '')
}

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<DemoVehicle[]>(SAMPLE_VEHICLES)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('All')

  const filtered = useMemo(() => vehicles.filter(vehicle => {
    const matchStatus = filter === 'All' || vehicle.status === filter
    const searchable = normalizeSearch([
      vehicle.plateNumber, vehicle.brand, vehicle.model, vehicle.color,
      vehicle.owner, vehicle.universityId, vehicle.role,
    ].join(' '))
    return matchStatus && searchable.includes(normalizeSearch(query))
  }), [vehicles, query, filter])

  const approved = vehicles.filter(v => v.status === 'Approved').length
  const pending = vehicles.filter(v => v.status === 'Pending').length
  const rejected = vehicles.filter(v => v.status === 'Rejected').length

  function updateStatus(id: string, status: ApprovalStatus) {
    setVehicles(current => current.map(vehicle =>
      vehicle.id === id ? { ...vehicle, status } : vehicle
    ))
  }

  return (
    <main className="av-page">
      <header className="av-header">
        <div>
          <p className="av-eyebrow">SMART CAMPUS / SMART PARKING</p>
          <h1>Vehicle Management</h1>
          <p>Review registered vehicles and their university access requests.</p>
        </div>
        <button className="av-reset" type="button" onClick={() => {
          setVehicles(SAMPLE_VEHICLES)
          setFilter('All')
          setQuery('')
        }}>Reset demo</button>
      </header>

      <div className="av-warning" role="note">
        <strong>Development UI preview.</strong> All records are fictional. Approve and Reject update this page only; no database, API, or access rules are changed.
      </div>

      <section className="av-stats" aria-label="Vehicle statistics">
        <div className="av-stat"><span>Total Registered</span><strong>{vehicles.length}</strong></div>
        <div className="av-stat"><span>Approved</span><strong className="av-positive">{approved}</strong></div>
        <div className="av-stat"><span>Pending</span><strong className="av-pending">{pending}</strong></div>
        <div className="av-stat"><span>Rejected</span><strong className="av-rejected">{rejected}</strong></div>
      </section>

      <section className="av-section">
        <div className="av-section-heading">
          <div><h2>Vehicle Applications</h2><p>Search by plate, vehicle, owner, or university ID.</p></div>
          <span className="av-count">{filtered.length} results</span>
        </div>
        <div className="av-toolbar">
          <label className="av-search-label" htmlFor="av-search">Search vehicles
            <input id="av-search" type="search" placeholder="Plate, owner, brand, university ID..." value={query} onChange={e => setQuery(e.target.value)} />
          </label>
          <label className="av-filter-label" htmlFor="av-filter">Approval status
            <select id="av-filter" value={filter} onChange={e => setFilter(e.target.value as FilterStatus)}>
              <option value="All">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </label>
        </div>
        <div className="av-table-wrap">
          <table className="av-table">
            <thead><tr><th>Vehicle / Plate</th><th>Registered Owner</th><th>Role</th><th>Status</th><th>Actions (demo only)</th></tr></thead>
            <tbody>
              {filtered.map(vehicle => (
                <tr key={vehicle.id}>
                  <td><strong>{vehicle.brand} {vehicle.model}</strong><span lang="ar" dir="rtl" className="av-plate">{vehicle.plateNumber}</span><small>{vehicle.color}</small></td>
                  <td><strong>{vehicle.owner}</strong><small>{vehicle.universityId}</small></td>
                  <td>{vehicle.role}</td>
                  <td><span className={`av-status av-${vehicle.status.toLowerCase()}`}>{vehicle.status}</span></td>
                  <td><div className="av-actions">
                    <button type="button" className="av-approve" disabled={vehicle.status === 'Approved'} onClick={() => updateStatus(vehicle.id, 'Approved')}>Approve</button>
                    <button type="button" className="av-reject" disabled={vehicle.status === 'Rejected'} onClick={() => updateStatus(vehicle.id, 'Rejected')}>Reject</button>
                  </div></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td className="av-empty" colSpan={5}>No vehicles match your search or filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <p className="av-footnote">Next integration: authenticated Admin-only API, CSRF protection, audit trail, and persistent approval decisions.</p>
    </main>
  )
}
