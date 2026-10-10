# Wayfinder map: SEO, fonts, icons, i18n

Labels: wayfinder:map
Status: doing

## Destination

Discoverable + multilingual by configuration: auto SEO/OG/blog fields,
configurable fonts and icon packs, and an English+Hindi foundation with
flagged-off RTL — all settings-driven JSON, nothing hardcoded. Done when
each ticket is live-proved with chain green and CI green.

## Notes

- Domain: dictionaries live as versioned JSON (`locales/`); brand kit stays
  the design source; machine translation is out.
- Skills every session: `implement` + `tdd`; `code-review` before release.
- Constraints: npm on-device; never `pm2 restart` on red build; probe cleanup.

## Decisions so far

- [Auto SEO, OG images, blog fields](217-auto-seo-og.md): OG routes + auto excerpt, byte-proved live.

## Not yet specified

- RTL full rollout (flagged off until Hindi proves the pipeline).
- Additional locales past Hindi (dictionaries make them additive).
- Scheduled publishing (from the blog map).

## Out of scope

- Machine translation at runtime (external API, cost, quality).
- Auto-switching locale by location (explicit switcher + hint only).

## Children

- [Auto SEO, OG images, blog fields](217-auto-seo-og.md) — done
- [Configurable fonts](218-configurable-fonts.md) — frontier
- [Icon packs with toggle](219-icon-packs.md) — frontier
- [i18n foundation Hindi plus English](220-i18n-foundation.md) — frontier
- [Grammar basics plus LanguageTool hook](221-grammar-hook.md) — frontier
