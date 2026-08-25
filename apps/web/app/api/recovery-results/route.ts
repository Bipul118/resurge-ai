import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Next.js runs from apps/web
    // JSON file is located at project-root/data
    const filePath = path.join(
      process.cwd(),
      "..",
      "..",
      "data",
      "recovery-results.json"
    );

    console.log("Recovery data path:", filePath);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        {
          success: false,
          error: "recovery-results.json not found",
          path: filePath,
        },
        { status: 404 }
      );
    }

    const rawData = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(rawData);

    if (!Array.isArray(data)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid recovery-results.json format",
        },
        { status: 500 }
      );
    }

    const records = data.map((item: any) => {
      const recoveredAmount = Number(
        item.simulated_recovered_amount ?? 0
      );

      const amount = Number(item.amount_inr ?? 0);

      let status = "Stopped";

      if (recoveredAmount > 0) {
        status = "Recovered";
      } else if (item.decision === "escalate") {
        status = "Escalated";
      }

      return {
        transaction_id: item.transaction_id,
        amount_inr: amount,
        failure_reason: item.failure_reason ?? "unknown",
        decision: item.decision ?? "unknown",
        action: item.action ?? "none",
        expected_recovery: Number(item.expected_recovery ?? 0),
        simulated_recovered_amount: recoveredAmount,
        status,
        timestamp: item.timestamp ?? null,
      };
    });

    const revenueAtRisk = records.reduce(
      (sum: number, item: any) => sum + item.amount_inr,
      0
    );

    const revenueRecovered = records.reduce(
      (sum: number, item: any) =>
        sum + item.simulated_recovered_amount,
      0
    );

    const recovered = records.filter(
      (item: any) => item.status === "Recovered"
    ).length;

    const stopped = records.filter(
      (item: any) => item.status === "Stopped"
    ).length;

    const escalated = records.filter(
      (item: any) => item.status === "Escalated"
    ).length;

    const recoveryRate =
      revenueAtRisk > 0
        ? (revenueRecovered / revenueAtRisk) * 100
        : 0;

    return NextResponse.json({
      success: true,

      summary: {
        transactions_processed: records.length,
        revenue_at_risk: revenueAtRisk,
        revenue_recovered: revenueRecovered,
        recovery_rate: Number(recoveryRate.toFixed(2)),

        decisions: {
          recovered,
          stopped,
          escalated,
        },
      },

      records,
    });
  } catch (error) {
    console.error("Recovery API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load recovery data",
      },
      { status: 500 }
    );
  }
}