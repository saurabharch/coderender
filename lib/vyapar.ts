// Finance advance (planning/03): idempotent intents, UPI QR + payment links,
// collection reminders, chart of accounts + P&L, subscriptions, business
// loans, hero slider. All post into the ONE ledger — no parallel books.
import { getDb, uid } from "./store";
import { ledgerPost } from "./finance";

export function vyaparTables(): void {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS PayIntent (id INTEGER PRIMARY KEY AUTOINCREMENT, ikey TEXT NOT NULL UNIQUE, orderId INTEGER NOT NULL DEFAULT 0, billId INTEGER NOT NULL DEFAULT 0, amount INTEGER NOT NULL DEFAULT 0, method TEXT NOT NULL DEFAULT 'upi', status TEXT NOT NULL DEFAULT 'created', providerRef TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS PayLink (token TEXT PRIMARY KEY, billId INTEGER NOT NULL DEFAULT 0, orderId INTEGER NOT NULL DEFAULT 0, amount INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'open', hits INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS UpiQr (id INTEGER PRIMARY KEY AUTOINCREMENT, upiId TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL DEFAULT 0, label TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1)`);
  db.exec(`CREATE TABLE IF NOT EXISTS ReminderLog (id INTEGER PRIMARY KEY AUTOINCREMENT, billId INTEGER NOT NULL, channel TEXT NOT NULL DEFAULT '', at TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS LedgerAcct (code TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'ASSET')`);
  db.exec(`CREATE TABLE IF NOT EXISTS BizSub (id INTEGER PRIMARY KEY AUTOINCREMENT, plan TEXT NOT NULL, cycle TEXT NOT NULL DEFAULT 'monthly', status TEXT NOT NULL DEFAULT 'active', renewsAt TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS BizLoan (id INTEGER PRIMARY KEY AUTOINCREMENT, provider TEXT NOT NULL DEFAULT '', principal INTEGER NOT NULL DEFAULT 0, outstanding INTEGER NOT NULL DEFAULT 0, rateBps INTEGER NOT NULL DEFAULT 0, tenure INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS BizRepay (id INTEGER PRIMARY KEY AUTOINCREMENT, loanId INTEGER NOT NULL, amount INTEGER NOT NULL DEFAULT 0, at TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS HeroSlide (id INTEGER PRIMARY KEY AUTOINCREMENT, image TEXT NOT NULL DEFAULT '', title TEXT NOT NULL DEFAULT '', subtitle TEXT NOT NULL DEFAULT '', cta TEXT NOT NULL DEFAULT '', href TEXT NOT NULL DEFAULT '/', anim TEXT NOT NULL DEFAULT 'slide', ord INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1)`);
  const seed: [string, string, string][] = [
    ["cash", "Cash in hand", "ASSET"], ["upi", "UPI clearing", "ASSET"], ["bank", "Bank account", "ASSET"],
    ["receivable", "Accounts receivable", "ASSET"], ["payable", "Accounts payable", "LIABILITY"],
    ["revenue", "Sales revenue", "INCOME"], ["commission-expense", "Commission expense", "EXPENSE"],
    ["partner-payable", "Partner payouts due", "LIABILITY"], ["suspense", "Suspense", "ASSET"],
  ];
  const ins = db.prepare("INSERT INTO LedgerAcct (code, name, type) VALUES (?,?,?) ON CONFLICT(code) DO NOTHING");
  for (const [c, n, t] of seed) ins.run(c, n, t);
}

// ---- idempotent intents ----
export function createIntent(input: { orderId?: number; billId?: number; amount: number; method?: string; ikey: string }): { id: number; status: string } {
  vyaparTables();
  const db = getDb();
  const key = input.ikey.slice(0, 80);
  if (!key) throw new Error("idempotency key required");
  const ex = db.prepare("SELECT id, status FROM PayIntent WHERE ikey=?").get(key) as { id: number; status: string } | undefined;
  if (ex) return ex; // retry returns the same intent — never double-charges
  const method = ["upi", "cash", "card"].includes(input.method ?? "") ? input.method! : "upi";
  const id = Number(db.prepare("INSERT INTO PayIntent (ikey, orderId, billId, amount, method) VALUES (?,?,?,?,?)")
    .run(key, input.orderId ?? 0, input.billId ?? 0, Math.max(1, Math.round(input.amount)), method).lastInsertRowid);
  return { id, status: "created" };
}

export async function confirmIntent(id: number, providerRef = ""): Promise<{ paymentId: number }> {
  vyaparTables();
  const db = getDb();
  const it = db.prepare("SELECT * FROM PayIntent WHERE id=?").get(id) as
    { id: number; orderId: number; billId: number; amount: number; method: string; status: string } | undefined;
  if (!it) throw new Error("no intent");
  if (it.status === "paid") {
    const p = db.prepare("SELECT id FROM Payment WHERE orderId=? AND amount=? AND status='paid' ORDER BY id DESC LIMIT 1").get(it.orderId, it.amount) as { id: number } | undefined;
    return { paymentId: p?.id ?? 0 }; // already done — same answer
  }
  if (it.status !== "created") throw new Error(`intent ${it.status}`);
  const { recordPayment } = await import("./finance");
  const paymentId = it.orderId
    ? await recordPayment(it.orderId, it.amount, it.method, "paid")
    : await (async () => {
      // Bill payment without an order: direct ledger + bill flip.
      const r = db.prepare("INSERT INTO Payment (orderId, amount, method, status) VALUES (?,?,?,?)")
        .run(0, it.amount, it.method, "paid");
      const pid = Number(r.lastInsertRowid);
      ledgerPost({ kind: "payment", refId: pid, amount: it.amount, memo: `bill #${it.billId}` });
      if (it.billId) db.prepare("UPDATE BillDoc SET status='paid' WHERE id=?").run(it.billId);
      return pid;
    })();
  db.prepare("UPDATE PayIntent SET status='paid', providerRef=? WHERE id=?").run(providerRef.slice(0, 120), id);
  return { paymentId };
}

// ---- UPI QR + links ----
export function upiPayload(upiId: string, name: string, amount = 0): string {
  const q = new URLSearchParams({ pa: upiId, pn: name.slice(0, 60), cu: "INR" });
  if (amount > 0) q.set("am", (amount / 100).toFixed(2));
  return `upi://pay?${q}`;
}

export function listQrs() {
  vyaparTables();
  return getDb().prepare("SELECT * FROM UpiQr ORDER BY id").all();
}

export function saveQr(input: { id?: number; upiId: string; name?: string; amount?: number; label?: string; active?: boolean }): number {
  vyaparTables();
  if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}/.test(input.upiId)) throw new Error("bad UPI id");
  const db = getDb();
  if (input.id) {
    db.prepare("UPDATE UpiQr SET upiId=?, name=?, amount=?, label=?, active=? WHERE id=?")
      .run(input.upiId.slice(0, 60), (input.name ?? "").slice(0, 60), Math.max(0, Math.round(input.amount ?? 0)),
        (input.label ?? "").slice(0, 60), input.active === false ? 0 : 1, input.id);
    return input.id;
  }
  return Number(db.prepare("INSERT INTO UpiQr (upiId, name, amount, label) VALUES (?,?,?,?)")
    .run(input.upiId.slice(0, 60), (input.name ?? "").slice(0, 60), Math.max(0, Math.round(input.amount ?? 0)), (input.label ?? "").slice(0, 60)).lastInsertRowid);
}

export function createPayLink(input: { billId?: number; orderId?: number; amount: number }): { token: string } {
  vyaparTables();
  const token = `pl_${uid(12)}`;
  getDb().prepare("INSERT INTO PayLink (token, billId, orderId, amount) VALUES (?,?,?,?)")
    .run(token, input.billId ?? 0, input.orderId ?? 0, Math.max(1, Math.round(input.amount)));
  return { token };
}

export function getPayLink(token: string) {
  vyaparTables();
  const db = getDb();
  const l = db.prepare("SELECT * FROM PayLink WHERE token=?").get(String(token).slice(0, 40)) as
    { token: string; billId: number; orderId: number; amount: number; status: string; hits: number } | undefined;
  if (!l) return null;
  db.prepare("UPDATE PayLink SET hits = hits + 1 WHERE token=?").run(l.token);
  return l;
}

export function closePayLink(token: string): void {
  vyaparTables();
  getDb().prepare("UPDATE PayLink SET status='paid' WHERE token=?").run(String(token).slice(0, 40));
}

// ---- collection reminders (daily tick) ----
export async function reminderTick(daysOverdue = 7): Promise<number> {
  vyaparTables();
  const db = getDb();
  const due = db.prepare(`SELECT b.id, b.no, b.grand, b.customerId, c.phone, c.email, c.name FROM BillDoc b
    LEFT JOIN Customer c ON c.id=b.customerId
    WHERE b.status IN ('sent','overdue') AND date(b.createdAt) <= date('now', ?)
    AND b.id NOT IN (SELECT billId FROM ReminderLog WHERE date(at)=date('now'))`).all(`-${daysOverdue} days`) as
    { id: number; no: string; grand: number; customerId: number; phone: string; email: string; name: string }[];
  let n = 0;
  for (const b of due) {
    const text = `Reminder: ${b.no} for ₹${(b.grand / 100).toFixed(0)} is due. Pay via your payment link or UPI. — ${b.name || "CodeRender"}`;
    let via = "";
    try {
      if (b.phone) {
        const { sendWhatsApp } = await import("./providers");
        const r = await sendWhatsApp(b.phone, text);
        if (r.sent) via = "whatsapp";
      }
      if (!via && b.email) {
        const { sendMail } = await import("./mailer");
        await sendMail(b.email, `Payment reminder ${b.no}`, `<p>${text}</p>`);
        via = "email";
      }
      if (via) {
        db.prepare("INSERT INTO ReminderLog (billId, channel) VALUES (?,?)").run(b.id, via);
        db.prepare("INSERT INTO Notification (title, body, audience, kind, target) VALUES (?,?,?,?,?)")
          .run(`Reminder sent (${via})`, `${b.no} → ${b.phone || b.email}`, "team", "info", "team");
        n++;
      }
    } catch { /* next tick retries */ }
  }
  if (due.length) db.prepare("UPDATE BillDoc SET status='overdue' WHERE status='sent' AND date(createdAt) <= date('now','-7 days')").run();
  return n;
}

// Udhari due reminders: only balances past terms, one nudge per customer per
// cooldown window, logged in the shared ReminderLog (customerId leg).
export async function udhariReminderTick(cooldownDays = 7): Promise<number> {
  vyaparTables();
  const { ageStatus, udhariReminderText } = await import("./credit-core");
  const db = getDb();
  try {
    db.exec("ALTER TABLE ReminderLog ADD COLUMN customerId INTEGER NOT NULL DEFAULT 0");
  } catch { /* exists */ }
  const cool = Math.min(30, Math.max(1, Math.round(cooldownDays) || 7));
  const dues = db.prepare(`SELECT id, name, phone, email, balance, termsDays, balanceSince FROM Customer
    WHERE balance > 0 AND balanceSince != ''
    AND date(balanceSince) <= date('now', '-' || CAST(termsDays AS TEXT) || ' days')
    AND id NOT IN (SELECT customerId FROM ReminderLog WHERE customerId != 0 AND date(at) > date('now', ?) )`).all(`-${cool} days`) as
    { id: number; name: string; phone: string; email: string; balance: number; termsDays: number; balanceSince: string }[];
  let n = 0;
  for (const d of dues) {
    const st = ageStatus({ balance: d.balance, balanceSince: d.balanceSince, termsDays: d.termsDays });
    if (!st.overdue) continue;
    const text = udhariReminderText(d.name, d.balance, st.days - d.termsDays);
    let via = "";
    try {
      if (d.phone) {
        const { sendWhatsApp } = await import("./providers");
        const r = await sendWhatsApp(d.phone, text);
        if (r.sent) via = "whatsapp";
      }
      if (!via && d.email) {
        const { sendMail } = await import("./mailer");
        await sendMail(d.email, "Payment reminder — dues pending", `<p>${text}</p>`);
        via = "email";
      }
      if (via) {
        db.prepare("INSERT INTO ReminderLog (billId, customerId, channel) VALUES (?,?,?)").run(0, d.id, via);
        db.prepare("INSERT INTO Notification (title, body, audience, kind, target) VALUES (?,?,?,?,?)")
          .run(`Udhari reminder (${via})`, `${d.name} → ${d.phone || d.email}`, "team", "info", "team");
        n++;
      }
    } catch { /* next tick retries */ }
  }
  return n;
}

// ---- chart + P&L ----
export function chartOfAccounts() {
  vyaparTables();
  return getDb().prepare("SELECT * FROM LedgerAcct ORDER BY type, code").all();
}

export function profitLoss() {
  vyaparTables();
  const db = getDb();
  const sales = (db.prepare("SELECT COALESCE(SUM(amount),0) s FROM Payment WHERE status='paid'").get() as { s: number }).s;
  const exp = (db.prepare("SELECT COALESCE(SUM(amount),0) s FROM Expense WHERE status='paid'").get() as { s: number }).s;
  const wage = (db.prepare("SELECT COALESCE(SUM(net),0) s FROM PayrollLine l JOIN PayrollRun r ON r.id=l.runId WHERE r.status='paid'").get() as { s: number }).s;
  return { sales, expenses: exp, wages: wage, profit: sales - exp - wage };
}

// ---- subscriptions ----
export function listSubs() {
  vyaparTables();
  return getDb().prepare("SELECT * FROM BizSub ORDER BY id DESC LIMIT 50").all();
}

export function joinSub(plan: string, cycle = "monthly"): number {
  vyaparTables();
  const months = cycle === "yearly" ? 12 : 1;
  const renews = new Date(Date.now() + months * 30 * 86400_000).toISOString().slice(0, 10);
  return Number(getDb().prepare("INSERT INTO BizSub (plan, cycle, renewsAt) VALUES (?,?,?)")
    .run(plan.slice(0, 60), months === 12 ? "yearly" : "monthly", renews).lastInsertRowid);
}

export function renewSub(id: number): void {
  vyaparTables();
  const db = getDb();
  const s = db.prepare("SELECT cycle, status FROM BizSub WHERE id=?").get(id) as { cycle: string; status: string } | undefined;
  if (!s || s.status === "cancelled") throw new Error("cannot renew");
  const months = s.cycle === "yearly" ? 12 : 1;
  db.prepare("UPDATE BizSub SET renewsAt=? WHERE id=?")
    .run(new Date(Date.now() + months * 30 * 86400_000).toISOString().slice(0, 10), id);
}

export function cancelSub(id: number): void {
  vyaparTables();
  getDb().prepare("UPDATE BizSub SET status='cancelled' WHERE id=?").run(id);
}

// ---- business loans ----
export function listLoans() {
  vyaparTables();
  return getDb().prepare("SELECT * FROM BizLoan ORDER BY id DESC LIMIT 50").all();
}

export function takeLoan(input: { provider?: string; principal: number; rateBps?: number; tenure?: number }): number {
  vyaparTables();
  if (input.principal <= 0) throw new Error("bad principal");
  return Number(getDb().prepare("INSERT INTO BizLoan (provider, principal, outstanding, rateBps, tenure) VALUES (?,?,?,?,?)")
    .run((input.provider ?? "").slice(0, 80), Math.round(input.principal), Math.round(input.principal),
      Math.max(0, Math.round(input.rateBps ?? 0)), Math.max(0, Math.round(input.tenure ?? 0))).lastInsertRowid);
}

export function repayLoan(id: number, amount: number): { left: number } {
  vyaparTables();
  const db = getDb();
  const l = db.prepare("SELECT outstanding, status FROM BizLoan WHERE id=?").get(id) as
    { outstanding: number; status: string } | undefined;
  if (!l || l.status !== "active") throw new Error("loan not active");
  const take = Math.min(Math.max(1, Math.round(amount)), l.outstanding);
  db.prepare("INSERT INTO BizRepay (loanId, amount) VALUES (?,?)").run(id, take);
  const left = l.outstanding - take;
  db.prepare("UPDATE BizLoan SET outstanding=?, status=? WHERE id=?").run(left, left <= 0 ? "closed" : "active", id);
  return { left };
}

// ---- hero slider ----
export type HeroAnim = "slide" | "fade" | "zoom";

export function listSlides(activeOnly = false) {
  vyaparTables();
  return getDb().prepare(`SELECT * FROM HeroSlide ${activeOnly ? "WHERE active=1" : ""} ORDER BY ord, id`).all();
}

export function saveSlide(input: { id?: number; image?: string; title?: string; subtitle?: string; cta?: string; href?: string; anim?: string; ord?: number; active?: boolean }): number {
  vyaparTables();
  const anim = (["slide", "fade", "zoom"] as const).includes(input.anim as HeroAnim) ? input.anim! : "slide";
  const db = getDb();
  if (input.id) {
    db.prepare("UPDATE HeroSlide SET image=?, title=?, subtitle=?, cta=?, href=?, anim=?, ord=?, active=? WHERE id=?")
      .run((input.image ?? "").slice(0, 300), (input.title ?? "").slice(0, 120), (input.subtitle ?? "").slice(0, 200),
        (input.cta ?? "").slice(0, 40), (input.href ?? "/").slice(0, 200), anim,
        Math.round(input.ord ?? 0), input.active === false ? 0 : 1, input.id);
    return input.id;
  }
  return Number(db.prepare("INSERT INTO HeroSlide (image, title, subtitle, cta, href, anim, ord) VALUES (?,?,?,?,?,?,?)")
    .run((input.image ?? "").slice(0, 300), (input.title ?? "").slice(0, 120), (input.subtitle ?? "").slice(0, 200),
      (input.cta ?? "").slice(0, 40), (input.href ?? "/").slice(0, 200), anim, Math.round(input.ord ?? 0)).lastInsertRowid);
}

export function deleteSlide(id: number): void {
  vyaparTables();
  getDb().prepare("UPDATE HeroSlide SET active=0 WHERE id=?").run(id);
}
