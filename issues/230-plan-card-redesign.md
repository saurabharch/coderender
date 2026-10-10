# Ticket: Public plan card redesign (strike, shimmer, badges)

Parent: [Wayfinder map: Sellable plans (configurable prices, cart, checkout)](227-sellable-plans-map.md)
Labels: wayfinder:prototype
Status: doing
Blocked-by: [Ticket: Plan price model (labels, offer, badge)](228-plan-price-model.md)

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
