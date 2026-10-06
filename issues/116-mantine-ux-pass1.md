# Ticket 116-mantine-ux-pass1

Status: done
Labels: ux, mantine, mobile-first

Scope (project wins over docs): Mantine stays admin-scoped, CSS isolated in
mantine-shell; shadcn/Radix + Tailwind remain primary. No wholesale input swap.

- [x] lib/mask.ts pure helpers (phone/amount) + tests/mask.test.ts.
- [x] components/admin-ux.tsx: CopyBtn (clipboard + notifications), StatusBadge
      (Mantine Badge, NoSsr fallback), CollapsibleCard (Mantine Collapse),
      Seg (SegmentedControl with native-select SSR fallback).
- [x] Pickers: click-outside + Escape close, aria-expanded, loading state.
- [x] service-picker: result count + clear search.
- [x] pos-counter kind selector -> Seg; shop/billing/services status -> StatusBadge.
- [x] shop barcode + billing UPI get CopyBtn; hero slider collapsible (open by default).
- [x] Chain: lint + typecheck + test + build; live-verify admin pages + APIs.
