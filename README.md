# Healthcare RCM Integration Platform

A full-stack healthcare Revenue Cycle Management (RCM) integration project that demonstrates patient management, insurance eligibility verification, claim submission, payer-based clearinghouse routing, retry handling, and automatic failover using simulated STEDI and Availity APIs.

> **Important:** STEDI and Availity are simulated services in this project. The mock servers demonstrate HTTP-based integration patterns; they do not connect to the real STEDI or Availity networks, verify actual insurance coverage, or submit real insurance claims.

## Features

- Patient registration and management
- Provider management
- Healthcare claim creation and submission
- Insurance eligibility checks
- Synchronous and asynchronous eligibility workflows
- Asynchronous task polling and status tracking
- Payer-based clearinghouse selection
- Configurable clearinghouse availability and estimated costs
- HTTP-based communication with separate mock STEDI and Availity API servers
- Provider-specific response formats with normalized eligibility results
- Retry handling with exponential backoff
- Automatic failover to an alternative clearinghouse
- Claim status tracking and history
- PostgreSQL persistence using Prisma ORM
- React dashboard for managing and testing workflows
- Failure simulation for testing error handling and resilience

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, Axios |
| Backend | Node.js, Express.js, Axios |
| Database | PostgreSQL |
| ORM | Prisma |
| Integration simulation | Separate Express-based mock APIs |
| API communication | HTTP and JSON |

## Architecture

```text
React Frontend
      |
      | HTTP requests
      v
RCM Backend (Express)
      |
      +---- Patient and Provider APIs
      |
      +---- Claims Service
      |
      +---- Eligibility Service
      |
      +---- Routing Service
      |
      +---- Prisma ORM
      |         |
      |         v
      |     PostgreSQL
      |
      +---- HTTP Integration Adapters
                 |
          +------+------+
          |             |
          v             v
    Mock STEDI      Mock Availity
    Port 5001       Port 5002
```

The RCM backend selects an eligible clearinghouse based on the payer routing configuration. The integration adapters send HTTP requests to the selected mock API. Provider responses are normalized where necessary, and results are stored and returned to the frontend.

## Project Structure

```text
Healthcare_integration/
├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── config/
│   │   ├── integrations/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── app.js
│   │   └── server.js
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── README.md
│
├── mock-clearinghouses/
│   ├── stedi/
│   │   └── server.js
│   ├── availity/
│   │   └── server.js
│   ├── package.json
│   └── package-lock.json
│
└── README.md
```

## Prerequisites

Install the following before running the application:

- Node.js and npm
- PostgreSQL
- Git

Ensure that the PostgreSQL database is configured and the backend environment variables point to the correct database.

## Setup and Installation

### 1. Configure the backend

Open a terminal in the project root:

```bash
cd backend
npm install
```

Configure the database connection in `backend/.env` using your local PostgreSQL credentials and database name.

Example:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/healthcare_rcm"
```

Replace the placeholders with your actual local database credentials. Do not commit `.env` or expose database passwords.

Generate the Prisma client and apply the existing migrations, if required:

```bash
npx prisma generate
npx prisma migrate deploy
```

For a local development database without existing migrations, follow the migration workflow already used by the project.

Start the backend using the script defined in `backend/package.json`, for example:

```bash
npm run dev
```

The backend is expected to run at:

```text
http://localhost:5000
```

### 2. Configure the mock clearinghouse servers

Open a separate terminal:

```bash
cd mock-clearinghouses
npm install
```

Start the mock STEDI server:

```bash
node stedi/server.js
```

Start the mock Availity server in another terminal:

```bash
node availity/server.js
```

Expected base URLs:

- Mock STEDI: `http://localhost:5001`
- Mock Availity: `http://localhost:5002`

If the backend uses environment variables for these URLs, configure them in `backend/.env`:

```env
MOCK_STEDI_URL="http://localhost:5001"
MOCK_AVAILITY_URL="http://localhost:5002"
```

Restart the backend after changing environment variables.

### 3. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal, usually:

```text
http://localhost:5173
```

