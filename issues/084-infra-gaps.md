# Ticket 084-infra-gaps

Status: done
Labels: infra, security

## Gap analysis (2026-10-05, device + Linux)
| # | Requirement | State | Verdict |
|---|---|---|---|
| 1 | DB backup + restore | none — dev.db (all leads/orders/payments) is a single copy on a 90%-full disk | GAP P0 → implement |
| 2 | Deploy tunnel verify | `pgrep -f "tunnel.*--config"` never matches — connector runs as bare `cloudflared tunnel run` | GAP P1 → fix pattern |
| 3 | Infra self-checks | disk/db/build/scheduler only; blind to backups + tunnel | GAP P1 → extend |
| 4 | Log bounds | pm2 logs small today (128K) but unbounded on 90% disk | GAP P2 → cap in backup run |
| 5 | SQLite busy_timeout | no pragma; scheduler + requests share one file | GAP P2 → one-line pragma |
| 6 | Restart history (73) | historical missing-.next during deploys; deploy.sh now guards | no action |

## Scope
- [x] `scripts/backup.sh`: online `.backup` + integrity check + prune-7 + pm2 log cap. Manual + scheduler daily (03:00 IST, `backup` pref).
- [x] deploy.sh tunnel pattern fix; infraCheck backup-freshness + tunnel checks; busy_timeout pragma.
- [x] `backups/` gitignored; restore notes in deploy/README.md.
- [x] Chain green, live smoke (backup file + restore-drill on copy + checks), commit + release.
