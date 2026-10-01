import { getDb } from "./store";
import { sanitizeFields, validateValues, type FormField } from "./form-schema";

export interface FormRecord {
  id: number;
  slug: string;
  title: string;
  fields: FormField[];
  schema: Record<string, unknown>;
  successMessage: string;
  redirectUrl: string;
  status: "active" | "inactive" | "archived";
  active: number;
  createdBy: string;
}

export interface SubmissionMeta {
  id: number;
  formId: number;
  submittedAt: string;
  submittedBy: string;
}

export interface FormHooks {
  onBeforeCreateForm?: (data: { title: string; slug: string }) => void | Promise<void>;
  onAfterCreateForm?: (form: { id: number; slug: string }) => void | Promise<void>;
  onBeforeUpdateForm?: (id: number) => void | Promise<void>;
  onAfterUpdateForm?: (form: { id: number; slug: string }) => void | Promise<void>;
  onBeforeDeleteForm?: (id: number) => void | Promise<void>;
  onAfterDeleteForm?: (id: number) => void | Promise<void>;
  onBeforeSubmission?: (slug: string, data: Record<string, unknown>) => Record<string, unknown> | void | Promise<Record<string, unknown> | void>;
  onAfterSubmission?: (sub: { id: number; formId: number }, form: FormRecord) => void | Promise<void>;
  onError?: (op: string, err: unknown) => void | Promise<void>;
}

let hooks: FormHooks = {};

export function setFormHooks(h: FormHooks) {
  hooks = { ...hooks, ...h };
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

interface FormRow {
  id: number; slug: string; title: string; fields: string; active: number;
  schema: string; successMessage: string; redirectUrl: string; status: string; createdBy: string;
}

function toRecord(r: FormRow): FormRecord {
  let fields: FormField[] = [];
  try { fields = sanitizeFields(JSON.parse(r.fields || "[]")); } catch { /* keep empty */ }
  let schema: Record<string, unknown> = {};
  try { schema = r.schema ? JSON.parse(r.schema) : {}; } catch { /* keep empty */ }
  return {
    id: r.id, slug: r.slug, title: r.title, fields,
    schema: Object.keys(schema).length ? schema : { type: "object" },
    successMessage: r.successMessage ?? "", redirectUrl: r.redirectUrl ?? "",
    status: (r.status === "inactive" || r.status === "archived" ? r.status : "active"),
    active: r.active ?? 1, createdBy: r.createdBy ?? "",
  };
}

export function listForms(opts: { status?: string; limit?: number } = {}): (FormRecord & { submissions: number })[] {
  const d = getDb();
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 200);
  const rows = (opts.status
    ? d.prepare("SELECT * FROM FormDef WHERE status=? ORDER BY id DESC LIMIT ?").all(opts.status, limit)
    : d.prepare("SELECT * FROM FormDef ORDER BY id DESC LIMIT ?").all(limit)) as unknown as FormRow[];
  return rows.map((r) => ({
    ...toRecord(r),
    submissions: (d.prepare("SELECT COUNT(*) c FROM Submission WHERE formId=?").get(r.id) as { c: number }).c,
  }));
}

export function getFormById(id: number): FormRecord | null {
  const r = getDb().prepare("SELECT * FROM FormDef WHERE id=?").get(id) as FormRow | undefined;
  return r ? toRecord(r) : null;
}

export function getActiveFormBySlug(slug: string): FormRecord | null {
  const r = getDb().prepare("SELECT * FROM FormDef WHERE slug=? AND status='active' AND active=1").get(slug) as FormRow | undefined;
  return r ? toRecord(r) : null;
}

export async function createForm(input: {
  title: string; slug: string; fields: unknown; schema?: unknown;
  successMessage?: string; redirectUrl?: string; status?: string; createdBy?: string;
}): Promise<number> {
  const title = String(input.title ?? "").slice(0, 120);
  const slug = slugify(String(input.slug ?? ""));
  const fields = sanitizeFields(input.fields);
  if (!title || !slug || fields.length === 0) throw new Error("title, slug and at least one field required");
  await hooks.onBeforeCreateForm?.({ title, slug });
  const status = input.status === "inactive" || input.status === "archived" ? input.status : "active";
  const schemaStr = input.schema && typeof input.schema === "object"
    ? JSON.stringify(input.schema).slice(0, 50000) : "";
  const r = getDb().prepare(
    `INSERT INTO FormDef (slug, title, fields, active, schema, successMessage, redirectUrl, status, createdBy)
     VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET
     title=excluded.title, fields=excluded.fields, schema=excluded.schema,
     successMessage=excluded.successMessage, redirectUrl=excluded.redirectUrl, status=excluded.status`
  ).run(slug, title, JSON.stringify(fields), status === "active" ? 1 : 0, schemaStr,
    String(input.successMessage ?? "").slice(0, 500), String(input.redirectUrl ?? "").slice(0, 300),
    status, String(input.createdBy ?? "").slice(0, 120));
  const row = getDb().prepare("SELECT id FROM FormDef WHERE slug=?").get(slug) as { id: number };
  void r;
  await hooks.onAfterCreateForm?.({ id: row.id, slug });
  try {
    getDb().prepare("INSERT INTO Event (type, path, data) VALUES (?,?,?)").run("form", `/f/${slug}`, JSON.stringify({ id: row.id }).slice(0, 200));
  } catch { /* telemetry never breaks forms */ }
  return row.id;
}

