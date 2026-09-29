# Deployment and Hosting Options (with licence check)
Checked {{date}}. Not legal advice. **Confirm current terms with the vendor in writing before selling any managed or multi-client hosting.**

## n8n licence: what our research found (2026-09-29)
- Building workflows and providing consulting/support for clients is permitted without a separate agreement (n8n docs and announcement).
- Hosting n8n and charging people to access it, reselling or white-labelling it, or offering it as a service is not permitted under the Sustainable Use License.
- Hosting clients' workflows and credentials on an instance you operate is described by several sources as needing an Enterprise/commercial licence; one community thread reports n8n support confirming a case where clients never access n8n and it is used purely as an internal tool. Sources differ, so get written confirmation for your exact model.
- Sources: docs.n8n.io (privacy-and-security/sustainable-use-license), n8n community thread "Can I use n8n Cloud to manage workflows for multiple consulting clients?", agency licensing guides.

## Delivery models
| Model | Who owns/pays infrastructure | Who holds credentials | Licence risk (n8n) | Our role | Use when |
|-------|-----------------------------|-----------------------|--------------------|----------|----------|
| A. Client-owned n8n (their cloud plan or their server) | Client | Client (we get scoped access) | Lowest: consulting/build | Build, support, retainer | Default |
| B. Client-owned SaaS accounts (Make, Zapier, Pipedream) | Client | Client | Vendor terms only | Build, support | Non-technical clients |
| C. Provider-operated instance running client workflows | Us | Us (holding client secrets) | Highest; needs written confirmation or commercial licence | Managed service | Only after licence is confirmed |
| D. Alternative engine with permissive licence (e.g. Activepieces self-host) | Client or us | Per contract | Check that tool's licence | Build, host | Need managed hosting without n8n licence |
| E. Client builds, we coach | Client | Client | Lowest | Training | Technical clients |

## Hosting checklist (self-host)
- [ ] Server sizing and region agreed; backups of database and the encryption key
- [ ] HTTPS, reverse proxy, restricted admin access, 2FA where available
- [ ] Update policy (who upgrades, when, with rollback)
- [ ] Execution data retention and pruning set
- [ ] Queue mode/workers if volume requires it
- [ ] Monitoring and disk/DB alerts
- [ ] Documented recovery steps and tested restore

## Decision log
| Client | Model chosen | Licence confirmed by/date | Notes |
|--------|--------------|---------------------------|-------|
