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

`/` · `/industries/[slug]` (10 verticals) · `/services/[slug]` (6) · `/tools/gbp-booster-whatsapp-ai-agent` · `/tools/*` (QR, template, pricing) · `/about /careers /pricing /contact /partner /docs /privacy /terms /refund` · `/api/leads` (POST zod-validated → SQLite `Lead`) · `/login` + `/admin/*` (magic-link, owner allowlist) · `/sitemap.xml` · `/robots.txt`.

## Platform: analytics, team, billing scaffolds

- **Tracking**: FingerprintJS visitor IDs, `/api/track` events, `/api/pixel.gif`, newsletter subscribe, fingerprints on leads. See live in `/admin`.
- **Team auth**: magic-link sign-in at `/login` for the two owner emails (configurable allowlist in `lib/auth.ts`); org + membership + preferences included.
- **Dashboard**: overview analytics, sortable leads, orders + payments, subscribers, in-app broadcasts, partner requests + profit-share plan, license/API keys, settings.
- **Mail**: set `SMTP_URL` (Gmail app-password or custom SMTP) for real delivery; without it, mails render as Ethereal previews in logs. Daily owner report auto-sends 23:55 IST (toggle in settings).
- **Sell later**: mint license keys per purchase, verify at `/api/license/verify`; API keys are hash-stored with scopes. No payment gateway wired yet — add your provider when ready.

## Project layout

```
app/            routes + layout (header/footer/mobile quick-bar) + globals.css
components/     theme-toggle, site chrome, lead-form, ui/* (shadcn-style), reveal
lib/            lead-schema (zod), leads (node:sqlite store), site (verticals)
prisma/         versioned schema — migrate on Linux/prod only (engines lack android builds)
skills/         vendored bb-* agent skills (see AGENTS.md)
templates/      offer/gtm/launch/service scaffolds
scripts/        demo.sh, status.py, a2a_new_task.py, wayfinder_map.py, validate_skills.py
.opencode/      controller + worker personas, A2A protocol + agent cards
issues/         local tracker (inbox → brief → doing → done)
workspaces/     research + offers decisions (rewritten, never verbatim)
```

`AGENTS.md` is the source of truth for agent sessions (commands, quirks, skill order).
