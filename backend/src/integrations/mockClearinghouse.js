
async function checkEligibility(patient, options = {}) {
    // Testing hook: simulate temporary failures.
    if (options.simulateFailure) {
        const error = new Error("Temporary clearinghouse failure");
        error.retryable = true;
        throw error;
    }

    return {
        member_status: "ACTIVE",
        payer_name: patient.insuranceProvider,
        member_id: patient.insuranceMemberId,
        benefits: {
            copay: 30,
            deductible_total: 1500,
            deductible_remaining: 500,
            coinsurance_percent: 20
        },
        checked_at: new Date().toISOString()
    };
}

module.exports = { checkEligibility };
