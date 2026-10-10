# Ticket: Provider adapters (Stripe, Paytm, Wise, mode-aware India stack)

Parent: [Wayfinder map: Sellable plans (configurable prices, cart, checkout)](227-sellable-plans-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: [Ticket: Gateway platform (test/live creds, settings tab, subscribe idempotency)](234-gateway-platform.md)

## Question

How does each provider collect and confirm — Stripe (PaymentIntent +
webhook), Paytm (checksum init + callback), Wise (payout rail quotes +
transfers), Razorpay/PayU/Easebuzz mode-aware — behind one adapter shape?

## Constraints

- Pure hash math in `-core` with round-trip tests (Stripe HMAC header,
  Paytm AES checksum, PayU/Easebuzz/Razorpay existing); HTTP clients in
  `lib/gateways.ts` with 20s timeouts; all provider webhooks
  signature-verified (403 otherwise) + idempotent confirm.
- Wise is a payout rail (refunds/partner payouts), labeled honestly —
  not a customer checkout. Live keys stay user-supplied; test mode
  proves the wiring without them.

## Resolution

One adapter shape per provider: Stripe PaymentIntent (native
Idempotency-Key) + timestamped webhook verify; Paytm AES checksum
init + callback verify; Wise quote→transfer payout rail (labeled
honestly, not checkout); Razorpay/PayU/Easebuzz mode-aware (test hosts +
keys). Pure hash math round-trip tested (178 green). Keys UI is a
Mantine vault console (owner/superadmin-gated API, masked render);
`/admin/payments` sidebar page + settings tab. Live proof: keyless tests
honest, unsigned webhooks 403, dummy-key save/test/clear round-trip.
