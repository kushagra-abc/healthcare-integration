
const express = require("express");
const { randomUUID } = require("crypto");
const mockStedi = require("../integrations/mockStedi");

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
    res.json({ service: "Mock Stedi", status: "healthy" });
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

        const result = await mockStedi.checkEligibility(patient, options);
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
        options.simulateProviderFailure === "STEDI"
    ) {
        return res.status(503).json({
            error: "Stedi mock: temporary claim submission failure",
            retryable: true,
        });
    }

    res.json({
        insurerClaimId: `STEDI-${randomUUID()}`,
        status: "ACKNOWLEDGED",
        provider: "STEDI",
        acknowledgedAt: new Date().toISOString(),
    });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Mock Stedi running on port ${PORT}`);
});
