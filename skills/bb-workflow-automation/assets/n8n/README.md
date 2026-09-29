# n8n Starter Skeletons

Three importable skeletons. They are **starting points, not finished workflows**: each contains `REPLACE:` placeholder nodes where real integrations go.

| File | Purpose |
|------|---------|
| error-notifier.json | Error Trigger → formats an alert → placeholder for Slack/email/Telegram. Set it as the error workflow on every production workflow. |
| lead-intake-to-crm.json | Webhook → normalize → validate email → placeholder CRM step → respond 200 or 422. Add authentication to the webhook and an existing-record lookup before creating. |
| creative-ops-brief-to-approval.json | Brief webhook → job record → placeholders for brand profile, generation, brand gate, client approval, delivery. Backbone for the Creative Ops Automation offer. |

## Import
In n8n: create a workflow → menu → Import from file. Import into a **test instance first**.

## Check before use
1. Node versions differ between n8n releases; if a node shows a warning, re-add it from the palette and copy the settings.
2. Replace every `REPLACE:` node; wire real credentials from the credential store (never paste secrets into nodes).
3. Test with the test webhook URL, then switch to the production URL and activate.
4. Set the error workflow in workflow settings.
5. Export the final JSON to git.

These files were generated and JSON-validated but not import-tested in a live n8n instance.
