import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'

import {
  getVehicleCatalog,
  getAvailableBodyTypes,
  registerVehicle,
  type VehicleCatalog,
  type VehicleBodyType,
  type RegisterVehicleRequest,
  type RegisteredVehicle,
} from '../../services/parkingService'

import VehicleIllustration from './VehicleIllustration'

import './VehicleRegistrationForm.css'

export type VehicleRegistrationData =
  RegisterVehicleRequest

interface VehicleRegistrationFormProps {
  onClose: () => void

  onRegistered?: (
    vehicle: RegisteredVehicle,
    message: string
  ) => void
}

// ==========================================
// LICENSE PLATE NORMALIZATION
// ==========================================

function normalizeDigits(
  value: string
): string {
  return value
    .replace(/[٠-٩]/g, digit =>
      String(
        digit.charCodeAt(0) - 0x0660
      )
    )
    .replace(/[۰-۹]/g, digit =>
      String(
        digit.charCodeAt(0) - 0x06f0
      )
    )
}

function toArabicDigits(
  value: string
): string {
  return normalizeDigits(value).replace(
    /[0-9]/g,
    digit =>
      String.fromCharCode(
        digit.charCodeAt(0) -
        0x30 +
        0x0660
      )
  )
}

function normalizeLetters(
  value: string
): string {
  return value
    .normalize('NFKC')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/\s+/g, '')
    .trim()
}

function getBodyTypeLabel(
  type: VehicleBodyType
): string {
  switch (type) {
    case 'SUV':
      return 'SUV / Crossover'

    case 'Van':
      return 'Van / MPV'

    default:
      return type
  }
}

// ==========================================
// REGISTRATION COMPONENT
// ==========================================

