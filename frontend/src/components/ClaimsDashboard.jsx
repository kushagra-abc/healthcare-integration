
import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'

const API = 'http://localhost:5000/api'

const initialPatient = {
  name: '',
  dateOfBirth: '',
  email: '',
  phone: '',
  insuranceMemberId: '',
  insuranceProvider: '',
}

const initialClaim = {
  patientId: '',
  providerId: '',
  serviceDate: new Date().toISOString().slice(0, 10),
  description: '',
  billedAmount: '',
}

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    'Something went wrong. Please try again.'
  )
}

function formatAmount(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  })
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN')
}

function StatusBadge({ status }) {
  const value = status || 'UNKNOWN'
  return (
    <span className={`claim-status status-${value.toLowerCase()}`}>
      {value.replaceAll('_', ' ')}
    </span>
  )
}

function ClaimsDashboard() {
  const [patients, setPatients] = useState([])
  const [providers, setProviders] = useState([])
  const [claims, setClaims] = useState([])
  const [patientForm, setPatientForm] = useState(initialPatient)
  const [claimForm, setClaimForm] = useState(initialClaim)
  const [simulateProviderFailure, setSimulateProviderFailure] = useState('')
  const [simulateAllFailures, setSimulateAllFailures] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingPatient, setSavingPatient] = useState(false)
  const [savingClaim, setSavingClaim] = useState(false)
  const [submittingClaimId, setSubmittingClaimId] = useState(null)
  const [pageError, setPageError] = useState('')
  const [notice, setNotice] = useState('')
  const [submissionResult, setSubmissionResult] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setPageError('')

    try {
      const [patientResponse, providerResponse, claimResponse] =
        await Promise.all([
          axios.get(`${API}/patients`),
          axios.get(`${API}/providers`),
          axios.get(`${API}/claims`),
        ])

      const patientList = patientResponse.data.patients || []
      const providerList = providerResponse.data.providers || []
      const claimList = claimResponse.data.claims || []

      setPatients(patientList)
      setProviders(providerList)
      setClaims(claimList)

      setClaimForm((previous) => ({
        ...previous,
        patientId:
          previous.patientId ||
          (patientList.length ? String(patientList[0].id) : ''),
        providerId:
          previous.providerId ||
          (providerList.length ? String(providerList[0].id) : ''),
      }))
    } catch (error) {
      setPageError(
        `${getErrorMessage(error)}. Check that the backend is running and its patient, provider, and claim routes are mounted.`
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleCreatePatient(event) {
    event.preventDefault()
    setSavingPatient(true)
    setNotice('')
    setPageError('')

    try {
      const response = await axios.post(`${API}/patients`, patientForm)
      const createdPatient = response.data.patient

      setNotice(`Patient "${createdPatient.name}" created successfully (ID ${createdPatient.id}).`)
      setPatientForm(initialPatient)

      await loadData()

      setClaimForm((previous) => ({
        ...previous,
        patientId: String(createdPatient.id),
      }))
    } catch (error) {
      setPageError(getErrorMessage(error))
    } finally {
      setSavingPatient(false)
    }
  }

  async function handleCreateClaim(event) {
    event.preventDefault()
    setSavingClaim(true)
    setNotice('')
    setPageError('')
    setSubmissionResult(null)

    try {
      const response = await axios.post(`${API}/claims`, {
        patientId: Number(claimForm.patientId),
        providerId: Number(claimForm.providerId),
        serviceDate: claimForm.serviceDate,
        description: claimForm.description.trim(),
        billedAmount: Number(claimForm.billedAmount),
      })

      const createdClaim = response.data.claim
      setNotice(`Claim #${createdClaim.id} created successfully as a draft.`)
      setClaimForm((previous) => ({
        ...initialClaim,
        patientId: previous.patientId,
        providerId: previous.providerId,
        serviceDate: new Date().toISOString().slice(0, 10),
      }))

      await loadData()
    } catch (error) {
      setPageError(getErrorMessage(error))
    } finally {
      setSavingClaim(false)
    }
  }

  async function handleSubmitClaim(claimId) {
    setSubmittingClaimId(claimId)
    setNotice('')
    setPageError('')
    setSubmissionResult(null)

    try {
      const response = await axios.post(
        `${API}/claims/${claimId}/submit`,
        {
          simulateFailure: simulateAllFailures,
          ...(simulateProviderFailure
            ? { simulateProviderFailure }
            : {}),
        }
      )

      setSubmissionResult({
        success: true,
        data: response.data,
      })

      setNotice(`Claim #${claimId} submitted successfully.`)
      await loadData()
    } catch (error) {
      const errorData = error.response?.data || {
        message: getErrorMessage(error),
      }

      setSubmissionResult({
        success: false,
        data: errorData,
      })

      setPageError(errorData.message || 'Claim submission failed.')
      await loadData()
    } finally {
      setSubmittingClaimId(null)
    }
  }

  return (
    <section className="claims-dashboard">
      <div className="section-heading claims-title">
        <div>
          <p className="eyebrow">REVENUE CYCLE MANAGEMENT</p>
          <h2>Patients & Claims</h2>
          <p className="muted">
            Create patient records, prepare claims, and test clearinghouse
            routing and failover.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={loadData}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : '↻ Refresh data'}
        </button>
      </div>

      {pageError && (
        <div className="feedback feedback-error" role="alert">
          <strong>Attention:</strong> {pageError}
        </div>
      )}

      {notice && (
        <div className="feedback feedback-success" role="status">
          {notice}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <span>Total patients</span>
          <strong>{patients.length}</strong>
        </div>
        <div className="stat-card">
          <span>Total claims</span>
          <strong>{claims.length}</strong>
        </div>
        <div className="stat-card">
          <span>Draft claims</span>
          <strong>
            {claims.filter((claim) => claim.status === 'DRAFT').length}
          </strong>
        </div>
        <div className="stat-card">
          <span>Submitted / processed</span>
          <strong>
            {claims.filter((claim) =>
              ['SUBMITTED', 'PROCESSING', 'APPROVED',
                'PARTIALLY_APPROVED', 'REJECTED', 'PAID'].includes(claim.status)
            ).length}
          </strong>
        </div>
      </div>

      <div className="management-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">PATIENT RECORDS</p>
              <h3>Register a patient</h3>
            </div>
          </div>

          <form className="data-form" onSubmit={handleCreatePatient}>
            <label>
              Full name *
              <input
                required
                maxLength={120}
                value={patientForm.name}
                onChange={(event) =>
                  setPatientForm({ ...patientForm, name: event.target.value })
                }
                placeholder="e.g. Rahul Sharma"
              />
            </label>

            <label>
              Date of birth *
              <input
                required
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={patientForm.dateOfBirth}
                onChange={(event) =>
                  setPatientForm({
                    ...patientForm,
                    dateOfBirth: event.target.value,
                  })
                }
              />
            </label>

            <div className="form-row">
              <label>
                Email
                <input
                  type="email"
                  maxLength={254}
                  value={patientForm.email}
                  onChange={(event) =>
                    setPatientForm({ ...patientForm, email: event.target.value })
                  }
                  placeholder="patient@example.com"
                />
              </label>

              <label>
                Phone
                <input
                  type="tel"
                  maxLength={30}
                  value={patientForm.phone}
                  onChange={(event) =>
                    setPatientForm({ ...patientForm, phone: event.target.value })
                  }
                  placeholder="Phone number"
                />
              </label>
            </div>

            <label>
              Insurance member ID *
              <input
                required
                maxLength={100}
                value={patientForm.insuranceMemberId}
                onChange={(event) =>
                  setPatientForm({
                    ...patientForm,
                    insuranceMemberId: event.target.value,
                  })
                }
                placeholder="Member identifier"
              />
            </label>

            <label>
              Insurance provider / payer *
              <input
                required
                maxLength={120}
                value={patientForm.insuranceProvider}
                onChange={(event) =>
                  setPatientForm({
                    ...patientForm,
                    insuranceProvider: event.target.value,
                  })
                }
                placeholder="e.g. ABC Health Insurance"
              />
            </label>

            <button className="primary-button" disabled={savingPatient}>
              {savingPatient ? 'Saving patient...' : 'Create patient'}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">CLAIM PREPARATION</p>
              <h3>Create a claim</h3>
            </div>
          </div>

          {patients.length === 0 || providers.length === 0 ? (
            <div className="empty-state">
              {patients.length === 0
                ? 'Register a patient before creating a claim.'
                : 'No providers were returned by the backend. Create a provider first.'}
            </div>
          ) : (
            <form className="data-form" onSubmit={handleCreateClaim}>
              <label>
                Patient *
                <select
                  required
                  value={claimForm.patientId}
                  onChange={(event) =>
                    setClaimForm({
                      ...claimForm,
                      patientId: event.target.value,
                    })
                  }
                >
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      #{patient.id} — {patient.name} ({patient.insuranceProvider})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Provider *
                <select
                  required
                  value={claimForm.providerId}
                  onChange={(event) =>
                    setClaimForm({
                      ...claimForm,
                      providerId: event.target.value,
                    })
                  }
                >
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      #{provider.id} — {provider.name}
                      {provider.organization ? ` · ${provider.organization}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Service date *
                <input
                  required
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={claimForm.serviceDate}
                  onChange={(event) =>
                    setClaimForm({
                      ...claimForm,
                      serviceDate: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Service description *
                <textarea
                  required
                  maxLength={500}
                  rows={3}
                  value={claimForm.description}
                  onChange={(event) =>
                    setClaimForm({
                      ...claimForm,
                      description: event.target.value,
                    })
                  }
                  placeholder="Describe the medical service"
                />
              </label>

              <label>
                Billed amount (INR) *
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={claimForm.billedAmount}
                  onChange={(event) =>
                    setClaimForm({
                      ...claimForm,
                      billedAmount: event.target.value,
                    })
                  }
                  placeholder="e.g. 2500"
                />
              </label>

              <button className="primary-button" disabled={savingClaim}>
                {savingClaim ? 'Creating claim...' : 'Create draft claim'}
              </button>
            </form>
          )}
        </section>
      </div>

      <section className="panel claims-panel">
        <div className="panel-heading claims-list-heading">
          <div>
            <p className="eyebrow">CLAIM LIFECYCLE</p>
            <h3>Claims register</h3>
            <p className="muted">
              Draft claims can be submitted to the mock clearinghouse workflow.
            </p>
          </div>
          <span className="record-count">{claims.length} records</span>
        </div>

        {loading && claims.length === 0 ? (
          <div className="empty-state">Loading claims...</div>
        ) : claims.length === 0 ? (
          <div className="empty-state">
            No claims yet. Create your first claim above.
          </div>
        ) : (
          <div className="table-scroll">
            <table className="claims-table">
              <thead>
                <tr>
                  <th>Claim</th>
                  <th>Patient</th>
                  <th>Provider</th>
                  <th>Service date</th>
                  <th>Billed amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.id}>
                    <td>
                      <strong>#{claim.id}</strong>
                      <span className="table-subtext">
                        {claim.description}
                      </span>
                    </td>
                    <td>
                      {claim.patient?.name || `Patient #${claim.patientId}`}
                    </td>
                    <td>
                      {claim.provider?.name || `Provider #${claim.providerId}`}
                    </td>
                    <td>{formatDate(claim.serviceDate)}</td>
                    <td>{formatAmount(claim.billedAmount)}</td>
                    <td><StatusBadge status={claim.status} /></td>
                    <td>
                      {claim.status === 'DRAFT' ? (
                        <button
                          type="button"
                          className="small-primary-button"
                          disabled={submittingClaimId !== null}
                          onClick={() => handleSubmitClaim(claim.id)}
                        >
                          {submittingClaimId === claim.id
                            ? 'Submitting...'
                            : 'Submit claim'}
                        </button>
                      ) : (
                        <span className="muted">No action</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel routing-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">INTEGRATION TEST CONTROLS</p>
            <h3>Claim routing simulation</h3>
            <p className="muted">
              Use these controls to test retries and provider failover. They
              simulate failures; they do not contact real clearinghouses.
            </p>
          </div>
        </div>

        <div className="simulation-controls">
          <label>
            Simulate failure at one clearinghouse
            <select
              value={simulateProviderFailure}
              onChange={(event) =>
                setSimulateProviderFailure(event.target.value)
              }
            >
              <option value="">No forced provider failure</option>
              <option value="AVAILITY">AVAILITY</option>
              <option value="STEDI">STEDI</option>
            </select>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={simulateAllFailures}
              onChange={(event) =>
                setSimulateAllFailures(event.target.checked)
              }
            />
            Simulate failure at every provider
          </label>
        </div>

        {submissionResult && (
          <div className="submission-result">
            <h4>
              {submissionResult.success
                ? 'Submission response'
                : 'Submission failed'}
            </h4>

            <p>{submissionResult.data.message || 'No message returned.'}</p>

            {submissionResult.data.routing && (
              <div className="routing-summary">
                <div>
                  <span>Payer</span>
                  <strong>{submissionResult.data.routing.payer || '—'}</strong>
                </div>
                <div>
                  <span>Selected clearinghouse</span>
                  <strong>
                    {submissionResult.data.routing.selectedProvider || '—'}
                  </strong>
                </div>
                <div>
                  <span>Estimated cost</span>
                  <strong>
                    {submissionResult.data.routing.estimatedCost ?? '—'}
                  </strong>
                </div>
                <div>
                  <span>Total attempts</span>
                  <strong>
                    {submissionResult.data.routing.totalAttempts ??
                      submissionResult.data.attempts?.length ??
                      0}
                  </strong>
                </div>
              </div>
            )}

            {submissionResult.data.acknowledgement && (
              <div className="acknowledgement">
                <strong>Mock acknowledgement</strong>
                <p>
                  Claim reference:{' '}
                  {submissionResult.data.acknowledgement.insurerClaimId || '—'}
                </p>
                <p>
                  Provider:{' '}
                  {submissionResult.data.acknowledgement.provider || '—'}
                </p>
              </div>
            )}

            {submissionResult.data.attempts?.length > 0 && (
              <div className="attempt-list">
                <h4>Provider attempt history</h4>
                {submissionResult.data.attempts.map((attempt, index) => (
                  <div
                    className="attempt-row"
                    key={`${attempt.provider}-${attempt.attemptNumber ?? index}-${index}`}
                  >
                    <span className="attempt-number">
                      {attempt.attemptNumber ?? index + 1}
                    </span>
                    <div className="attempt-details">
                      <strong>{attempt.provider || 'Provider'}</strong>
                      <span>
                        {attempt.errorMessage ||
                          attempt.message ||
                          'Attempt completed'}
                      </span>
                    </div>
                    <span
                      className={`attempt-status ${
                        String(attempt.status || '').toLowerCase().includes('success') ||
                        String(attempt.status || '').toLowerCase().includes('accepted')
                          ? 'attempt-success'
                          : 'attempt-failed'
                      }`}
                    >
                      {attempt.status || 'UNKNOWN'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="secondary-button result-dismiss"
              onClick={() => setSubmissionResult(null)}
            >
              Dismiss result
            </button>
          </div>
        )}
      </section>
    </section>
  )
}

export default ClaimsDashboard
