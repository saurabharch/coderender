# Credentials and Access Register: {{client}}

**Never store secrets in this file.** Record where they live and who can use them.

| System | Access type (OAuth / API key / service account) | Scope/permissions | Stored in (credential store name) | Owner at client | Created | Expires / rotate by | Revoked at offboarding |
|--------|--------------------------------------------------|-------------------|-----------------------------------|-----------------|---------|---------------------|------------------------|

## Rules
- Client creates service accounts where possible; we receive least-privilege access
- One set per client; no shared logins; no secrets in chat, email, prompts, or repos
- Use a password manager or the tool's credential store
- Rotate on staff change and at project end; log revocation date

## Incident contact
{{name, phone, email}} · Process: revoke credential, review executions, notify client within {{hours}}.
