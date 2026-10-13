
import { useState, type FormEvent } from 'react'
import './App.css'

function App() {
  const [universityId, setUniversityId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // Authentication will be connected to ASP.NET Core Identity.
    // Never use these fields for real credentials yet.
    setMessage(
      'The login interface is ready. Secure authentication will be connected next.'
    )
  }

  return (
    <main className="login-page">
      <section className="login-container">
        <div className="campus-panel">
          <div className="campus-overlay" />

          <div className="campus-content">
            <div className="campus-brand">
              <div className="brand-symbol">SC</div>
              <div>
                <strong>SMART CAMPUS</strong>
                <span>AIoT University Ecosystem</span>
              </div>
            </div>

            <div className="campus-intro">
              <span className="eyebrow">THE FUTURE OF CAMPUS LIFE</span>
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

        <div className="form-panel">
          <div className="form-top">
            <span className="portal-label">UNIVERSITY PORTAL</span>
            <span className="secure-label">Secure Access</span>
          </div>

          <div className="form-content">
            <div className="welcome-icon">SC</div>

            <h2>Welcome back</h2>
            <p className="form-subtitle">
              Sign in to access your Smart Campus dashboard.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label htmlFor="universityId">
                  University ID or Email
                </label>

                <input
                  id="universityId"
                  type="text"
                  placeholder="Enter your university ID or email"
                  value={universityId}
                  onChange={(event) => setUniversityId(event.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="password">Password</label>

                <div className="password-wrapper">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <p className="demo-notice">
                Development preview: Do not enter real university
                credentials yet.
              </p>

              <button type="submit" className="sign-in-btn">
                Sign In
                <span aria-hidden="true">→</span>
              </button>

              {message && (
                <p className="status-message" role="status">
                  {message}
                </p>
              )}
            </form>

            <div className="form-divider">
              <span>ONE PLATFORM, MULTIPLE SERVICES</span>
            </div>

            <div className="services-preview">
              <div className="service">
                <span className="service-icon">P</span>
                <span>Parking</span>
              </div>

              <div className="service">
                <span className="service-icon">A</span>
                <span>Attendance</span>
              </div>

              <div className="service">
                <span className="service-icon">I</span>
                <span>Irrigation</span>
              </div>
            </div>
          </div>

          <div className="form-bottom">
            © 2026 Secure AIoT Smart Campus
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
