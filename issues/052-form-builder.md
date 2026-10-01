# Form builder upgrade (BTST contract, native)

Status: done
Labels: feature

## Question
Forms are raw JSON textarea + single submit endpoint; no palette/builder,
no typed field validation, no per-form messages/redirects/status, no
submission review API, no reusable public renderer.

## Done when
- `lib/form-schema.ts` pure catalogue (12 field types), field props,
  fields<->JSON-schema converters, per-type validation.
- `lib/forms.ts` ops over FormDef/Submission (schema, successMessage,
  redirectUrl, status, ip/ua) + lifecycle hooks (before/after/error).
- Typed REST (list/get/create/update/delete, by-slug, submit, submissions
  list/get/delete) with public-active vs team-draft auth.
- Visual builder (palette + canvas + preview + JSON tabs) at
  /admin/forms/new + /admin/forms/[id]/edit; submissions review page.
- `FormRenderer` public component; `/f/[slug]` uses it (all 12 types,
  multi-step allOf, success/redirect).
- Chain green + smoke.
