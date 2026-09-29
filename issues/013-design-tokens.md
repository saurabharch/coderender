# Design tokens (filled 2026-09-30 — mbgcard rhythm, coderender brand)

Status: done
Labels: design

## Token table
| Token | Value |
|---|---|
| Brand primary (buttons, bar) | teal `#0d9488`, deep `#0f766e`, soft `#ccfbf1` |
| Secondary/accent | amber stars `#fbbf24`-ish (`amber-400`); ink pills `zinc-900/white` |
| Page bg / section tint | `#fbf8f3` light, `#000` dark; alt bands `white` / `zinc-950` |
| Text heading / body / muted | `zinc-900` / `zinc-600` / `zinc-500` (dark: white / `zinc-400` / `zinc-500`) |
| Font family | Display `Archivo` 700/800, body `Inter` 400/500/600 (next/font) |
| H1 / H2 / H3 / body | H1 m 2.5rem / d clamp(3rem,6vw,4.5rem); H2 m 1.75rem / d 2.5rem; H3 1.25rem; body 1rem |
| Button | radius full, padding 0.75rem–1.5rem (min-h 44px), weight 600 |
| Card | radius 16px, 1px `black/10` border, shadow none (xl on hero mock only) |
| Section padding | `clamp(72px,10vw,140px)`; container `max-w-6xl`, inline ≥24px |
| Marquee | 50s linear infinite reverse (glides left-to-right), 1rem gap, cards w-56–w-80, snap, pause on hover |
| Header | banner + 64px bar, sticky, backdrop-blur, border-b, shadow after 8px scroll |

## Screenshot shot-list (human pass — no screenshot browser reaches device localhost)
Announcement bar + header; each dropdown; hero desktop + 390px; gallery close-up; bento;
mock cards; platform rows; services top/mid/end; integrations; stats; daily band;
testimonials; talk band; FAQ open/closed; CTA + footer desktop + mobile.

## QA (code-verifiable)
Marquee content duplicated for gapless -50% loop; pause on hover; frozen under
reduced-motion. CTA links use placeholder tel/wa.me (user decision). Zero hotlinked
images (grep `http` in `src=`/`Image` — only wa.me + sitemap URLs).
