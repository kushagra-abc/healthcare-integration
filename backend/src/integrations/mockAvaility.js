
async function checkEligibility(patient, options = {}) {
    if (
    options.simulateFailure ||
    options.simulateProviderFailure === "AVAILITY"
    ) {
        const error = new Error("Availity mock: temporary failure");
        error.retryable = true;
        throw error;
    }

    return {
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
    };
}

module.exports = { checkEligibility };
