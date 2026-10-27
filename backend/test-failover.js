
const prisma = require("./src/config/prisma");
const { selectClearinghouse } = require("./src/services/routingService");

async function main() {
    const payer = await prisma.payer.findUnique({
        where: { name: "ABC Health Insurance" },
        include: { providerLinks: { include: { clearinghouse: true } } },
    });

    if (!payer) {
        throw new Error("ABC Health Insurance not found. Run the seed script first.");
    }

    const originalSettings = payer.providerLinks.map((link) => ({
        id: link.id,
        available: link.available,
    }));

    const availity = payer.providerLinks.find(
        (link) => link.clearinghouse.name === "Availity"
    );

    const stedi = payer.providerLinks.find(
        (link) => link.clearinghouse.name === "Stedi"
    );

    if (!availity || !stedi) {
        throw new Error("Both provider links must exist for this test.");
    }

    let failures = 0;

    async function expectRoute(label, expectedProvider) {
        try {
            const result = await selectClearinghouse(
                "ABC Health Insurance",
                "eligibility"
            );

            const passed = result.clearinghouse === expectedProvider;

            console.log(
                `${passed ? "PASS" : "FAIL"} | ${label} | ` +
                `Selected: ${result.clearinghouse} | Expected: ${expectedProvider}`
            );

            if (!passed) failures++;
        } catch (error) {
            console.log(
                `${expectedProvider === null ? "PASS" : "FAIL"} | ${label} | ${error.message}`
            );

            if (expectedProvider !== null) failures++;
        }
    }

    try {
        // Scenario 1: Cheapest provider unavailable.
        await prisma.payerSupport.update({
            where: { id: availity.id },
            data: { available: false },
        });

        await expectRoute("Availity unavailable; use fallback", "Stedi");

        // Scenario 2: Both providers unavailable.
        await prisma.payerSupport.update({
            where: { id: stedi.id },
            data: { available: false },
        });

        await expectRoute("Both providers unavailable", null);

        // Scenario 3: Availity restored; cheapest provider selected again.
        await prisma.payerSupport.update({
            where: { id: availity.id },
            data: { available: true },
        });

        await expectRoute("Availity restored", "Availity");
    } finally {
        // Restore every original availability setting, even if a test fails.
        for (const setting of originalSettings) {
            await prisma.payerSupport.update({
                where: { id: setting.id },
                data: { available: setting.available },
            });
        }

        console.log("\nOriginal provider availability settings restored.");
    }

    if (failures > 0) {
        throw new Error(`${failures} failover test(s) failed.`);
    }

    console.log("All failover tests passed.");
}

main()
    .catch((error) => {
        console.error("Failover test failed:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
