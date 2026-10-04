# WhatsApp Cloud API provider (074)

Status: done
Labels: feature

## Question
WhatsApp is links-only; no Cloud API send, webhook, or receipts.

## Done when
- Meta credential fields (token, phone ID, WABA, app id/secret,
  verify token) in vault; debug_token validation test.
- Webhook verify + signature-checked inbound (messages stored +
  team notified; receipts update rows); correct graph endpoint.
- Central sender prefers Cloud API, falls back to wa.me link.
- Chain green + smoke.
