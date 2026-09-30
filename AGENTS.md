# AGENTS.md — coderender

Greenfield agency site `coderender`. Next.js App Router (TS) + Prisma (SQLite) + shadcn/Radix + next-themes. Pixel-adapted from references, not a template build.

## Stack (do not swap)

- Next.js App Router + TypeScript `strict`, Tailwind, `next-themes` (`light`/`dark`/`system`, default `system`).
- UI: shadcn + Radix primary. Mantine only for advanced primitives (carousel, spotlights); isolate its CSS import to avoid token clash. Icons: `lucide-react` only. Motion: `framer-motion` + CSS keyframes for cinematic/gradient backgrounds.
- DB: SQLite `Lead` via `lib/leads.ts` (`node:sqlite`, zero native deps). `prisma/schema.prisma` is the versioned schema for Linux/prod (`npm run db:deploy` there, never on-device). No Postgres/Supabase.
- Package mgr: `npm` on-device (pnpm store locks unsupported on Termux fs: `ERR_PNPM_STORE_DIR_ACQUIRE_OPERATION_LOCK`). npm cache lives in `/data/data/com.termux/files/usr/tmp/opencode/npm-cache`. postinstall scripts are blocked by default → `npm install-scripts approve <pkg>` (needed: prisma, esbuild, unrs-resolver).

## Commands (npm on-device; verified 2026-09-30)

```bash
npm install --cache /data/data/com.termux/files/usr/tmp/opencode/npm-cache --no-audit --no-fund
npm run dev -- --port 3100   # verify at :3100
npm run lint && npm run typecheck && npm test && npm run build
npm run db:deploy             # Linux/prod only (Prisma migrate deploy)
pnpm dlx shadcn@latest add <component>  # only where pnpm works; else hand-add in shadcn style
```

Single test: `npx vitest run <file>`. Single page check: `npm run build && npm start`.
Never `pm2 restart` unless the build just went green — a failed build leaves `.next` unservable and the restart takes the demo down (seen 2026-09-30). Always `curl localhost:3100` after a restart.
Stop dev with `pkill -f "[n]ext dev"` — a bare `pkill -f "next dev"` matches and kills your own shell.
Next 15: route `params` is `Promise` — `await` it in pages + `generateMetadata`.
Vitest needs `vitest.config.ts` `@` alias (tsconfig paths are not enough).

## Routes (must exist, SEO slugs)

- `/` adapts `https://mbgcard.in/` section order 1:1 (hero, trust-strip, services, process, showcase, testimonials, pricing-teaser, FAQ, CTA).
- `/industries/[slug]` for: `salon-owners`, `gym-fitness-centres`, `bakers-cake-shops`, `doctors-health-clinics`, `restaurant-bars`, `pest-control`, `car-garages-mechanics`, `tours-travels`, `yoga-wellness`, `handyman-services`. One shared template + per-slug copy/SEO metadata.
- `/tools/gbp-booster-whatsapp-ai-agent` (Featured Tool).
- `/about`, `/careers`, `/pricing`, `/contact` (Company). `/api/leads` POST → Prisma `Lead`.

## Design rules (anti-slop)

- Inspo MCP first for any new page/section: `recommend` → 1-2x `search_screens` → `get_screen` on 3-5 keeps. Follow project tokens over Inspo if they conflict. Never skip this and freehand UI.
- References to study: `mbgcard.in`, `gmb.digitalmbg.com`, `grexa.ai`. Recreate layout/rhythm/animation; DO NOT hotlink/scrape their images or paste copy verbatim. Rebuild assets locally in `public/`, rewrite SEO copy in own words.
- Global chrome: sticky header banner + full footer banner on all routes; horizontal floating quick-action bar (call/WhatsApp/enquiry) rendered mobile-only (`md:hidden`, `safe-area-inset-bottom`).
- Responsive mandatory: `375px / 768px / 1280px` smoke check, no horizontal overflow, tap targets ≥44px.
- No generic gradients/purple-blue blobs, no lorem, no unstyled shadcn defaults. Cinematic backgrounds: one focal gradient/mask per viewport, `prefers-reduced-motion` respected.

## Data + forms

- Every CTA/enquiry form POSTs to `/api/leads` with `zod` validation → `createLead()` in `lib/leads.ts` (`Lead { id, name, phone, businessType, source, message, createdAt }`, table auto-created). No `console.log` persistence, no localStorage as DB.
- Prisma engines have no android/bionic builds (x64 default; arm64 fails on TLS/glibc) — so `prisma migrate` can never run on-device. Schema stays versioned in `prisma/` (`binaryTargets = ["linux-arm64-openssl-3.0.x"]`, `PRISMA_CLI_BINARY_TARGETS` for reference); runtime here is `node:sqlite`. `next-themes` must be `^0.4.x` for React 19.

## Skills (local `./skills` + matt-skills at `~/matt-skills/`)

- Project (`opencode.json` `skills: ["./skills"]`): `bb-market-research`, `bb-creator-intelligence`, `bb-gtm-30-day`, `bb-gap-analysis`, `bb-services-offers`, `bb-workflow-automation` — vendored from `~/downloads/BBuilder`. Global: `grill-with-docs`, `grill-me`, `tdd`, `diagnosing-bugs`, `code-review`, `research`, `implement`, `to-spec`, `to-tickets`, `handoff`, `writing-for-agents`.
- If a skill is missing: check folder-name ID, `description` present, `skill` permission allow, no duplicate ID shadowing. Validate with `python3 scripts/validate_skills.py`.
- Order for new work: `grill-with-docs` (reference breakdown + CONTEXT terms) → `to-spec` → `to-tickets` → `prototype` (if UI question) → `implement` + `tdd` → `code-review`.

