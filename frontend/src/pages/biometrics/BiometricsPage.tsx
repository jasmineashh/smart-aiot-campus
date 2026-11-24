
import { useState } from 'react'
import './BiometricsPage.css'

interface BiometricsPageProps {
  onBack: () => void
}

export default function BiometricsPage({
  onBack,
}: BiometricsPageProps) {
  const [frameVersion, setFrameVersion] = useState(0)

  return (
    <section className="biometrics-page">
      <button
        type="button"
        className="biometrics-back"
        onClick={onBack}
      >
        ← Back to Overview
      </button>

      <div className="biometrics-heading">
        <div>
          <span className="biometrics-eyebrow">
            CAMPUS SECURITY
          </span>

          <h1>Attendance & Access</h1>

          <p>
            Biometric attendance, university access
            and building navigation.
          </p>
        </div>

        <span className="biometrics-badge">
          Secure session
        </span>
      </div>

      <div className="biometrics-toolbar">
        <span>
          Access permissions are based on your
          university account.
        </span>

        <button
          type="button"
          className="biometrics-refresh"
          onClick={() => setFrameVersion(v => v + 1)}
        >
          ↻ Refresh dashboard
        </button>
      </div>

      <div className="biometrics-frame-container">
        <iframe
          key={frameVersion}
          src="/biometrics.html"
          title="Smart Campus Biometric Dashboard"
          className="biometrics-frame"
          referrerPolicy="same-origin"
        />
      </div>

      <p className="biometrics-footer">
        Secure AIoT Smart Campus · Biometric Security
        & Attendance
      </p>
    </section>
  )
}
