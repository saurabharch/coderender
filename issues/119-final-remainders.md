# Ticket 119-final-remainders

Status: done
Labels: ux, mantine

Genuinely remaining refs; N/A documented at bottom (no matching UI).

- [x] Variant row: picker wrapper basis-full, vprice maskAmount, ccode maskUpper (new helper+test), cval pct→maskPercent/flat→maskAmount, coupon chips CopyBtn.
- [x] use-map: provider-tabs keyed field values Record → useMap.
- [x] use-long-press: POS found-row add (tap +1, hold +5 via qty param).
- [x] use-orientation: scanner landscape hint.
- [x] multi-select: calendar/board Who filter single → MultiSelect.
- [x] Chain green + live verify + release.

N/A (no matching UI, not skipped lightly): floating-indicator (no tab bar UI
anywhere — ProviderTabs is a vault form), tiptap (CKEditor kept per AGENTS.md,
no editor duplication), use-headroom (only stickies are the nav drawer and the
global site header — must not move), schedule views (day/week/month/year/gantt
+ agenda already exist in BoardViews).
