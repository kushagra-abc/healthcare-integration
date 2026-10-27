const express = require("express");
const prisma = require("../config/prisma");

const router = express.Router();

// Create a new provider
router.post("/", async (req, res) => {
    try {
        const {
            name,
            organization,
            specialization
        } = req.body;

        const provider = await prisma.provider.create({
            data: {
                name,
                organization,
                specialization
            }
        });

        res.status(201).json({
            message: "Provider created successfully",
            provider
        });
    } catch (error) {
        console.error("Error creating provider:", error.message);

        res.status(500).json({
            message: "Failed to create provider"
        });
    }
});

// Get all providers
router.get("/", async (req, res) => {
    try {
        const providers = await prisma.provider.findMany({
            orderBy: {
                createdAt: "desc"
            }
        });

        res.status(200).json({
            count: providers.length,
            providers
        });
    } catch (error) {
        console.error("Error fetching providers:", error.message);

        res.status(500).json({
            message: "Failed to fetch providers"
        });
    }
});

// Get provider by ID
router.get("/:id", async (req, res) => {
    try {
        const providerId = Number(req.params.id);

        const provider = await prisma.provider.findUnique({
            where: {
                id: providerId
            }
        });

        if (!provider) {
            return res.status(404).json({
                message: "Provider not found"
            });
        }

        res.status(200).json({
            provider
        });
    } catch (error) {
        console.error("Error fetching provider:", error.message);

        res.status(500).json({
            message: "Failed to fetch provider"
        });
    }
});

// Update provider by ID
router.patch("/:id", async (req, res) => {
    try {
        const providerId = Number(req.params.id);

        const existingProvider = await prisma.provider.findUnique({
            where: {
                id: providerId
            }
        });

        if (!existingProvider) {
            return res.status(404).json({
                message: "Provider not found"
            });
        }

        const {
            name,
            organization,
            specialization
        } = req.body;

        const updateData = {};

        if (name !== undefined) updateData.name = name;
        if (organization !== undefined) {
            updateData.organization = organization;
        }
        if (specialization !== undefined) {
            updateData.specialization = specialization;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                message: "No fields provided for update"
            });
        }

        const updatedProvider = await prisma.provider.update({
            where: {
                id: providerId
            },
            data: updateData
        });

        res.status(200).json({
            message: "Provider updated successfully",
            provider: updatedProvider
        });
    } catch (error) {
        console.error("Error updating provider:", error.message);

        res.status(500).json({
            message: "Failed to update provider"
        });
    }
});

// Delete provider by ID
router.delete("/:id", async (req, res) => {
    try {
        const providerId = Number(req.params.id);

        const existingProvider = await prisma.provider.findUnique({
            where: {
                id: providerId
            }
        });

        if (!existingProvider) {
            return res.status(404).json({
                message: "Provider not found"
            });
        }

        await prisma.provider.delete({
            where: {
                id: providerId
            }
        });

        res.status(200).json({
            message: "Provider deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting provider:", error.message);

        res.status(500).json({
            message: "Failed to delete provider"
        });
    }
});

module.exports = router;