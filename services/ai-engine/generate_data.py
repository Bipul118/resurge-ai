import json
import random
from datetime import datetime, timedelta
from pathlib import Path

random.seed(42)

OUTPUT = Path(__file__).resolve().parents[2] / "data" / "transactions.json"

FAILURE_PROFILES = [
    ("insufficient_funds", 0.24),
    ("bank_timeout", 0.16),
    ("card_declined", 0.18),
    ("technical_failure", 0.14),
    ("checkout_abandoned", 0.12),
    ("subscription_failed", 0.10),
    ("invoice_overdue", 0.06),
]

ACTIONS = {
    "insufficient_funds": "smart_retry",
    "bank_timeout": "retry",
    "card_declined": "payment_method_update",
    "technical_failure": "retry",
    "checkout_abandoned": "customer_nudge",
    "subscription_failed": "customer_nudge",
    "invoice_overdue": "receivables_chaser",
}

def weighted_reason():
    reasons = [x[0] for x in FAILURE_PROFILES]
    weights = [x[1] for x in FAILURE_PROFILES]
    return random.choices(reasons, weights=weights, k=1)[0]


def generate_transaction(i: int):
    reason = weighted_reason()
    amount = random.choice([
        499, 799, 999, 1499, 1999, 2499,
        3999, 4999, 7499, 9999, 12400, 18900
    ])

    created_at = datetime.now() - timedelta(
        hours=random.randint(1, 24 * 30)
    )

    attempts = random.randint(0, 3)

    recoverability = random.randint(45, 95)

    if reason in ["technical_failure", "bank_timeout"]:
        recoverability += 3

    if reason == "invoice_overdue":
        recoverability -= 8

    recoverability = max(1, min(99, recoverability))

    risk_score = random.randint(20, 95)

    if recoverability >= 75:
        status = "high_priority"
    elif recoverability >= 55:
        status = "medium_priority"
    else:
        status = "low_priority"

    return {
        "transaction_id": f"RZ_TXN_{10000 + i}",
        "customer_id": f"CUST_{5000 + random.randint(1, 999)}",
        "amount_inr": amount,
        "currency": "INR",
        "failure_reason": reason,
        "attempt_count": attempts,
        "risk_score": risk_score,
        "recoverability_score": recoverability,
        "priority": status,
        "recommended_action": ACTIONS[reason],
        "recovery_status": "at_risk",
        "created_at": created_at.isoformat(),
    }


transactions = [
    generate_transaction(i)
    for i in range(1, 101)
]

OUTPUT.parent.mkdir(parents=True, exist_ok=True)

with open(OUTPUT, "w", encoding="utf-8") as f:
    json.dump(transactions, f, indent=2)

total = sum(t["amount_inr"] for t in transactions)

print("RESURGE synthetic dataset generated")
print(f"Transactions: {len(transactions)}")
print(f"Revenue at risk: ₹{total:,.2f}")
print(f"Output: {OUTPUT}")
