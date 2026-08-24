import json
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[2]

RECOVERY_FILE = ROOT / "data" / "recovery-results.json"
EXECUTION_FILE = ROOT / "data" / "execution-results.json"
AUDIT_FILE = ROOT / "data" / "audit-log.json"


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    recovery = load_json(RECOVERY_FILE)
    executions = load_json(EXECUTION_FILE)

    execution_map = {
        item["transaction_id"]: item
        for item in executions
    }

    audit_records = []

    for item in recovery:
        txn_id = item["transaction_id"]
        execution = execution_map.get(txn_id, {})

        record = {
            "audit_id": f"AUDIT_{txn_id}",
            "timestamp": datetime.now().isoformat(),

            "transaction_id": txn_id,

            "financial": {
                "amount_at_risk": item["amount_inr"],
                "expected_recovery": item["expected_recovery"],
                "actual_recovered": item[
                    "simulated_recovered_amount"
                ],
            },

            "diagnosis": {
                "failure_reason": item["failure_reason"],
                "recoverability_score": item[
                    "recoverability_score"
                ],
            },

            "decision": {
                "decision": item["decision"],
                "action": item["action"],
                "reason": item["decision_reason"],
            },

            "policy": {
                "bounded": True,
                "allowlisted_action": execution.get(
                    "status"
                ) == "success",
                "execution_status": execution.get(
                    "status",
                    "not_executed"
                ),
            },

            "execution": {
                "mode": execution.get(
                    "mode",
                    "not_executed"
                ),
                "executed_amount": execution.get(
                    "executed_amount",
                    0
                ),
            },
        }

        audit_records.append(record)

    with open(AUDIT_FILE, "w", encoding="utf-8") as f:
        json.dump(
            audit_records,
            f,
            indent=2
        )

    print("========================================")
    print("        RESURGE AUDIT TRAIL")
    print("========================================")
    print(f"Records generated : {len(audit_records)}")
    print(f"Audit file        : {AUDIT_FILE}")
    print("Status             : COMPLETE")
    print("========================================")


if __name__ == "__main__":
    main()