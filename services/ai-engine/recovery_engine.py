import json
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[2]

INPUT_FILE = ROOT / "data" / "transactions.json"
OUTPUT_FILE = ROOT / "data" / "recovery-results.json"


def decide_action(txn):
    amount = txn["amount_inr"]
    recoverability = txn["recoverability_score"]
    attempts = txn["attempt_count"]
    reason = txn["failure_reason"]

    # HARD STOP: too many previous attempts
    if attempts >= 3:
        return {
            "decision": "stop",
            "action": "no_more_retries",
            "reason": "retry_limit_reached",
            "expected_recovery": 0,
        }

    # HARD STOP: low recovery probability
    if recoverability < 40:
        return {
            "decision": "escalate",
            "action": "manual_review",
            "reason": "low_recoverability",
            "expected_recovery": 0,
        }

    # High-value transactions require additional control
    if amount >= 15000:
        if recoverability >= 75:
            expected = round(amount * 0.55)
            return {
                "decision": "approval_required",
                "action": "controlled_recovery",
                "reason": "high_value_case",
                "expected_recovery": expected,
            }

        return {
            "decision": "escalate",
            "action": "manual_review",
            "reason": "high_value_low_confidence",
            "expected_recovery": 0,
        }

    # Reason-specific bounded interventions
    if reason == "insufficient_funds":
        expected = round(amount * 0.62)

        return {
            "decision": "recover",
            "action": "smart_retry",
            "reason": "insufficient_funds",
            "expected_recovery": expected,
        }

    if reason == "bank_timeout":
        expected = round(amount * 0.72)

        return {
            "decision": "recover",
            "action": "retry",
            "reason": "temporary_bank_failure",
            "expected_recovery": expected,
        }

    if reason == "technical_failure":
        expected = round(amount * 0.76)

        return {
            "decision": "recover",
            "action": "retry",
            "reason": "technical_failure",
            "expected_recovery": expected,
        }

    if reason == "card_declined":
        expected = round(amount * 0.48)

        return {
            "decision": "recover",
            "action": "payment_method_update",
            "reason": "card_declined",
            "expected_recovery": expected,
        }

    if reason == "checkout_abandoned":
        expected = round(amount * 0.38)

        return {
            "decision": "recover",
            "action": "customer_nudge",
            "reason": "checkout_abandonment",
            "expected_recovery": expected,
        }

    if reason == "subscription_failed":
        expected = round(amount * 0.44)

        return {
            "decision": "recover",
            "action": "customer_nudge",
            "reason": "subscription_failure",
            "expected_recovery": expected,
        }

    if reason == "invoice_overdue":
        expected = round(amount * 0.32)

        return {
            "decision": "recover",
            "action": "receivables_chaser",
            "reason": "invoice_overdue",
            "expected_recovery": expected,
        }

    # Unknown condition = never guess
    return {
        "decision": "escalate",
        "action": "manual_review",
        "reason": "unknown_failure_reason",
        "expected_recovery": 0,
    }


def process_transactions(transactions):
    results = []

    for txn in transactions:
        decision = decide_action(txn)

        recovered = 0

        # Simulated bounded execution.
        # In production this would call a Razorpay/test-mode action.
        if decision["decision"] == "recover":
            recovered = decision["expected_recovery"]

        result = {
            "transaction_id": txn["transaction_id"],
            "customer_id": txn["customer_id"],
            "amount_inr": txn["amount_inr"],
            "failure_reason": txn["failure_reason"],
            "recoverability_score": txn["recoverability_score"],
            "decision": decision["decision"],
            "action": decision["action"],
            "decision_reason": decision["reason"],
            "expected_recovery": decision["expected_recovery"],
            "simulated_recovered_amount": recovered,
            "timestamp": datetime.now().isoformat(),
        }

        results.append(result)

    return results


def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        transactions = json.load(f)

    results = process_transactions(transactions)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    total_risk = sum(t["amount_inr"] for t in transactions)
    recovered = sum(
        r["simulated_recovered_amount"]
        for r in results
    )

    recovery_rate = (
        recovered / total_risk * 100
        if total_risk
        else 0
    )

    recovered_cases = sum(
        1
        for r in results
        if r["simulated_recovered_amount"] > 0
    )

    stopped_cases = sum(
        1
        for r in results
        if r["decision"] == "stop"
    )

    escalated_cases = sum(
        1
        for r in results
        if r["decision"] in ["escalate", "approval_required"]
    )

    print("\n========================================")
    print("        RESURGE RECOVERY ENGINE")
    print("========================================")
    print(f"Transactions processed : {len(results)}")
    print(f"Revenue at risk        : ₹{total_risk:,.2f}")
    print(f"Simulated recovered    : ₹{recovered:,.2f}")
    print(f"Recovery rate          : {recovery_rate:.2f}%")
    print(f"Recovered cases        : {recovered_cases}")
    print(f"Stopped cases          : {stopped_cases}")
    print(f"Escalated cases        : {escalated_cases}")
    print("========================================")
    print(f"Results: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()