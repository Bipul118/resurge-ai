"use client";

import { useEffect, useMemo, useState } from "react";

type DecisionSummary = {
  recover?: number;
  stop?: number;
  escalate?: number;
  approval_required?: number;
  [key: string]: unknown;
};

type ApiSummary = {
  transactions_processed?: number;
  revenue_at_risk?: number;
  revenue_recovered?: number;
  recovery_rate?: number;
  decisions?: DecisionSummary;
  [key: string]: unknown;
};

type RecoveryResult = {
  transaction_id?: string;
  customer_id?: string;
  amount_inr?: number;
  amount?: number;
  failure_reason?: string;
  failure?: string | object;
  recoverability_score?: number;
  decision?: string | object;
  action?: string | object;
  decision_reason?: string;
  expected_recovery?: number;
  simulated_recovered_amount?: number;
  recovered_amount?: number;
  recovery_amount?: number;
  status?: string;
  outcome?: string;
  timestamp?: string;
  [key: string]: unknown;
};

type ApiResponse = {
  success?: boolean;
  summary?: ApiSummary;
  records?: RecoveryResult[];
  results?: RecoveryResult[];
  transactions?: RecoveryResult[];
};

function getText(value: unknown): string {
  if (value === null || value === undefined) return "—";

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    return String(
      obj.reason ??
        obj.type ??
        obj.name ??
        obj.strategy ??
        obj.action ??
        obj.decision ??
        obj.message ??
        JSON.stringify(obj)
    );
  }

  return String(value);
}

function getAmount(tx: RecoveryResult): number {
  return Number(tx.amount_inr ?? tx.amount ?? 0);
}

function getRecoveredAmount(tx: RecoveryResult): number {
  return Number(
    tx.simulated_recovered_amount ??
      tx.recovered_amount ??
      tx.recovery_amount ??
      0
  );
}

function getFailure(tx: RecoveryResult): string {
  return getText(tx.failure_reason ?? tx.failure);
}

function getDecision(tx: RecoveryResult): string {
  return getText(tx.decision);
}

function getAction(tx: RecoveryResult): string {
  return getText(tx.action);
}