export default function VehicleRegistrationForm({
  onClose,
  onRegistered,
}: VehicleRegistrationFormProps) {
  const [letters, setLetters] =
    useState('')

  const [numbers, setNumbers] =
    useState('')

  const [make, setMake] =
    useState('')

  const [model, setModel] =
    useState('')

  const [bodyType, setBodyType] =
    useState<VehicleBodyType | ''>('')

  const [color, setColor] =
    useState('')

  const [brandSearch, setBrandSearch] =
    useState('')

  const [catalog, setCatalog] =
    useState<VehicleCatalog | null>(null)

  const [catalogLoading, setCatalogLoading] =
    useState(true)

  const [catalogError, setCatalogError] =
    useState('')

  const [catalogRefresh, setCatalogRefresh] =
    useState(0)

  const [submitting, setSubmitting] =
    useState(false)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const submittingRef =
    useRef(false)

  // ==========================================
  // LOAD VEHICLE CATALOG
  // ==========================================

  useEffect(() => {
    const controller =
      new AbortController()

    async function loadCatalog() {
      setCatalogLoading(true)
      setCatalogError('')

      try {
        const data =
          await getVehicleCatalog(
            controller.signal
          )

        if (!controller.signal.aborted) {
          setCatalog(data)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setCatalogError(
            err instanceof Error
              ? err.message
              : 'Unable to load vehicle options.'
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setCatalogLoading(false)
        }
      }
    }

    void loadCatalog()

    return () => controller.abort()
  }, [catalogRefresh])

  // ==========================================
  // DERIVED DROPDOWN OPTIONS
  // ==========================================

  const selectedBrand =
    catalog?.brands.find(
      brand => brand.name === make
    )

  const availableModels =
    selectedBrand?.models ?? []

  const filteredBrands =
    catalog?.brands.filter(
      brand =>
        brand.name
          .toLowerCase()
          .includes(
            brandSearch
              .trim()
              .toLowerCase()
          ) ||
        brand.name === make
    ) ?? []

  const availableBodyTypes =
    getAvailableBodyTypes(
      catalog,
      make,
      model
    )

  // Automatically select a single body type.
  // Require user selection for multiple types.

  const resolvedBodyType:
    VehicleBodyType | null =
    availableBodyTypes.length === 1
      ? availableBodyTypes[0]
      : bodyType &&
          availableBodyTypes.includes(bodyType)
        ? bodyType
        : null

  const showBodyTypeDropdown =
    Boolean(model) &&
    availableBodyTypes.length > 1

  const selectedColor =
    catalog?.colors.find(
      item => item.name === color
    )

  const displayLetters =
    normalizeLetters(letters)
      .split('')
      .join(' ')

  const displayNumbers =
    toArabicDigits(numbers)

  const validLetters =
    /^[\u0621-\u063A\u0641-\u064A]{2,3}$/u
      .test(
        normalizeLetters(letters)
      )

  const validNumbers =
    /^[0-9]{3,4}$/.test(
      normalizeDigits(numbers)
    )

  const catalogUnavailable =
    catalogLoading ||
    Boolean(catalogError) ||
    !catalog

  const canSubmit =
    !catalogUnavailable &&
    !submitting &&
    validLetters &&
    validNumbers &&
    Boolean(selectedBrand) &&
    availableModels.includes(model) &&
    Boolean(resolvedBodyType) &&
    Boolean(selectedColor)

  // ==========================================
  // RESET FEEDBACK
  // ==========================================

  function clearFeedback() {
    setError('')
    setSuccess('')
  }

  // ==========================================
  // BRAND SELECTION
  // ==========================================

  function handleBrandChange(
    value: string
  ) {
    setMake(value)

    // Reset dependent selections.

    setModel('')
    setBodyType('')

    clearFeedback()
  }

  // ==========================================
  // MODEL SELECTION
  // ==========================================

  function handleModelChange(
    value: string
  ) {
    setModel(value)

    // Never retain a body type belonging
    // to a previously selected model.

    setBodyType('')

    clearFeedback()
  }

  // ==========================================
  // REGISTER VEHICLE
  // ==========================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (
      submittingRef.current ||
      catalogUnavailable
    ) {
      return
    }

    clearFeedback()

    const cleanedLetters =
      normalizeLetters(letters)

    const cleanedNumbers =
      normalizeDigits(numbers.trim())

    if (!validLetters) {
      setError(
        'Enter 2 or 3 valid Arabic plate letters.'
      )
      return
    }

    if (!validNumbers) {
      setError(
        'Enter 3 or 4 plate digits.'
      )
      return
    }

    if (!selectedBrand) {
      setError(
        'Please select your car brand.'
      )
      return
    }

    if (!availableModels.includes(model)) {
      setError(
        'Please select your car model.'
      )
      return
    }

    if (!resolvedBodyType) {
      setError(
        'Please select your vehicle body type.'
      )
      return
    }

    if (!selectedColor) {
      setError(
        'Please select your vehicle color.'
      )
      return
    }

    const plateNumber =
      `${cleanedLetters.split('').join(' ')} ` +
      toArabicDigits(cleanedNumbers)

    submittingRef.current = true
    setSubmitting(true)

    try {
      const result =
        await registerVehicle({
          plateNumber,
          make,
          model,
          color,
        })

      setSuccess(result.message)

      // Reset all form selections.

      setLetters('')
      setNumbers('')
      setMake('')
      setModel('')
      setBodyType('')
      setColor('')
      setBrandSearch('')

      onRegistered?.(
        result.vehicle,
        result.message
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to register your vehicle.'
      )
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  // ==========================================
  // FORM INTERFACE
  // ==========================================

  return (
    <section className="vr-panel">

      {/* HEADER */}

      <div className="vr-heading">
        <div>
          <h2>Register a Vehicle</h2>

          <p>
            Add a vehicle to your university account.
          </p>
        </div>

        <button
          type="button"
          className="vr-close"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close registration form"
        >
          ×
        </button>
      </div>

      {/* LOADING STATE */}

      {catalogLoading && (
        <div
          className="vr-loading"
          role="status"
        >
          Loading vehicle options...
        </div>
      )}

      {/* CATALOG ERROR */}

      {catalogError && (
        <div
          className="vr-error"
          role="alert"
        >
          <p>{catalogError}</p>

          <button
            type="button"
            className="vr-cancel"
            onClick={() =>
              setCatalogRefresh(
                value => value + 1
              )
            }
          >
            Retry
          </button>
        </div>
      )}

      <form
        className="vr-form"
        onSubmit={handleSubmit}
        aria-busy={submitting}
      >

        <div className="vr-registration-layout">

          {/* LEFT: REGISTRATION DETAILS */}

          <div className="vr-details-column">

            {/* LICENSE PLATE SECTION */}

            <section className="vr-form-section">
              <h3>License Plate</h3>

              <div className="vr-fields-grid">

                <div className="vr-field">
                  <label htmlFor="vr-letters">
                    Plate Letters
                  </label>

                  <input
                    id="vr-letters"
                    type="text"
                    lang="ar"
                    dir="rtl"
                    placeholder="س ب ج"
                    value={letters}
                    onChange={event => {
                      setLetters(
                        event.target.value
                      )
                      clearFeedback()
                    }}
                    maxLength={8}
                    disabled={submitting}
                    required
                  />

                  <small>
                    2–3 Arabic letters
                  </small>
                </div>

                <div className="vr-field">
                  <label htmlFor="vr-numbers">
                    Plate Numbers
                  </label>

                  <input
                    id="vr-numbers"
                    type="text"
                    lang="ar"
                    dir="rtl"
                    inputMode="numeric"
                    placeholder="١٢٣٤"
                    value={displayNumbers}
                    onChange={event => {
                      const digits =
                        normalizeDigits(
                          event.target.value
                        ).replace(/[^0-9]/g, '')

                      setNumbers(
                        digits.slice(0, 4)
                      )

                      clearFeedback()
                    }}
                    maxLength={4}
                    disabled={submitting}
                    required
                  />

                  <small>
                    3–4 digits
                  </small>
                </div>

              </div>
            </section>

            {/* VEHICLE DETAILS SECTION */}

            <section className="vr-form-section">
              <h3>Vehicle Details</h3>

              <div className="vr-fields-grid">

                {/* BRAND SEARCH */}

                <div className="vr-field vr-full-width">
                  <label htmlFor="vr-brand-search">
                    Search Brands
                  </label>

                  <input
                    id="vr-brand-search"
                    type="search"
                    placeholder="Search car brands..."
                    value={brandSearch}
                    onChange={event =>
                      setBrandSearch(
                        event.target.value
                      )
                    }
                    disabled={
                      submitting ||
                      catalogUnavailable
                    }
                    autoComplete="off"
                  />
                </div>

                {/* BRAND */}

                <div className="vr-field">
                  <label htmlFor="vr-make">
                    Car Brand
                  </label>

                  <select
                    id="vr-make"
                    value={make}
                    onChange={event =>
                      handleBrandChange(
                        event.target.value
                      )
                    }
                    disabled={
                      submitting ||
                      catalogUnavailable
                    }
                    required
                  >
                    <option value="">
                      Select brand
                    </option>

                    {filteredBrands.map(
                      brand => (
                        <option
                          key={brand.name}
                          value={brand.name}
                        >
                          {brand.name}
                        </option>
                      )
                    )}
                  </select>

                  {!catalogUnavailable &&
                    filteredBrands.length === 0 && (
                      <small>
                        No matching brands.
                      </small>
                    )}
                </div>

                {/* MODEL */}

                <div className="vr-field">
                  <label htmlFor="vr-model">
                    Car Model
                  </label>

                  <select
                    id="vr-model"
                    value={model}
                    onChange={event =>
                      handleModelChange(
                        event.target.value
                      )
                    }
                    disabled={
                      !make ||
                      submitting ||
                      catalogUnavailable
                    }
                    required
                  >
                    <option value="">
                      {make
                        ? 'Select model'
                        : 'Select brand first'}
                    </option>

                    {availableModels.map(
                      item => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* CONDITIONAL BODY TYPE */}

                {showBodyTypeDropdown && (
                  <div className="vr-field vr-full-width">
                    <label htmlFor="vr-body-type">
                      Body Type
                    </label>

                    <select
                      id="vr-body-type"
                      value={bodyType}
                      onChange={event => {
                        const value =
                          event.target
                            .value as VehicleBodyType | ''

                        setBodyType(value)
                        clearFeedback()
                      }}
                      disabled={
                        submitting ||
                        catalogUnavailable
                      }
                      required
                    >
                      <option value="">
                        Select body type
                      </option>

                      {availableBodyTypes.map(
                        item => (
                          <option
                            key={item}
                            value={item}
                          >
                            {getBodyTypeLabel(item)}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}

                {/* COLOR */}

                <div className="vr-field vr-full-width">
                  <label htmlFor="vr-color">
                    Vehicle Color
                  </label>

                  <select
                    id="vr-color"
                    value={color}
                    onChange={event => {
                      setColor(
                        event.target.value
                      )
                      clearFeedback()
                    }}
                    disabled={
                      submitting ||
                      catalogUnavailable
                    }
                    required
                  >
                    <option value="">
                      Select color
                    </option>

                    {catalog?.colors.map(
                      item => (
                        <option
                          key={item.name}
                          value={item.name}
                        >
                          {item.name}
                        </option>
                      )
                    )}
                  </select>

                  <div
                    className="vr-color-swatches"
                    role="group"
                    aria-label="Vehicle colors"
                  >
                    {catalog?.colors.map(
                      item => (
                        <button
                          key={item.name}
                          type="button"
                          className={
                            color === item.name
                              ? 'vr-color-swatch selected'
                              : 'vr-color-swatch'
                          }
                          style={{
                            backgroundColor:
                              item.hex,
                          }}
                          title={item.name}
                          aria-label={item.name}
                          aria-pressed={
                            color === item.name
                          }
                          disabled={
                            submitting ||
                            catalogUnavailable
                          }
                          onClick={() => {
                            setColor(item.name)
                            clearFeedback()
                          }}
                        >
                          {color === item.name && (
                            <span className="vr-color-check">
                              ✓
                            </span>
                          )}
                        </button>
                      )
                    )}
                  </div>
                </div>

              </div>

              <p className="vr-help">
                Can't find your vehicle?
                Contact the parking administration.
              </p>

            </section>
          </div>

          {/* RIGHT: LIVE PREVIEWS */}

          <aside className="vr-preview-column">

            {/* LICENSE PLATE */}

            <div className="vr-preview-section">
              <span className="vr-preview-label">
                License Plate
              </span>

              <div className="mv-plate">
                <div className="mv-plate-header">
                  <span>EGYPT</span>
                  <span lang="ar">مصر</span>
                </div>

                <div className="vr-plate-content">
                  <span
                    className={
                      displayNumbers
                        ? 'vr-plate-digits'
                        : 'vr-plate-digits placeholder'
                    }
                    lang="ar"
                    dir="ltr"
                  >
                    {displayNumbers || '١٢٣٤'}
                  </span>

                  <span
                    className="vr-plate-divider"
                    aria-hidden="true"
                  />

                  <span
                    className={
                      displayLetters
                        ? 'vr-plate-letters'
                        : 'vr-plate-letters placeholder'
                    }
                    lang="ar"
                    dir="rtl"
                  >
                    {displayLetters || 'س ب ج'}
                  </span>
                </div>
              </div>
            </div>

            {/* VEHICLE ILLUSTRATION */}

            <div className="vr-vehicle-preview">
              <span className="vr-preview-label">
                Your Vehicle
              </span>

              <VehicleIllustration
                bodyType={resolvedBodyType}
                colorHex={selectedColor?.hex}
                colorName={
                  selectedColor?.name ?? 'Silver'
                }
                className="vr-car-illustration"
              />

              <h3>
                {[make, model]
                  .filter(Boolean)
                  .join(' ') ||
                  'Select your vehicle'}
              </h3>

              {model &&
                !resolvedBodyType &&
                showBodyTypeDropdown && (
                  <p>
                    Select your vehicle body type
                  </p>
                )}

              {resolvedBodyType && (
                <p>
                  {[
                    getBodyTypeLabel(
                      resolvedBodyType
                    ),
                    color,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}

              {resolvedBodyType && (
                <small>
                  Illustrative vehicle preview
                </small>
              )}
            </div>

          </aside>
        </div>

        {/* SUBMISSION ERROR */}

        {error && (
          <p
            className="vr-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* SUBMISSION SUCCESS */}

        {success && (
          <div
            className="vr-success"
            role="status"
          >
            {success}
          </div>
        )}

        {/* FOOTER */}

        <div className="vr-form-footer">

          <div className="vr-approval-note">
            <strong>Parking access</strong>

            <p>
              Your registration requires approval
              before campus parking access is granted.
            </p>
          </div>

          <div className="vr-actions">
            <button
              type="button"
              className="vr-cancel"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="vr-submit"
              disabled={!canSubmit}
            >
              {submitting
                ? 'Registering...'
                : 'Register Vehicle'}
            </button>
          </div>

        </div>
      </form>
    </section>
  )
}
