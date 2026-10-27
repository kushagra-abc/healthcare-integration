
const prisma = require("../config/prisma");
const routingService = require("./routingService");
const mockClaims = require("../integrations/mockClaims");

const MAX_ATTEMPTS_PER_PROVIDER = 3;

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function submitClaim(claimId, options = {}) {
    const id = Number(claimId);

    if (!Number.isInteger(id) || id <= 0) {
        throw Object.assign(new Error("Invalid claim ID"), {
            statusCode: 400,
        });
    }

    const claim = await prisma.claim.findUnique({
        where: { id },
        include: {
            patient: true,
            provider: true,
        },
    });

    if (!claim) {
        throw Object.assign(new Error("Claim not found"), {
            statusCode: 404,
        });
    }

    if (claim.status !== "DRAFT") {
        throw Object.assign(
            new Error(
                `Only DRAFT claims can be submitted. Current status: ${claim.status}`
            ),
            { statusCode: 409 }
        );
    }

    const candidates = await routingService.getClearinghouseCandidates(
        claim.patient.insuranceProvider,
        "claims"
    );

    let totalAttempts = 0;
    let lastError = null;
    const attemptHistory = [];

    for (const candidate of candidates) {
        const provider = candidate.clearinghouse.toUpperCase();

        for (
            let attempt = 1;
            attempt <= MAX_ATTEMPTS_PER_PROVIDER;
            attempt++
        ) {
            totalAttempts++;
            const startedAt = Date.now();

            try {
                const acknowledgement = await mockClaims.submitClaim(claim, {
                    ...options,
                    provider,
                });

                const durationMs = Date.now() - startedAt;

                const updatedClaim = await prisma.$transaction(async (tx) => {
                    const updated = await tx.claim.update({
                        where: { id },
                        data: {
                            status: "SUBMITTED",
                            insurerClaimId: acknowledgement.insurerClaimId,
                            rejectionReason: null,
                        },
                    });

                    await tx.claimStatusHistory.create({
                        data: {
                            claimId: id,
                            oldStatus: claim.status,
                            newStatus: "SUBMITTED",
                            remarks: `Mock submission acknowledged by ${provider}.`,
                        },
                    });

                    return updated;
                });

                attemptHistory.push({
                    attemptNumber: totalAttempts,
                    provider,
                    status: "SUCCEEDED",
                    durationMs,
                    errorMessage: null,
                });

                return {
                    message: "Claim submitted successfully (mock integration)",
                    claim: updatedClaim,
                    acknowledgement,
                    routing: {
                        payer: claim.patient.insuranceProvider,
                        selectedProvider: provider,
                        estimatedCost: candidate.estimatedCost,
                        reason:
                            totalAttempts === 1
                                ? "Lowest-cost available clearinghouse supporting claims"
                                : "Selected after retry or provider failover",
                        totalAttempts,
                    },
                    attempts: attemptHistory,
                };
            } catch (error) {
                // Retry only errors explicitly marked as retryable.
                if (!error.retryable) {
                    throw error;
                }

                lastError = error;

                attemptHistory.push({
                    attemptNumber: totalAttempts,
                    provider,
                    status: "FAILED",
                    durationMs: Date.now() - startedAt,
                    errorMessage: error.message,
                });

                if (attempt < MAX_ATTEMPTS_PER_PROVIDER) {
                    await delay(300 * (2 ** (attempt - 1)));
                }
            }
        }
    }

    throw Object.assign(
        new Error(
            `Claim submission failed after ${totalAttempts} attempts. ${
                lastError?.message || "No provider accepted the claim."
            }`
        ),
        {
            statusCode: 502,
            attempts: attemptHistory,
        }
    );
}

module.exports = { submitClaim };
