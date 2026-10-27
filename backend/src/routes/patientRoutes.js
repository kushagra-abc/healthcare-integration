const express = require("express");
const prisma = require("../config/prisma");

const router = express.Router();

// Create a new patient
router.post("/", async (req, res) => {
    try {
        const {
            name,
            dateOfBirth,
            email,
            phone,
            insuranceMemberId,
            insuranceProvider
        } = req.body;

        const patient = await prisma.patient.create({
            data: {
                name,
                dateOfBirth: new Date(dateOfBirth),
                email,
                phone,
                insuranceMemberId,
                insuranceProvider
            }
        });

        res.status(201).json({
            message: "Patient created successfully",
            patient
        });
    } catch (error) {
        console.error("Error creating patient:", error.message);

        res.status(500).json({
            message: "Failed to create patient"
        });
    }
});

// Get all patients
router.get("/", async (req, res) => {
    try {
        const patients = await prisma.patient.findMany({
            orderBy: {
                createdAt: "desc"
            }
        });

        res.status(200).json({
            count: patients.length,
            patients
        });
    } catch (error) {
        console.error("Error fetching patients:", error.message);

        res.status(500).json({
            message: "Failed to fetch patients"
        });
    }
});

// Get a single patient by ID
router.get("/:id", async (req, res) => {
    try {
        const patientId = Number(req.params.id);

        const patient = await prisma.patient.findUnique({
            where: {
                id: patientId
            }
        });

        if (!patient) {
            return res.status(404).json({
                message: "Patient not found"
            });
        }

        res.status(200).json({
            patient
        });
    } catch (error) {
        console.error("Error fetching patient:", error.message);

        res.status(500).json({
            message: "Failed to fetch patient"
        });
    }
});

// Update a patient by ID
router.patch("/:id", async (req, res) => {
    try {
        const patientId = Number(req.params.id);

        const {
            name,
            dateOfBirth,
            email,
            phone,
            insuranceMemberId,
            insuranceProvider
        } = req.body;

        // Check whether the patient exists
        const existingPatient = await prisma.patient.findUnique({
            where: {
                id: patientId
            }
        });

        if (!existingPatient) {
            return res.status(404).json({
                message: "Patient not found"
            });
        }

        // Build update object using only supplied fields
        const updateData = {};

        if (name !== undefined) updateData.name = name;
        if (dateOfBirth !== undefined) {
            updateData.dateOfBirth = new Date(dateOfBirth);
        }
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (insuranceMemberId !== undefined) {
            updateData.insuranceMemberId = insuranceMemberId;
        }
        if (insuranceProvider !== undefined) {
            updateData.insuranceProvider = insuranceProvider;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                message: "No fields provided for update"
            });
        }

        const updatedPatient = await prisma.patient.update({
            where: {
                id: patientId
            },
            data: updateData
        });

        res.status(200).json({
            message: "Patient updated successfully",
            patient: updatedPatient
        });
    } catch (error) {
        console.error("Error updating patient:", error.message);

        res.status(500).json({
            message: "Failed to update patient"
        });
    }
});

// Delete a patient by ID
router.delete("/:id", async (req, res) => {
    try {
        const patientId = Number(req.params.id);

        // Check whether the patient exists
        const existingPatient = await prisma.patient.findUnique({
            where: {
                id: patientId
            }
        });

        if (!existingPatient) {
            return res.status(404).json({
                message: "Patient not found"
            });
        }

        await prisma.patient.delete({
            where: {
                id: patientId
            }
        });

        res.status(200).json({
            message: "Patient deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting patient:", error.message);

        res.status(500).json({
            message: "Failed to delete patient"
        });
    }
});

module.exports = router;