Keep the backend and both mock API servers running while using the application.

## Mock API Endpoints

The following endpoints are implemented by the mock servers.

| Server | Method | Endpoint | Purpose |
|---|---|---|---|
| STEDI | GET | `/health` | Health check |
| STEDI | POST | `/api/eligibility` | Simulated eligibility verification |
| STEDI | POST | `/api/claims` | Simulated claim submission |
| Availity | GET | `/health` | Health check |
| Availity | POST | `/api/eligibility` | Simulated eligibility verification |
| Availity | POST | `/api/claims` | Simulated claim submission |

Full URLs use the respective server's port: `5001` for STEDI and `5002` for Availity.

### Example eligibility request

```json
{
  "patient": {
    "insuranceMemberId": "TEST-1001",
    "insuranceProvider": "ABC Health Insurance"
  },
  "options": {}
}
```

Send this JSON to `POST http://localhost:5001/api/eligibility` to test the mock STEDI API.

### Example claim submission request

The claims endpoint expects a claim object with an ID and an options object:

```json
{
  "claim": {
    "id": 5
  },
  "options": {}
}
```

This is a minimal illustration of the mock endpoint's expected structure. The RCM backend sends the full claim object when submitting a claim.

## Routing, Retries, and Failover

The routing service retrieves the eligible clearinghouse candidates for a patient's insurance payer and the requested operation.

The routing configuration determines which clearinghouses support an operation and are available. Candidates are ordered according to the configured estimated cost and routing priority.

For each provider, the service retries retryable failures up to three times, using exponential backoff. If the provider continues to fail, the service moves to the next eligible provider.

### Successful failover example

```text
Claim submission
      |
      v
Availity
  Attempt 1 -> Failure
  Attempt 2 -> Failure
  Attempt 3 -> Failure
      |
      v
STEDI
  Attempt 4 -> Success
      |
      v
Claim status: SUBMITTED
```

### Complete failure example

```text
Availity: 3 failed attempts
      |
      v
STEDI: 3 failed attempts
      |
      v
Submission failure returned
Claim remains DRAFT
```

A successful mock acknowledgement is saved as a simulated insurer claim reference. It does not represent actual payer acceptance, adjudication, approval, or payment.

## Testing

### 1. Test API health

```powershell
Invoke-RestMethod http://localhost:5001/health
Invoke-RestMethod http://localhost:5002/health
```

Both endpoints should return a healthy status.

### 2. Test eligibility

Use the dashboard to select an existing patient and run an eligibility check with failure simulation disabled.

Verify that:

- The task reaches `COMPLETED`.
- A clearinghouse is selected.
- The eligibility response contains the normalized fields.
- Provider attempt history is recorded.

### 3. Test provider failover

Use a payer configured with both clearinghouses available.

1. Select the provider-specific failure option for the preferred clearinghouse.
2. Run eligibility or submit a draft claim.
3. Verify three failed attempts at the first provider.
4. Verify that the next eligible provider succeeds.
5. Verify the final result and attempt history.

### 4. Test complete provider failure

Enable the option to simulate failures at every provider and submit a fresh draft claim.

Verify that both providers exhaust their retries, the backend reports failure, and the claim is not marked `SUBMITTED`.

### 5. Verify database persistence

Inspect the claim record and its saved insurer claim reference using PostgreSQL or Prisma Studio.

## Current Limitations

- STEDI and Availity are simulated APIs hosted locally.
- Eligibility and claim responses are synthetic.
- No real payer, clearinghouse, or insurer is contacted.
- The mock benefit amounts and claim acknowledgements are illustrative.
- This project demonstrates integration architecture and failure handling, not production healthcare adjudication.

## Future Improvements

- Integrate official provider test or sandbox environments where access is available.
- Add authentication and request validation to the mock API servers.
- Add automated API and integration tests.
- Add structured logging and correlation IDs across requests.
- Add configurable response delays and more failure scenarios.
- Add claim status polling and simulated adjudication workflows.
- Document API contracts using an OpenAPI specification.

## License

Add an appropriate license before distributing the project publicly.
