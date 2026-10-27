
const express = require("express");

const app = express();
const PORT = 5001;

app.use(express.json());

// Health check
app.get("/health", (req, res) => {
    res.json({
        provider: "STEDI",
        status: "healthy",
        message: "Mock STEDI API is running",
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
        String(options.simulateProviderFailure || "").toUpperCase() === "STEDI"
    ) {
        return res.status(503).json({
            provider: "STEDI",
            error: "Temporary eligibility service failure",
            retryable: true,
        });
    }

    return res.json({
        member_status: "ACTIVE",
        payer_name: patient.insuranceProvider,
        member_id: patient.insuranceMemberId,
        benefits: {
            copay: 30,
            deductible_total: 1500,
            deductible_remaining: 500,
            coinsurance_percent: 20,
        },
        checked_at: new Date().toISOString(),
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
        String(options.simulateProviderFailure || "").toUpperCase() === "STEDI"
    ) {
        return res.status(503).json({
            provider: "STEDI",
            error: "Temporary claim-submission failure",
            retryable: true,
        });
    }

    return res.json({
        provider: "STEDI",
        accepted: true,
        insurerClaimId: `MOCK-STEDI-${claim.id}-${Date.now()}`,
        message: "Mock STEDI API accepted the claim for processing",
        submittedAt: new Date().toISOString(),
    });
});

app.listen(PORT, () => {
    console.log(`Mock STEDI API running at http://localhost:${PORT}`);
});
