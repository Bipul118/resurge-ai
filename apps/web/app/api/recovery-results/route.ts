import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type RecoveryRecord = {
  transaction_id: string;
  amount_inr: number;
  failure_reason: string;
  decision: string;
  action: string;
  expected_recovery: number;
  simulated_recovered_amount: number;
  status: string;
  timestamp: string | null;
};

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

    // ============================================================
    // NORMALIZE RAW RECOVERY RECORDS
    // ============================================================

    const records: RecoveryRecord[] = data.map((item: any) => {
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

    // ============================================================
    // CORE FINANCIAL METRICS
    // ============================================================

    const revenueAtRisk = records.reduce(
      (sum, item) => sum + item.amount_inr,
      0
    );

    const revenueRecovered = records.reduce(
      (sum, item) => sum + item.simulated_recovered_amount,
      0
    );

    const recovered = records.filter(
      (item) => item.status === "Recovered"
    ).length;

    const stopped = records.filter(
      (item) => item.status === "Stopped"
    ).length;

    const escalated = records.filter(
      (item) => item.status === "Escalated"
    ).length;

    const recoveryRate =
      revenueAtRisk > 0
        ? (revenueRecovered / revenueAtRisk) * 100
        : 0;

    // ============================================================
    // DECISION DISTRIBUTION
    // ============================================================

    const decisionDistribution: Record<string, number> = {};

    records.forEach((item) => {
      decisionDistribution[item.decision] =
        (decisionDistribution[item.decision] ?? 0) + 1;
    });

    // ============================================================
    // ACTION DISTRIBUTION
    // ============================================================

    const actionDistribution: Record<string, number> = {};

    records.forEach((item) => {
      actionDistribution[item.action] =
        (actionDistribution[item.action] ?? 0) + 1;
    });

    // ============================================================
    // FAILURE-WISE EVALUATION
    // ============================================================

    const failureGroups: Record<string, RecoveryRecord[]> = {};

    records.forEach((item) => {
      if (!failureGroups[item.failure_reason]) {
        failureGroups[item.failure_reason] = [];
      }

      failureGroups[item.failure_reason].push(item);
    });

    const failureAnalysis = Object.entries(failureGroups)
      .map(([failureReason, group]) => {
        const transactions = group.length;

        const failureRevenueAtRisk = group.reduce(
          (sum, item) => sum + item.amount_inr,
          0
        );

        const failureRevenueRecovered = group.reduce(
          (sum, item) => sum + item.simulated_recovered_amount,
          0
        );

        const recoveredTransactions = group.filter(
          (item) => item.status === "Recovered"
        ).length;

        const stoppedTransactions = group.filter(
          (item) => item.status === "Stopped"
        ).length;

        const escalatedTransactions = group.filter(
          (item) => item.status === "Escalated"
        ).length;

        const transactionRecoveryRate =
          transactions > 0
            ? (recoveredTransactions / transactions) * 100
            : 0;

        const financialRecoveryRate =
          failureRevenueAtRisk > 0
            ? (failureRevenueRecovered / failureRevenueAtRisk) * 100
            : 0;

        return {
          failure_reason: failureReason,
          transactions,
          recovered_transactions: recoveredTransactions,
          stopped_transactions: stoppedTransactions,
          escalated_transactions: escalatedTransactions,
          transaction_recovery_rate: Number(
            transactionRecoveryRate.toFixed(2)
          ),
          revenue_at_risk: failureRevenueAtRisk,
          revenue_recovered: failureRevenueRecovered,
          financial_recovery_rate: Number(
            financialRecoveryRate.toFixed(2)
          ),
        };
      })
      .sort((a, b) => b.revenue_at_risk - a.revenue_at_risk);

    // ============================================================
    // HIGH-VALUE TRANSACTIONS
    // ============================================================

    const highValueTransactions = records
      .filter((item) => item.amount_inr >= 10000)
      .sort((a, b) => b.amount_inr - a.amount_inr)
      .map((item) => ({
        transaction_id: item.transaction_id,
        amount_inr: item.amount_inr,
        failure_reason: item.failure_reason,
        decision: item.decision,
        action: item.action,
        status: item.status,
        simulated_recovered_amount:
          item.simulated_recovered_amount,
      }));

    // ============================================================
    // EVALUATION SUMMARY
    // ============================================================

    const evaluation = {
      decision_distribution: decisionDistribution,

      action_distribution: actionDistribution,

      failure_analysis: failureAnalysis,

      high_value_transactions: highValueTransactions,

      high_value_transaction_count:
        highValueTransactions.length,

      average_transaction_value:
        records.length > 0
          ? Number(
              (
                revenueAtRisk / records.length
              ).toFixed(2)
            )
          : 0,

      average_recovered_value:
        recovered > 0
          ? Number(
              (
                revenueRecovered / recovered
              ).toFixed(2)
            )
          : 0,
    };

    // ============================================================
    // FINAL API RESPONSE
    // ============================================================

    return NextResponse.json({
      success: true,

      summary: {
        transactions_processed: records.length,

        revenue_at_risk: revenueAtRisk,

        revenue_recovered: revenueRecovered,

        recovery_rate: Number(
          recoveryRate.toFixed(2)
        ),

        decisions: {
          recovered,
          stopped,
          escalated,
        },
      },

      evaluation,

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