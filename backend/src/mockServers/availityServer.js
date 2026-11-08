
const express = require("express");
const { randomUUID } = require("crypto");
const mockAvaility = require("../integrations/mockAvaility");

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
    res.json({ service: "Mock Availity", status: "healthy" });
});

app.post("/api/eligibility", async (req, res) => {
    try {
        const { patient, options = {} } = req.body;

        if (!patient) {
            return res.status(400).json({
                error: "Patient is required",
                retryable: false,
            });
        }

        const result = await mockAvaility.checkEligibility(patient, options);
        res.json(result);
    } catch (error) {
        res.status(error.retryable ? 503 : 400).json({
            error: error.message,
            retryable: Boolean(error.retryable),
        });
    }
});

app.post("/api/claims", (req, res) => {
    const { claim, options = {} } = req.body;

    if (!claim) {
        return res.status(400).json({
            error: "Claim is required",
            retryable: false,
        });
    }

    if (
        options.simulateFailure ||
        options.simulateProviderFailure === "AVAILITY"
    ) {
        return res.status(503).json({
            error: "Availity mock: temporary claim submission failure",
            retryable: true,
        });
    }

    res.json({
        insurerClaimId: `AVAILITY-${randomUUID()}`,
        status: "ACKNOWLEDGED",
        provider: "AVAILITY",
        acknowledgedAt: new Date().toISOString(),
    });
});

const PORT = process.env.PORT || 5002;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Mock Availity running on port ${PORT}`);
});
