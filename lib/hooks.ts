import { randomBytes } from "node:crypto";
import { getDb } from "./store";
import { signPayload } from "./hooks-core";

export { signPayload, verifySignature } from "./hooks-core";

// Svix-like delivery core, native: endpoint registry + per-endpoint secrets,
// HMAC-signed sends with timestamp, idempotency keys, retry scheduler with
// backoff, replay, per-endpoint rate limits, full delivery logs.

export interface HookEndpoint {
  id: number; name: string; url: string; secret: string;
  events: string[]; active: number; ratePerMin: number;
}

export function listEndpoints(): HookEndpoint[] {
  return (getDb().prepare("SELECT * FROM HookEndpoint ORDER BY id DESC LIMIT 100").all() as
    { id: number; name: string; url: string; secret: string; events: string; active: number; ratePerMin: number }[])
    .map((r) => {
      let events: string[] = [];
      try { events = JSON.parse(r.events || "[]"); } catch { /* keep empty */ }
      return { ...r, events };
    });
}

export function createEndpoint(input: { name: string; url: string; events?: string[]; ratePerMin?: number }): { id: number; secret: string } {
  const name = String(input.name ?? "").slice(0, 80);
  const url = String(input.url ?? "").slice(0, 500);
  if (!name.trim() || !/^https?:\/\//.test(url)) throw new Error("name + http(s) url required");
  const secret = `whsec_${randomBytes(16).toString("hex")}`;
  const r = getDb().prepare("INSERT INTO HookEndpoint (name, url, secret, events, ratePerMin) VALUES (?,?,?,?,?)").run(
    name, url, secret, JSON.stringify((input.events ?? []).slice(0, 20)),
    Math.min(Math.max(Number(input.ratePerMin ?? 30), 1), 600));
  return { id: Number(r.lastInsertRowid), secret };
}

export function rotateSecret(id: number): string {
  const secret = `whsec_${randomBytes(16).toString("hex")}`;
  getDb().prepare("UPDATE HookEndpoint SET secret=? WHERE id=?").run(secret, id);
  return secret;
}

export function deleteEndpoint(id: number): void {
  getDb().prepare("DELETE FROM HookDelivery WHERE endpointId=?").run(id);
  getDb().prepare("DELETE FROM HookEndpoint WHERE id=?").run(id);
}

// Fan out one event to every active subscribed endpoint (dedupe by idemKey).
export function emitHook(event: string, payload: Record<string, unknown> = {}, idemKey?: string): number {
  const key = (idemKey || `${event}-${Date.now()}-${randomBytes(4).toString("hex")}`).slice(0, 120);
  let n = 0;
  for (const e of listEndpoints().filter((x) => x.active && (x.events.length === 0 || x.events.includes(event)))) {
    const dup = getDb().prepare("SELECT id FROM HookDelivery WHERE endpointId=? AND idemKey=?").get(e.id, key);
    if (dup) continue;
    getDb().prepare("INSERT INTO HookDelivery (endpointId, event, payload, idemKey) VALUES (?,?,?,?)").run(
      e.id, event, JSON.stringify(payload).slice(0, 8000), key);
    n++;
  }
  return n;
}

async function attempt(deliveryId: number): Promise<void> {
  const d = getDb();
  const row = d.prepare(
    `SELECT dl.*, e.url, e.secret, e.ratePerMin FROM HookDelivery dl
     JOIN HookEndpoint e ON e.id=dl.endpointId WHERE dl.id=?`).get(deliveryId) as
    { id: number; event: string; payload: string; idemKey: string; attempts: number; url: string; secret: string; ratePerMin: number } | undefined;
  if (!row) return;
  const recent = (d.prepare(
    "SELECT COUNT(*) c FROM HookDelivery WHERE endpointId=(SELECT endpointId FROM HookDelivery WHERE id=?) AND createdAt > datetime('now','-1 minute')"
  ).get(deliveryId) as { c: number }).c;
  const ep = d.prepare("SELECT ratePerMin FROM HookEndpoint WHERE id=(SELECT endpointId FROM HookDelivery WHERE id=?)").get(deliveryId) as { ratePerMin: number };
  if (recent > Math.max(1, ep.ratePerMin)) {
    d.prepare("UPDATE HookDelivery SET runAfter=datetime('now','+1 minute') WHERE id=?").run(deliveryId);
    return;
  }
  const ts = Date.now();
  const sig = signPayload(row.secret, row.idemKey, ts, row.payload);
  d.prepare("UPDATE HookDelivery SET attempts=attempts+1 WHERE id=?").run(deliveryId);
  try {
    const res = await fetch(row.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "cr-event": row.event, "cr-idem-key": row.idemKey,
        "cr-timestamp": String(ts), "cr-signature": sig,
      },
      body: row.payload,
      signal: AbortSignal.timeout(15000),
    });
    const ok = res.status >= 200 && res.status < 300;
    if (ok) {
      d.prepare("UPDATE HookDelivery SET status='delivered', code=?, error='' WHERE id=?").run(res.status, deliveryId);
    } else {
      throw new Error(`http ${res.status}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    const at = (d.prepare("SELECT attempts FROM HookDelivery WHERE id=?").get(deliveryId) as { attempts: number }).attempts;
    if (at >= 8) {
      d.prepare("UPDATE HookDelivery SET status='dead', error=? WHERE id=?").run(msg.slice(0, 300), deliveryId);
    } else {
      const mins = [1, 5, 15, 60, 240, 720, 1440, 1440][Math.min(at, 7)];
      d.prepare("UPDATE HookDelivery SET status='retry', code=0, error=?, runAfter=datetime('now', ?) WHERE id=?")
        .run(msg.slice(0, 300), `+${mins} minutes`, deliveryId);
    }
  }
}

// Worker tick: due queued/retry deliveries (called by scheduler + manually).
export async function runHookTick(limit = 10): Promise<number> {
  const rows = getDb().prepare(
    "SELECT id FROM HookDelivery WHERE status IN ('queued','retry') AND runAfter <= datetime('now') ORDER BY id LIMIT ?").all(limit) as { id: number }[];
  for (const r of rows) {
    await attempt(r.id).catch(() => {});
  }
  return rows.length;
}

export function replayDelivery(id: number): void {
  getDb().prepare("UPDATE HookDelivery SET status='queued', attempts=0, error='', runAfter=datetime('now') WHERE id=?").run(id);
}

export function deliveryLog(endpointId?: number, limit = 50) {
  const d = getDb();
  const rows = (endpointId
    ? d.prepare("SELECT * FROM HookDelivery WHERE endpointId=? ORDER BY id DESC LIMIT ?").all(endpointId, limit)
    : d.prepare("SELECT * FROM HookDelivery ORDER BY id DESC LIMIT ?").all(limit)) as unknown as
    { id: number; endpointId: number; event: string; status: string; attempts: number; code: number; error: string; createdAt: string }[];
  return rows;
}
