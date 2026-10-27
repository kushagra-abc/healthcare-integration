
const express = require("express");
const prisma = require("../config/prisma");
const claimsService = require("../services/claimsService");

const router = express.Router();

// Create a new claim
router.post("/", async (req, res) => {
    try {
        const {
            patientId,
            providerId,
            serviceDate,
            description,
            billedAmount,
        } = req.body;

        if (
            !patientId ||
            !providerId ||
            !serviceDate ||
            !description ||
            billedAmount === undefined ||
            billedAmount === null
        ) {
            return res.status(400).json({
                message:
                    "patientId, providerId, serviceDate, description, and billedAmount are required",
            });
        }

        const amount = Number(billedAmount);
        const parsedDate = new Date(serviceDate);

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                message: "billedAmount must be a positive number",
            });
        }

        if (Number.isNaN(parsedDate.getTime())) {
            return res.status(400).json({
                message: "serviceDate must be a valid date",
            });
        }

        const patient = await prisma.patient.findUnique({
            where: { id: Number(patientId) },
        });

        if (!patient) {
            return res.status(404).json({
                message: "Patient not found",
            });
        }

        const provider = await prisma.provider.findUnique({
            where: { id: Number(providerId) },
        });

        if (!provider) {
            return res.status(404).json({
                message: "Provider not found",
            });
        }

        const claim = await prisma.claim.create({
            data: {
                patientId: Number(patientId),
                providerId: Number(providerId),
                serviceDate: parsedDate,
                description: String(description),
                billedAmount: amount,
            },
        });

        return res.status(201).json({
            message: "Claim created successfully",
            claim,
        });
    } catch (error) {
        console.error("Error creating claim:", error.message);

        return res.status(500).json({
            message: "Failed to create claim",
        });
    }
});

// Submit a DRAFT claim through the mock claims-routing integration
router.post("/:id/submit", async (req, res) => {
    try {
        const result = await claimsService.submitClaim(req.params.id, {
            simulateFailure: req.body?.simulateFailure === true,
            simulateProviderFailure:
                req.body?.simulateProviderFailure || "",
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error("Error submitting claim:", error.message);

        return res.status(error.statusCode || 500).json({
            message: error.message || "Failed to submit claim",
            ...(error.attempts ? { attempts: error.attempts } : {}),
        });
    }
});

// Get all claims
router.get("/", async (req, res) => {
    try {
        const claims = await prisma.claim.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                patient: true,
                provider: true,
            },
        });

        return res.status(200).json({
            count: claims.length,
            claims,
        });
    } catch (error) {
        console.error("Error fetching claims:", error.message);

        return res.status(500).json({
            message: "Failed to fetch claims",
        });
    }
});

// Get claim by ID
router.get("/:id", async (req, res) => {
    try {
        const claimId = Number(req.params.id);

        if (!Number.isInteger(claimId) || claimId <= 0) {
            return res.status(400).json({
                message: "Invalid claim ID",
            });
        }

        const claim = await prisma.claim.findUnique({
            where: { id: claimId },
            include: {
                patient: true,
                provider: true,
                statusHistory: {
                    orderBy: { createdAt: "asc" },
                },
                payments: true,
            },
        });

        if (!claim) {
            return res.status(404).json({
                message: "Claim not found",
            });
        }

        return res.status(200).json({ claim });
    } catch (error) {
        console.error("Error fetching claim:", error.message);

        return res.status(500).json({
            message: "Failed to fetch claim",
        });
    }
});

module.exports = router;
