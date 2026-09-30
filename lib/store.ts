import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { randomBytes, createHash } from "node:crypto";

function dbPath(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const file = url.startsWith("file:") ? url.slice(5) : url;
  return file.startsWith("/") ? file : join(process.cwd(), file);
}

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(dbPath());
    db.exec(`CREATE TABLE IF NOT EXISTS Lead (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL,
      businessType TEXT NOT NULL DEFAULT 'general', source TEXT NOT NULL DEFAULT 'contact',
      message TEXT, fingerprint TEXT, createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    try { db.exec("ALTER TABLE Lead ADD COLUMN fingerprint TEXT"); } catch { /* exists */ }
    db.exec(`CREATE TABLE IF NOT EXISTS Event (
      id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, path TEXT NOT NULL DEFAULT '/',
      fingerprint TEXT, data TEXT, createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS Subscriber (
      id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL DEFAULT 'footer', active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS AppUser (
      id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE,
      name TEXT, role TEXT NOT NULL DEFAULT 'member',
      prefs TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS MagicToken (
      id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, token TEXT NOT NULL UNIQUE,
      expiresAt TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS Session (
      id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, token TEXT NOT NULL UNIQUE,
      expiresAt TEXT NOT NULL)`);
    db.exec(`CREATE TABLE IF NOT EXISTS Org (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT 'CodeRender',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS Membership (
      id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, orgId INTEGER NOT NULL DEFAULT 1,
      role TEXT NOT NULL DEFAULT 'member', UNIQUE(userId, orgId))`);
    db.exec(`CREATE TABLE IF NOT EXISTS Preference (
      key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')`);
    db.exec(`CREATE TABLE IF NOT EXISTS Notification (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
      audience TEXT NOT NULL DEFAULT 'team', createdBy INTEGER,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS PartnerRequest (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT '', tier TEXT NOT NULL DEFAULT 'referrer',
      status TEXT NOT NULL DEFAULT 'new',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS ClientOrder (
      id INTEGER PRIMARY KEY AUTOINCREMENT, leadId INTEGER, title TEXT NOT NULL,
      amount INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS Payment (
      id INTEGER PRIMARY KEY AUTOINCREMENT, orderId INTEGER NOT NULL, amount INTEGER NOT NULL,
      method TEXT NOT NULL DEFAULT 'upi', status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS LicenseKey (
      id INTEGER PRIMARY KEY AUTOINCREMENT, product TEXT NOT NULL, key TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active', maxActivations INTEGER NOT NULL DEFAULT 1,
      activations INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS ApiKey (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, prefix TEXT NOT NULL,
      hash TEXT NOT NULL UNIQUE, scopes TEXT NOT NULL DEFAULT 'leads:write',
      active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    const org = db.prepare("SELECT id FROM Org WHERE id = 1").get();
    if (!org) db.prepare("INSERT INTO Org (id, name) VALUES (1, 'CodeRender')").run();
    try { db.exec("ALTER TABLE Lead ADD COLUMN status TEXT NOT NULL DEFAULT 'new'"); } catch { /* exists */ }
    db.exec(`CREATE TABLE IF NOT EXISTS Post (
      id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL, excerpt TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '',
      published INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS Comment (
      id INTEGER PRIMARY KEY AUTOINCREMENT, postId INTEGER NOT NULL, name TEXT NOT NULL,
      body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS MediaAsset (
      id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL, mime TEXT NOT NULL DEFAULT '',
      size INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS FormDef (
      id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
      fields TEXT NOT NULL DEFAULT '[]', active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS Submission (
      id INTEGER PRIMARY KEY AUTOINCREMENT, formId INTEGER NOT NULL, data TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS ContentBlock (
      key TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '', published INTEGER NOT NULL DEFAULT 1)`);
    db.exec(`CREATE TABLE IF NOT EXISTS ChatThread (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL DEFAULT 'Chat',
      userId INTEGER,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    try { db.exec("ALTER TABLE ChatThread ADD COLUMN userId INTEGER"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE ChatThread ADD COLUMN state TEXT NOT NULL DEFAULT '{}'"); } catch { /* exists */ }
    db.exec(`CREATE TABLE IF NOT EXISTS ChatMessage (
      id INTEGER PRIMARY KEY AUTOINCREMENT, threadId INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'user', body TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS Eval (
      id INTEGER PRIMARY KEY AUTOINCREMENT, threadId INTEGER,
      score INTEGER NOT NULL DEFAULT 0, rubric TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS AiAudit (
      id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER,
      scope TEXT NOT NULL DEFAULT '', excerpt TEXT NOT NULL DEFAULT '',
      runtime TEXT NOT NULL DEFAULT 'none',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS ChatMemory USING fts5(threadId, role, body)`);
    db.exec(`CREATE TABLE IF NOT EXISTS Vote (
      id INTEGER PRIMARY KEY AUTOINCREMENT, threadId INTEGER NOT NULL,
      turnIdx INTEGER NOT NULL DEFAULT 0, vote TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS Appointment (
      id INTEGER PRIMARY KEY AUTOINCREMENT, threadId INTEGER, name TEXT NOT NULL DEFAULT '',
      contact TEXT NOT NULL DEFAULT '', mode TEXT NOT NULL DEFAULT 'meet',
      slot TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'proposed',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS Testimonial (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, business TEXT NOT NULL DEFAULT '',
      beforeTx TEXT NOT NULL DEFAULT '', afterTx TEXT NOT NULL DEFAULT '',
      published INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS OtpCode (
      email TEXT PRIMARY KEY, code TEXT NOT NULL, exp INTEGER NOT NULL)`);
    db.exec(`CREATE TABLE IF NOT EXISTS GatePass (
      email TEXT PRIMARY KEY, pinHash TEXT NOT NULL, digits INTEGER NOT NULL DEFAULT 6,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS Ticket (
      id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'open',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    try { db.exec("ALTER TABLE ChatThread ADD COLUMN fp TEXT"); } catch { /* exists */ }
    db.exec(`CREATE TABLE IF NOT EXISTS Idempotency (
      key TEXT PRIMARY KEY, response TEXT NOT NULL DEFAULT '{}', exp INTEGER NOT NULL)`);
    db.exec(`CREATE TABLE IF NOT EXISTS RateBan (
      key TEXT PRIMARY KEY, until INTEGER NOT NULL, level INTEGER NOT NULL DEFAULT 1)`);
    db.exec(`CREATE TABLE IF NOT EXISTS BotFlag (
      id INTEGER PRIMARY KEY AUTOINCREMENT, fp TEXT NOT NULL DEFAULT '', ip TEXT NOT NULL DEFAULT '',
      reason TEXT NOT NULL DEFAULT '', score INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  }
  return db;
}

export function remember(threadId: number, role: string, body: string) {
  try {
    getDb().prepare("INSERT INTO ChatMemory (threadId, role, body) VALUES (?,?,?)").run(threadId, role, body.slice(0, 2000));
  } catch { /* memory never breaks chat */ }
}

export function recall(threadId: number, query: string, limit = 3): string[] {
  try {
    const q = query.replace(/["*]/g, " ").split(/\s+/).filter((w) => w.length > 2).slice(0, 6).join(" ");
    if (!q.trim()) return [];
    const rows = getDb().prepare(
      "SELECT role, body FROM ChatMemory WHERE threadId=? AND ChatMemory MATCH ? ORDER BY rank LIMIT ?"
    ).all(threadId, q, limit) as { role: string; body: string }[];
    return rows.map((r) => `${r.role}: ${r.body.slice(0, 160)}`);
  } catch {
    return [];
  }
}

export function uid(bytes = 24): string {
  return randomBytes(bytes).toString("hex");
}

export function newLicenseKey(): string {
  const seg = () => randomBytes(3).toString("hex").toUpperCase();
  return `CR-${seg()}-${seg()}-${seg()}`;
}

export function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// ---- reads used by dashboard ----
export function totals() {
  const d = getDb();
  const q = (t: string, extra = "") =>
    (d.prepare(`SELECT COUNT(*) c FROM ${t} ${extra}`).get() as { c: number }).c;
  return {
    leads: q("Lead"),
    leadsToday: q("Lead", "WHERE date(createdAt) = date('now')"),
    eventsToday: q("Event", "WHERE date(createdAt) = date('now')"),
    subscribers: q("Subscriber", "WHERE active = 1"),
    orders: q("ClientOrder"),
    revenue: (d.prepare(`SELECT COALESCE(SUM(amount),0) s FROM Payment WHERE status='paid'`).get() as { s: number }).s,
  };
}

export function leadsPerDay(days = 14): { day: string; n: number }[] {
  const rows = getDb().prepare(
    `SELECT substr(createdAt,1,10) day, COUNT(*) n FROM Lead WHERE createdAt >= date('now', ?) GROUP BY day ORDER BY day`
  ).all(`-${days} days`) as { day: string; n: number }[];
  return rows;
}

export function topPages(limit = 8): { path: string; n: number }[] {
  return getDb().prepare(
    `SELECT path, COUNT(*) n FROM Event WHERE type='page_view' GROUP BY path ORDER BY n DESC LIMIT ?`
  ).all(limit) as { path: string; n: number }[];
}

export function recentLeads(limit = 10) {
  return getDb().prepare(`SELECT * FROM Lead ORDER BY id DESC LIMIT ?`).all(limit);
}

export function recentOrders(limit = 10) {
  return getDb().prepare(
    `SELECT o.*, COALESCE((SELECT SUM(amount) FROM Payment p WHERE p.orderId=o.id AND p.status='paid'),0) paid
     FROM ClientOrder o ORDER BY o.id DESC LIMIT ?`).all(limit);
}

export function upcomingMeetings(limit = 5) {
  return getDb().prepare(
    `SELECT * FROM Appointment WHERE status IN ('proposed','confirmed') ORDER BY id DESC LIMIT ?`).all(limit);
}

export function meetingCount(): number {
  return (getDb().prepare(
    `SELECT COUNT(*) c FROM Appointment WHERE status IN ('proposed','confirmed')`).get() as { c: number }).c;
}

export function evalAvg(last = 20): number {
  return (getDb().prepare(
    `SELECT COALESCE(AVG(score),0) a FROM Eval WHERE id > (SELECT COALESCE(MAX(id),0)-? FROM Eval)`).get(last) as { a: number }).a;
}

export function getPref(key: string, fallback = ""): string {
  const r = getDb().prepare("SELECT value FROM Preference WHERE key=?").get(key) as { value: string } | undefined;
  return r?.value ?? fallback;
}

export function setPref(key: string, value: string) {
  getDb().prepare("INSERT INTO Preference (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key, value);
}
