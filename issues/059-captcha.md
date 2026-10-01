# Slider captcha plugin (devcaptcha spirit, native)

Status: done
Labels: feature

## Question
Only math captcha exists; no visual puzzle, no per-form option, no
provider switch (both could collide).

## Done when
- `lib/slider-captcha.ts` (HMAC-id challenge, media-bg puzzle, tolerance,
  hashcash PoW, TTL, single-use) + pure core tests.
- Single `captcha_provider` pref (default|slider|off) enforced centrally;
  admin settings radio; never both gates at once.
- Chat widget renders active provider; forms optional per-form captcha
  (builder select + renderer + submit verify).
- openApi version auto-reads package.json; new routes listed.
- Chain green + smoke.
