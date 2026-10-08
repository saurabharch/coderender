# Wayfinder map: NexoPOS advancement on current infra

Labels: wayfinder:map
Status: done

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

- [Double-entry ledger adoption](174-double-entry-ledger.md): books already balanced, proven live; legs math extracted pure + tested.
- [Receivables aging, terms, write-off](175-receivables-aging.md): terms/overdue/statement/owner write-off live-proved.
- [GST depth: HSN, composition, versioned rules](176-gst-depth.md): HSN/composition/rate windows live-proved.
- [CSV import pipeline](177-csv-import-pipeline.md): preview UI + batch rollback live-proved.
- [Quote versioning and acceptance](178-quote-versioning.md): versions immutable, accept mints linked order.

## Not yet specified

- Restaurant/KOT, LAN/print bridge, native shells, Typesense, ABAC, gateway
  reconciliation, portals, forecasting — future maps, in dependency order
  after quotes if the owner calls for them.

## Out of scope

- Verbatim third-party code (GPL or otherwise) — functional model only.
- Native iOS builds blocking any release.
- Statutory engines (no verified rule tables), customer storefront bar.

## Children

- [Double-entry ledger adoption](174-double-entry-ledger.md) — done
- [Receivables aging, terms, write-off](175-receivables-aging.md) — done (terms/overdue/statement/write-off live-proved)
- [GST depth: HSN, composition, versioned rules](176-gst-depth.md) — done (HSN/composition/rate windows live-proved)
- [CSV import pipeline](177-csv-import-pipeline.md) — done (preview UI + batch rollback live-proved)
- [Quote versioning and acceptance](178-quote-versioning.md) — done (versions immutable, accept mints linked order)
