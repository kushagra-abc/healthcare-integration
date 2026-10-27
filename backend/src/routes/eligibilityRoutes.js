
const express = require("express");
const prisma = require("../config/prisma");

const {
    createEligibilityTask,
    processEligibilityTask,
    checkPatientEligibility
} = require("../services/eligibilityService");

const router = express.Router();

// Synchronous OR asynchronous eligibility check
router.post("/check", async (req, res) => {
    const patientId = Number(req.body.patientId);

    if (!Number.isInteger(patientId) || patientId <= 0) {
        return res.status(400).json({
            message: "A valid patientId is required"
        });
    }

    const options = {
    simulateFailure: req.body.simulateFailure,
    simulateProviderFailure: req.body.simulateProviderFailure,
    };

    try {
        // ASYNCHRONOUS MODE
        if (req.query.mode === "async") {
            const task = await createEligibilityTask(patientId);

            // Start processing after responding to the request.
            setImmediate(() => {
                processEligibilityTask(task.id, options).catch((error) => {
                    console.error(
                        `Background task ${task.id} failed:`,
                        error.message
                    );
                });
            });

            return res.status(202).json({
                message: "Eligibility check accepted",
                taskId: task.id,
                status: task.status,
                pollUrl: `/api/eligibility/tasks/${task.id}`
            });
        }

        // EXISTING SYNCHRONOUS MODE
        const eligibilityCheck = await checkPatientEligibility(
            patientId,
            options
        );

        return res.status(200).json({
            message: "Eligibility check completed",
            eligibilityCheck
        });
    } catch (error) {
        console.error("Eligibility check failed:", error.message);

        return res.status(error.statusCode || 500).json({
            message:
                error.statusCode === 404
                    ? error.message
                    : "Eligibility check failed"
        });
    }
});

// POLLING ENDPOINT: retrieve current task status
router.get("/tasks/:id", async (req, res) => {
    const taskId = Number(req.params.id);

    if (!Number.isInteger(taskId) || taskId <= 0) {
        return res.status(400).json({
            message: "Invalid task ID"
        });
    }

    try {
        const task = await prisma.eligibilityCheck.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return res.status(404).json({
                message: "Eligibility task not found"
            });
        }

        return res.status(200).json({
            taskId: task.id,
            patientId: task.patientId,
            status: task.status,
            normalizedResponse: task.normalizedResponse,
            retryCount: task.retryCount,
            errorMessage: task.errorMessage,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        });
    } catch (error) {
        console.error("Failed to fetch task:", error.message);

        return res.status(500).json({
            message: "Failed to fetch eligibility task"
        });
    }
});

// EXISTING HISTORY ENDPOINT
router.get("/patient/:patientId", async (req, res) => {
    const patientId = Number(req.params.patientId);

    if (!Number.isInteger(patientId) || patientId <= 0) {
        return res.status(400).json({
            message: "Invalid patientId"
        });
    }

    try {
        const checks = await prisma.eligibilityCheck.findMany({
            where: { patientId },
            orderBy: { createdAt: "desc" }
        });

        return res.status(200).json({
            count: checks.length,
            eligibilityChecks: checks
        });
    } catch (error) {
        console.error(
            "Failed to fetch eligibility checks:",
            error.message
        );

        return res.status(500).json({
            message: "Failed to fetch eligibility checks"
        });
    }
});


router.get("/tasks/:id/attempts", async (req, res) => {
  const taskId = Number(req.params.id);

  // Validate the task ID
  if (!Number.isInteger(taskId) || taskId <= 0) {
    return res.status(400).json({
      message: "Invalid eligibility task ID",
    });
  }

  try {
    // Check whether the eligibility task exists
    const task = await prisma.eligibilityCheck.findUnique({
      where: { id: taskId },
      select: { id: true },
    });

    if (!task) {
      return res.status(404).json({
        message: "Eligibility task not found",
      });
    }

    // Fetch all attempts in execution order
    const attempts = await prisma.eligibilityAttempt.findMany({
      where: { eligibilityCheckId: taskId },
      orderBy: { attemptNumber: "asc" },
    });

    return res.status(200).json({
      eligibilityCheckId: taskId,
      totalAttempts: attempts.length,
      attempts,
    });
  } catch (error) {
    console.error("Error fetching eligibility attempts:", error);

    return res.status(500).json({
      message: "Unable to retrieve eligibility attempts",
    });
  }
});


module.exports = router;
