// Pure Google helpers (no sqlite — safe for vitest).
// Scopes requested at OAuth consent; the granted set is recorded per token
// so the UI can honestly say "reconnect" when scopes grow.

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/documents",
] as const;

// Bump when GOOGLE_SCOPES grows: stored per token at callback time.
export const SCOPE_SET = 2;

export function scopeString(): string {
  return [...GOOGLE_SCOPES].join(" ");
}

// Extract plain text from a Docs documents.get body.
export function docsText(doc: {
  body?: { content?: { paragraph?: { elements?: { textRun?: { content?: string } }[] } }[] };
}): string {
  const out: string[] = [];
  for (const el of doc.body?.content ?? []) {
    for (const pe of el.paragraph?.elements ?? []) {
      if (pe.textRun?.content) out.push(pe.textRun.content);
    }
  }
  return out.join("").replace(/\n{3,}/g, "\n\n").slice(0, 20000);
}

// Build a Drive files.list query from a free-text search (quoted, safe).
export function driveQuery(q: string): string {
  const clean = q.replace(/["\\]/g, "").trim().slice(0, 100);
  return clean ? `name contains '${clean}' and trashed = false` : "trashed = false";
}

export function driveParams(q: string, limit: number): URLSearchParams {
  return new URLSearchParams({
    q: driveQuery(q),
    orderBy: "modifiedTime desc",
    pageSize: String(Math.min(50, Math.max(1, Math.round(limit) || 10))),
    fields: "files(id,name,mimeType,modifiedTime,webViewLink)",
  });
}
