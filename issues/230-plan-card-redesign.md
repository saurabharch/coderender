# Ticket: Public plan card redesign (strike, shimmer, badges)

Parent: [Wayfinder map: Sellable plans (configurable prices, cart, checkout)](227-sellable-plans-map.md)
Labels: wayfinder:prototype
Status: doing
Assignee: opencode
Blocked-by: [Ticket: Plan price model (labels, offer, badge)](228-plan-price-model.md) — done

## Question

What does the redesigned `/pricing` plan card look like — previous price
struck light-grey sub-text, new price highlighted with shimmer text +
badge ("new price"/"new"/"offer price") — before it is built?

## Constraints

- HITL: build the throwaway look with the owner reacting (prototype
  skill), then lock: shadcn/Radix + existing `beam`/`glass` idiom
  (`globals.css`), new shimmer keyframe with `prefers-reduced-motion`
  respected, 375/768/1280 + ≥44px targets. No Mantine on public pages.
- Purely presentational over the model from Plan price model; effective
  price math already tested there.

## Prototype (awaiting owner reaction — HITL open)

Live at `/admin/preview-cards` (owner-only, mock data, deleted after
reaction): 5 states — plain, custom label, MRP strike + flat + badge,
% + new-price + /mo, badge-only. `PlanPrice` component wired into
`/pricing` (no live offers configured, so public look is unchanged —
honest). Shimmer keyframe + reduced-motion kill in `globals.css`.
