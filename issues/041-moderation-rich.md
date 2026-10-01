# Moderation + rich chat + abuse console

Status: done
Labels: feature, security

## Question
No content moderation; flags invisible; replies are plain text only.

## Done when
- `lib/moderate.ts` layer (NSFW, injection, link-spam, zalgo/control chars,
  caps-shout) → allow/warn/block; repeat NSFW escalates to exponential bans.
- /admin/flags lists flags + bans + votes with fingerprint/IP/locale; unban works.
- Replies render links, tables (sort/search/paginate), buttons, option chips;
  agent builds comparison/pricing tables on demand.
- Chain green + adversarial smoke (profanity ladder, injection strings, scanner paths).
