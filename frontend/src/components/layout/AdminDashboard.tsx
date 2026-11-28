
import { useState } from 'react'
import type { CampusUser } from '../../services/authService'

import AdminOverviewPage from '../../pages/parking/AdminOverviewPage'
import AdminVehiclesPage from '../../pages/parking/AdminVehiclesPage'
import ParkingPage from '../../pages/parking/ParkingPage'
import BiometricsPage from '../../pages/biometrics/BiometricsPage'

import './AdminDashboard.css'

interface AdminDashboardProps {
  user: CampusUser
  onLogout: () => Promise<void>
  loggingOut: boolean
}

type AdminPage =
  | 'overview'
  | 'vehicles'
  | 'parking'
  | 'biometrics'

interface NavigationItem {
  page: AdminPage
  label: string
}

const navigationItems: NavigationItem[] = [
  {
    page: 'overview',
    label: 'Operations Overview',
  },
  {
    page: 'vehicles',
    label: 'Vehicle Management',
  },
  {
    page: 'parking',
    label: 'Parking Occupancy',
  },
  {
    page: 'biometrics',
    label: 'Attendance & Access',
  },
]

const pageTitles: Record<AdminPage, string> = {
  overview: 'Operations Overview',
  vehicles: 'Vehicle Management',
  parking: 'Parking Occupancy',
  biometrics: 'Attendance & Access',
}

// ==========================================
// NAVIGATION ICONS
// ==========================================

function NavigationIcon({ page }: { page: AdminPage }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {page === 'overview' && (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </>
      )}

      {page === 'vehicles' && (
        <>
          <path d="m5 11 1.7-4.5A2.3 2.3 0 0 1 8.8 5h6.4a2.3 2.3 0 0 1 2.1 1.5L19 11" />

          <rect
            x="3"
            y="11"
            width="18"
            height="7"
            rx="2"
          />

          <path d="M5 18v2M19 18v2M7 14.5h2M15 14.5h2" />
        </>
      )}

      {page === 'parking' && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
        </>
      )}

      {page === 'biometrics' && (
        <>
          <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />
          <path d="m9 12 2 2 4-4" />
        </>
      )}
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" transform="rotate(180 9 12)" />
      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7" />
    </svg>
  )
}

function getInitials(fullName: string): string {
  return (
    fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'AD'
  )
}

// ==========================================
// ADMINISTRATOR DASHBOARD
// ==========================================

export default function AdminDashboard({
  user,
  onLogout,
  loggingOut,
}: AdminDashboardProps) {
  const [page, setPage] =
    useState<AdminPage>('overview')

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false)

  const initials = getInitials(user.fullName)

  function navigate(nextPage: AdminPage) {
    setPage(nextPage)
    setMobileMenuOpen(false)
  }

  return (
    <div className="sad-shell">
      <aside className="sad-sidebar">

        {/* SIDEBAR BRAND */}

        <div className="sad-sidebar-header">
          <div className="sad-brand">
            <div
              className="sad-brand-logo"
              aria-hidden="true"
            >
              SC
            </div>

            <div className="sad-brand-text">
              <strong>Smart Campus</strong>
              <span>Administration</span>
            </div>
          </div>

          <button
            type="button"
            className="sad-mobile-toggle"
            aria-label={
              mobileMenuOpen
                ? 'Close navigation menu'
                : 'Open navigation menu'
            }
            aria-expanded={mobileMenuOpen}
            aria-controls="sad-navigation"
            onClick={() =>
              setMobileMenuOpen(open => !open)
            }
          >
            <svg
              width="23"
              height="23"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {mobileMenuOpen ? (
                <path d="m6 6 12 12M18 6 6 18" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* ADMINISTRATOR NAVIGATION */}

        <nav
          id="sad-navigation"
          className={`sad-navigation ${
            mobileMenuOpen ? 'sad-navigation-open' : ''
          }`}
          aria-label="Administrator navigation"
        >
          <div className="sad-navigation-group">
            <span className="sad-navigation-label">
              WORKSPACE
            </span>

            <button
              type="button"
              className={`sad-navigation-link ${
                page === 'overview' ? 'sad-active' : ''
              }`}
              aria-current={
                page === 'overview' ? 'page' : undefined
              }
              onClick={() => navigate('overview')}
            >
              <NavigationIcon page="overview" />
              <span>Operations Overview</span>
            </button>
          </div>

          <div className="sad-navigation-group">
            <span className="sad-navigation-label">
              CAMPUS SYSTEMS
            </span>

            {navigationItems
              .filter(item => item.page !== 'overview')
              .map(item => (
                <button
                  type="button"
                  key={item.page}
                  className={`sad-navigation-link ${
                    page === item.page
                      ? 'sad-active'
                      : ''
                  }`}
                  aria-current={
                    page === item.page
                      ? 'page'
                      : undefined
                  }
                  onClick={() => navigate(item.page)}
                >
                  <NavigationIcon page={item.page} />
                  <span>{item.label}</span>
                </button>
              ))}
          </div>
        </nav>

        {/* ADMINISTRATOR ACCOUNT */}

        <div className="sad-sidebar-bottom">
          <div className="sad-account">
            <div
              className="sad-account-avatar"
              aria-hidden="true"
            >
              {initials}
            </div>

            <div className="sad-account-details">
              <strong>{user.fullName}</strong>
              <span>Administrator</span>
            </div>
          </div>

          <button
            type="button"
            className="sad-logout-button"
            disabled={loggingOut}
            onClick={() => void onLogout()}
          >
            <LogoutIcon />

            <span>
              {loggingOut
                ? 'Signing out...'
                : 'Sign Out'}
            </span>
          </button>

          <p className="sad-sidebar-footer">
            Secure AIoT Smart Campus
          </p>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}

      <div className="sad-workspace">
        <header className="sad-topbar">
          <div className="sad-breadcrumb">
            <span>Administration</span>

            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>

            <strong>{pageTitles[page]}</strong>
          </div>

          <div className="sad-topbar-account">
            <div className="sad-topbar-account-text">
              <strong>{user.fullName}</strong>
              <span>{user.universityId}</span>
            </div>

            <div
              className="sad-topbar-avatar"
              aria-hidden="true"
            >
              {initials}
            </div>
          </div>
        </header>

        {/* PAGE ROUTING */}

        <main className="sad-content">
          {page === 'overview' && (
            <AdminOverviewPage
              onViewVehicles={() => navigate('vehicles')}
            />
          )}

          {page === 'vehicles' && (
            <AdminVehiclesPage />
          )}

          {page === 'parking' && (
            <div className="sad-module-content">
              <ParkingPage
                onBack={() => navigate('overview')}
              />
            </div>
          )}

          {page === 'biometrics' && (
            <div className="sad-module-content">
              <BiometricsPage
                onBack={() => navigate('overview')}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
