import json
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[2]

RESULTS_FILE = ROOT / "data" / "recovery-results.json"
OUTPUT_FILE = ROOT / "data" / "execution-results.json"


ALLOWED_ACTIONS = {
    "retry",
    "smart_retry",
    "payment_method_update",
    "customer_nudge",
    "receivables_chaser",
}


def execute_action(item):
    action = item["action"]
    decision = item["decision"]

    # Hard safety gate
    if decision != "recover":
        return {
            "status": "blocked",
            "reason": "agent_decision_does_not_permit_execution",
            "executed_amount": 0,
        }

    # Allow-list gate
    if action not in ALLOWED_ACTIONS:
        return {
            "status": "blocked",
            "reason": "action_not_allowlisted",
            "executed_amount": 0,
        }

    # Synthetic test-mode execution
    amount = item["simulated_recovered_amount"]

    return {
        "status": "success",
        "mode": "synthetic_test_mode",
        "action": action,
        "executed_amount": amount,
        "message": f"Simulated {action} executed successfully",
    }


def main():
    with open(RESULTS_FILE, "r", encoding="utf-8") as f:
        results = json.load(f)

    executions = []

    for item in results:
        execution = execute_action(item)

        executions.append({
            "execution_id": f"EXEC_{item['transaction_id']}",
            "transaction_id": item["transaction_id"],
            "timestamp": datetime.now().isoformat(),
            "action": item["action"],
            "decision": item["decision"],
            **execution,
        })

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(executions, f, indent=2)

    successful = sum(
        1 for x in executions
        if x["status"] == "success"
    )

    blocked = sum(
        1 for x in executions
        if x["status"] == "blocked"
    )

    executed_amount = sum(
        x["executed_amount"]
        for x in executions
    )

    print("========================================")
    print("       RESURGE ACTION EXECUTOR")
    print("========================================")
    print(f"Execution attempts : {len(executions)}")
    print(f"Successful         : {successful}")
    print(f"Blocked            : {blocked}")
    print(f"Executed value     : ₹{executed_amount:,.2f}")
    print("Mode               : SYNTHETIC TEST")
    print("========================================")
    print(f"Output: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()