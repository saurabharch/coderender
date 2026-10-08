# Ticket: GST depth: HSN, composition, versioned rules

Parent: [Wayfinder map: NexoPOS advancement on current infra](173-nexopos-advance-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How do HSN/SAC codes, composition scheme, and versioned tax rules layer
onto the current CGST/SGST/IGST engine without breaking live bills?

## Constraints

- Current inclusive/exclusive math untouched; new rules additive + dated.
- No seeded statutory rates beyond verified tables (legal risk stands).

## Resolution

Additive slice, live bills untouched in the default path:
- HSN: `Product.hsn` (validated 4–8 digits, pure `parseHsn` + tests), saved
  via product API, flows through product reads automatically.
- Composition: `tax_composition` pref + Settings toggle; quote path zeroes
  line tax when on; receipt prints "Composition scheme — tax not collected".
  No statutory rates seeded (legal risk stands).
- Versioned rates: `TaxRate.startsAt/endsAt` + pure `rateEffective` + tests +
  Settings date fields + window display. Products keep snapshotted taxPct
  (documented, not changed).
Live proof: probe product stored hsn 3004; quote 1525 tax normally, 0 under
composition; toggle UI renders; all probe rows/prefs cleaned.
