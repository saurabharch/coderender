// Google Calendar two-way sync (zero deps — direct REST via fetch).
// Needs GOOGLE_CLIENT_ID/SECRET + redirect datastore; without keys every
// entry point reports `configured: false` and local views keep working.
// Identity: syncKey `cr-task-{id}-{day}` in extendedProperties.private,
// plus local GcalEvent rows — retries stay idempotent.
import { getDb } from "./store";
import { syncKey } from "./calendar-core";

export function gcalConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri(): string {
  const base = (process.env.APP_URL || "http://localhost:3100").replace(/\/$/, "");
  return `${base}/api/gcal/callback`;
}

export function connectUrl(email: string, state: string): string {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
    state: `${email}:${state}`,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  if (!res.ok) throw new Error("google token failed");
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number }>;
}

export async function exchangeCode(code: string): Promise<{ refreshToken: string }> {
  const t = await tokenRequest({
    code, client_id: process.env.GOOGLE_CLIENT_ID || "", client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirect_uri: redirectUri(), grant_type: "authorization_code",
  });
  if (!t.refresh_token) throw new Error("no refresh token (use a fresh consent)");
  return { refreshToken: t.refresh_token };
}

export async function accessToken(email: string): Promise<string> {
  const row = getDb().prepare("SELECT refreshToken FROM GcalToken WHERE email=? AND syncOn=1").get(email) as
    { refreshToken: string } | undefined;
  if (!row?.refreshToken) throw new Error("google not connected");
  const t = await tokenRequest({
    refresh_token: row.refreshToken, client_id: process.env.GOOGLE_CLIENT_ID || "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET || "", grant_type: "refresh_token",
  });
  return t.access_token;
}

export function connectStatus(email: string): { connected: boolean; configured: boolean; calendarId: string } {
  const row = getDb().prepare("SELECT calendarId, syncOn FROM GcalToken WHERE email=?").get(email) as
    { calendarId: string; syncOn: number } | undefined;
  return { connected: !!row?.syncOn, configured: gcalConfigured(), calendarId: row?.calendarId ?? "primary" };
}

export function setConnection(email: string, input: { refreshToken?: string; calendarId?: string; syncOn?: boolean }): void {
  getDb().prepare(
    `INSERT INTO GcalToken (email, refreshToken, calendarId, syncOn) VALUES (?,?,?,?)
     ON CONFLICT(email) DO UPDATE SET
       refreshToken=COALESCE(NULLIF(excluded.refreshToken,''),refreshToken),
       calendarId=excluded.calendarId, syncOn=excluded.syncOn, updatedAt=datetime('now')`
  ).run(email, input.refreshToken ?? "", input.calendarId ?? "primary", input.syncOn === false ? 0 : 1);
}

async function gapi(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`gcal ${res.status}`);
  return res.json();
}

export interface SyncTask {
  id: number; title: string; body: string; day: string;
  assigneeEmail: string; designation?: string; done: boolean;
}

// Push one task-day as an event (upsert by sync key — idempotent).
export async function pushTask(email: string, t: SyncTask): Promise<string> {
  const token = await accessToken(email);
  const { calendarId } = connectStatus(email);
  const key = syncKey(t.id, t.day);
  const existing = await gapi(token,
    `/calendars/${encodeURIComponent(calendarId)}/events?privateExtendedProperty=crKey%3D${key}&maxResults=1&singleEvents=true`
  ).catch(() => null) as { items?: { id: string }[] } | null;
  const body = {
    summary: `${t.done ? "✓ " : ""}${t.title}`.slice(0, 200),
    description: `${t.body}\n— CodeRender task #${t.id}${t.assigneeEmail ? ` · ${t.assigneeEmail}${t.designation ? ` (${t.designation})` : ""}` : ""}`.slice(0, 2000),
    start: { date: t.day },
    end: { date: t.day },
    extendedProperties: { private: { crKey: key } },
  };
  const gid = existing?.items?.[0]?.id;
  const saved = gid
    ? await gapi(token, `/calendars/${encodeURIComponent(calendarId)}/events/${gid}`, { method: "PUT", body: JSON.stringify(body) })
    : await gapi(token, `/calendars/${encodeURIComponent(calendarId)}/events`, { method: "POST", body: JSON.stringify(body) });
  getDb().prepare("INSERT INTO GcalEvent (taskId, gEventId, day) VALUES (?,?,?) ON CONFLICT(taskId) DO UPDATE SET gEventId=excluded.gEventId, day=excluded.day, updated=datetime('now')")
    .run(t.id, (saved as { id: string }).id, t.day);
  return (saved as { id: string }).id;
}

// Pull: read back events carrying our sync key (last-write-wins by updated).
export async function pullDay(email: string, day: string): Promise<{ key: string; summary: string; status: string }[]> {
  const token = await accessToken(email);
  const { calendarId } = connectStatus(email);
  const data = await gapi(token,
    `/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${day}T00:00:00Z&timeMax=${day}T23:59:59Z&singleEvents=true&maxResults=50&orderBy=startTime`
  ) as { items?: { summary?: string; status?: string; extendedProperties?: { private?: Record<string, string> } }[] };
  return (data.items ?? [])
    .filter((e) => e.extendedProperties?.private?.crKey)
    .map((e) => ({ key: e.extendedProperties!.private!.crKey, summary: e.summary ?? "", status: e.status ?? "" }));
}

export function syncState(taskId: number): { gEventId: string; day: string; updated: string } | null {
  return getDb().prepare("SELECT gEventId, day, updated FROM GcalEvent WHERE taskId=?").get(taskId) as
    { gEventId: string; day: string; updated: string } | null ?? null;
}
