# Ticket 134-split-payments

Status: done
Labels: plan06, pos, money

Plan §30: one sale, several payment rows, exact-sum enforced.

- [x] posSale payments[] (per-row recordPayment, cash-only drawer move, exact sum).
- [x] Route schema accepts payments[]; legacy single path untouched.
- [x] POS split composer (rows, remainder fill, validation) + UPI-total QR.
- [x] Receipt lists every split row.
- [x] Live split + legacy verify + release.