## Team (controller + workers, `.opencode/agents/`)

- Controller: `coderender-controller` (`mode: all`) — routes, verifies outputs, advances `issues/`. Only it may launch workers. (`bbuilder-controller.md` kept as reference, do not use.)
- Workers (`mode: subagent`, no fan-out): `researcher`, `offer-architect`, `automation-builder`, `launcher` (also owns client ops; `client-manager` retired — card in `.opencode/a2a/agent-cards/_retired/`).
- Dispatch: `Use the <worker> subagent to ...` via the controller. Dependents serially, independents may parallelize.
- Done rule: output file exists + meets worker criteria before Status advances (`inbox → brief → doing → done`).

## A2A + workspaces + templates

- Protocol: `.opencode/a2a/PROTOCOL.md`; cards in `agent-cards/`; envelopes in `tasks/`. Sweep inbox oldest-first, verify file, close, advance linked `issues/`. Seed with `python3 scripts/a2a_new_task.py <to> <type> <expected> --issue=issues/NNN-x.md`. Status: `python3 scripts/status.py`.
- Wayfinder: `.opencode/a2a/WAYFINDER-LAYER.md`, scaffold via `python3 scripts/wayfinder_map.py <spec>`.
- Templates: `templates/{research,product,gtm,launch,growth,acquisition,offers,services,automation}` — scaffold with `python3 scripts/new_workspace.py <offers|automation|client|launch|...> "<Name>"`. Placeholders look like `{{this}}`; secrets in `.env` only.
- Start: `planning/00-master-plan.md`, shared language `CONTEXT.md`, tracker `issues/` local files first.

## Platform (analytics, auth, admin, billing scaffolds)

- Store: `lib/store.ts` — one `node:sqlite` DB, all tables (Lead+fingerprint, Event,
  Subscriber, AppUser/Session/MagicToken, Org/Membership, Preference, Notification,
  PartnerRequest, ClientOrder, Payment, LicenseKey, ApiKey). `prisma/schema.prisma`
  mirrors it for Linux (`npm run db:deploy` there; `deploy.sh` migrates only off-Android).
- Tracking: `components/tracker.tsx` (FingerprintJS → `cr_fp` → `/api/track`) +
  `/api/pixel.gif`; LeadForm attaches the fingerprint; footer newsletter → Subscriber.
- Auth: magic-link only, allowlist enforced in `lib/auth.ts`
  (`saurabhkashyap0001@gmail.com`, `raj90.ro@gmail.com`); session cookie `cr_session`;
  `/admin/*` guarded in `app/admin/layout.tsx`. better-auth intentionally NOT used
  (needs native modules unavailable on Android); same UX, minimal tables.
- Mail: `lib/mailer.ts` (nodemailer + hand-rolled templates — mailgen's file themes
  break under Next bundling). No `SMTP_URL` = Ethereal dev preview (no real delivery).
  Daily owner report: `lib/scheduler.ts` via `instrumentation.ts`, 23:55 IST,
  toggle `daily_report`, manual send in `/admin/settings`.
- Admin: overview (counts, 14d bars, top pages, latest), sortable leads, orders +
  payments, subscribers, broadcasts, partners + JSON profit plan + real revenue math,
  license/API keys (raw shown once), settings/team. Partner form writes PartnerRequest.
- Keys: verify at `/api/license/verify` (activation-counted). No payment gateway yet —
  orders/payments are manual (UPI/cash/card, pending/paid).
- AI inference (secure, local-first): `lib/ai-gateway.ts` is the ONLY caller of any
  model. Scopes enforced (support/product/pricing/partner/infra); prompts PII-redacted;
  runs `opencode run --format json --standalone` under `script` pty in an empty sandbox
  dir (plain pipes kill it with SIGINT), 100s cap, output length-capped; provider HTTP
  fallback; every call audited. `lib/agent-net.ts` = router + 4 agents + tools.
  AgentKit package deferred (needs zod-v4); BTST proper device-blocked (see 030).
- Jobs (Inngest): `lib/jobs.ts` defines durable functions (daily-report cron, lead
  pipeline with 24h nurture sleep, throttled/cancellable broadcasts, support-triage
  agent) + `runLocal()` executes bodies in-process. `emit()` in `lib/events.ts`
  (catalog `APP_EVENTS`) fans out to Cloud when keys exist, local always.
  Serve at `/api/inngest` (needs `INNGEST_DEV=1` locally — set in `.env`/ecosystem).
  Evals: heuristic rubric in `lib/evals.ts`, scored on every chat reply, avg on /admin.
  Realtime: team-only SSE at `/api/realtime`, live badge on /account.
- Plugins (native, BTST-aligned — BTST itself needs Tailwind v4/persistent ORM/
  Better Auth/AI keys/pnpm, none viable here): blog+comments, media, pipeline kanban,
  form builder, CMS blocks + `/p/[slug]` pages, provider-gated AI chat, account page,
  OpenAPI + route docs from `lib/plugins/manifest.ts`. Add tables in `lib/store.ts`,
  mirror in Prisma, register routes in the manifest — see `lib/plugins/README.md`.

## Verification before done

`npm run lint && npm run typecheck && npm test && npm run build` must pass (green 2026-09-30). Confirm theme toggle cycles all 3 modes without FOUC, mobile quick-bar only on small screens, `/api/leads` round-trips to SQLite (live-verified: 200 + row, invalid → 422).
