const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
    res.json({
        message: "Healthcare Integration API is healthy"
    });
});

module.exports = router;