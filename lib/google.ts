// Google Drive + Docs (zero deps — direct REST via fetch).
// Reuses the Calendar OAuth token (accessToken from lib/gcal); without keys
// or connection every entry throws an honest Error naming the fix.
// Tokens granted before the Drive/Docs scopes need a fresh consent — the
// status endpoint reports needsReconnect instead of failing silently.
import { getDb } from "./store";
import { accessToken, connectStatus, gcalConfigured } from "./gcal";
import { docsText, driveParams } from "./google-core";

export interface DriveFile {
  id: string; name: string; mimeType: string; modifiedTime: string; webViewLink: string;
}

async function gapi(token: string, host: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://${host}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "").then((t) => t.slice(0, 120));
    const err = new Error(`google ${res.status}${detail ? `: ${detail}` : ""}`) as Error & { code?: number };
    err.code = res.status;
    throw err;
  }
  return res.json();
}

function needsReconnectHint(e: unknown): string | null {
  const code = (e as { code?: number })?.code;
  if (code === 403 || code === 401) return "Google refused (old consent?) — reconnect on /admin/google to grant Drive/Docs access.";
  return null;
}

export function googleStatus(email: string): {
  configured: boolean; keySource: string; connected: boolean;
  calendarId: string; needsReconnect: boolean;
} {
  const st = connectStatus(email);
  return {
    configured: st.configured, keySource: st.keySource, connected: st.connected,
    calendarId: st.calendarId, needsReconnect: st.needsReconnect,
  };
}

export async function driveList(email: string, q = "", limit = 10): Promise<DriveFile[]> {
  if (!gcalConfigured()) throw new Error("add Google client ID + secret (dashboard Providers → google, or env)");
  const st = connectStatus(email);
  if (!st.connected) throw new Error("Google not connected — use Connect on /admin/google");
  if (st.needsReconnect) throw new Error("reconnect Google on /admin/google to grant Drive/Docs access");
  try {
    const token = await accessToken(email);
    const data = await gapi(token, "www.googleapis.com",
      `/drive/v3/files?${driveParams(q, limit)}`) as { files?: DriveFile[] };
    return (data.files ?? []).map((f) => ({
      id: f.id, name: f.name, mimeType: f.mimeType,
      modifiedTime: f.modifiedTime, webViewLink: f.webViewLink,
    }));
  } catch (e) {
    throw new Error(needsReconnectHint(e) ?? (e instanceof Error ? e.message : "drive failed"));
  }
}

export async function docsCreate(email: string, title: string, text: string): Promise<{ id: string; url: string }> {
  if (!gcalConfigured()) throw new Error("add Google client ID + secret (dashboard Providers → google, or env)");
  const st = connectStatus(email);
  if (!st.connected) throw new Error("Google not connected — use Connect on /admin/google");
  if (st.needsReconnect) throw new Error("reconnect Google on /admin/google to grant Drive/Docs access");
  try {
    const token = await accessToken(email);
    const doc = await gapi(token, "docs.googleapis.com",
      "/v1/documents", { method: "POST", body: JSON.stringify({ title: title.slice(0, 150) }) }) as { documentId: string };
    if (text.trim()) {
      await gapi(token, "docs.googleapis.com",
        `/v1/documents/${doc.documentId}:batchUpdate`,
        {
          method: "POST",
          body: JSON.stringify({ requests: [{ insertText: { location: { index: 1 }, text: text.slice(0, 15000) } }] }),
        });
    }
    return { id: doc.documentId, url: `https://docs.google.com/document/d/${doc.documentId}/edit` };
  } catch (e) {
    throw new Error(needsReconnectHint(e) ?? (e instanceof Error ? e.message : "docs create failed"));
  }
}

export async function docsRead(email: string, docId: string): Promise<{ title: string; text: string }> {
  if (!gcalConfigured()) throw new Error("add Google client ID + secret (dashboard Providers → google, or env)");
  const st = connectStatus(email);
  if (!st.connected) throw new Error("Google not connected — use Connect on /admin/google");
  if (st.needsReconnect) throw new Error("reconnect Google on /admin/google to grant Drive/Docs access");
  try {
    const token = await accessToken(email);
    const doc = await gapi(token, "docs.googleapis.com",
      `/v1/documents/${encodeURIComponent(docId)}`) as Parameters<typeof docsText>[0] & { title?: string };
    return { title: doc.title ?? "", text: docsText(doc) };
  } catch (e) {
    throw new Error(needsReconnectHint(e) ?? (e instanceof Error ? e.message : "docs read failed"));
  }
}

export function recentDocs(email: string, limit = 5): { docId: string; title: string; at: string }[] {
  return getDb().prepare("SELECT docId, title, at FROM GdocLog WHERE email=? ORDER BY id DESC LIMIT ?").all(email, limit) as
    { docId: string; title: string; at: string }[];
}

export function logDoc(email: string, docId: string, title: string): void {
  getDb().prepare("INSERT INTO GdocLog (email, docId, title) VALUES (?,?,?)").run(email, docId, title.slice(0, 150));
}
