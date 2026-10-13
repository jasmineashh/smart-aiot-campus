
import { useState } from 'react'
import type { CampusUser } from '../../services/authService'
import './CampusDashboard.css'

import ParkingPage from '../../pages/parking/ParkingPage'


interface DashboardProps {
  user: CampusUser
  onLogout: () => Promise<void>
  loggingOut: boolean
}

type Module = {
  title: string
  description: string
  icon: string
  status: string
  available: boolean
}

export default function CampusDashboard({
  user,
  onLogout,
  loggingOut,
}: DashboardProps) {
  const [selectedModule, setSelectedModule] =
    useState<string | null>(null)

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

  const modules: Module[] = [
    {
      title: 'Smart Parking',
      description:
        'Campus parking availability, registered vehicles and AI predictions.',
      icon: 'P',
      status: 'In development',
      available: true,
    },
    {
      title: 'Attendance & Access',
      description:
        'University attendance records and secure campus access.',
      icon: 'A',
      status: 'Coming soon',
      available: false,
    },
    {
      title: 'Smart Irrigation',
      description:
        'Environmental monitoring and university green-field management.',
      icon: 'I',
      status: 'Coming soon',
      available: false,
    },
  ]

  const welcomeName = user.fullName.split(' ')[0]

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
    selectedModule === null
      ? 'sidebar-link active'
      : 'sidebar-link'
  }
  onClick={() => setSelectedModule(null)}
  style={{
    border: 'none',
    width: '100%',
    background:
      selectedModule === null
        ? '#EAF2FE'
        : 'transparent',
    textAlign: 'left',
    cursor: 'pointer',
    font: 'inherit',
    fontSize: '13px',
  }}
>
  <span className="sidebar-link-icon">⌂</span>
  Overview
</button>


          <span className="sidebar-section-label">
            CAMPUS SYSTEMS
          </span>

          
          
           {modules.map((module) => (
             <button
    type="button"
    className={
      selectedModule === module.title
        ? 'sidebar-link active'
        : 'sidebar-link'
 
    }
    key={module.title}
    disabled={!module.available}
    onClick={() => setSelectedModule(module.title)}
    style={{
      border: 'none',
      width: '100%',
      background:
        selectedModule === module.title
          ? '#EAF2FE'
          : 'transparent',
      textAlign: 'left',
      cursor: module.available
        ? 'pointer'
        : 'not-allowed',
      font: 'inherit',
      fontSize: '13px',
    }}
  >
    <span className="sidebar-link-icon">
      {module.icon}
    </span>
    {module.title}
  </button>
))}

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
            {loggingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </aside>

      <div className="dashboard-workspace">
        <header className="dashboard-topbar">
          <div className="dashboard-breadcrumb">
            Smart Campus <span>/</span>
            <strong>Overview</strong>
          </div>

          <div className="dashboard-top-user">
            <span>{role}</span>
            <div className="top-avatar">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="dashboard-main">
          
           {selectedModule === 'Smart Parking' ? (
          <ParkingPage
             onBack={() => setSelectedModule(null)}
                          />
                ) : (
                     <>

          <section className="dashboard-welcome">
            <div>
              <span className="dashboard-eyebrow">
                SMART CAMPUS PORTAL
              </span>

              <h1>Welcome back, {welcomeName}!</h1>

              <p>
                Your connected university experience
                starts here.
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
                Explore your connected university systems.
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
                    {module.status}
                  </span>
                </div>

                <h3>{module.title}</h3>
                <p>{module.description}</p>

                {module.available ? (
                  <button
                    className="module-open"
                    type="button"
                    onClick={() =>
                      setSelectedModule(module.title)
                    }
                  >
                    View development status
                    <span aria-hidden="true">→</span>
                  </button>
                ) : (
                  <span className="module-unavailable">
                    Module not yet available
                  </span>
                )}
              </article>
            ))}
          </section>

          {selectedModule && (
            <section
              className="dashboard-info-panel"
              aria-live="polite"
            >
              <div>
                <h3>{selectedModule}</h3>
                <p>
                  The Smart Parking page is our next
                  development milestone. It will use
                  the real campus map and database-backed
                  parking information.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedModule(null)}
              >
                Close
              </button>
            </section>
          )}

          <div className="dashboard-heading">
            <div>
              <h2>My University Profile</h2>
              <p>
                Your information from the shared campus
                database.
              </p>
            </div>
          </div>

          <section className="dashboard-profile-grid">
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
