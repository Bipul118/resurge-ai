"use client";

import { useEffect, useState } from "react";

type RecoveryData = {
  transactions: number;
  revenueAtRisk: number;
  recovered: number;
  recoveryRate: number;
  recoveredCases: number;
  stoppedCases: number;
  escalatedCases: number;
};

const fallbackData: RecoveryData = {
  transactions: 100,
  revenueAtRisk: 516515,
  recovered: 161460,
  recoveryRate: 31.26,
  recoveredCases: 68,
  stoppedCases: 27,
  escalatedCases: 5,
};

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export default function Home() {
  const [data, setData] = useState<RecoveryData>(fallbackData);
  const [apiStatus, setApiStatus] = useState("CONNECTING");

  useEffect(() => {
    fetch("http://localhost:4000/api/recovery")
      .then((res) => {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then((result) => {
        setData({
          transactions: result.transactions ?? fallbackData.transactions,
          revenueAtRisk: result.revenueAtRisk ?? fallbackData.revenueAtRisk,
          recovered: result.recovered ?? fallbackData.recovered,
          recoveryRate: result.recoveryRate ?? fallbackData.recoveryRate,
          recoveredCases:
            result.recoveredCases ?? fallbackData.recoveredCases,
          stoppedCases: result.stoppedCases ?? fallbackData.stoppedCases,
          escalatedCases:
            result.escalatedCases ?? fallbackData.escalatedCases,
        });

        setApiStatus("LIVE");
      })
      .catch(() => {
        setApiStatus("DEMO DATA");
      });
  }, []);

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* HEADER */}
        <header className="mb-10 flex items-center justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-orange-400 shadow-[0_0_15px_#fb923c]" />
              <span className="text-xs font-bold tracking-[0.3em] text-orange-400">
                RESURGE AI
              </span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight">
              Revenue Recovery
              <span className="text-orange-400"> Command Center</span>
            </h1>

            <p className="mt-2 text-gray-500">
              Detect. Decide. Recover.
            </p>
          </div>

          <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-400" />
            API {apiStatus}
          </div>
        </header>

        {/* KPI GRID */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          <KPI
            label="Revenue at Risk"
            value={money(data.revenueAtRisk)}
            accent
          />

          <KPI
            label="Recovered Revenue"
            value={money(data.recovered)}
          />

          <KPI
            label="Recovery Rate"
            value={`${data.recoveryRate}%`}
          />

          <KPI
            label="Transactions Processed"
            value={data.transactions.toString()}
          />

        </section>

        {/* PIPELINE */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6">

          <div className="mb-6">
            <p className="text-xs font-bold tracking-[0.25em] text-orange-400">
              AUTONOMOUS RECOVERY PIPELINE
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              From revenue risk to measured recovery
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-6">

            {[
              ["01", "DETECT"],
              ["02", "DIAGNOSE"],
              ["03", "DECIDE"],
              ["04", "BOUND"],
              ["05", "RECOVER"],
              ["06", "AUDIT"],
            ].map(([number, title], index) => (
              <div key={title} className="relative">

                <div className="rounded-xl border border-white/10 bg-black/30 p-5">

                  <div className="text-xs text-orange-400">
                    {number}
                  </div>

                  <div className="mt-3 font-semibold">
                    {title}
                  </div>

                  <div className="mt-2 text-xs leading-5 text-gray-500">
                    {index === 0 && "Identify revenue at risk"}
                    {index === 1 && "Understand failure cause"}
                    {index === 2 && "Select safest intervention"}
                    {index === 3 && "Apply stopping rules"}
                    {index === 4 && "Execute recovery action"}
                    {index === 5 && "Record every decision"}
                  </div>

                </div>

              </div>
            ))}

          </div>
        </section>

        {/* RECOVERY OUTCOMES */}
        <section className="mt-8 grid gap-6 lg:grid-cols-2">

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">

            <p className="text-xs font-bold tracking-[0.25em] text-orange-400">
              RECOVERY OUTCOMES
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              What happened to the 100 transactions?
            </h2>

            <div className="mt-8 space-y-5">

              <Progress
                label="Recovered"
                value={data.recoveredCases}
                total={data.transactions}
              />

              <Progress
                label="Stopped"
                value={data.stoppedCases}
                total={data.transactions}
              />

              <Progress
                label="Escalated"
                value={data.escalatedCases}
                total={data.transactions}
              />

            </div>

          </div>

          {/* AI DECISION */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">

            <p className="text-xs font-bold tracking-[0.25em] text-orange-400">
              AI DECISION LOGIC
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Every action is bounded
            </h2>

            <div className="mt-6 space-y-3">

              <Decision
                title="Retry"
                description="Retry payment when failure is transient."
              />

              <Decision
                title="Recover"
                description="Trigger customer recovery workflow."
              />

              <Decision
                title="Stop"
                description="Stop when retry or contact limits are reached."
              />

              <Decision
                title="Escalate"
                description="Human review for ambiguous or high-risk cases."
              />

            </div>

          </div>

        </section>

        {/* MONEY PROOF */}
        <section className="mt-8 rounded-2xl border border-orange-400/20 bg-orange-400/[0.04] p-8">

          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">

            <div>
              <p className="text-xs font-bold tracking-[0.25em] text-orange-400">
                MEASURED IMPACT
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                {money(data.recovered)}
              </h2>

              <p className="mt-2 text-gray-400">
                simulated revenue recovered across {data.transactions} transactions
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 px-6 py-4">
              <div className="text-xs text-gray-500">
                Recovery efficiency
              </div>

              <div className="mt-1 text-2xl font-bold text-orange-400">
                {data.recoveryRate}%
              </div>
            </div>

          </div>

        </section>

        {/* FOOTER */}
        <footer className="mt-10 border-t border-white/10 pt-6 text-xs text-gray-600">

          RESURGE AI · Autonomous Revenue Recovery Agent ·
          Synthetic test environment

        </footer>

      </div>
    </main>
  );
}

function KPI({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">

      <p className="text-xs tracking-widest text-gray-500">
        {label.toUpperCase()}
      </p>

      <p
        className={`mt-4 text-3xl font-bold ${
          accent ? "text-orange-400" : "text-white"
        }`}
      >
        {value}
      </p>

    </div>
  );
}

function Progress({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percentage = (value / total) * 100;

  return (
    <div>

      <div className="mb-2 flex justify-between text-sm">

        <span className="text-gray-300">
          {label}
        </span>

        <span className="text-gray-500">
          {value} / {total}
        </span>

      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/10">

        <div
          className="h-full rounded-full bg-orange-400"
          style={{ width: `${percentage}%` }}
        />

      </div>

    </div>
  );
}

function Decision({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">

      <div className="font-semibold text-orange-400">
        {title}
      </div>

      <div className="mt-1 text-sm text-gray-500">
        {description}
      </div>

    </div>
  );
}