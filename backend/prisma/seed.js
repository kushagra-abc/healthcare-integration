
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
    const payerConfigs = [
        {
            name: "ABC Health Insurance",
            payerId: "TEST-ABC-001",
            providers: [
                { name: "Stedi", cost: 0.30, claims: true },
                { name: "Availity", cost: 0.25, claims: false },
            ],
        },
        {
            name: "Delta Health",
            payerId: "TEST-DELTA-001",
            providers: [
                { name: "Stedi", cost: 0.20, claims: true },
            ],
        },
        {
            name: "Metro Insurance",
            payerId: "TEST-METRO-001",
            providers: [
                { name: "Stedi", cost: 0.35, claims: true },
                { name: "Availity", cost: 0.22, claims: true },
            ],
        },
        {
            name: "Prime Health",
            payerId: "TEST-PRIME-001",
            providers: [
                { name: "Availity", cost: 0.28, claims: false },
            ],
        },
    ];

    const providerRecords = {};

    for (const name of ["Stedi", "Availity"]) {
        providerRecords[name] = await prisma.clearinghouse.upsert({
            where: { name },
            update: { active: true },
            create: { name, active: true },
        });
    }

    for (const config of payerConfigs) {
        const payer = await prisma.payer.upsert({
            where: { name: config.name },
            update: {
                payerId: config.payerId,
                active: true,
            },
            create: {
                name: config.name,
                payerId: config.payerId,
                active: true,
            },
        });

        const supportedProviders = new Set(
            config.providers.map((provider) => provider.name)
        );

        // Upsert supported links and refresh their test settings.
        for (const provider of config.providers) {
            const clearinghouse = providerRecords[provider.name];

            await prisma.payerSupport.upsert({
                where: {
                    payerId_clearinghouseId: {
                        payerId: payer.id,
                        clearinghouseId: clearinghouse.id,
                    },
                },
                update: {
                    eligibilitySupported: true,
                    claimsSupported: provider.claims,
                    estimatedCost: provider.cost,
                    available: true,
                },
                create: {
                    payerId: payer.id,
                    clearinghouseId: clearinghouse.id,
                    eligibilitySupported: true,
                    claimsSupported: provider.claims,
                    estimatedCost: provider.cost,
                    available: true,
                },
            });
        }

        // Disable any old links not listed for this payer.
        const allProviders = Object.values(providerRecords);

        for (const clearinghouse of allProviders) {
            if (!supportedProviders.has(clearinghouse.name)) {
                await prisma.payerSupport.updateMany({
                    where: {
                        payerId: payer.id,
                        clearinghouseId: clearinghouse.id,
                    },
                    data: {
                        eligibilitySupported: false,
                        claimsSupported: false,
                    },
                });
            }
        }

        console.log(`Configured payer: ${config.name}`);
    }

    console.log("\nPayer directory seeded successfully.");
}

main()
    .catch((error) => {
        console.error("Seeding failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
