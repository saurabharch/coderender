# Ticket: POS anomaly triage

Parent: [Wayfinder map: POS advance on current infra](163-pos-advance-map.md)
Labels: wayfinder:grilling
Status: done
Assignee: opencode
Blocked-by: (none — frontier, HITL)

## Question

What are the top concrete POS failure symptoms (scan, totals, print, outbox,
UPI, hold/resume…), each traced to its code cause before any fix ticket?

## Notes

HITL: needs the owner's symptom list. Code has zero TODO/FIXME markers;
known gap areas live in closed issues 102/110/130/133/136. Do not fix here —
triage only, one fix ticket per symptom graduates after.

## Triage result (print)

Symptom accepted per recommendation: POS customer receipt, paper first.
Traced causes (all in code, no guessing):
1. `components/pos-receipt.tsx:29` hardcodes `width: 72mm` with no `@page size`
   → 58mm printers clip/mis-scale; A4 wastes a page. No width control anywhere.
2. Receipt never reads the brand kit → no logo possible; billing print also
   ignores `brand_*`.
3. `body * {visibility:hidden}` + absolute positioning → long bills can cut
   at page breaks; single `#pos-receipt` id breaks multi-copy.
4. Blank header ("Counter Bill", no address) when biz prefs unset — honest
   fallback, not a bug; covered by onboarding, not this fix.
Out of triage scope (graduated separately): labels/A4-invoice/payslip paths,
PDF engine, WhatsApp-share, ESC/POS raw printing (no infra for it).
Graduated: [POS receipt width + logo](168-pos-receipt-width-logo.md).
