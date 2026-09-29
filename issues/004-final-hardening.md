# Final hardening (unused deps, SEO, repo init)

Status: done
Labels: chore

## Question
Close the leftover gaps: installed-but-unused Radix Accordion + framer-motion, missing sitemap/robots/metadata, no custom 404, repo not under git.

## Done when
- FAQ uses shadcn-style Radix Accordion; hero/bento use reduced-motion-safe Reveal.
- `app/sitemap.ts` (all routes) + `app/robots.ts` + metadata on pricing/contact.
- `app/not-found.tsx` exists; `git init` + initial commit done.
- `lint + typecheck + test + build` green + live smoke re-verified.
