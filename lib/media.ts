import { getDb } from "./store";
import { MAX_BYTES } from "./media-core";

export { ALLOWED_MIME, MAX_BYTES, isAllowedMime, publicUrl } from "./media-core";

export interface MediaHooks {
  onBeforeUpload?: (meta: { name: string; size: number; mime: string }) => void | Promise<void>;
  onAfterUpload?: (id: number) => void | Promise<void>;
  onBeforeDeleteAsset?: (id: number) => void | Promise<void>;
  onAfterDeleteAsset?: (id: number) => void | Promise<void>;
  onError?: (op: string, err: unknown) => void | Promise<void>;
}

let hooks: MediaHooks = {};

export function setMediaHooks(h: MediaHooks) {
  hooks = { ...hooks, ...h };
}

export interface Asset {
  id: number; filename: string; mime: string; size: number;
  folder: string; alt: string; url: string; createdAt: string;
}

export function listAssets(opts: { q?: string; folder?: string; mime?: string; limit?: number; offset?: number } = {}): { items: Asset[]; total: number } {
  const d = getDb();
  const conds: string[] = [];
  const args: (string | number)[] = [];
  if (opts.q) {
    conds.push("(filename LIKE ? OR alt LIKE ?)");
    args.push(`%${opts.q.slice(0, 200)}%`, `%${opts.q.slice(0, 200)}%`);
  }
  if (opts.folder !== undefined && opts.folder !== "") {
    conds.push("folder = ?");
    args.push(opts.folder.slice(0, 80));
  }
  if (opts.mime) {
    conds.push("mime = ?");
    args.push(opts.mime);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const limit = Math.min(Math.max(opts.limit ?? 40, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  const items = d.prepare(`SELECT * FROM MediaAsset ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...args, limit, offset) as unknown as Asset[];
  const total = (d.prepare(`SELECT COUNT(*) c FROM MediaAsset ${where}`).get(...args) as { c: number }).c;
  return { items, total };
}

export async function registerAsset(input: { url: string; alt?: string; folder?: string }): Promise<number> {
  const url = String(input.url ?? "").slice(0, 500);
  if (!/^(\/|https?:\/\/)/.test(url)) throw new Error("url must be /uploads/… or http(s)");
  const r = getDb().prepare("INSERT INTO MediaAsset (filename, mime, size, folder, alt, url) VALUES (?,?,?,?,?,?)").run(
    "", "", 0, String(input.folder ?? "").slice(0, 80), String(input.alt ?? "").slice(0, 160), url);
  return Number(r.lastInsertRowid);
}

export async function updateAsset(id: number, input: { alt?: string; folder?: string }): Promise<void> {
  const cur = getDb().prepare("SELECT id, alt, folder FROM MediaAsset WHERE id=?").get(id) as { id: number; alt: string; folder: string } | undefined;
  if (!cur) throw new Error("not found");
  getDb().prepare("UPDATE MediaAsset SET alt=?, folder=? WHERE id=?").run(
    input.alt !== undefined ? String(input.alt).slice(0, 160) : cur.alt,
    input.folder !== undefined ? String(input.folder).slice(0, 80) : cur.folder,
    id);
}

export async function deleteAsset(id: number): Promise<{ filename: string }> {
  await hooks.onBeforeDeleteAsset?.(id);
  const cur = getDb().prepare("SELECT filename FROM MediaAsset WHERE id=?").get(id) as { filename: string } | undefined;
  if (!cur) throw new Error("not found");
  getDb().prepare("DELETE FROM MediaAsset WHERE id=?").run(id);
  await hooks.onAfterDeleteAsset?.(id);
  return cur;
}

export interface Folder { id: number; name: string; parentId: number | null }

export function listFolders(): Folder[] {
  return getDb().prepare("SELECT id, name, parentId FROM MediaFolder ORDER BY name").all() as unknown as Folder[];
}

export function createFolder(name: string, parentId?: number): number {
  const n = String(name ?? "").slice(0, 60).trim();
  if (!n) throw new Error("name required");
  if (parentId) {
    const p = getDb().prepare("SELECT id FROM MediaFolder WHERE id=?").get(parentId);
    if (!p) throw new Error("parent not found");
  }
  const r = getDb().prepare("INSERT INTO MediaFolder (name, parentId) VALUES (?,?)").run(n, parentId ?? null);
  return Number(r.lastInsertRowid);
}

export function deleteFolder(id: number): void {
  const kids = getDb().prepare("SELECT COUNT(*) c FROM MediaFolder WHERE parentId=?").get(id) as { c: number };
  if (kids.c > 0) throw new Error("folder has children");
  getDb().prepare("UPDATE MediaAsset SET folder='' WHERE folder=(SELECT name FROM MediaFolder WHERE id=?)").run(id);
  getDb().prepare("DELETE FROM MediaFolder WHERE id=?").run(id);
}
