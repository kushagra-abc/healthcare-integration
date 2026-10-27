
const axios = require("axios");

const PROVIDER_URLS = {
    STEDI: process.env.MOCK_STEDI_URL || "http://localhost:5001",
    AVAILITY: process.env.MOCK_AVAILITY_URL || "http://localhost:5002",
};

async function checkEligibility(patient, options = {}) {
    const provider = String(options.provider || "STEDI").toUpperCase();
    const baseUrl = PROVIDER_URLS[provider];

    if (!baseUrl) {
        throw Object.assign(
            new Error(`Unsupported clearinghouse provider: ${provider}`),
            { retryable: false, statusCode: 400 }
        );
    }

    let response;

    try {
        response = await axios.post(
            `${baseUrl}/api/eligibility`,
            { patient, options },
            { timeout: 10000 }
        );
    } catch (error) {
        const responseData = error.response?.data;
        const status = error.response?.status;

        const integrationError = new Error(
            responseData?.error ||
            responseData?.message ||
            error.message ||
            `${provider} eligibility request failed`
        );

        integrationError.retryable =
            responseData?.retryable === true ||
            status === 429 ||
            status >= 500 ||
            !error.response;

        integrationError.statusCode = status || 502;
        throw integrationError;
    }

    const rawResponse = response.data;

    if (provider === "STEDI") {
        return {
            provider: "STEDI",
            eligibilityStatus: rawResponse.member_status,
            payerName: rawResponse.payer_name,
            memberId: rawResponse.member_id,
            benefits: {
                copay: rawResponse.benefits.copay,
                deductibleTotal: rawResponse.benefits.deductible_total,
                deductibleRemaining: rawResponse.benefits.deductible_remaining,
                coinsurancePercent: rawResponse.benefits.coinsurance_percent,
            },
            checkedAt: rawResponse.checked_at,
        };
    }

    return {
        provider: "AVAILITY",
        eligibilityStatus: rawResponse.status,
        payerName: rawResponse.payer,
        memberId: rawResponse.subscriberId,
        benefits: {
            copay: rawResponse.benefitDetails.copayAmount,
            deductibleTotal: rawResponse.benefitDetails.deductible.total,
            deductibleRemaining: rawResponse.benefitDetails.deductible.remaining,
            coinsurancePercent: rawResponse.benefitDetails.coinsurance,
        },
        checkedAt: rawResponse.responseTimestamp,
    };
}

module.exports = { checkEligibility };
