const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/healthRoutes");
const patientRoutes = require("./routes/patientRoutes");
const providerRoutes = require("./routes/providerRoutes");
const claimRoutes = require("./routes/claimRoutes");
const eligibilityRoutes = require("./routes/eligibilityRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/eligibility", eligibilityRoutes);

module.exports = app;