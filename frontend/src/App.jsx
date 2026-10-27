
import { useEffect, useState } from 'react'
import axios from 'axios'
import './App.css'
import EligibilityCheck from './components/EligibilityCheck'
import ClaimsDashboard from './components/ClaimsDashboard'

const API_URL = 'http://localhost:5000/api'

function App() {
  const [backendMessage, setBackendMessage] = useState('Checking backend...')
  const [backendOnline, setBackendOnline] = useState(false)

  useEffect(() => {
    axios
      .get(`${API_URL}/health`)
      .then((response) => {
        setBackendMessage(response.data.message || 'Backend connected')
        setBackendOnline(true)
      })
      .catch(() => {
        setBackendMessage('Backend unavailable')
        setBackendOnline(false)
      })
  }, [])

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="brand-mark">RCM</div>
          <div>
            <h1>Healthcare Integration Platform</h1>
            <p>Revenue Cycle Management · Integration Dashboard</p>
          </div>
        </div>
        <span className={`connection-badge ${backendOnline ? 'online' : 'offline'}`}>
          <span className="connection-dot" />
          {backendMessage}
        </span>
      </header>

      <main className="dashboard">
        <section className="welcome-section">
          <div>
            <p className="eyebrow">OPERATIONS OVERVIEW</p>
            <h2>Healthcare RCM Dashboard</h2>
            <p className="muted">
              Manage patients, verify eligibility, and submit claims through
              the mock clearinghouse integration.
            </p>
          </div>
        </section>

        <section className="overview-grid">
          <div className="overview-card">
            <span className="overview-icon">01</span>
            <div>
              <p>Patient Management</p>
              <h3>Patient records</h3>
              <span>Register and retrieve patient information</span>
            </div>
          </div>

          <div className="overview-card">
            <span className="overview-icon">02</span>
            <div>
              <p>Eligibility</p>
              <h3>Coverage verification</h3>
              <span>Check insurance benefits and provider attempts</span>
            </div>
          </div>

          <div className="overview-card">
            <span className="overview-icon">03</span>
            <div>
              <p>Claims Management</p>
              <h3>Claim processing</h3>
              <span>Create, submit, and track claims</span>
            </div>
          </div>
        </section>

        <ClaimsDashboard />

        <section className="section-heading">
          <div>
            <p className="eyebrow">INSURANCE WORKFLOW</p>
            <h2>Eligibility Verification</h2>
          </div>
          <p className="muted">Synchronous and asynchronous processing</p>
        </section>

        <EligibilityCheck />
      </main>

      <footer className="footer">
        Healthcare Integration Platform · RCM Demonstration
        <span>Claim submission uses mock clearinghouse integrations.</span>
      </footer>
    </div>
  )
}

export default App
