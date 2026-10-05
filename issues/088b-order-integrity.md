# Ticket 088b-order-integrity (bugfix, from Phase D live testing)

Status: done
Labels: bugfix

Fixed before Phase E:
- Cancel/return leaked stock (no restock) → restock via ledger on cancel-from-confirmed + return.
- Confirm→cancel kept loyalty points (exploit) → revokeForOrder.
- Abandoned drafts burned coupon uses → released on cancel.
- Double-billing same order possible → one final bill per order+type.
- Stock transfer to warehouse 0 created phantom levels → rejected (route zod + lib guard).
- Non-atomic confirms could leave phantom orders → transaction-wrapped (085-088 paths).
