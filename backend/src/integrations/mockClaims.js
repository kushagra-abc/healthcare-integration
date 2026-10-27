
const axios = require("axios");

const PROVIDER_URLS = {
    STEDI: process.env.MOCK_STEDI_URL || "http://localhost:5001",
    AVAILITY: process.env.MOCK_AVAILITY_URL || "http://localhost:5002",
};

async function submitClaim(claim, options = {}) {
    const provider = String(options.provider || "").toUpperCase();
    const baseUrl = PROVIDER_URLS[provider];

    if (!baseUrl) {
        throw Object.assign(
            new Error(`Unsupported mock clearinghouse: ${provider}`),
            { retryable: false, statusCode: 400 }
        );
    }

    try {
        const response = await axios.post(
            `${baseUrl}/api/claims`,
            { claim, options },
            { timeout: 10000 }
        );

        return response.data;
    } catch (error) {
        const responseData = error.response?.data;
        const status = error.response?.status;

        const integrationError = new Error(
            responseData?.error ||
            responseData?.message ||
            error.message ||
            `${provider} claim submission failed`
        );

        integrationError.retryable =
            responseData?.retryable === true ||
            status === 429 ||
            status >= 500 ||
            !error.response;

        integrationError.statusCode = status || 502;
        throw integrationError;
    }
}

module.exports = { submitClaim };
