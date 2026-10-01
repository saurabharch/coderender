import { version } from "../../package.json";

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
  { method: "POST", path: "/api/comments", auth: "public", desc: "Post a comment (threaded, masked, spam shadow-hidden).", body: "{resourceType, resourceId, parentId?, name, body}" },
  { method: "GET", path: "/api/comments?resourceType=&resourceId=", auth: "public", desc: "Approved thread (?count=1 for count)." },
  { method: "PATCH", path: "/api/comments/[id]", auth: "team", desc: "Edit own comment (re-moderated)." },
  { method: "DELETE", path: "/api/comments/[id]", auth: "team", desc: "Delete own comment." },
  { method: "POST", path: "/api/comments/[id]/like", auth: "public", desc: "Toggle like (rate-limited)." },
  { method: "PATCH", path: "/api/comments/[id]/status", auth: "team", desc: "Moderate: pending/approved/spam." },
  { method: "DELETE", path: "/api/comments/[id]/status", auth: "team", desc: "Delete any comment (moderation)." },
  { method: "GET", path: "/api/kanban/tasks/[taskId]/checklist", auth: "team", desc: "Task checklist items." },
  { method: "POST", path: "/api/kanban/tasks/[taskId]/checklist", auth: "team", desc: "Add checklist item.", body: "{label}" },
  { method: "GET", path: "/api/todos", auth: "team", desc: "List team todos (?status=)." },
  { method: "POST", path: "/api/todos", auth: "team", desc: "Create a team todo.", body: "{title, body?, assigneeEmail?}" },
  { method: "GET", path: "/api/todos/[id]", auth: "team", desc: "Get a team todo." },
  { method: "PUT", path: "/api/todos/[id]", auth: "team", desc: "Update a team todo." },
  { method: "DELETE", path: "/api/todos/[id]", auth: "team", desc: "Delete a team todo." },
  { method: "POST", path: "/api/forms/submit", auth: "public", desc: "Submit a dynamic form (typed validation, rate-limited).", body: "{slug, values, fingerprint?}" },
  { method: "GET", path: "/api/forms", auth: "team", desc: "List forms (?status=, ?limit=) with submission counts." },
  { method: "POST", path: "/api/forms", auth: "team", desc: "Create a form (visual-builder payload).", body: "{title, slug, fields[], schema?, successMessage?, redirectUrl?, status?}" },
  { method: "GET", path: "/api/forms/[id]", auth: "team", desc: "Get a form by ID for editing." },
  { method: "PUT", path: "/api/forms/[id]", auth: "team", desc: "Update a form.", body: "{title?, fields[]?, schema?, successMessage?, redirectUrl?, status?}" },
  { method: "DELETE", path: "/api/forms/[id]", auth: "team", desc: "Delete a form + its submissions." },
  { method: "GET", path: "/api/forms/by-slug/[slug]", auth: "public", desc: "Get an active form for public rendering." },
  { method: "GET", path: "/api/forms/[id]/submissions", auth: "team", desc: "List submission metadata for a form." },
  { method: "GET", path: "/api/forms/[id]/submissions/[subId]", auth: "team", desc: "Get one submission with its data." },
  { method: "DELETE", path: "/api/forms/[id]/submissions/[subId]", auth: "team", desc: "Delete a submission." },
  { method: "GET", path: "/api/agent/call", auth: "public", desc: "List allowlisted agent ops." },
  { method: "POST", path: "/api/agent/call", auth: "key", desc: "Run an allowlisted agent op (ApiKey scope-checked, audited; durable via Inngest when keyed).", body: "{op, params?}" },
  { method: "GET", path: "/api/kanban/boards", auth: "team", desc: "List boards with column/task counts." },
  { method: "POST", path: "/api/kanban/boards", auth: "team", desc: "Create a board (default columns).", body: "{name, description?, formId?}" },
  { method: "GET", path: "/api/kanban/boards/[id]", auth: "team", desc: "Board detail with columns + tasks." },
  { method: "PUT", path: "/api/kanban/boards/[id]", auth: "team", desc: "Rename/describe/link a form.", body: "{name?, description?, formId?}" },
  { method: "DELETE", path: "/api/kanban/boards/[id]", auth: "team", desc: "Delete a board + columns + tasks." },
  { method: "GET", path: "/api/kanban/boards/[id]/analytics", auth: "team", desc: "Per-board stats (columns, priorities, throughput, cycle) + linked submissions." },
  { method: "POST", path: "/api/kanban/boards/[id]/columns", auth: "team", desc: "Add a column.", body: "{name}" },
  { method: "PUT", path: "/api/kanban/columns/[colId]", auth: "team", desc: "Rename a column." },
  { method: "DELETE", path: "/api/kanban/columns/[colId]", auth: "team", desc: "Delete a column (tasks move to first)." },
  { method: "POST", path: "/api/kanban/columns/reorder", auth: "team", desc: "Reorder columns.", body: "{boardId, ids[]}" },
  { method: "POST", path: "/api/kanban/tasks", auth: "team", desc: "Create a task.", body: "{boardId, columnId?, title, body?, priority?, assigneeEmail?, submissionId?}" },
  { method: "PUT", path: "/api/kanban/tasks/[taskId]", auth: "team", desc: "Update a task." },
  { method: "DELETE", path: "/api/kanban/tasks/[taskId]", auth: "team", desc: "Delete a task." },
  { method: "POST", path: "/api/kanban/tasks/move", auth: "team", desc: "Move a task across columns.", body: "{taskId, columnId, index?}" },
  { method: "POST", path: "/api/kanban/tasks/reorder", auth: "team", desc: "Reorder tasks in a column.", body: "{columnId, ids[]}" },
  { method: "GET", path: "/api/kanban/users", auth: "team", desc: "Assignee directory (?q=)." },
  { method: "GET", path: "/api/gcal/sync", auth: "team", desc: "Google sync status for me." },
  { method: "POST", path: "/api/gcal/sync", auth: "team", desc: "Push board / pull day / disconnect.", body: "{action: push|pull|off, boardId?, day?}" },
  { method: "GET", path: "/api/gcal/connect", auth: "team", desc: "Google OAuth URL (or unconfigured note)." },
  { method: "GET", path: "/api/gcal/state?board=", auth: "team", desc: "Per-task Google event map for a board." },
  { method: "POST", path: "/api/media/upload", auth: "team", desc: "Upload image (2MB cap, folder + alt) to /uploads." },
  { method: "GET", path: "/api/media/assets", auth: "team", desc: "Library search (?q=, ?folder=, ?mime=, ?limit=, ?offset=)." },
  { method: "POST", path: "/api/media/assets", auth: "team", desc: "Register an asset URL.", body: "{url, alt?, folder?}" },
  { method: "PATCH", path: "/api/media/assets/[id]", auth: "team", desc: "Edit asset alt/folder." },
  { method: "DELETE", path: "/api/media/assets/[id]", auth: "team", desc: "Delete asset + file." },
  { method: "GET", path: "/api/media/folders", auth: "team", desc: "List folders." },
  { method: "POST", path: "/api/media/folders", auth: "team", desc: "Create a folder.", body: "{name, parentId?}" },
  { method: "DELETE", path: "/api/media/folders/[id]", auth: "team", desc: "Delete an empty folder." },
  { method: "POST", path: "/api/chat", auth: "team", desc: "AI chat (request/response)." },
  { method: "POST", path: "/api/chat/stream", auth: "team", desc: "AI chat with SSE token streaming." },
  { method: "GET", path: "/api/chat/threads-team", auth: "team", desc: "List own conversations." },
  { method: "PUT", path: "/api/chat/threads-team", auth: "team", desc: "Rename own conversation." },
  { method: "DELETE", path: "/api/chat/threads-team", auth: "team", desc: "Delete own conversation + messages." },
  { method: "POST", path: "/api/chat/vote", auth: "public", desc: "Vote an answer up/down (thread-scoped)." },
  { method: "GET", path: "/api/cms/[type]", auth: "public", desc: "List published CMS items (announcement|page|faq|highlight|category|testimonial). ?all=1 returns drafts for team." },
  { method: "POST", path: "/api/cms/[type]", auth: "team", desc: "Create a typed CMS item (zod-validated).", body: "{…type fields}" },
  { method: "GET", path: "/api/cms/[type]/[id]", auth: "public", desc: "Get one CMS item (drafts need team session)." },
  { method: "PUT", path: "/api/cms/[type]/[id]", auth: "team", desc: "Update a CMS item (merged + revalidated).", body: "{…type fields}" },
  { method: "DELETE", path: "/api/cms/[type]/[id]", auth: "team", desc: "Delete a CMS item." },
  { method: "GET", path: "/api/chat/threads", auth: "public", desc: "List own-device guest threads (fingerprint-scoped)." },  { method: "GET", path: "/api/realtime", auth: "team", desc: "SSE heartbeat of latest team notification." },
  { method: "GET", path: "/api/ops/run", auth: "team", desc: "Run the queue worker tick (depth + results)." },
  { method: "POST", path: "/api/ops/enqueue", auth: "team", desc: "Enqueue a job + run tick.", body: "{kind: gcal.push|gcal.pull|agent.call|notify, payload?}" },
  { method: "POST", path: "/api/ops/cancel", auth: "team", desc: "Fan out ops-cancel signal (stops broadcast runs)." },
  { method: "GET", path: "/api/client", auth: "public", desc: "Your own connection facts (IP, geo, UA class)." },
  { method: "POST", path: "/api/push/subscribe", auth: "public", desc: "Store a Web Push subscription." },
  { method: "GET", path: "/api/push/key", auth: "public", desc: "VAPID public key for subscribing." },
  { method: "POST", path: "/api/push/test", auth: "team", desc: "Send yourself a test push." },
  { method: "POST", path: "/api/otp", auth: "public", desc: "Request/verify email OTP or gate PIN." },
  { method: "GET", path: "/api/pages/[slug]", auth: "public", desc: "Composed page layers + variables." },
  { method: "GET", path: "/api/captcha/mode", auth: "public", desc: "Active human gate (default|slider|off) — chat + forms read this." },
  { method: "GET", path: "/api/slider-captcha", auth: "public", desc: "Issue a slide-puzzle challenge (chat gate only)." },
  { method: "POST", path: "/api/slider-captcha", auth: "public", desc: "Verify puzzle + hashcash, set human cookie.", body: "{id, sig, dx, nonce}" },
  { method: "GET", path: "/api/forms/captcha?kind=", auth: "public", desc: "Form-scoped challenge (math or slider, no cookie)." },
  { method: "GET", path: "/api/inngest", auth: "public", desc: "Inngest serve endpoint (needs keys to execute remotely)." },
  { method: "GET", path: "/api/cron", auth: "public", desc: "Ensures the local scheduler is running." },
  { method: "GET", path: "/api/openapi.json", auth: "public", desc: "This manifest as OpenAPI 3.1." },
];

