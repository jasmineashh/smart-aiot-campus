
import { useState } from 'react'
import type { CampusUser } from '../../services/authService'
import ParkingPage from '../../pages/parking/ParkingPage'
import './CampusDashboard.css'

interface DashboardProps {
  user: CampusUser
  onLogout: () => Promise<void>
  loggingOut: boolean
}

type Page =
  | 'overview'
  | 'parking'
  | 'parking-admin'

type CampusModule = {
  title: string
  description: string
  icon: string
  available: boolean
  page?: Page
}

export default function CampusDashboard({
  user,
  onLogout,
  loggingOut,
}: DashboardProps) {
  const [page, setPage] = useState<Page>('overview')

  const isAdmin = user.roles.includes('Admin')
  const isProfessor = user.roles.includes('Professor')
  const isStaff = user.roles.includes('Staff')

  const role = isAdmin
    ? 'Administrator'
    : isProfessor
      ? 'Professor'
      : isStaff
        ? 'Staff Member'
        : 'Student'

  const welcomeName =
    user.fullName.trim().split(' ')[0] || 'User'

  const modules: CampusModule[] = [
    {
      title: 'Smart Parking',
      description:
        'Explore the campus parking map, parking zones and individual spaces.',
      icon: 'P',
      available: true,
      page: 'parking',
    },
    {
      title: 'Attendance & Access',
      description:
        'Biometric attendance and secure university access.',
      icon: 'A',
      available: false,
    },
    {
      title: 'Smart Irrigation',
      description:
        'Environmental monitoring and automated irrigation.',
      icon: 'I',
      available: false,
    },
  ]

  const pageTitle =
    page === 'parking'
      ? 'Smart Parking'
      : page === 'parking-admin'
        ? 'Parking Management'
        : 'Overview'

  const navigate = (nextPage: Page) => {
    setPage(nextPage)
  }

  return (
    <div className="campus-dashboard">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">SC</div>

          <div>
            <strong>Smart Campus</strong>
            <span>AIoT Ecosystem</span>
          </div>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-section-label">
            MAIN MENU
          </span>

          <button
            type="button"
            className={
              page === 'overview'
                ? 'sidebar-link active'
                : 'sidebar-link'
            }
            aria-current={
              page === 'overview' ? 'page' : undefined
            }
            onClick={() => navigate('overview')}
          >
            <span className="sidebar-link-icon">
              ⌂
            </span>
            Overview
          </button>

          <span className="sidebar-section-label">
            CAMPUS SYSTEMS
          </span>

          {modules.map((module) => (
            <button
              key={module.title}
              type="button"
              className={
                module.page === page
                  ? 'sidebar-link active'
                  : 'sidebar-link'
              }
              aria-current={
                module.page === page
                  ? 'page'
                  : undefined
              }
              disabled={!module.available}
              onClick={() => {
                if (module.page) {
                  navigate(module.page)
                }
              }}
            >
              <span className="sidebar-link-icon">
                {module.icon}
              </span>

              {module.title}
            </button>
          ))}

          {isAdmin && (
            <>
              <span className="sidebar-section-label">
                ADMINISTRATION
              </span>

              <button
                type="button"
                className={
                  page === 'parking-admin'
                    ? 'sidebar-link active'
                    : 'sidebar-link'
                }
                aria-current={
                  page === 'parking-admin'
                    ? 'page'
                    : undefined
                }
                onClick={() =>
                  navigate('parking-admin')
                }
              >
                <span className="sidebar-link-icon">
                  M
                </span>
                Parking Management
              </button>
            </>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {user.fullName.charAt(0).toUpperCase()}
            </div>

            <div className="sidebar-user-info">
              <strong>{user.fullName}</strong>
              <span>{role}</span>
            </div>
          </div>

          <button
            className="sidebar-logout"
            type="button"
            disabled={loggingOut}
            onClick={() => void onLogout()}
          >
            {loggingOut
              ? 'Signing out...'
              : 'Sign Out'}
          </button>
        </div>
      </aside>

      <div className="dashboard-workspace">
        <header className="dashboard-topbar">
          <div className="dashboard-breadcrumb">
            Smart Campus <span>/</span>
            <strong>{pageTitle}</strong>
          </div>

          <div className="dashboard-top-user">
            <span>{role}</span>

            <div className="top-avatar">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="dashboard-main">
          {page === 'parking' && (
            <ParkingPage
              onBack={() => navigate('overview')}
            />
          )}

          {page === 'parking-admin' && isAdmin && (
            <>
              <section className="dashboard-welcome">
                <div>
                  <span className="dashboard-eyebrow">
                    ADMINISTRATION
                  </span>

                  <h1>Parking Management</h1>

                  <p>
                    Manage registered vehicles,
                    parking permissions and campus
                    parking operations.
                  </p>
                </div>

                <div className="welcome-badge">
                  Administrator
                </div>
              </section>

              <section className="dashboard-info-panel">
                <div>
                  <h3>Admin dashboard preparation</h3>

                  <p>
                    Vehicle approvals, occupancy
                    analytics and parking permissions
                    will appear here once the secured
                    administrator API endpoints
                    are implemented.
                  </p>
                </div>
              </section>

              <div className="dashboard-heading">
                <div>
                  <h2>Available Management Areas</h2>
                  <p>
                    These features will use actual
                    database records.
                  </p>
                </div>
              </div>

              <section className="campus-module-grid">
                <article className="campus-module-card">
                  <div className="module-icon">V</div>
                  <h3>Vehicle Approvals</h3>
                  <p>
                    Review registered vehicles and
                    approve or reject requests.
                  </p>
                  <span className="module-unavailable">
                    API integration pending
                  </span>
                </article>

                <article className="campus-module-card">
                  <div className="module-icon">C</div>
                  <h3>Parking Analytics</h3>
                  <p>
                    Monitor zone occupancy, utilization
                    and historical trends.
                  </p>
                  <span className="module-unavailable">
                    Analytics integration pending
                  </span>
                </article>

                <article className="campus-module-card">
                  <div className="module-icon">R</div>
                  <h3>Parking Permissions</h3>
                  <p>
                    Configure eligibility for students,
                    professors, staff and residents.
                  </p>
                  <span className="module-unavailable">
                    Access rules pending
                  </span>
                </article>
              </section>
            </>
          )}

          {page === 'overview' && (
            <>
              <section className="dashboard-welcome">
                <div>
                  <span className="dashboard-eyebrow">
                    SMART CAMPUS PORTAL
                  </span>

                  <h1>
                    Welcome back, {welcomeName}!
                  </h1>

                  <p>
                    Your connected university
                    experience starts here.
                  </p>
                </div>

                <div className="welcome-badge">
                  {role}
                </div>
              </section>

              <div className="dashboard-heading">
                <div>
                  <h2>Campus Services</h2>
                  <p>
                    Explore your connected
                    university systems.
                  </p>
                </div>
              </div>

              <section className="campus-module-grid">
                {modules.map((module) => (
                  <article
                    className="campus-module-card"
                    key={module.title}
                  >
                    <div className="module-card-top">
                      <div className="module-icon">
                        {module.icon}
                      </div>

                      <span
                        className={
                          module.available
                            ? 'module-status developing'
                            : 'module-status'
                        }
                      >
                        {module.available
                          ? 'In development'
                          : 'Coming soon'}
                      </span>
                    </div>

                    <h3>{module.title}</h3>
                    <p>{module.description}</p>

                    {module.available && module.page ? (
                      <button
                        type="button"
                        className="module-open"
                        onClick={() =>
                          navigate(module.page!)
                        }
                      >
                        Explore Smart Parking
                        <span aria-hidden="true">
                          →
                        </span>
                      </button>
                    ) : (
                      <span className="module-unavailable">
                        Module not yet available
                      </span>
                    )}
                  </article>
                ))}
              </section>

              <div className="dashboard-heading">
                <div>
                  <h2>My University Profile</h2>
                  <p>
                    Your account information
                    from the campus system.
                  </p>
                </div>
              </div>

              <section className="dashboard-profile-grid">
                <div className="profile-data-card">
                  <span>Full Name</span>
                  <strong>{user.fullName}</strong>
                </div>

                <div className="profile-data-card">
                  <span>University ID</span>
                  <strong>{user.universityId}</strong>
                </div>

                <div className="profile-data-card">
                  <span>Department</span>
                  <strong>
                    {user.department ?? 'Not assigned'}
                  </strong>
                </div>

                <div className="profile-data-card">
                  <span>Account Type</span>
                  <strong>{role}</strong>
                </div>
              </section>

              <footer className="dashboard-footer">
                Secure AIoT Smart Campus
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
