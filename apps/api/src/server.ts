import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 4000);

const DATA_DIR = path.resolve(__dirname, "../../../data");

function readJson(fileName: string) {
  const filePath = path.join(DATA_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

/* ---------------- HEALTH ---------------- */

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "resurge-api",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
});

/* ---------------- RECOVERY ---------------- */

app.get("/api/recovery", (_req, res) => {
  try {
    const recovery = readJson("recovery-results.json");

    if (!recovery) {
      return res.status(404).json({
        status: "error",
        message: "recovery-results.json not found",
      });
    }

    const transactions =
      recovery.transactions ??
      recovery.total_transactions ??
      100;

    const revenueAtRisk =
      recovery.revenue_at_risk ??
      recovery.revenueAtRisk ??
      0;

    const recovered =
      recovery.simulated_recovered ??
      recovery.recovered ??
      0;

    const recoveryRate =
      recovery.recovery_rate ??
      recovery.recoveryRate ??
      (revenueAtRisk > 0
        ? Number(((recovered / revenueAtRisk) * 100).toFixed(2))
        : 0);

    res.json({
      status: "ok",
      transactions,
      revenueAtRisk,
      recovered,
      recoveryRate,
      recoveredCases:
        recovery.recovered_cases ??
        recovery.recoveredCases ??
        0,
      stoppedCases:
        recovery.stopped_cases ??
        recovery.stoppedCases ??
        0,
      escalatedCases:
        recovery.escalated_cases ??
        recovery.escalatedCases ??
        0,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Failed to load recovery results",
    });
  }
});

/* ---------------- AUDIT TRAIL ---------------- */

app.get("/api/audit", (_req, res) => {
  try {
    const audit = readJson("audit-log.json");

    if (!audit) {
      return res.status(404).json({
        status: "error",
        message: "audit-log.json not found",
      });
    }

    res.json({
      status: "ok",
      count: Array.isArray(audit) ? audit.length : 0,
      records: audit,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Failed to load audit trail",
    });
  }
});

/* ---------------- EXECUTION ---------------- */

app.get("/api/execution", (_req, res) => {
  try {
    const execution = readJson("execution-results.json");

    if (!execution) {
      return res.status(404).json({
        status: "error",
        message: "execution-results.json not found",
      });
    }

    res.json({
      status: "ok",
      data: execution,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Failed to load execution results",
    });
  }
});

/* ---------------- SERVER ---------------- */

app.listen(PORT, () => {
  console.log("");
  console.log("========================================");
  console.log("          RESURGE API SERVER");
  console.log("========================================");
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Recovery: http://localhost:${PORT}/api/recovery`);
  console.log(`Audit: http://localhost:${PORT}/api/audit`);
  console.log(`Execution: http://localhost:${PORT}/api/execution`);
  console.log("========================================");
  console.log("");
});