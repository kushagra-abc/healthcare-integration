import { useEffect, useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [backendMessage, setBackendMessage] = useState('Checking backend...')

  useEffect(() => {
    axios
      .get('http://localhost:5000/api/health')
      .then((response) => {
        setBackendMessage(response.data.message)
      })
      .catch(() => {
        setBackendMessage('Backend unavailable')
      })
  }, [])

  return (
    <div className="app">
      <header className="header">
        <h1>Healthcare Integration Platform</h1>
        <p>RCM API Integration Dashboard</p>
      </header>

      <main className="dashboard">
        <div className="card">
          <h2>System Status</h2>
          <p className="status">● {backendMessage}</p>
          <p>React is communicating with the Express backend.</p>
        </div>

        <div className="card">
          <h2>Available Services</h2>
          <ul>
            <li>Insurance Eligibility Verification</li>
            <li>Claims Submission</li>
            <li>Claims Status Tracking</li>
          </ul>
        </div>
      </main>
    </div>
  )
}

export default App