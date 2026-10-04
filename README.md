# CodeRender — local-growth agency site

Marketing site for the **coderender** agency: Google Business Profile growth, WhatsApp automation, local SEO, and fast websites for 10 local-business verticals. Rewritten copy, rebuilt assets — pixel-adapted from `mbgcard.in` / `grexa.ai` rhythms, never copied.

Live demo (on the shared `termux` mayo tunnel `de25d1cf…`): **https://coderender.optyx.shop**

> The raw `<tunnel-id>.cfargotunnel.com` address carries no DNS and cannot serve
> traffic directly — the tunnel routes by hostname, so the demo lives on a routed
> hostname. `demo.optyx.com` takes over once that zone moves to Cloudflare.

## Stack

Next.js 15 App Router + TypeScript strict + Tailwind + `next-themes` (light/dark/system) · shadcn-style + Radix + lucide · framer-motion · SQLite leads via `node:sqlite` (`lib/leads.ts`) with `prisma/schema.prisma` as the versioned schema for Linux/prod · vitest · pm2 + cloudflared for the demo.

## Quickstart

```bash
npm install --cache /data/data/com.termux/files/usr/tmp/opencode/npm-cache --no-audit --no-fund
cp -n .env.example .env
npm run dev -- --port 3100   # http://localhost:3100
```

Verify before every commit:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

## Demo in one command (pm2 + Cloudflare tunnel)

```bash
npm run demo        # build → pm2 start (port 3100) → cloudflared tunnel
npm run demo:stop   # stop tunnel + pm2 app
```

What `demo` does (`scripts/demo.sh`): production build, `pm2 start ecosystem.config.cjs`, then exposes port 3100. If Cloudflare credentials exist in `~/.cloudflared/`, it runs the **named tunnel** serving `demo.optyx.com`; otherwise it falls back to a **quick tunnel** and prints the public `https://*.trycloudflare.com` URL. Logs: `pm2 logs coderender`.

## pm2 runbook (production, port 3100)

```bash
npm run build
./node_modules/.bin/pm2 start ecosystem.config.cjs --update-env
./node_modules/.bin/pm2 list            # expect coderender → online
./node_modules/.bin/pm2 logs coderender --lines 20 --nostream
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/
./node_modules/.bin/pm2 restart ecosystem.config.cjs --update-env   # only on green builds
```

Rules: never restart on a red build (a failed build leaves `.next` unservable and the restart takes the demo down). The ecosystem caps crash loops (`min_uptime 10s`, `max_restarts 5`). Stop the demo connector only by its PID file (`demo:stop`) — never broad `pkill` patterns, which can kill your own shell or other tunnels.

## Ship automation (CI → review → release → deploy)
- `bash scripts/ci.sh` — local gate (lint + typecheck + test + build); same chain runs on every push/PR via `.github/workflows/ci.yml`.
- `bash scripts/sync.sh` — pull --rebase, gate, push (needs GitHub auth).
- `bash scripts/release.sh [patch|minor|major] ["notes"]` — bumps version, writes CHANGELOG, commits + tags `vX.Y.Z`; tag push creates the GitHub Release (`release.yml`).
- `bash scripts/deploy.sh` — gates, backs up `.next`, rebuilds, reloads pm2, health-checks, auto-rolls back on failure, verifies the tunnel URL.
- Branch flow: feature branches → PR (CI must pass) → merge to `main` → release tag → deploy. Pushes to `main` without a green gate are not done.

## Cloudflare tunnel runbook (shared `termux` tunnel)
```bash
cloudflared tunnel --config ~/.cloudflared/config.yml run   # serves every ingress hostname
tail -f /data/data/com.termux/files/usr/tmp/opencode/cloudflared-demo.log
```

One connector serves all ingress rules in the shared file (`demo.optyx.shop` → :8090, `demo.optyx.com` + `coderender.optyx.shop` → :3100). Live demo: **https://coderender.optyx.shop**.

## One-time DNS for demo.optyx.com

Prerequisite: the `optyx.com` zone must live on Cloudflare (as of 2026-09-30 it resolves
outside Cloudflare, so tunnel routing cannot attach — moving nameservers to Cloudflare
is a dashboard + registrar step). Once it does, add:

| Type  | Name | Target                                    | Proxy |
|-------|------|-------------------------------------------|-------|
| CNAME | demo | `<tunnel-id>.cfargotunnel.com`            | ON    |

Get `<tunnel-id>` from `cloudflared tunnel list` (the ID already in `~/.cloudflared/*.json`). No dashboard change is needed for quick tunnels. Never commit `~/.cloudflared/*.json` — it stays out of git (see `.gitignore`).

## Routes

`/` · `/industries/[slug]` (10 verticals) · `/services/[slug]` (6) · `/tools/gbp-booster-whatsapp-ai-agent` · `/tools/*` (QR, template, pricing) · `/about /careers /pricing /contact /partner /docs /privacy /terms /refund` · `/support /faqs /support/ticket /grievance /complaints` · `/blog` · `/f/[slug]` (dynamic forms) · `/p/[slug]` (composed pages) · `/api/leads` (POST zod-validated → SQLite `Lead`) · `/login` + `/admin/*` (magic-link, owner allowlist) · `/ai-chat` (team streaming chat) · `/reference` (team API docs) · `/sitemap.xml` · `/robots.txt`.

## Features (v0.8.0)

