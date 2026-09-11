import './App.css'

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>Healthcare Integration Platform</h1>
        <p>RCM API Integration Dashboard</p>
      </header>

      <main className="dashboard">
        <div className="card">
          <h2>System Status</h2>
          <p className="status">● Backend Connected</p>
          <p>Healthcare integration API is running.</p>
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