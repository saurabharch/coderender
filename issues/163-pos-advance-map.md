# Wayfinder map: POS advance on current infra

Labels: wayfinder:map
Status: doing

## Destination

POS gaps from plan 09 closed as working code slices on the current stack
(Next.js + node:sqlite + PWA + Cloudflare web prod), sidebar groups
controllable by business mode (offline/online/hybrid), nothing existing
broken. Done when each frontier ticket is live-proved with chain green.

## Notes

- Domain: see CONTEXT.md (Business mode); plan 09 is adaptation source, not
  a port — its Capacitor/Tauri/Redis/R2/monorepo assumptions are rejected.
- Skills every session: `implement` + `tdd`; `code-review` before release;
  `diagnosing-bugs` when live contradicts green; Inspo MCP for POS UI,
  Mantine MCP for admin primitives. No new infra, no native modules.
- Constraints: npm on-device; never `pm2 restart` on red build; split-brain
  `.next` playbook (stop, rm -rf .next, rebuild, start); probe cleanup.
- RBAC still gates access; drawer/mode filtering is display-only.

## Decisions so far

- [Sidebar mode-based groups](165-sidebar-mode-groups.md): unified catalog + mode matrices + intersection, live-proved.

## Not yet specified

- GitHub Actions CI (needs secrets + Linux runner; local scripts hardened first).
- Native shells (Capacitor/Tauri AAB/IPA/desktop) — fog until a non-Termux
  runner exists; PWA is the device story.
- Plan-09 later phases (credit ledger depth, label designer, PDF themes,
  kitchen/customer displays) — graduate one ticket at a time after the
  frontier lands.

## Out of scope

- Native iOS builds blocking any release (plan defers iOS past commercial).
- Verbatim TailPOS code (GPL-3.0) — functional model only, per repo policy.
- Statutory engines, customer storefront bar, full OPD dashboard (per map 148).

## Children

- [POS anomaly triage](164-pos-anomaly-triage.md) — done (print: receipt width/logo causes traced)
- [Sidebar mode-based groups](165-sidebar-mode-groups.md) — done
- [POS offline catalog fallback](166-pos-offline-catalog.md) — done
- [PWA shell + release hardening](167-pwa-shell-release-hardening.md) — done
- [POS receipt width + logo](168-pos-receipt-width-logo.md) — done

