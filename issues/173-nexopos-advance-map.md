# Wayfinder map: NexoPOS advancement on current infra

Labels: wayfinder:map
Status: doing

## Destination

Plan-10 gaps closed as working slices on the current stack (Next.js +
node:sqlite + PWA + Cloudflare), starting with the ledger decision and
receivables aging. Done when each frontier ticket is live-proved with chain
green and CI green.

## Notes

- Domain: plan 10 (§1–§100) is adaptation source, not a port. Survey:
  nearly all PARTIAL, several MISSING; native/Redis/Typesense/R2/gateway
  assumptions rejected for on-device work.
- Skills every session: `implement` + `tdd`; `code-review` before release;
  `diagnosing-bugs` when live contradicts green. No new infra, no native modules.
- Constraints: npm on-device; Prisma migrate Linux-only; never `pm2 restart`
  on red build; split-brain `.next` playbook; probe cleanup; ledger rows are
  immutable — migrations only add, never rewrite.
- RBAC still gates access; filtering display-only.

## Decisions so far

<!-- one line per closed ticket, gist + link -->

## Not yet specified

- Slice order past receivables (GST depth vs import vs quotes).
- Restaurant/KOT, LAN/print bridge, native shells, Typesense, ABAC, gateway
  reconciliation, portals, forecasting — fog until the ledger decision lands.

## Out of scope

- Verbatim third-party code (GPL or otherwise) — functional model only.
- Native iOS builds blocking any release.
- Statutory engines (no verified rule tables), customer storefront bar.

## Children

- [Double-entry ledger adoption](174-double-entry-ledger.md) — frontier
- [Receivables aging, terms, write-off](175-receivables-aging.md) — blocked by double-entry decision
- [GST depth: HSN, composition, versioned rules](176-gst-depth.md) — frontier
- [CSV import pipeline](177-csv-import-pipeline.md) — frontier
- [Quote versioning and acceptance](178-quote-versioning.md) — frontier