function getStatus(tx: RecoveryResult): string {
  const decision = getDecision(tx).toLowerCase();

  if (decision === "recover") return "Recovered";
  if (decision === "escalate") return "Escalated";

  if (
    decision === "stop" ||
    decision === "approval_required"
  ) {
    return "Stopped";
  }

  const raw = String(
    tx.status ?? tx.outcome ?? ""
  ).toLowerCase();

  if (
    raw.includes("recover") ||
    raw.includes("success") ||
    raw.includes("execut")
  ) {
    return "Recovered";
  }

  if (
    raw.includes("escalat") ||
    raw.includes("human")
  ) {
    return "Escalated";
  }

  return "Stopped";
}

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Home() {
  const [transactions, setTransactions] = useState<RecoveryResult[]>([]);
  const [summary, setSummary] = useState<ApiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/recovery-results",
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(
            `API request failed: ${response.status}`
          );
        }

        const data: ApiResponse = await response.json();

        const records = Array.isArray(data)
          ? data
          : data.records ??
            data.results ??
            data.transactions ??
            [];

        setTransactions(records);
        setSummary(data.summary ?? null);
      } catch (err) {
        console.error("RESURGE loadData error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load recovery data"
        );

        setTransactions([]);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const stats = useMemo(() => {
    const revenueAtRisk =
      Number(summary?.revenue_at_risk ?? 0) ||
      transactions.reduce(
        (sum, tx) => sum + getAmount(tx),
        0
      );

    const revenueRecovered =
      Number(summary?.revenue_recovered ?? 0) ||
      transactions.reduce(
        (sum, tx) => sum + getRecoveredAmount(tx),
        0
      );

    const transactionsProcessed = Number(
      summary?.transactions_processed ??
        transactions.length
    );

    const recoveryRate = Number(
      summary?.recovery_rate ??
        (revenueAtRisk > 0
          ? (revenueRecovered / revenueAtRisk) * 100
          : 0)
    );

    const recovered = transactions.filter(
      (tx) => getDecision(tx).toLowerCase() === "recover"
    ).length;

    const stopped = transactions.filter(
      (tx) => getDecision(tx).toLowerCase() === "stop"
    ).length;

    const escalated = transactions.filter(
      (tx) => getDecision(tx).toLowerCase() === "escalate"
    ).length;

    const approvalRequired = transactions.filter(
      (tx) =>
        getDecision(tx).toLowerCase() ===
        "approval_required"
    ).length;

    return {
      revenueAtRisk,
      revenueRecovered,
      recoveryRate,
      transactionsProcessed,
      recovered,
      stopped,
      escalated,
      approvalRequired,
    };
  }, [transactions, summary]);

  const systemOnline =
    !loading &&
    !error &&
    transactions.length > 0;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#f5f5f5",
        padding: "32px",
        fontFamily:
          "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1450px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            paddingBottom: "32px",
            borderBottom: "1px solid #1f2937",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "13px",
                  letterSpacing: "4px",
                  fontWeight: 800,
                  color: "#a3a3a3",
                  marginBottom: "10px",
                }}
              >
                RESURGE.
              </div>

              <h1
                style={{
                  fontSize: "clamp(32px, 5vw, 52px)",
                  lineHeight: 1.05,
                  margin: 0,
                  fontWeight: 850,
                  letterSpacing: "-2px",
                }}
              >
                Autonomous AI Revenue
                <br />
                Recovery Agent
              </h1>

              <p
                style={{
                  color: "#737373",
                  marginTop: "14px",
                  marginBottom: 0,
                  fontSize: "14px",
                }}
              >
                Detect. Decide. Recover.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: "9px",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  borderRadius: "999px",
                  border: "1px solid #262626",
                  background: "#0b0b0b",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: systemOnline
                      ? "#4ade80"
                      : "#f87171",
                    boxShadow: systemOnline
                      ? "0 0 10px rgba(74,222,128,.7)"
                      : "none",
                  }}
                />

                {systemOnline
                  ? "SYSTEM ONLINE"
                  : loading
                    ? "CONNECTING"
                    : "SYSTEM ERROR"}
              </div>

              <div
                style={{
                  fontSize: "11px",
                  color: "#737373",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Synthetic Test Mode
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div
            style={{
              padding: "18px",
              marginBottom: "28px",
              border: "1px solid #7f1d1d",
              background: "#1f0a0a",
              borderRadius: "12px",
              color: "#fca5a5",
            }}
          >
            <strong>
              Failed to load recovery data
            </strong>

            <div
              style={{
                marginTop: "6px",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          </div>
        )}

        <section
          style={{
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              display: "inline-block",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              color: "#a3a3a3",
              border: "1px solid #262626",
              padding: "7px 10px",
              borderRadius: "999px",
              marginBottom: "15px",
            }}
          >
            CLOSED-LOOP RECOVERY INTELLIGENCE
          </div>

          <h2
            style={{
              fontSize: "28px",
              margin: "0 0 8px",
              letterSpacing: "-0.8px",
            }}
          >
            Revenue recovery, closed-loop.
          </h2>

          <p
            style={{
              color: "#8a8a8a",
              maxWidth: "900px",
              lineHeight: 1.7,
              margin: 0,
              fontSize: "15px",
            }}
          >
            RESURGE detects revenue at risk, diagnoses
            the failure, chooses a bounded intervention,
            executes recovery, and records every decision
            in an audit trail.
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
            marginBottom: "34px",
          }}
        >
          <StatCard
            label="Revenue at Risk"
            value={
              loading
                ? "Loading..."
                : formatINR(stats.revenueAtRisk)
            }
            accent="risk"
          />

          <StatCard
            label="Revenue Recovered"
            value={
              loading
                ? "Loading..."
                : formatINR(stats.revenueRecovered)
            }
            accent="success"
          />

          <StatCard
            label="Recovery Rate"
            value={
              loading
                ? "Loading..."
                : `${stats.recoveryRate.toFixed(2)}%`
            }
            accent="neutral"
          />

          <StatCard
            label="Transactions Processed"
            value={
              loading
                ? "Loading..."
                : String(stats.transactionsProcessed)
            }
            accent="neutral"
          />
        </section>

        <section
          style={{
            marginBottom: "38px",
          }}
        >
          <SectionHeader
            title="Recovery Decisions"
            subtitle="Bounded agent outcomes across the recovery pipeline."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            <DecisionCard
              label="Recovered"
              value={stats.recovered}
              description="Recovery action executed"
              status="Recovered"
            />

            <DecisionCard
              label="Stopped"
              value={stats.stopped}
              description="Safety boundary triggered"
              status="Stopped"
            />

            <DecisionCard
              label="Escalated"
              value={stats.escalated}
              description="Human review required"
              status="Escalated"
            />

            <DecisionCard
              label="Approval Required"
              value={stats.approvalRequired}
              description="High-value recovery requires approval"
              status="Approval Required"
            />
          </div>
        </section>

        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: "18px",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
            <SectionHeader
              title="Decision Audit Trail"
              subtitle="Every recovery decision is explainable and traceable."
            />

            <div
              style={{
                border: "1px solid #262626",
                background: "#0b0b0b",
                borderRadius: "999px",
                padding: "7px 12px",
                color: "#a3a3a3",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              {transactions.length} records
            </div>
          </div>

          <div
            style={{
              overflowX: "auto",
              border: "1px solid #1f2937",
              borderRadius: "14px",
              background: "#090909",
              boxShadow:
                "0 15px 50px rgba(0,0,0,.25)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "1000px",
              }}
            >
              <thead>
                <tr>
                  <Th>Transaction</Th>
                  <Th>Amount</Th>
                  <Th>Failure</Th>
                  <Th>Decision</Th>
                  <Th>Action</Th>
                  <Th>Status</Th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: "#737373",
                      }}
                    >
                      Loading recovery records...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: "#737373",
                      }}
                    >
                      No recovery records found.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx, index) => {
                    const status = getStatus(tx);

                    return (
                      <tr
                        key={
                          tx.transaction_id ?? index
                        }
                      >
                        <Td>
                          <span
                            style={{
                              fontFamily:
                                "ui-monospace, SFMono-Regular, Menlo, monospace",
                              fontSize: "13px",
                              color: "#d4d4d4",
                            }}
                          >
                            {tx.transaction_id ?? "—"}
                          </span>
                        </Td>

                        <Td>
                          {formatINR(getAmount(tx))}
                        </Td>

                        <Td>
                          {getFailure(tx)}
                        </Td>

                        <Td>
                          <CodeText>
                            {getDecision(tx)}
                          </CodeText>
                        </Td>

                        <Td>
                          <CodeText>
                            {getAction(tx)}
                          </CodeText>
                        </Td>

                        <Td>
                          <StatusBadge status={status} />
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section
          style={{
            marginTop: "52px",
            paddingBottom: "30px",
          }}
        >
          <SectionHeader
            title="RESURGE Recovery Loop"
            subtitle="A bounded autonomous workflow from detection to audit."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
            }}
          >
            <LoopStep
              number="01"
              title="Detect"
              description="Find revenue at risk"
            />

            <LoopStep
              number="02"
              title="Diagnose"
              description="Understand failure"
            />

            <LoopStep
              number="03"
              title="Decide"
              description="Select bounded strategy"
            />

            <LoopStep
              number="04"
              title="Recover"
              description="Execute intervention"
            />

            <LoopStep
              number="05"
              title="Audit"
              description="Record the outcome"
            />
          </div>
        </section>

        <footer
          style={{
            borderTop: "1px solid #1f2937",
            paddingTop: "22px",
            marginTop: "10px",
            color: "#525252",
            fontSize: "12px",
            display: "flex",
            justifyContent: "space-between",
            gap: "15px",
            flexWrap: "wrap",
          }}
        >
          <span>
            RESURGE AI • Revenue Recovery Intelligence
          </span>

          <span>
            Synthetic Test Mode • Audit Enabled
          </span>
        </footer>
      </div>
    </main>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <h2
        style={{
          fontSize: "22px",
          margin: 0,
          letterSpacing: "-0.4px",
        }}
      >
        {title}
      </h2>

      <p
        style={{
          color: "#737373",
          margin: "7px 0 0",
          fontSize: "13px",
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "risk" | "success" | "neutral";
}) {
  const accentMap = {
    risk: "#fca5a5",
    success: "#86efac",
    neutral: "#e5e5e5",
  };

  return (
    <div
      style={{
        border: "1px solid #1f2937",
        borderRadius: "14px",
        padding: "22px",
        background:
          "linear-gradient(145deg, #0c0c0c, #080808)",
        minHeight: "110px",
      }}
    >
      <div
        style={{
          color: "#737373",
          fontSize: "12px",
          marginBottom: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          fontWeight: 700,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "28px",
          fontWeight: 850,
          letterSpacing: "-0.8px",
          color: accentMap[accent],
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DecisionCard({
  label,
  value,
  description,
  status,
}: {
  label: string;
  value: number;
  description: string;
  status: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #1f2937",
        borderRadius: "14px",
        padding: "22px",
        background: "#0b0b0b",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          marginBottom: "13px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            color: "#737373",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            fontWeight: 700,
          }}
        >
          {label}
        </div>

        <StatusBadge status={status} />
      </div>

      <div
        style={{
          fontSize: "32px",
          fontWeight: 850,
          marginBottom: "6px",
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: "13px",
          color: "#525252",
        }}
      >
        {description}
      </div>
    </div>
  );
}

function Th({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "15px 16px",
        borderBottom: "1px solid #1f2937",
        color: "#737373",
        fontSize: "11px",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <td
      style={{
        padding: "14px 16px",
        borderBottom: "1px solid #151515",
        fontSize: "13px",
        color: "#bdbdbd",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}

function CodeText({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "12px",
        color: "#a3a3a3",
      }}
    >
      {children}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<
    string,
    React.CSSProperties
  > = {
    Recovered: {
      background: "#052e16",
      color: "#86efac",
      border: "1px solid #166534",
    },

    Stopped: {
      background: "#2a0a0a",
      color: "#fca5a5",
      border: "1px solid #7f1d1d",
    },

    Escalated: {
      background: "#2e2105",
      color: "#fde68a",
      border: "1px solid #854d0e",
    },

    "Approval Required": {
      background: "#1e1b4b",
      color: "#c4b5fd",
      border: "1px solid #6d28d9",
    },
  };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 9px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 800,
        whiteSpace: "nowrap",
        ...styles[status],
      }}
    >
      {status}
    </span>
  );
}

function LoopStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #1f2937",
        borderRadius: "14px",
        padding: "20px",
        background: "#0b0b0b",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: "#525252",
          marginBottom: "12px",
          letterSpacing: "0.1em",
          fontWeight: 800,
        }}
      >
        {number}
      </div>

      <h3
        style={{
          margin: "0 0 7px",
          fontSize: "17px",
          letterSpacing: "-0.2px",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: 0,
          color: "#737373",
          fontSize: "12px",
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
    </div>
  );
}
