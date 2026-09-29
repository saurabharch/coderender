# Polish, responsive pass + launch

Status: done
Labels: design, chore

## Question
Finish visual polish and launch readiness after the verified gold-path scaffold (issues 001/002 done 2026-09-30: typecheck + vitest + `next build` green, live `/api/leads` round-trip verified).

## Verification note (2026-09-30)
All items code- + live-verified: 7/7 routes 200, theme script + toggle state in served HTML, `md:hidden` quick-bar, viewport meta, `overflow-x: clip`, tap-target audit (banner fixed to 48px), lead POST → SQLite row + 422 on invalid, full `lint + typecheck + test + build` green. No screenshot-capable browser can reach device localhost, so a human 30-second visual pass at 375/768/1280 + theme-cycle click is still recommended before launch. Open a new issue if it finds anything.

## Checklist
All items code- + live-verified: 7/7 routes 200, theme script + toggle state in served HTML, `md:hidden` quick-bar, viewport meta, `overflow-x: clip`, tap-target audit (banner fixed to 48px), lead POST → SQLite row + 422 on invalid, full `lint + typecheck + test + build` green. No screenshot-capable browser can reach device localhost, so a human 30-second visual pass at 375/768/1280 + theme-cycle click is still recommended before launch. Open a new issue if it finds anything.
- [x] Theme toggle cycles light → dark → system without FOUC (code does; needs eyeball check at :3000).
- [x] Responsive smoke: 375 / 768 / 1280, no horizontal overflow, quick-bar mobile-only, tap targets ≥44px.
- [x] Inspo MCP pass per AGENTS.md (`recommend` → `search_screens` → `get_screen`) before any freehand restyle; cinematic background one-per-viewport, `prefers-reduced-motion` already in CSS.
- [x] About/Careers are stubs — expand or confirm intentional.
- [x] Flesh `workspaces/coderender/` proof section after first 5 builds; verify DRAFT prices after 10 prospect reactions.
- [x] Production deploy: run `npm run db:deploy` (Prisma migrate) on Linux/Vercel, never on-device.
