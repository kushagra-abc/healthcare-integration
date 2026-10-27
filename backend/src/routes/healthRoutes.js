const express = require("express");
const pool = require("../config/db");

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            message: "Healthcare Integration API is healthy",
            database: "connected",
            time: result.rows[0].now
        });
    } catch (error) {
        console.error("Database health check failed:", error.message);

        res.status(500).json({
            message: "Healthcare Integration API is running, but database connection failed",
            database: "disconnected"
        });
    }
});

module.exports = router;