export function openApiDoc() {
  const toOpenPath = (p: string) =>
    p.replace("[type]", "{type}").replace("[id]", "{id}").replace("[slug]", "{slug}")
      .replace("[subId]", "{subId}").replace("[colId]", "{colId}").replace("[taskId]", "{taskId}");
  const tagOf = (p: string) => {
    const seg = p.split("/")[2] ?? "misc";
    return seg.replace(/\[.*/, "") || "misc";
  };
  const paths: Record<string, unknown> = {};
  for (const r of ROUTES.filter((x) => x.path.startsWith("/api/"))) {
    const open = toOpenPath(r.path.split("?")[0]);
    const params = [...r.path.matchAll(/\[(\w+)\]/g)].map((m) => ({
      name: m[1], in: "path", required: true, schema: { type: "string" },
    }));
    const query = r.path.includes("?") ? [{
      name: r.path.split("?")[1].split("=")[0], in: "query", required: false, schema: { type: "string" },
    }] : [];
    paths[open] = {
      [r.method.toLowerCase()]: {
        tags: [tagOf(r.path)],
        operationId: `${r.method.toLowerCase()}_${open.replace(/[\/{}]/g, "_").replace(/^_+|_+$/g, "")}`,
        summary: r.desc,
        ...(r.body ? {
          requestBody: {
            content: { "application/json": { schema: { type: "object" }, example: r.body } },
          },
        } : {}),
        parameters: [...params, ...query],
        "x-cr-auth": r.auth,
        responses: { "200": { description: "OK" } },
      },
    };
  }
  return {
    openapi: "3.1.0",
    info: { title: "CodeRender API", version },
    servers: [{ url: "/api", description: "This deployment" }],
    tags: [...new Set(ROUTES.map((r) => tagOf(r.path)))].map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: {
        cookieAuth: { type: "apiKey", in: "cookie", name: "cr_session" },
        apiKey: { type: "apiKey", in: "header", name: "x-api-key" },
      },
    },
  };
}
