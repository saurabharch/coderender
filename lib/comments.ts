import { getDb } from "./store";
import { moderate } from "./moderate";
import { expandShortcodes } from "./emoji";
import { isResourceType, maskText, nest, statusFor, type ThreadComment } from "./comments-core";

export interface CommentHooks {
  onBeforeCreateComment?: (data: { resourceType: string; resourceId: string }) => void | Promise<void>;
  onAfterCreateComment?: (id: number, status: string) => void | Promise<void>;
  onBeforeModerateComment?: (id: number, status: string) => void | Promise<void>;
  onAfterModerateComment?: (id: number, status: string) => void | Promise<void>;
  onError?: (op: string, err: unknown) => void | Promise<void>;
}

let hooks: CommentHooks = {};

export function setCommentHooks(h: CommentHooks) {
  hooks = { ...hooks, ...h };
}

export async function createComment(input: {
  resourceType: string; resourceId: string; parentId?: number;
  name: string; body: string; authorEmail?: string; trusted?: boolean;
}): Promise<{ id: number; status: string }> {
  if (!isResourceType(input.resourceType)) throw new Error("bad resource");
  const rid = String(input.resourceId).slice(0, 120);
  if (!rid) throw new Error("bad resource");
  const name = maskText(String(input.name ?? "").slice(0, 80));
  if (name.trim().length < 2) throw new Error("name required");
  const mod = moderate(`${name} ${input.body}`);
  const body = maskText(expandShortcodes(String(input.body ?? "").slice(0, 2000)));
  if (body.trim().length < 2) throw new Error("body required");
  if (input.parentId) {
    const p = getDb().prepare("SELECT id FROM Comment WHERE id=? AND resourceType=? AND resourceId=?").get(
      input.parentId, input.resourceType, rid) as { id: number } | undefined;
    if (!p) throw new Error("parent not found");
  }
  await hooks.onBeforeCreateComment?.({ resourceType: input.resourceType, resourceId: rid });
  const status = statusFor(mod.verdict, input.trusted);
  const postRow = input.resourceType === "blog-post"
    ? getDb().prepare("SELECT id FROM Post WHERE slug=?").get(rid) as { id: number } | undefined
    : undefined;
  const r = getDb().prepare(
    `INSERT INTO Comment (postId, name, body, status, resourceType, resourceId, parentId, authorEmail)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(postRow?.id ?? 0, name, body, status, input.resourceType, rid,
    input.parentId ?? null, String(input.authorEmail ?? "").slice(0, 120));
  const id = Number(r.lastInsertRowid);
  await hooks.onAfterCreateComment?.(id, status);
  try {
    getDb().prepare("INSERT INTO Event (type, path, data) VALUES (?,?,?)").run(
      "comment", `/${input.resourceType}/${rid}`, JSON.stringify({ id, status }).slice(0, 200));
  } catch { /* telemetry never breaks comments */ }
  return { id, status };
}

export function listThread(resourceType: string, resourceId: string, viewerLikeKey?: string, limit = 100): ThreadComment[] {
  if (!isResourceType(resourceType)) return [];
  const rows = getDb().prepare(
    `SELECT id, parentId, name, body, status, likes, editedAt, createdAt, authorEmail FROM Comment
     WHERE resourceType=? AND resourceId=? AND status='approved' ORDER BY id ASC LIMIT ?`
  ).all(resourceType, String(resourceId).slice(0, 120), Math.min(Math.max(limit, 1), 200)) as unknown as (ThreadComment & { authorEmail: string })[];
  const liked = new Set<number>();
  if (viewerLikeKey) {
    const ids = rows.map((r) => r.id);
    if (ids.length) {
      const marks = getDb().prepare(
        `SELECT commentId FROM CommentLike WHERE key=? AND commentId IN (${ids.map(() => "?").join(",")})`
      ).all(viewerLikeKey, ...ids) as { commentId: number }[];
      for (const m of marks) liked.add(m.commentId);
    }
  }
  const viewerEmail = viewerLikeKey?.startsWith("u:") ? viewerLikeKey.slice(2) : "";
  return rows.map(({ authorEmail, ...r }) => ({
    ...r, body: maskText(r.body), name: maskText(r.name),
    liked: liked.has(r.id), mine: !!viewerEmail && authorEmail === viewerEmail,
  }));
}

export function nestedThread(resourceType: string, resourceId: string, viewerLikeKey?: string) {
  return nest(listThread(resourceType, resourceId, viewerLikeKey));
}

export function countApproved(resourceType: string, resourceId: string): number {
  if (!isResourceType(resourceType)) return 0;
  return (getDb().prepare("SELECT COUNT(*) c FROM Comment WHERE resourceType=? AND resourceId=? AND status='approved'")
    .get(resourceType, String(resourceId).slice(0, 120)) as { c: number }).c;
}

export async function toggleLike(commentId: number, key: string): Promise<{ likes: number; liked: boolean }> {
  const c = getDb().prepare("SELECT likes FROM Comment WHERE id=? AND status='approved'").get(commentId) as { likes: number } | undefined;
  if (!c) throw new Error("not found");
  const k = String(key).slice(0, 120) || "anon";
  const had = getDb().prepare("SELECT commentId FROM CommentLike WHERE commentId=? AND key=?").get(commentId, k);
  if (had) {
    getDb().prepare("DELETE FROM CommentLike WHERE commentId=? AND key=?").run(commentId, k);
    getDb().prepare("UPDATE Comment SET likes=likes-1 WHERE id=?").run(commentId);
    return { likes: Math.max(0, c.likes - 1), liked: false };
  }
  getDb().prepare("INSERT INTO CommentLike (commentId, key) VALUES (?,?)").run(commentId, k);
  getDb().prepare("UPDATE Comment SET likes=likes+1 WHERE id=?").run(commentId);
  return { likes: c.likes + 1, liked: true };
}

export async function editComment(id: number, body: string): Promise<void> {
  const clean = maskText(expandShortcodes(String(body ?? "").slice(0, 2000)));
  if (clean.trim().length < 2) throw new Error("body required");
  const mod = moderate(clean);
  getDb().prepare("UPDATE Comment SET body=?, status=?, editedAt=datetime('now') WHERE id=?").run(
    clean, mod.verdict === "block" ? "spam" : "approved", id);
}

export async function moderateComment(id: number, status: "pending" | "approved" | "spam"): Promise<void> {
  const cur = getDb().prepare("SELECT id FROM Comment WHERE id=?").get(id) as { id: number } | undefined;
  if (!cur) throw new Error("not found");
  await hooks.onBeforeModerateComment?.(id, status);
  getDb().prepare("UPDATE Comment SET status=? WHERE id=?").run(status, id);
  await hooks.onAfterModerateComment?.(id, status);
}

export async function deleteComment(id: number): Promise<void> {
  getDb().prepare("DELETE FROM CommentLike WHERE commentId=?").run(id);
  getDb().prepare("DELETE FROM Comment WHERE id=?").run(id);
}

export function commentOwner(id: number): { authorEmail: string; name: string } | null {
  return getDb().prepare("SELECT authorEmail, name FROM Comment WHERE id=?").get(id) as
    { authorEmail: string; name: string } | null ?? null;
}
