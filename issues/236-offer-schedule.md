# Ticket: Offer schedule (start/end auto-expiry + bot wiring)

Parent: [Wayfinder map: Sellable plans (configurable prices, cart, checkout)](227-sellable-plans-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: [Ticket: Plan price model (labels, offer, badge)](228-plan-price-model.md) — done

## Question

How do offers turn on/off by datetime schedule automatically — across
display, subscribe charge, bot answers, and plan search — with Mantine
datetime editing?

## Constraints

- `offerStartsAt`/`offerEndsAt` (blank = unbounded); schedule evaluated
  at read time everywhere (no cron to break): pricing display, subscribe
  charge, bot briefing, admin status chip. Past/expired offers never
  render as live. Pure schedule math in `-core` with tests.
- Mantine `DateTimePicker` in the editor (+ native datetime-local
  fallback); search helper the bot uses is schedule-aware.
- Claim before work; live-prove scheduled subscribe end to end with
  captured-id cleanup; full gate green.

## Resolution

`offerStartsAt/offerEndsAt` (blank = unbounded, invalid = fail-open) on
`ServicePackage` + Prisma; pure `offerWindowActive/offerStatus` in
`-core` (4 tests: upcoming renders plain, expired renders plain, live
window applies, bad dates fail open). Schedule evaluated at read time
everywhere — no cron: `PlanPrice`/pricing, subscribe charge, bot
`plansBriefing` (live offers print with end date), new `plan_search`
bot tool (schedule-aware charge + status), admin `DateTimePicker`
pair + native fallback + live status chip.
Live proof (self-restoring probe, captured-id cleanup): 20%-off window
on plan 1 → subscribe charged 3959 (off 4949); expired window →
charged 4949; plan restored; bot briefing/search read through the same
math. Preview page gains upcoming/expired mock states for the owner's
reaction on the open card prototype.