- **Chat**: guest wizard (vertical → goals → booking) + verified support/partner modes with real snapshots, ticket filing, meeting reschedule flow, captcha gates (math or slide-puzzle, admin-switchable), moderation + evals + self-distillation. Team: `/ai-chat` streaming with threads, votes, memory.
- **Kanban**: boards/columns/tasks, priorities, assignees + designations, attachments, checklists with notes, comments, form-submission links, client/owner mapping, day/week/month/year/Gantt views, standalone `/admin/calendar`, Google Calendar two-way sync (keys pending).
- **Forms**: visual builder (12 field types, validation, multi-step), public renderer, per-form captcha, submissions console, typed REST.
- **CMS + pages**: typed collections, visual page composer (11 layer types, variables), media picker, blog with covers.
- **Comments**: threaded + likes + edit, resource-bound (blog/kanban/todos), NSFW auto-mask, spam auto-hide, moderation console.
- **Tickets**: console + timeline + assign/resolve, abuse layer, quarantined attachments (ClamAV-or-heuristic scan job), adjustable SLA auto-status, bot filing + tracking, agent `ticket.*` ops, loop notifications (mail/push/WhatsApp-link/Telegram-hook).
- **Platform**: Inngest jobs (report, nurture, triage, distill, agent-call, scan) with local runner; key-scoped agent API (`/api/agent/call`, audited); durable job queue (`/admin/ops`); OpenAPI 3.1 + team reference.
- **Captcha plugin**: math or slide-puzzle (canvas-cut piece, vendored art, hashcash worker, single-use TTL), per-form option, exclusive provider switch.

```
                    ┌─────────────┐
                    │   Visitors  │
                    └──────┬──────┘
                           ▼
            ┌──────────────────────────┐
            │  Site + Chat + Forms     │──leads──▶ SQLite
            └──────┬─────────┬─────────┘
                   │         │ tickets/comments/submissions
                   ▼         ▼
            ┌──────────────┐ ┌──────────────┐
            │ Team Boards  │ │ Admin consoles│
            │ Kanban/Gantt │ │ tickets/media │
            │ Calendar/GCal│ │ catalog/pages │
            └──────┬───────┘ └──────┬────────┘
                   │                │
                   ▼                ▼
            ┌────────────────────────────────┐
            │ Agents (chat/tools/ApiKey) +   │
            │ Inngest jobs + queue + notify  │
            │ (mail/push/wa-link/tg-hook)    │
            └────────────────────────────────┘
```

Ticket lifecycle: `filed (bot/web, abuse-screened) → open → assigned → resolved (+resolution note) → closed (auto after SLA)` · spam auto-hidden · SLA escalates stale opens · every step notifies watchers + team on connected channels · attachments unlock only after a clean scan.

## Configuration

| Key | Required for | Without it |
|---|---|---|
| `SMTP_URL`, `MAIL_FROM` | real mail | Ethereal dev previews in logs |
| `WHATSAPP_API_URL` + `WHATSAPP_API_TOKEN` | provider WhatsApp sends | `wa.me` click-to-chat links |
| `TELEGRAM_BOT_TOKEN` (+ `TELEGRAM_TEAM_CHAT_ID`) | Telegram sends | logged + Notification rows |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Calendar two-way sync | local views only, honest 422 |
| `INNGEST_EVENT_KEY` / `SIGNING_KEY` | Cloud job execution | in-process `runLocal` |
| `GITHUB_TOKEN` | `scripts/sync.sh` push | manual `git push` with fresh auth |
| `CLAMAV_SOCKET` (or `clamscan` + DBs) | ClamAV engine | EICAR + executable heuristic (backend recorded per file) |
| `CAPTCHA_SECRET` | cookie signing | dev default (change in prod) |
| `sla_ack_hours` / `sla_close_days` (settings) | ticket SLA automation | 24h escalate / 14d auto-close |
| `captcha_provider` (settings) | chat gate | math captcha |

## Platform: analytics, team, billing scaffolds

- **Tracking**: FingerprintJS visitor IDs, `/api/track` events, `/api/pixel.gif`, newsletter subscribe, fingerprints on leads. See live in `/admin`.
- **Team auth**: magic-link sign-in at `/login` for the two owner emails (configurable allowlist in `lib/auth.ts`); org + membership + preferences included.
- **Dashboard**: overview analytics, sortable leads, orders + payments, subscribers, in-app broadcasts, partner requests + profit-share plan, license/API keys, settings.
- **Mail**: set `SMTP_URL` (Gmail app-password or custom SMTP) for real delivery; without it, mails render as Ethereal previews in logs. Daily owner report auto-sends 23:55 IST (toggle in settings).
- **Sell later**: mint license keys per purchase, verify at `/api/license/verify`; API keys are hash-stored with scopes. No payment gateway wired yet — add your provider when ready.

## Project layout

```
app/            routes + layout (header/footer/mobile quick-bar) + globals.css
components/     theme-toggle, site chrome, chat widget, kanban board/views, tables, pickers, editors
lib/            domain ops (leads, kanban, forms, cms, comments, tickets, catalog, media, gcal, queue, notify)
prisma/         versioned schema — migrate on Linux/prod only (engines lack android builds)
public/captcha-bg vendored puzzle art · public/captcha-worker.js PoW worker
skills/         vendored bb-* agent skills (see AGENTS.md)
templates/      offer/gtm/launch/service scaffolds
scripts/        demo.sh, sync.sh, release.sh, ci.sh, deploy.sh, status.py, ...
.opencode/      controller + worker personas, A2A protocol + agent cards
issues/         local tracker (inbox → brief → doing → done)
tests/          vitest suites (pure helpers; DB paths covered by live smoke)
```

`AGENTS.md` is the source of truth for agent sessions (commands, quirks, skill order).
