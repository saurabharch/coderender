# Linux deploy (compose) vs on-device demo (pm2)

- **On-device (Termux):** `bash scripts/demo.sh` (build → pm2 :3100 → tunnel)
  or `bash scripts/deploy.sh` (CI gate → pm2 reload → health check → rollback
  on failure → tunnel verify). Prisma migrate is skipped on Android — runtime
  is `node:sqlite`; `prisma/schema.prisma` stays versioned for Linux.
- **Linux (compose):** copy `.env.example` to `.env`, set `POSTGRES_PASSWORD`
  + `WORKER_TICK_TOKEN` (+ provider keys as needed), then:
  `docker compose -f deploy/docker-compose.yml --env-file .env up -d --build`.
  `app` runs `prisma migrate deploy` before `next start`; `worker` ticks the
  queue through the app every 60s. CI validates the compose file on every push.
- **Backups:** `bash scripts/backup.sh` any time (also daily ~03:00 IST via the
  in-app scheduler, toggle with the `backup` pref). Keeps 7 verified copies in
  `backups/` (gitignored). Restore: stop the app, `cp backups/dev-YYYYMMDD.db
  dev.db`, start the app.
- **Termux services (optional):** `services/coderender/run` +
  `services/cloudflared/run` are termux-services definitions (`sv-enable …`).
