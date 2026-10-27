
const prisma = require("../config/prisma");

async function getClearinghouseCandidates(
    payerName,
    operation = "eligibility"
) {
    if (!["eligibility", "claims"].includes(operation)) {
        throw new Error("Unsupported operation. Use eligibility or claims.");
    }

    const payer = await prisma.payer.findFirst({
        where: {
            name: {
                equals: payerName,
                mode: "insensitive",
            },
            active: true,
        },
        include: {
            providerLinks: {
                where: {
                    available: true,
                    clearinghouse: { active: true },
                    ...(operation === "eligibility"
                        ? { eligibilitySupported: true }
                        : { claimsSupported: true }),
                },
                include: {
                    clearinghouse: true,
                },
                orderBy: [
                    { estimatedCost: "asc" },
                    { priority: "asc" },
                ],
            },
        },
    });

    if (!payer) {
        throw new Error(`Active payer not found: ${payerName}`);
    }

    if (payer.providerLinks.length === 0) {
        throw new Error(
            `No available clearinghouse supports ${operation} for ${payerName}`
        );
    }

    return payer.providerLinks.map((link) => ({
        payer: payer.name,
        operation,
        clearinghouse: link.clearinghouse.name,
        estimatedCost: link.estimatedCost,
        priority: link.priority,
    }));
}

async function selectClearinghouse(payerName, operation = "eligibility") {
    const candidates = await getClearinghouseCandidates(
        payerName,
        operation
    );

    const selected = candidates[0];

    return {
        ...selected,
        reason: "Lowest estimated cost among available supported providers",
        alternatives: candidates.slice(1).map((candidate) => ({
            clearinghouse: candidate.clearinghouse,
            estimatedCost: candidate.estimatedCost,
        })),
    };
}

module.exports = {
    selectClearinghouse,
    getClearinghouseCandidates,
};
