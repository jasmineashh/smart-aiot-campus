import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import {
  login,
  logout,
  getCurrentUser,
  type CampusUser,
} from './services/authService'

import CampusDashboard from './components/layout/CampusDashboard'

import './App.css'

function App() {
  const [universityId, setUniversityId] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [showPassword, setShowPassword] =
    useState(false)

  const [user, setUser] =
    useState<CampusUser | null>(null)

  const [loading, setLoading] =
    useState(false)

  const [checkingSession, setCheckingSession] =
    useState(true)

  const [message, setMessage] =
    useState('')

  const [error, setError] =
    useState('')

  // ==========================================
  // CHECK EXISTING AUTHENTICATED SESSION
  // ==========================================

  useEffect(() => {
    let active = true

    async function checkSession() {
      try {
        const currentUser =
          await getCurrentUser()

        if (active) {
          setUser(currentUser)
        }
      } catch {
        if (active) {
          setError(
            'Unable to check your session. ' +
            'Verify that the backend is running.'
          )
        }
      } finally {
        if (active) {
          setCheckingSession(false)
        }
      }
    }

    void checkSession()

    return () => {
      active = false
    }
  }, [])

  // ==========================================
  // LOGIN
  // ==========================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setError('')
    setMessage('')
    setLoading(true)

    try {
      const loggedInUser = await login(
        universityId.trim(),
        password
      )

      setUser(loggedInUser)
      setPassword('')
      setShowPassword(false)

      setMessage(
        'Signed in successfully.'
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred.'
      )
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // LOGOUT
  // ==========================================

  async function handleLogout() {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await logout()

      setUser(null)
      setUniversityId('')
      setPassword('')
      setShowPassword(false)

      setMessage(
        'You have been signed out.'
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to log out.'
      )
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // AUTHENTICATED CAMPUS DASHBOARD
  // ==========================================

  if (!checkingSession && user) {
    return (
      <CampusDashboard
        user={user}
        onLogout={handleLogout}
        loggingOut={loading}
      />
    )
  }

  // ==========================================
  // SMART CAMPUS LOGIN PAGE
  // ==========================================

  return (
    <main className="login-page">
      <section className="login-container">

        {/* LEFT: CAMPUS BRANDING */}

        <div className="campus-panel">
          <div className="campus-overlay" />

          <div className="campus-content">

            <div className="campus-brand">
              <div className="brand-symbol">
                SC
              </div>

              <div>
                <strong>
                  SMART CAMPUS
                </strong>

                <span>
                  AIoT University Ecosystem
                </span>
              </div>
            </div>

            <div className="campus-intro">
              <span className="eyebrow">
                THE FUTURE OF CAMPUS LIFE
              </span>

              <h1>
                One Campus.
                <br />
                Smarter Future.
              </h1>

              <p>
                A secure, intelligent and connected campus.
                Everything you need in one place.
              </p>

              <div className="feature-list">
                <span>Smart Parking</span>
                <span>Biometric Access</span>
                <span>Smart Irrigation</span>
              </div>
            </div>

            <div className="campus-footer">
              Secure AIoT Smart Campus Project
            </div>

          </div>
        </div>

        {/* RIGHT: LOGIN FORM */}

        <div className="form-panel">

          <div className="form-top">
            <span className="portal-label">
              UNIVERSITY PORTAL
            </span>

            <span className="secure-label">
              Secure Access
            </span>
          </div>

          <div className="form-content">

            <div className="welcome-icon">
              SC
            </div>

            {checkingSession ? (
              <>
                <h2>Checking session</h2>

                <p className="form-subtitle">
                  Connecting to your university account...
                </p>
              </>
            ) : (
              <>
                <h2>Welcome back</h2>

                <p className="form-subtitle">
                  Sign in to access your Smart Campus
                  dashboard.
                </p>

                <form onSubmit={handleSubmit}>

                  {/* UNIVERSITY ID OR EMAIL */}

                  <div className="input-group">
                    <label htmlFor="universityId">
                      University ID or Email
                    </label>

                    <input
                      id="universityId"
                      type="text"
                      placeholder="Enter your university ID or email"
                      value={universityId}
                      onChange={event =>
                        setUniversityId(
                          event.target.value
                        )
                      }
                      autoComplete="username"
                      disabled={loading}
                      required
                      maxLength={256}
                    />
                  </div>

                  {/* PASSWORD */}

                  <div className="input-group">
                    <label htmlFor="password">
                      Password
                    </label>

                    <div className="password-wrapper">

                      <input
                        id="password"
                        type={
                          showPassword
                            ? 'text'
                            : 'password'
                        }
                        placeholder="Enter your password"
                        value={password}
                        onChange={event =>
                          setPassword(
                            event.target.value
                          )
                        }
                        autoComplete="current-password"
                        disabled={loading}
                        required
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowPassword(
                            value => !value
                          )
                        }
                        aria-label={
                          showPassword
                            ? 'Hide password'
                            : 'Show password'
                        }
                      >
                        {showPassword
                          ? 'Hide'
                          : 'Show'}
                      </button>

                    </div>
                  </div>

                  {/* DEVELOPMENT NOTICE */}

                  <p className="demo-notice">
                    Development environment: use only
                    your temporary test account.
                  </p>

                  {/* SIGN IN */}

                  <button
                    type="submit"
                    className="sign-in-btn"
                    disabled={loading}
                  >
                    {loading
                      ? 'Signing in...'
                      : 'Sign In'}

                    {!loading && (
                      <span aria-hidden="true">
                        →
                      </span>
                    )}
                  </button>

                </form>
              </>
            )}

            {/* STATUS MESSAGES */}

            {message && (
              <p
                className="status-message"
                role="status"
              >
                {message}
              </p>
            )}

            {error && (
              <p
                className="status-message auth-error"
                role="alert"
              >
                {error}
              </p>
            )}

            {/* SERVICES PREVIEW */}

            <div className="form-divider">
              <span>
                ONE PLATFORM, MULTIPLE SERVICES
              </span>
            </div>

            <div className="services-preview">

              <div className="service">
                <span className="service-icon">
                  P
                </span>

                <span>Parking</span>
              </div>

              <div className="service">
                <span className="service-icon">
                  A
                </span>

                <span>Attendance</span>
              </div>

              <div className="service">
                <span className="service-icon">
                  I
                </span>

                <span>Irrigation</span>
              </div>

            </div>
          </div>

          <div className="form-bottom">
            AIoT Smart Campus
          </div>

        </div>
      </section>
    </main>
  )
}

export default App
