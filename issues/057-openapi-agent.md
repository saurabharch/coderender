# OpenAPI + agent secure layer (BTST contract, native)

Status: doing
Labels: feature

## Question
OpenAPI doc is manifest-only (no params/bodies/tags); agents have no
key-scoped secure API; inngest has no agent-call job with audit.

## Done when
- openApiDoc enriched (tags, params, bodies, x-cr-auth) + /reference UI.
- ApiKey-scoped `POST /api/agent/call` (allowlisted ops) + inngest
  `agentCall` job with audit log; key rotation docs.
- Chain green + smoke.
