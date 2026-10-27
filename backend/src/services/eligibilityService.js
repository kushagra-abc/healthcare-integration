
const prisma = require("../config/prisma");
const clearinghouseAdapter = require("../integrations/clearinghouseAdapter");

const MAX_ATTEMPTS = 3;

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}



async function checkWithRetry(patient, options = {}, taskId) {
    const routingService = require("./routingService");

    const candidates = await routingService.getClearinghouseCandidates(
        patient.insuranceProvider,
        "eligibility"
    );

    let totalAttempts = 0;
    let lastError;

    for (const candidate of candidates) {
        const provider = candidate.clearinghouse.toUpperCase();

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            totalAttempts++;

            const startedAt = Date.now();

            const attemptRecord = await prisma.eligibilityAttempt.create({
                data: {
                    eligibilityCheckId: taskId,
                    provider,
                    attemptNumber: totalAttempts,
                    status: "PROCESSING",
                },
            });

            let result;

            try {
                result = await clearinghouseAdapter.checkEligibility(
                    patient,
                    { ...options, provider }
                );
            } catch (error) {
                lastError = error;
                error.selectedProvider = provider;

                await prisma.eligibilityAttempt.update({
                    where: { id: attemptRecord.id },
                    data: {
                        status: "FAILED",
                        errorMessage: error.message,
                        retryable: Boolean(error.retryable),
                        durationMs: Date.now() - startedAt,
                    },
                });

                if (!error.retryable) {
                    error.attempts = totalAttempts;
                    throw error;
                }

                if (attempt < MAX_ATTEMPTS) {
                    await delay(500 * (2 ** (attempt - 1)));
                }

                continue;
            }

            await prisma.eligibilityAttempt.update({
                where: { id: attemptRecord.id },
                data: {
                    status: "SUCCEEDED",
                    retryable: false,
                    durationMs: Date.now() - startedAt,
                },
            });

            return {
                result: {
                    ...result,
                    routing: {
                        selectedProvider: candidate.clearinghouse,
                        estimatedCost: candidate.estimatedCost,
                        reason:
                            totalAttempts === 1
                                ? "Lowest-cost available supported provider"
                                : "Selected after retry or provider failover",
                        attempts: totalAttempts,
                    },
                },
                attempts: totalAttempts,
            };
        }
    }

    const error = new Error(
        `All eligible clearinghouses failed for ${patient.insuranceProvider}: ${
            lastError?.message || "Unknown provider error"
        }`
    );

    error.retryable = true;
    error.attempts = totalAttempts;
    error.selectedProvider = lastError?.selectedProvider || null;

    throw error;
}



async function createEligibilityTask(patientId) {
    const patient = await prisma.patient.findUnique({
        where: { id: patientId }
    });

    if (!patient) {
        const error = new Error("Patient not found");
        error.statusCode = 404;
        throw error;
    }

    return prisma.eligibilityCheck.create({
        data: {
            patientId,
            status: "PENDING",
            provider: "MOCK"
        }
    });
}

async function processEligibilityTask(taskId, options = {}) {
    const task = await prisma.eligibilityCheck.findUnique({
        where: { id: taskId }
    });

    if (!task) {
        throw new Error("Eligibility task not found");
    }

    try {
        await prisma.eligibilityCheck.update({
            where: { id: taskId },
            data: {
                status: "PROCESSING",
                errorMessage: null
            }
        });

        const patient = await prisma.patient.findUnique({
            where: { id: task.patientId }
        });

        if (!patient) {
            const error = new Error("Patient not found");
            error.retryable = false;
            throw error;
        }

        const { result, attempts } = await checkWithRetry(
            patient,
            options,
            taskId
        );

        return await prisma.eligibilityCheck.update({
            where: { id: taskId },
            data: {
                status: "COMPLETED",
                selectedProvider: result.provider,
                normalizedResponse: result,
                retryCount: attempts - 1,
                errorMessage: null
            }
        });
    } catch (error) {
        await prisma.eligibilityCheck.update({
            where: { id: taskId },
            data: {
                status: "FAILED",
                selectedProvider: error.selectedProvider || null,
                retryCount: error.attempts
                    ? Math.max(0, error.attempts - 1)
                    : 0,
                errorMessage: error.message
            }
        });

        throw error;
    }
}

// Existing synchronous behavior: create the task and wait for its result.
async function checkPatientEligibility(patientId, options = {}) {
    const task = await createEligibilityTask(patientId);

    return processEligibilityTask(task.id, options);
}

module.exports = {
    createEligibilityTask,
    processEligibilityTask,
    checkPatientEligibility
};
