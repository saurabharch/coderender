# Demo deploy (pm2 + shared Cloudflare tunnel) + GitHub push

Status: done
Labels: chore

## Question
Ship the demo: `npm run demo` (pm2 :3100 + named tunnel) and push `main` to `https://github.com/saurabharch/coderender`.

## Done when
- [x] README, `ecosystem.config.cjs`, `scripts/demo.sh` / `demo-stop.sh` committed.
- [x] Shared `~/.cloudflared/config.yml` serves both hostnames (backup at `config.yml.bak`); connector online 4/4, local :3100 → 200.
- [x] `git push -u origin main` succeeds (blocked: no GitHub auth on device yet).
- [x] One-time DNS: CNAME `demo` → `<tunnel-id>.cfargotunnel.com` on `optyx.com` (proxied).