export async function updateForm(id: number, input: {
  title?: string; fields?: unknown; schema?: unknown;
  successMessage?: string; redirectUrl?: string; status?: string;
}): Promise<void> {
  const cur = getFormById(id);
  if (!cur) throw new Error("not found");
  await hooks.onBeforeUpdateForm?.(id);
  const title = input.title !== undefined ? String(input.title).slice(0, 120) : cur.title;
  const fields = input.fields !== undefined ? sanitizeFields(input.fields) : cur.fields;
  if (!title || fields.length === 0) throw new Error("title and at least one field required");
  const status = input.status === "inactive" || input.status === "archived" ? input.status
    : input.status === "active" ? "active" : cur.status;
  const schemaStr = input.schema && typeof input.schema === "object"
    ? JSON.stringify(input.schema).slice(0, 50000)
    : JSON.stringify(cur.schema);
  getDb().prepare(
    `UPDATE FormDef SET title=?, fields=?, active=?, schema=?, successMessage=?, redirectUrl=?, status=? WHERE id=?`
  ).run(title, JSON.stringify(fields), status === "active" ? 1 : 0, schemaStr,
    input.successMessage !== undefined ? String(input.successMessage).slice(0, 500) : cur.successMessage,
    input.redirectUrl !== undefined ? String(input.redirectUrl).slice(0, 300) : cur.redirectUrl,
    status, id);
  await hooks.onAfterUpdateForm?.({ id, slug: cur.slug });
}

export async function deleteForm(id: number): Promise<void> {
  await hooks.onBeforeDeleteForm?.(id);
  getDb().prepare("DELETE FROM Submission WHERE formId=?").run(id);
  getDb().prepare("DELETE FROM FormDef WHERE id=?").run(id);
  await hooks.onAfterDeleteForm?.(id);
}

// ---- submissions ----

export async function createSubmission(form: FormRecord, values: Record<string, unknown>, meta: {
  ip?: string; ua?: string; by?: string;
}): Promise<{ id: number }> {
  let data = values;
  const altered = await hooks.onBeforeSubmission?.(form.slug, values);
  if (altered && typeof altered === "object") data = altered as Record<string, unknown>;
  const { ok, errors, clean } = validateValues(form.fields, data);
  if (!ok) {
    await hooks.onError?.("submission:validation", errors);
    throw Object.assign(new Error("validation failed"), { errors, status: 422 });
  }
  const r = getDb().prepare("INSERT INTO Submission (formId, data, ipAddress, userAgent, submittedBy) VALUES (?,?,?,?,?)").run(
    form.id, JSON.stringify(clean), (meta.ip ?? "").slice(0, 80), (meta.ua ?? "").slice(0, 300), (meta.by ?? "").slice(0, 120));
  const id = Number(r.lastInsertRowid);
  await hooks.onAfterSubmission?.({ id, formId: form.id }, form);
  // Default post-submission behavior (kept from before): leads + telemetry.
  try {
    const v = clean as Record<string, string | number | boolean>;
    if (v.name && v.phone) {
      getDb().prepare("INSERT INTO Lead (name, phone, businessType, source, message) VALUES (?,?,?,?,?)")
        .run(String(v.name).slice(0, 80), String(v.phone).slice(0, 20), "general", `form:${form.slug}`, JSON.stringify(clean).slice(0, 1000));
    }
    getDb().prepare("INSERT INTO Event (type, path, data) VALUES (?,?,?)").run("form_submit", `/f/${form.slug}`, JSON.stringify({ id }).slice(0, 200));
  } catch { /* post-actions never break the response */ }
  return { id };
}

export function listSubmissions(formId: number, limit = 100): SubmissionMeta[] {
  return getDb().prepare(
    "SELECT id, formId, createdAt submittedAt, submittedBy FROM Submission WHERE formId=? ORDER BY id DESC LIMIT ?"
  ).all(formId, Math.min(Math.max(limit, 1), 200)) as unknown as SubmissionMeta[];
}

export function getSubmission(formId: number, subId: number): { id: number; formId: number; data: Record<string, unknown>; submittedAt: string } | null {
  const r = getDb().prepare("SELECT id, formId, data, createdAt submittedAt FROM Submission WHERE formId=? AND id=?").get(formId, subId) as
    { id: number; formId: number; data: string; submittedAt: string } | undefined;
  if (!r) return null;
  try {
    return { ...r, data: JSON.parse(r.data) };
  } catch {
    return { ...r, data: {} };
  }
}

export async function deleteSubmission(formId: number, subId: number): Promise<void> {
  getDb().prepare("DELETE FROM Submission WHERE formId=? AND id=?").run(formId, subId);
}
