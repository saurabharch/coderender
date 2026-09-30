# Adding a plugin (native layer, BTST-aligned)

BTST itself can't run on this device (Tailwind v4, persistent ORM adapters, Better Auth
backend, AI credentials, pnpm codegen — see issue for the full audit). Instead each
BTST-catalog capability is implemented natively here with the same shape:

1. **Table** in `lib/store.ts` (+ mirror model in `prisma/schema.prisma`).
2. **Public routes** under `app/` + **admin UI** under `app/admin/`.
3. **Registry**: add API routes to `lib/plugins/manifest.ts` (feeds `/api/docs`,
   `/api/openapi.json`, `/admin/routes`).
4. **Jobs**: side effects go through `lib/jobs.ts` (`runLocal` on-device, Inngest
   Cloud when keys exist).

Current coverage: blog+comments, media, pipeline kanban, form builder, CMS blocks,
public pages (`/p/[slug]`), AI chat (provider-gated), account, openapi, route docs.
Deferred with reasons: BTST UI Builder canvas (DnD authoring — use `/p/[slug]` blocks),
Better Auth backend (native-blocked; magic-link covers UX), AI provider (needs keys).
