# Ticket 139-versioning + soft-delete

Status: done
Labels: plan06, platform

Suggestion order #4 (last). Version contract without route duplication;
inactive-flag deletes for variants/lots/slides (reversible in DB).

- [x] middleware.ts stamps x-api-version on /api/* + /api/version doc.
- [x] active flags + filtered reads + flipped deletes (3 tables + Prisma).
- [x] Live: delete→hidden→data intact; version header present + release.
