import { getDb } from "./store";
import { schemaFor, FIELD_UI } from "./cms-schemas";

export type { FieldDef } from "./cms-fields";
export { fieldsFor, coerceForm, describeType } from "./cms-fields";

export interface CmsHooks {
  onBeforeCreate?: (type: string, data: Record<string, unknown>) => void | Promise<void>;
  onAfterCreate?: (type: string, id: number) => void | Promise<void>;
  onBeforeUpdate?: (type: string, id: number, data: Record<string, unknown>) => void | Promise<void>;
  onAfterUpdate?: (type: string, id: number) => void | Promise<void>;
  onBeforeDelete?: (type: string, id: number) => void | Promise<void>;
  onAfterDelete?: (type: string, id: number) => void | Promise<void>;
  onError?: (op: string, err: unknown) => void | Promise<void>;
}

let hooks: CmsHooks = {};

export function setCmsHooks(h: CmsHooks) {
  hooks = { ...hooks, ...h };
}

function slugify(data: Record<string, unknown>): string {
  const base = String(data.title ?? data.name ?? data.question ?? data.text ?? `item-${Date.now()}`);
  return base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || `item-${Date.now()}`;
}

function publishedFlag(data: Record<string, unknown>): number {
  return data.published === false ? 0 : 1;
}

function telemetry(type: string, id?: number) {
  try {
    getDb().prepare("INSERT INTO Event (type, path, data) VALUES (?,?,?)").run(
      "cms", `/cms/${type}`, JSON.stringify({ id }).slice(0, 200));
  } catch { /* telemetry never breaks cms */ }
}

export async function createItem(type: string, data: Record<string, unknown>): Promise<number> {
  const schema = schemaFor(type);
  if (!schema) throw new Error("unknown type");
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    await hooks.onError?.("create", parsed.error);
    throw new Error("validation failed");
  }
  await hooks.onBeforeCreate?.(type, parsed.data);
  const slug = slugify(parsed.data as Record<string, unknown>);
  const r = getDb().prepare("INSERT INTO CmsItem (type, slug, data, published) VALUES (?,?,?,?)").run(
    type, slug,
    JSON.stringify(parsed.data),
    publishedFlag(parsed.data as Record<string, unknown>)
  );
  const id = Number(r.lastInsertRowid);
  await hooks.onAfterCreate?.(type, id);
  telemetry(type, id);
  return id;
}

export async function updateItem(type: string, id: number, data: Record<string, unknown>): Promise<void> {
  const schema = schemaFor(type);
  if (!schema) throw new Error("unknown type");
  const cur = getDb().prepare("SELECT data FROM CmsItem WHERE type=? AND id=?").get(type, id) as { data: string } | undefined;
  if (!cur) throw new Error("not found");
  const merged = { ...JSON.parse(cur.data), ...data };
  const parsed = schema.safeParse(merged);
  if (!parsed.success) {
    await hooks.onError?.("update", parsed.error);
    throw new Error("validation failed");
  }
  await hooks.onBeforeUpdate?.(type, id, parsed.data);
  getDb().prepare("UPDATE CmsItem SET data=?, published=? WHERE type=? AND id=?").run(
    JSON.stringify(parsed.data),
    publishedFlag(parsed.data as Record<string, unknown>), type, id);
  await hooks.onAfterUpdate?.(type, id);
  telemetry(type, id);
}

export async function deleteItem(type: string, id: number): Promise<void> {
  if (!schemaFor(type)) throw new Error("unknown type");
  await hooks.onBeforeDelete?.(type, id);
  getDb().prepare("DELETE FROM CmsItem WHERE type=? AND id=?").run(type, id);
  await hooks.onAfterDelete?.(type, id);
  telemetry(type, id);
}

export interface CmsRow {
  id: number;
  slug: string;
  data: Record<string, unknown>;
  published: number;
  related?: Record<string, Record<string, unknown> | null>;
}

// Resolve belongsTo relations (e.g. testimonial.categoryId -> category row).
export function expandRelations(type: string, data: Record<string, unknown>): Record<string, Record<string, unknown> | null> {
  const out: Record<string, Record<string, unknown> | null> = {};
  for (const [key, ui] of Object.entries(FIELD_UI)) {
    const [t, field] = key.split(".");
    if (t !== type || ui.fieldType !== "relation" || !ui.relation) continue;
    const ref = data[field] as { id?: string | number } | undefined;
    const refId = ref?.id === undefined || ref?.id === "" ? null : Number(ref.id);
    if (refId === null || Number.isNaN(refId)) {
      out[field] = null;
      continue;
    }
    try {
      const target = getDb().prepare("SELECT id, slug, data FROM CmsItem WHERE type=? AND id=?").get(
        ui.relation.targetType, refId) as { id: number; slug: string; data: string } | undefined;
      out[field] = target ? { id: target.id, slug: target.slug, ...JSON.parse(target.data) } : null;
    } catch {
      out[field] = null;
    }
  }
  return out;
}

function toRow(r: { id: number; slug: string; data: string; published: number }, type: string, withRelated: boolean): CmsRow {
  const data = JSON.parse(r.data) as Record<string, unknown>;
  return {
    ...r,
    data,
    related: withRelated ? expandRelations(type, data) : undefined,
  };
}

export function listItems(type: string, limit = 100, opts: { publishedOnly?: boolean; withRelated?: boolean } = {}): CmsRow[] {
  const { publishedOnly = false, withRelated = true } = opts;
  const rows = getDb().prepare(
    `SELECT id, slug, data, published FROM CmsItem WHERE type=?${publishedOnly ? " AND published=1" : ""} ORDER BY id DESC LIMIT ?`
  ).all(type, Math.min(Math.max(limit, 1), 200)) as { id: number; slug: string; data: string; published: number }[];
  return rows.map((r) => toRow(r, type, withRelated));
}

export function getItem(type: string, id: number, withRelated = true): CmsRow | null {
  const r = getDb().prepare("SELECT id, slug, data, published FROM CmsItem WHERE type=? AND id=?").get(type, id) as
    { id: number; slug: string; data: string; published: number } | undefined;
  if (!r) return null;
  return toRow(r, type, withRelated);
}

export function getItemBySlug(type: string, slug: string, withRelated = true): CmsRow | null {
  const r = getDb().prepare("SELECT id, slug, data, published FROM CmsItem WHERE type=? AND slug=? ORDER BY id DESC").get(type, slug) as
    { id: number; slug: string; data: string; published: number } | undefined;
  if (!r) return null;
  return toRow(r, type, withRelated);
}

export function countByType(): Record<string, number> {
  const rows = getDb().prepare("SELECT type, COUNT(*) c FROM CmsItem GROUP BY type").all() as { type: string; c: number }[];
  return Object.fromEntries(rows.map((r) => [r.type, r.c]));
}

// Latest active announcement for the header banner (typed CMS first).
export function activeAnnouncement(): { text: string; link: string } | null {
  try {
    const rows = listItems("announcement", 10, { publishedOnly: true, withRelated: false });
    const hit = rows.find((r) => (r.data.active as boolean) !== false && String(r.data.text ?? "").trim());
    if (hit) return { text: String(hit.data.text), link: String(hit.data.link ?? "") };
  } catch { /* fall through to legacy */ }
  return null;
}
