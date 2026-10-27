
const express = require("express");

const app = express();
const PORT = 5002;

app.use(express.json());

// Health check
app.get("/health", (req, res) => {
    res.json({
        provider: "AVAILITY",
        status: "healthy",
        message: "Mock Availity API is running",
    });
});

// Simulated eligibility API
app.post("/api/eligibility", (req, res) => {
    const patient = req.body.patient;
    const options = req.body.options || {};

    if (!patient || !patient.insuranceMemberId) {
        return res.status(400).json({
            error: "Patient and insuranceMemberId are required",
            retryable: false,
        });
    }

    if (
        options.simulateFailure ||
        String(options.simulateProviderFailure || "").toUpperCase() === "AVAILITY"
    ) {
        return res.status(503).json({
            provider: "AVAILITY",
            error: "Temporary eligibility service failure",
            retryable: true,
        });
    }

    return res.json({
        status: "ACTIVE",
        payer: patient.insuranceProvider,
        subscriberId: patient.insuranceMemberId,
        benefitDetails: {
            copayAmount: 25,
            deductible: {
                total: 1200,
                remaining: 400,
            },
            coinsurance: 15,
        },
        responseTimestamp: new Date().toISOString(),
    });
});

// Simulated claim submission API
app.post("/api/claims", (req, res) => {
    const claim = req.body.claim;
    const options = req.body.options || {};

    if (!claim || !claim.id) {
        return res.status(400).json({
            error: "A valid claim is required",
            retryable: false,
        });
    }

    if (
        options.simulateFailure ||
        String(options.simulateProviderFailure || "").toUpperCase() === "AVAILITY"
    ) {
        return res.status(503).json({
            provider: "AVAILITY",
            error: "Temporary claim-submission failure",
            retryable: true,
        });
    }

    return res.json({
        provider: "AVAILITY",
        accepted: true,
        insurerClaimId: `MOCK-AVAILITY-${claim.id}-${Date.now()}`,
        message: "Mock Availity API accepted the claim for processing",
        submittedAt: new Date().toISOString(),
    });
});

app.listen(PORT, () => {
    console.log(`Mock Availity API running at http://localhost:${PORT}`);
});
