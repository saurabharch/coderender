# CMS upgrade (BTST contract, native)

Status: done
Labels: feature

## Question
CMS is free-form key/value; no types, relations, hooks, or typed API.

## Done when
- `lib/cms-schemas.ts` Zod types (announcement, page, faq, highlight, category).
- `lib/cms.ts` operations (validate, hooks, relations) over `CmsItem`.
- Typed REST (`/api/cms/[type]`, `/[id]`), generated admin forms incl. file+relation.
- Announcement bar reads typed CMS. Chain green + smoke.
