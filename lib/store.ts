import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { randomBytes, createHash } from "node:crypto";
import { embed, cosine, parseVec } from "./vectors";
import { SERVICES } from "./services";

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
      resourceType TEXT NOT NULL DEFAULT '', resourceId TEXT NOT NULL DEFAULT '',
      parentId INTEGER, authorEmail TEXT NOT NULL DEFAULT '', likes INTEGER NOT NULL DEFAULT 0,
      editedAt TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    try { db.exec("ALTER TABLE Comment ADD COLUMN resourceType TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE Comment ADD COLUMN resourceId TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE Comment ADD COLUMN parentId INTEGER"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE Comment ADD COLUMN authorEmail TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE Comment ADD COLUMN likes INTEGER NOT NULL DEFAULT 0"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE Comment ADD COLUMN editedAt TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    db.exec(`CREATE TABLE IF NOT EXISTS CommentLike (
      commentId INTEGER NOT NULL, key TEXT NOT NULL, UNIQUE(commentId, key))`);
    db.exec(`CREATE TABLE IF NOT EXISTS KanbanTodo (
      id INTEGER PRIMARY KEY AUTOINCREMENT, taskId INTEGER NOT NULL,
      label TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, ord INTEGER NOT NULL DEFAULT 0,
      note TEXT NOT NULL DEFAULT '')`);
    try { db.exec("ALTER TABLE KanbanTodo ADD COLUMN note TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    db.exec(`CREATE TABLE IF NOT EXISTS BoardMember (
      boardId INTEGER NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(boardId, email))`);
    db.exec(`CREATE TABLE IF NOT EXISTS TeamTodo (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open', assigneeEmail TEXT NOT NULL DEFAULT '',
      ord INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    // Backfill: blog comments get resource identity so old threads keep working.
    try {
      db.exec(`UPDATE Comment SET resourceType='blog-post', resourceId=(SELECT slug FROM Post WHERE Post.id=Comment.postId)
        WHERE resourceType='' AND postId > 0`);
    } catch { /* posts may not exist yet */ }    db.exec(`CREATE TABLE IF NOT EXISTS MediaAsset (
      id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL, mime TEXT NOT NULL DEFAULT '',
      size INTEGER NOT NULL DEFAULT 0, folder TEXT NOT NULL DEFAULT '',
      alt TEXT NOT NULL DEFAULT '', url TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    try { db.exec("ALTER TABLE MediaAsset ADD COLUMN folder TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE MediaAsset ADD COLUMN alt TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE MediaAsset ADD COLUMN url TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    db.exec(`CREATE TABLE IF NOT EXISTS MediaFolder (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, parentId INTEGER,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    try { db.exec("ALTER TABLE Post ADD COLUMN cover TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE KanbanTask ADD COLUMN attachments TEXT NOT NULL DEFAULT '[]'"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE KanbanTask ADD COLUMN startAt TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE KanbanTask ADD COLUMN dueAt TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE AppUser ADD COLUMN designation TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    db.exec(`CREATE TABLE IF NOT EXISTS GcalToken (
      email TEXT PRIMARY KEY, refreshToken TEXT NOT NULL DEFAULT '', calendarId TEXT NOT NULL DEFAULT 'primary',
      syncOn INTEGER NOT NULL DEFAULT 1, updatedAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS GcalEvent (
      taskId INTEGER PRIMARY KEY, gEventId TEXT NOT NULL DEFAULT '', day TEXT NOT NULL DEFAULT '',
      updated TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS Job (
      id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, payload TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'queued', attempts INTEGER NOT NULL DEFAULT 0,
      runAfter TEXT NOT NULL DEFAULT (datetime('now')), error TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS FormDef (
      id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
      fields TEXT NOT NULL DEFAULT '[]', active INTEGER NOT NULL DEFAULT 1,
      schema TEXT NOT NULL DEFAULT '', successMessage TEXT NOT NULL DEFAULT '',
      redirectUrl TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active',
      createdBy TEXT NOT NULL DEFAULT '', captcha TEXT NOT NULL DEFAULT 'off',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    try { db.exec("ALTER TABLE FormDef ADD COLUMN schema TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE FormDef ADD COLUMN successMessage TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE FormDef ADD COLUMN redirectUrl TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE FormDef ADD COLUMN status TEXT NOT NULL DEFAULT 'active'"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE FormDef ADD COLUMN createdBy TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE FormDef ADD COLUMN captcha TEXT NOT NULL DEFAULT 'off'"); } catch { /* exists */ }
    db.exec(`CREATE TABLE IF NOT EXISTS Submission (
      id INTEGER PRIMARY KEY AUTOINCREMENT, formId INTEGER NOT NULL, data TEXT NOT NULL DEFAULT '{}',
      ipAddress TEXT NOT NULL DEFAULT '', userAgent TEXT NOT NULL DEFAULT '', submittedBy TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    try { db.exec("ALTER TABLE Submission ADD COLUMN ipAddress TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE Submission ADD COLUMN userAgent TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE Submission ADD COLUMN submittedBy TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    db.exec(`CREATE TABLE IF NOT EXISTS KanbanBoard (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '', formId INTEGER, ownerEmail TEXT NOT NULL DEFAULT '',
      clientLeadId INTEGER,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    try { db.exec("ALTER TABLE KanbanBoard ADD COLUMN clientLeadId INTEGER"); } catch { /* exists */ }    db.exec(`CREATE TABLE IF NOT EXISTS KanbanColumn (
      id INTEGER PRIMARY KEY AUTOINCREMENT, boardId INTEGER NOT NULL,
      name TEXT NOT NULL, ord INTEGER NOT NULL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS KanbanTask (
      id INTEGER PRIMARY KEY AUTOINCREMENT, boardId INTEGER NOT NULL, columnId INTEGER NOT NULL,
      title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'medium', assigneeEmail TEXT NOT NULL DEFAULT '',
      ord INTEGER NOT NULL DEFAULT 0, submissionId INTEGER,
      archived INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')), doneAt TEXT NOT NULL DEFAULT '')`);    db.exec(`CREATE TABLE IF NOT EXISTS ContentBlock (
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
    db.exec(`CREATE TABLE IF NOT EXISTS ChatVec (
      id INTEGER PRIMARY KEY AUTOINCREMENT, threadId INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '', vec TEXT NOT NULL DEFAULT '')`);
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
      reason TEXT NOT NULL DEFAULT '', score INTEGER NOT NULL DEFAULT 0, locale TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    try { db.exec("ALTER TABLE BotFlag ADD COLUMN locale TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    db.exec(`CREATE TABLE IF NOT EXISTS PushSubscription (
      id INTEGER PRIMARY KEY AUTOINCREMENT, endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL DEFAULT '', auth TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS ServicePackage (
      id INTEGER PRIMARY KEY AUTOINCREMENT, serviceSlug TEXT NOT NULL,
      name TEXT NOT NULL, price INTEGER NOT NULL DEFAULT 0, per TEXT NOT NULL DEFAULT 'one-time',
      timeline TEXT NOT NULL DEFAULT '', includes TEXT NOT NULL DEFAULT '[]',
      bestFor TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    seedPackages(db);
    db.exec(`CREATE TABLE IF NOT EXISTS Service (
      id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
      tagline TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT 'growth',
      description TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS PackageService (
      packageId INTEGER NOT NULL, serviceId INTEGER NOT NULL, UNIQUE(packageId, serviceId))`);
    try { db.exec("ALTER TABLE ServicePackage ADD COLUMN notes TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE ServicePackage ADD COLUMN details TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
    seedServices(db);
    db.exec(`CREATE TABLE IF NOT EXISTS Distill (
      id INTEGER PRIMARY KEY AUTOINCREMENT, input TEXT NOT NULL,
      better TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'nightly',
      score INTEGER NOT NULL DEFAULT 0, uses INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS PageBlock (
      id INTEGER PRIMARY KEY AUTOINCREMENT, pageSlug TEXT NOT NULL,
      ord INTEGER NOT NULL DEFAULT 0, type TEXT NOT NULL DEFAULT 'text',
      title TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '',
      props TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
    try { db.exec("ALTER TABLE PageBlock ADD COLUMN props TEXT NOT NULL DEFAULT '{}'"); } catch { /* exists */ }
    db.exec(`CREATE TABLE IF NOT EXISTS PageVar (
      pageSlug TEXT NOT NULL, name TEXT NOT NULL, value TEXT NOT NULL DEFAULT '',
      UNIQUE(pageSlug, name))`);    db.exec(`CREATE TABLE IF NOT EXISTS CmsItem (
      id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL,
      slug TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}', published INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  }
  return db;
}

export function remember(threadId: number, role: string, body: string) {
  try {
    getDb().prepare("INSERT INTO ChatMemory (threadId, role, body) VALUES (?,?,?)").run(threadId, role, body.slice(0, 2000));
  } catch { /* memory never breaks chat */ }
  try {
    getDb().prepare("INSERT INTO ChatVec (threadId, role, body, vec) VALUES (?,?,?,?)")
      .run(threadId, role, body.slice(0, 2000), JSON.stringify(embed(body)));
  } catch { /* vectors never break chat either */ }
}

export function recall(threadId: number, query: string, limit = 3): string[] {
  const out: string[] = [];
  try {
    const q = embed(query);
    const rows = getDb().prepare("SELECT role, body, vec FROM ChatVec WHERE threadId=? ORDER BY id DESC LIMIT 40").all(threadId) as
      { role: string; body: string; vec: string }[];
    const scored = rows
      .map((r) => ({ r, s: parseVec(r.vec) ? cosine(q, parseVec(r.vec)!) : -1 }))
      .filter((x) => x.s > 0.12)
      .sort((a, b) => b.s - a.s)
      .slice(0, limit);
    for (const x of scored) out.push(`${x.r.role}: ${x.r.body.slice(0, 160)}`);
  } catch { /* fall through to FTS */ }
  if (out.length > 0) return out;
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

export interface PackageRow {
  id: number;
  serviceSlug: string;
  name: string;
  price: number;
  per: string;
  timeline: string;
  includes: string[];
  bestFor: string;
}

const SEED_PACKAGES: [string, string, number, string, string, string[], string][] = [
  ["google-business-profile", "Profile Tune-up Sprint", 4999, "one-time", "1 week",
    ["Categories, hours, services + photo refresh", "Keyword map for Maps + Search", "Review reply catch-up (last 90 days)"], "rank leaks"],
  ["google-business-profile", "Maps Dominance Monthly", 11999, "/mo", "ongoing",
    ["Weekly SEO posts", "Every review answered in 48h", "Monthly rank + calls report"], "staying #1"],
  ["website-development", "Launch Site", 29999, "one-time", "3–4 weeks",
    ["Mobile-first custom design", "Call/WhatsApp CTAs every screen", "Local SEO basics + speed"], "new presence"],
  ["website-development", "Scale Site", 49999, "one-time", "5–6 weeks",
    ["Everything in Launch", "Blog + service templates", "Analytics + quarterly tune"], "growing brands"],
  ["local-seo", "Local Cleanup", 9999, "one-time", "month 1",
    ["NAP + citation cleanup", "Hyper-local keyword map", "Directory submissions"], "inconsistent listings"],
  ["local-seo", "Local Rank Retainer", 11999, "/mo", "ongoing",
    ["Monthly citations + links", "Quarterly content refresh", "Rank tracking"], "compounding rank"],
  ["seo-marketing", "Content Engine", 14999, "/mo", "ongoing",
    ["4 answer-first articles/mo", "Technical audit + fixes", "Traffic + leads dashboard"], "organic growth"],
  ["seo-marketing", "Authority", 24999, "/mo", "ongoing",
    ["8 articles/mo", "Outreach link-building", "Quarterly strategy"], "competitive niches"],
  ["lead-generation", "Funnel Sprint", 19999, "one-time", "2–3 weeks",
    ["Offer + landing page", "WhatsApp-first capture", "CRM handoff"], "first pipeline"],
  ["lead-generation", "Managed Pipeline", 19999, "/mo + spend", "ongoing",
    ["Meta + Google management", "Weekly creative refresh", "Honest cost-per-lead reporting"], "steady flow"],
  ["chat-automation", "WhatsApp Flows", 14999, "one-time", "2 weeks",
    ["Business API setup + templates", "Flows trained on your tone", "Lead qualification"], "instant replies"],
  ["chat-automation", "Always-on Care", 7999, "/mo", "ongoing",
    ["Monthly flow training", "Broadcasts to past buyers", "Fallback to human"], "never missing out"],
];

function seedPackages(db: DatabaseSync) {
  try {
    const n = (db.prepare("SELECT COUNT(*) c FROM ServicePackage").get() as { c: number }).c;
    if (n > 0) return;
    for (const [slug, name, price, per, timeline, includes, bestFor] of SEED_PACKAGES) {
      db.prepare("INSERT INTO ServicePackage (serviceSlug, name, price, per, timeline, includes, bestFor) VALUES (?,?,?,?,?,?,?)")
        .run(slug, name, price as number, per, timeline, JSON.stringify(includes), bestFor);
    }
  } catch { /* seeding never breaks boot */ }
}

function seedServices(db: DatabaseSync) {
  const CAT: Record<string, string> = {
    "google-business-profile": "visibility", "website-development": "presence",
    "local-seo": "visibility", "seo-marketing": "growth",
    "lead-generation": "pipeline", "chat-automation": "care",
  };
  try {
    const n = (db.prepare("SELECT COUNT(*) c FROM Service").get() as { c: number }).c;
    if (n > 0) return;
    for (const s of SERVICES) {
      db.prepare("INSERT INTO Service (slug, title, tagline, category, description) VALUES (?,?,?,?,?)").run(
        s.slug, s.title, s.tagline, CAT[s.slug] ?? "growth",
        [...s.includes, ...s.excludes.map((x) => `(not) ${x}`)].join("\n").slice(0, 2000));
    }
  } catch { /* seeding never breaks boot */ }
}

export function listPackages(serviceSlug: string): PackageRow[] {
  return getDb().prepare("SELECT * FROM ServicePackage WHERE serviceSlug=? AND active=1 ORDER BY price").all(serviceSlug).map((r) => {
    const row = r as Omit<PackageRow, "includes"> & { includes: string };
    let includes: string[] = [];
    try { includes = JSON.parse(row.includes); } catch { /* keep empty */ }
    return { ...row, includes };
  });
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
