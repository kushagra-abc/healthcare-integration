
const prisma = require("./src/config/prisma");
const { selectClearinghouse } = require("./src/services/routingService");

async function main() {
    const testCases = [
        { payer: "ABC Health Insurance", expected: "Availity" },
        { payer: "Delta Health", expected: "Stedi" },
        { payer: "Metro Insurance", expected: "Availity" },
        { payer: "Prime Health", expected: "Availity" },
    ];

    let failures = 0;

    for (const testCase of testCases) {
        const result = await selectClearinghouse(
            testCase.payer,
            "eligibility"
        );

        const passed = result.clearinghouse === testCase.expected;

        console.log(
            `${passed ? "PASS" : "FAIL"} | ${testCase.payer} | ` +
            `Selected: ${result.clearinghouse} | ` +
            `Expected: ${testCase.expected} | ` +
            `Cost: $${result.estimatedCost.toFixed(2)}`
        );

        if (!passed) failures++;
    }

    // A payer with no directory entry must not be routed arbitrarily.
    try {
        await selectClearinghouse("Unknown Test Payer", "eligibility");
        console.log("FAIL | Unknown payer was unexpectedly routed");
        failures++;
    } catch (error) {
        console.log("PASS | Unknown payer rejected:", error.message);
    }

    if (failures > 0) {
        throw new Error(`${failures} routing test(s) failed.`);
    }

    console.log("\nAll routing tests passed.");
}

main()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
