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

## One-time DNS for demo.optyx.com

Prerequisite: the `optyx.com` zone must live on Cloudflare (as of 2026-09-30 it resolves
outside Cloudflare, so tunnel routing cannot attach — moving nameservers to Cloudflare
is a dashboard + registrar step). Once it does, add:

| Type  | Name | Target                                    | Proxy |
|-------|------|-------------------------------------------|-------|
| CNAME | demo | `<tunnel-id>.cfargotunnel.com`            | ON    |

Get `<tunnel-id>` from `cloudflared tunnel list` (the ID already in `~/.cloudflared/*.json`). No dashboard change is needed for quick tunnels. Never commit `~/.cloudflared/*.json` — it stays out of git (see `.gitignore`).

## Routes

`/` · `/industries/[slug]` (10 verticals) · `/tools/gbp-booster-whatsapp-ai-agent` · `/about /careers /pricing /contact` · `/api/leads` (POST zod-validated → SQLite `Lead`) · `/sitemap.xml` · `/robots.txt`.

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
