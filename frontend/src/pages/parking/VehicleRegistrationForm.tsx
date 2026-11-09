
import { useState, type FormEvent } from 'react'
import './VehicleRegistrationForm.css'

export interface VehicleRegistrationData {
  plateNumber: string
  make: string
  model: string
  color: string
}

interface VehicleRegistrationFormProps {
  onClose: () => void
}

const ARABIC_LETTERS = /^[\u0621-\u064A\s]+$/u

// Convert English, Arabic-Indic, and Persian digits
// into standard digits for internal validation.
function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, digit =>
      String(digit.charCodeAt(0) - 0x0660)
    )
    .replace(/[۰-۹]/g, digit =>
      String(digit.charCodeAt(0) - 0x06f0)
    )
}

// Convert standard digits to Arabic-Indic digits.
function toArabicDigits(value: string): string {
  return normalizeDigits(value).replace(
    /[0-9]/g,
    digit => String.fromCharCode(
      digit.charCodeAt(0) - 0x30 + 0x0660
    )
  )
}

function normalizeLetters(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/\s+/g, '')
    .trim()
}

export default function VehicleRegistrationForm({
  onClose,
}: VehicleRegistrationFormProps) {
  const [letters, setLetters] = useState('')
  const [numbers, setNumbers] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [color, setColor] = useState('')

  const [error, setError] = useState('')
  const [preview, setPreview] =
    useState<VehicleRegistrationData | null>(null)

  const displayLetters = letters.trim()
  const displayNumbers = toArabicDigits(numbers)

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    setError('')
    setPreview(null)

    const cleanedLetters = normalizeLetters(letters)
    const cleanedNumbers = normalizeDigits(numbers.trim())

    if (
      !ARABIC_LETTERS.test(letters.trim()) ||
      cleanedLetters.length < 2 ||
      cleanedLetters.length > 3
    ) {
      setError('Enter 2 or 3 Arabic plate letters.')
      return
    }

    if (!/^[0-9]{3,4}$/.test(cleanedNumbers)) {
      setError('Enter 3 or 4 plate digits.')
      return
    }

    if (!make.trim() || !model.trim() || !color.trim()) {
      setError('Please complete all vehicle details.')
      return
    }

    const arabicNumbers = toArabicDigits(cleanedNumbers)

    setPreview({
      plateNumber: `${cleanedLetters} ${arabicNumbers}`,
      make: make.trim(),
      model: model.trim(),
      color: color.trim(),
    })
  }

  return (
    <section className="vr-panel">
      <div className="vr-heading">
        <div>
          <span className="mv-eyebrow">
            SMART PARKING
          </span>

          <h2>Register a Vehicle</h2>

          <p>
            Enter your Egyptian license plate
            and vehicle information.
          </p>
        </div>

        <button
          type="button"
          className="vr-close"
          onClick={onClose}
          aria-label="Close registration form"
        >
          ×
        </button>
      </div>

      <div className="vr-notice">
        Development preview only. Vehicle information
        is not submitted to the database.
      </div>

      {/* LIVE EGYPTIAN PLATE PREVIEW */}
      <div className="mv-plate">
        <div className="mv-plate-header">
          <span>EGYPT</span>
          <span lang="ar">مصر</span>
        </div>

        <div
          className="mv-plate-number"
          dir="rtl"
          lang="ar"
        >
          {displayLetters || 'س ب ج'}
          {' | '}
          {displayNumbers || '١٢٣٤'}
        </div>
      </div>

      <form
        className="vr-form"
        onSubmit={handleSubmit}
      >
        <div className="vr-field">
          <label htmlFor="vr-letters">
            License Plate Letters
          </label>

          <input
            id="vr-letters"
            lang="ar"
            dir="rtl"
            type="text"
            placeholder="س ب ج"
            value={letters}
            onChange={event => {
              setLetters(event.target.value)
              setPreview(null)
            }}
            maxLength={8}
            required
          />

          <small>
            Enter 2 or 3 Arabic letters.
          </small>
        </div>

        <div className="vr-field">
          <label htmlFor="vr-numbers">
            License Plate Numbers
          </label>

          <input
            id="vr-numbers"
            lang="ar"
            dir="rtl"
            type="text"
            inputMode="numeric"
            placeholder="١٢٣٤"
            value={displayNumbers}
            onChange={event => {
              const digits = normalizeDigits(
                event.target.value
              ).replace(/[^0-9]/g, '')

              setNumbers(digits.slice(0, 4))
              setPreview(null)
            }}
            maxLength={4}
            required
          />

          <small>
            Numbers automatically appear in Arabic.
          </small>
        </div>

        <div className="vr-field">
          <label htmlFor="vr-make">
            Car Brand
          </label>

          <input
            id="vr-make"
            type="text"
            value={make}
            onChange={event => {
              setMake(event.target.value)
              setPreview(null)
            }}
            placeholder="e.g. Hyundai"
            maxLength={80}
            required
          />
        </div>

        <div className="vr-field">
          <label htmlFor="vr-model">
            Car Model
          </label>

          <input
            id="vr-model"
            type="text"
            value={model}
            onChange={event => {
              setModel(event.target.value)
              setPreview(null)
            }}
            placeholder="e.g. Elantra"
            maxLength={80}
            required
          />
        </div>

        <div className="vr-field">
          <label htmlFor="vr-color">
            Car Color
          </label>

          <input
            id="vr-color"
            type="text"
            value={color}
            onChange={event => {
              setColor(event.target.value)
              setPreview(null)
            }}
            placeholder="e.g. Silver"
            maxLength={50}
            required
          />
        </div>

        {error && (
          <p className="vr-error" role="alert">
            {error}
          </p>
        )}

        <div className="vr-actions">
          <button
            type="button"
            className="vr-cancel"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="vr-submit"
          >
            Preview Registration
          </button>
        </div>
      </form>

      {preview && (
        <div
          className="vr-preview"
          role="status"
        >
          <h3>Registration Preview</h3>

          <p>
            <strong>Egyptian Plate: </strong>
            <span lang="ar" dir="rtl">
              {preview.plateNumber}
            </span>
          </p>

          <p>
            <strong>Vehicle: </strong>
            {preview.make} {preview.model}
          </p>

          <p>
            <strong>Color: </strong>
            {preview.color}
          </p>

          <small>
            Preview complete. No data has been saved.
          </small>
        </div>
      )}
    </section>
  )
}
