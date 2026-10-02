import { getDb } from "./store";

export interface Service {
  id: number; slug: string; title: string; tagline: string;
  category: string; description: string; notes: string; active: number;
}

export interface Plan {
  id: number; serviceSlug: string; name: string; price: number; per: string;
  timeline: string; includes: string[]; bestFor: string;
  notes: string; details: string; active: number;
  services: Service[];
}

export function listServices(category?: string): Service[] {
  const d = getDb();
  const rows = (category
    ? d.prepare("SELECT * FROM Service WHERE category=? ORDER BY title").all(category)
    : d.prepare("SELECT * FROM Service ORDER BY category, title").all()) as unknown as Service[];
  return rows;
}

export function categories(): { category: string; n: number }[] {
  return getDb().prepare("SELECT category, COUNT(*) n FROM Service GROUP BY category ORDER BY category").all() as
    { category: string; n: number }[];
}

export function suggestServices(q: string, limit = 8): Service[] {
  const like = `%${q.slice(0, 60)}%`;
  return getDb().prepare(
    "SELECT * FROM Service WHERE active=1 AND (title LIKE ? OR tagline LIKE ? OR category LIKE ?) ORDER BY title LIMIT ?"
  ).all(like, like, like, limit) as unknown as Service[];
}

export function createService(input: { title: string; tagline?: string; category?: string; description?: string; notes?: string }): number {
  const title = String(input.title ?? "").slice(0, 120);
  if (!title.trim()) throw new Error("title required");
  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}-${Date.now().toString(36)}`;
  const r = getDb().prepare("INSERT INTO Service (slug, title, tagline, category, description, notes) VALUES (?,?,?,?,?,?)").run(
    slug, title, String(input.tagline ?? "").slice(0, 200), String(input.category ?? "growth").slice(0, 40),
    String(input.description ?? "").slice(0, 4000), String(input.notes ?? "").slice(0, 2000));
  return Number(r.lastInsertRowid);
}

export function updateService(id: number, input: Partial<Pick<Service, "title" | "tagline" | "category" | "description" | "notes">> & { active?: boolean }): void {
  const cur = getDb().prepare("SELECT * FROM Service WHERE id=?").get(id) as Service | undefined;
  if (!cur) throw new Error("not found");
  getDb().prepare("UPDATE Service SET title=?, tagline=?, category=?, description=?, notes=?, active=? WHERE id=?").run(
    input.title !== undefined ? String(input.title).slice(0, 120) : cur.title,
    input.tagline !== undefined ? String(input.tagline).slice(0, 200) : cur.tagline,
    input.category !== undefined ? String(input.category).slice(0, 40) : cur.category,
    input.description !== undefined ? String(input.description).slice(0, 4000) : cur.description,
    input.notes !== undefined ? String(input.notes).slice(0, 2000) : cur.notes,
    input.active !== undefined ? (input.active ? 1 : 0) : cur.active, id);
}

export function deleteService(id: number): void {
  getDb().prepare("DELETE FROM PackageService WHERE serviceId=?").run(id);
  getDb().prepare("DELETE FROM Service WHERE id=?").run(id);
}

export function planServices(packageId: number): Service[] {
  return getDb().prepare(
    "SELECT s.* FROM Service s JOIN PackageService ps ON ps.serviceId=s.id WHERE ps.packageId=? ORDER BY s.title"
  ).all(packageId) as unknown as Service[];
}

export function setPlanServices(packageId: number, serviceIds: number[]): void {
  getDb().prepare("DELETE FROM PackageService WHERE packageId=?").run(packageId);
  for (const sid of serviceIds.slice(0, 20)) {
    getDb().prepare("INSERT INTO PackageService (packageId, serviceId) VALUES (?,?) ON CONFLICT DO NOTHING").run(packageId, Number(sid));
  }
}

export function getPlan(id: number): Plan | null {
  const r = getDb().prepare("SELECT * FROM ServicePackage WHERE id=?").get(id) as
    (Omit<Plan, "includes" | "services"> & { includes: string }) | undefined;
  if (!r) return null;
  let includes: string[] = [];
  try { includes = JSON.parse(r.includes); } catch { /* keep empty */ }
  return { ...r, includes, services: planServices(id) };
}

export function listPlans(): Plan[] {
  const rows = getDb().prepare("SELECT id FROM ServicePackage ORDER BY serviceSlug, price").all() as { id: number }[];
  return rows.map((r) => getPlan(r.id)!).filter(Boolean);
}

export function createPlan(input: {
  name: string; price?: number; per?: string; timeline?: string; serviceSlug?: string;
  includes?: string[]; bestFor?: string; notes?: string; details?: string; serviceIds?: number[];
}): number {
  const name = String(input.name ?? "").slice(0, 120);
  if (!name.trim()) throw new Error("name required");
  const r = getDb().prepare(
    "INSERT INTO ServicePackage (serviceSlug, name, price, per, timeline, includes, bestFor, notes, details) VALUES (?,?,?,?,?,?,?,?,?)"
  ).run(
    String(input.serviceSlug ?? "custom").slice(0, 60), name,
    Math.max(0, Math.round(Number(input.price ?? 0) || 0)), String(input.per ?? "one-time").slice(0, 30),
    String(input.timeline ?? "").slice(0, 60), JSON.stringify(input.includes ?? []),
    String(input.bestFor ?? "").slice(0, 200), String(input.notes ?? "").slice(0, 2000),
    String(input.details ?? "").slice(0, 4000));
  const id = Number(r.lastInsertRowid);
  if (input.serviceIds?.length) setPlanServices(id, input.serviceIds);
  return id;
}

export function updatePlan(id: number, input: {
  name?: string; price?: number; per?: string; timeline?: string; serviceSlug?: string;
  includes?: string[]; bestFor?: string; notes?: string; details?: string; active?: boolean; serviceIds?: number[];
}): void {
  const cur = getPlan(id);
  if (!cur) throw new Error("not found");
  getDb().prepare(
    "UPDATE ServicePackage SET name=?, price=?, per=?, timeline=?, serviceSlug=?, includes=?, bestFor=?, notes=?, details=?, active=? WHERE id=?"
  ).run(
    input.name !== undefined ? String(input.name).slice(0, 120) : cur.name,
    input.price !== undefined ? Math.max(0, Math.round(Number(input.price) || 0)) : cur.price,
    input.per !== undefined ? String(input.per).slice(0, 30) : cur.per,
    input.timeline !== undefined ? String(input.timeline).slice(0, 60) : cur.timeline,
    input.serviceSlug !== undefined ? String(input.serviceSlug).slice(0, 60) : cur.serviceSlug,
    input.includes !== undefined ? JSON.stringify(input.includes) : JSON.stringify(cur.includes),
    input.bestFor !== undefined ? String(input.bestFor).slice(0, 200) : cur.bestFor,
    input.notes !== undefined ? String(input.notes).slice(0, 2000) : cur.notes,
    input.details !== undefined ? String(input.details).slice(0, 4000) : cur.details,
    input.active !== undefined ? (input.active ? 1 : 0) : cur.active, id);
  if (input.serviceIds !== undefined) setPlanServices(id, input.serviceIds);
}

export function deletePlan(id: number): void {
  getDb().prepare("DELETE FROM PackageService WHERE packageId=?").run(id);
  getDb().prepare("DELETE FROM ServicePackage WHERE id=?").run(id);
}
