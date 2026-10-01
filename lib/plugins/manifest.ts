export interface RouteDoc {
  method: string;
  path: string;
  auth: "public" | "team" | "key";
  desc: string;
  body?: string;
}

export const ROUTES: RouteDoc[] = [
  { method: "POST", path: "/api/leads", auth: "public", desc: "Create a lead (zod-validated). Partner sources also open a PartnerRequest.", body: "{name, phone, businessType?, source?, message?, fingerprint?}" },
  { method: "POST", path: "/api/track", auth: "public", desc: "Ingest a first-party analytics event.", body: "{type: page_view|click|form_submit|lead, path?, fingerprint?, data?}" },
  { method: "GET", path: "/api/pixel.gif", auth: "public", desc: "1px tracking pixel (logs page_view, never breaks)." },
  { method: "POST", path: "/api/subscribe", auth: "public", desc: "Newsletter subscribe.", body: "{email, source?}" },
  { method: "POST", path: "/api/auth/request", auth: "public", desc: "Magic-link email (allowlist only)." },
  { method: "GET", path: "/api/auth/verify?token=", auth: "public", desc: "Redeem magic link, set session, go /admin." },
  { method: "POST", path: "/api/auth/logout", auth: "team", desc: "Destroy session." },
  { method: "POST", path: "/api/license/verify", auth: "public", desc: "Validate a license key (activation-counted).", body: "{key, product?}" },
  { method: "POST", path: "/api/comments", auth: "public", desc: "Post a blog comment (held for moderation)." },
  { method: "POST", path: "/api/forms/submit", auth: "public", desc: "Submit a dynamic form.", body: "{slug, values, fingerprint?}" },
  { method: "POST", path: "/api/media/upload", auth: "team", desc: "Upload image (2MB cap) to /uploads." },
  { method: "POST", path: "/api/chat", auth: "team", desc: "AI chat (needs provider key; 503 without)." },
  { method: "GET", path: "/api/realtime", auth: "team", desc: "SSE heartbeat of latest team notification." },
  { method: "POST", path: "/api/ops/cancel", auth: "team", desc: "Fan out ops-cancel signal (stops broadcast runs)." },
  { method: "GET", path: "/api/client", auth: "public", desc: "Your own connection facts (IP, geo, UA class)." },
  { method: "POST", path: "/api/push/subscribe", auth: "public", desc: "Store a Web Push subscription." },
  { method: "GET", path: "/api/push/key", auth: "public", desc: "VAPID public key for subscribing." },
  { method: "POST", path: "/api/push/test", auth: "team", desc: "Send yourself a test push." },
  { method: "POST", path: "/api/otp", auth: "public", desc: "Request/verify email OTP or gate PIN." },
  { method: "GET", path: "/api/inngest", auth: "public", desc: "Inngest serve endpoint (needs keys to execute remotely)." },
  { method: "GET", path: "/api/cron", auth: "public", desc: "Ensures the local scheduler is running." },
  { method: "GET", path: "/api/openapi.json", auth: "public", desc: "This manifest as OpenAPI 3.1." },
];

export function openApiDoc() {
  return {
    openapi: "3.1.0",
    info: { title: "CodeRender API", version: "0.2.0" },
    paths: Object.fromEntries(
      ROUTES.filter((r) => r.path.startsWith("/api/")).map((r) => [
        r.path,
        { [r.method.toLowerCase()]: { summary: r.desc, ...(r.body ? { requestBody: { content: { "application/json": { schema: { type: "object" } } } } } : {}) } },
      ])
    ),
  };
}
