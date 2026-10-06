# Ticket 122-final-consolidation

Status: done
Labels: ux, consistency

Last verifiable remainders: IconBtn exists but only the shop add-row uses it;
plans contain zero unchecked boxes (verified by grep); N/A items documented
in 116/117/119/121.

- [x] IconBtn supports extra button handlers (long-press passthrough).
- [x] Migrate every remaining icon-only button to IconBtn (shop/pos/billing/
      people/kanban/boards/scale/services/stock), behavior identical.
- [x] Chain green + live verify + release.
