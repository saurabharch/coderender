# Platform epic: analytics, auth, dashboard, billing scaffolds, reports

Status: done
Labels: feature

## Question
Leads go nowhere; no auth, no analytics, no billing objects, no reporting.

## Done when
- SQLite store covers Lead(+fingerprint), Event, Subscriber, Notification, User,
  Session, MagicToken, Org, Membership, Preference, Order, Payment,
  PartnerRequest, LicenseKey, ApiKey; Prisma schema mirrors for Linux.
- FingerprintJS tracker + /api/track + /api/pixel.gif; footer newsletter;
  partner form writes PartnerRequest.
- Magic-link login (admin allowlist only), team/org/preferences, in-app broadcasts.
- /admin: overview, sortable leads, orders+payments, subscribers, notify,
  partners+plan, keys, settings; license verify endpoint.
- Daily 23:55 IST owner report (mailgen+nodemailer, SMTP_URL or dev preview);
  deploy.sh runs Prisma migrate on non-Android.
- Chain green + full smoke. Honest limits documented (better-auth native-blocked,
  ethereal dev mail, no payment gateway yet).
