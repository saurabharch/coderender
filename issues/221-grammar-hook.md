# Ticket: Grammar basics plus LanguageTool hook

Parent: [Wayfinder map: SEO, fonts, icons, i18n](216-seo-fonts-i18n-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How does the blog editor flag basic issues locally (doubles, repeats,
casing) with a dormant LanguageTool hook that activates on a pasted key?

## Constraints

- Local checks pure + tested; no network without a key; key lives in
  settings/vault, never in code.

## Resolution

Writing checks without network dependence:
- Pure local checks (doubled words/spaces, repeated sentences, casing) +
  tests; team-gated `/api/proofread` endpoint.
- LanguageTool provider registered in the vault (URL + optional key) so
  its UI appears automatically; merges remote matches only when keyed,
  stays fully dormant otherwise (proven: via null, no outbound call).
- Check button + notes panel in the blog editor.
Live proof: local issues flagged, anon 401, no-key dormancy confirmed.
Probe tokens cleaned.
