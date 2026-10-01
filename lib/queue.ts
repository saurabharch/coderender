import { getDb } from "./store";
import { MAX_ATTEMPTS, backoffMs, isJobKind, type JobKind } from "./queue-core";

export interface Job {
  id: number; kind: string; payload: string; status: string;
  attempts: number; runAfter: string; error: string; createdAt: string;
}

export function enqueue(kind: string, payload: Record<string, unknown> = {}, delayMs = 0): number {
  if (!isJobKind(kind)) throw new Error("bad kind");
  const runAfter = new Date(Date.now() + delayMs).toISOString().slice(0, 19).replace("T", " ");
  const r = getDb().prepare("INSERT INTO Job (kind, payload, runAfter) VALUES (?,?,?)").run(
    kind, JSON.stringify(payload).slice(0, 8000), runAfter);
  return Number(r.lastInsertRowid);
}

export function queueDepth(): Record<string, number> {
  const rows = getDb().prepare("SELECT status, COUNT(*) c FROM Job GROUP BY status").all() as { status: string; c: number }[];
  return Object.fromEntries(rows.map((r) => [r.status, r.c]));
}

export function listJobs(status?: string, limit = 50): Job[] {
  const d = getDb();
  const rows = (status
    ? d.prepare("SELECT * FROM Job WHERE status=? ORDER BY id DESC LIMIT ?").all(status, limit)
    : d.prepare("SELECT * FROM Job ORDER BY id DESC LIMIT ?").all(limit)) as unknown as Job[];
  return rows;
}

async function handle(job: Job): Promise<string> {
  const payload = JSON.parse(job.payload || "{}") as Record<string, unknown>;
  if (job.kind === "gcal.push") {
    const { pushTask } = await import("./gcal");
    const { designationOf } = await import("./kanban");
    const boardId = Number(payload.boardId || 0);
    const email = String(payload.email || "");
    const { getBoard } = await import("./kanban");
    const { taskDay } = await import("./calendar-core");
    const board = getBoard(boardId);
    if (!board) throw new Error("no board");
    let n = 0;
    for (const t of board.tasks.filter((x) => !x.archived)) {
      const day = taskDay({ dueAt: t.dueAt, doneAt: t.doneAt, createdAt: t.createdAt });
      await pushTask(email, {
        id: t.id, title: t.title, body: t.body.slice(0, 500), day,
        assigneeEmail: t.assigneeEmail, designation: designationOf(t.assigneeEmail), done: !!t.doneAt,
      });
      n++;
    }
    return `pushed ${n}`;
  }
  if (job.kind === "gcal.pull") {
    const { pullDay } = await import("./gcal");
    const events = await pullDay(String(payload.email || ""), String(payload.day || ""));
    return `pulled ${events.length}`;
  }
  if (job.kind === "agent.call") {
    const { runAgentOp } = await import("./agent-ops");
    await runAgentOp(String(payload.op || ""), (payload.params ?? {}) as Record<string, unknown>, String(payload.keyName || "queue"));
    return "agent ok";
  }
  if (job.kind === "notify") {
    getDb().prepare("INSERT INTO Notification (title, body, audience) VALUES (?,?,?)").run(
      String(payload.title || "Queued note").slice(0, 160), String(payload.body || "").slice(0, 1000), "team");
    return "notified";
  }
  throw new Error("unknown kind");
}

// Claim one due job atomically (single pm2 fork: UPDATE-first wins).
export async function runQueueTick(limit = 5): Promise<{ ran: number; results: string[] }> {
  const results: string[] = [];
  let ran = 0;
  for (let i = 0; i < limit; i++) {
    const job = getDb().prepare(
      "SELECT * FROM Job WHERE status='queued' AND runAfter <= datetime('now') ORDER BY id LIMIT 1").get() as unknown as Job | undefined;
    if (!job) break;
    const claimed = getDb().prepare("UPDATE Job SET status='running', attempts=attempts+1 WHERE id=? AND status='queued'").run(job.id);
    if (!claimed.changes) continue;
    ran++;
    try {
      const summary = await handle({ ...job, attempts: job.attempts + 1 });
      getDb().prepare("UPDATE Job SET status='done', error='' WHERE id=?").run(job.id);
      results.push(`#${job.id} ${job.kind}: ${summary}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "failed";
      const attempts = job.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        getDb().prepare("UPDATE Job SET status='dead', error=? WHERE id=?").run(msg.slice(0, 500), job.id);
        results.push(`#${job.id} ${job.kind}: DEAD ${msg.slice(0, 80)}`);
      } else {
        const runAfter = new Date(Date.now() + backoffMs(attempts)).toISOString().slice(0, 19).replace("T", " ");
        getDb().prepare("UPDATE Job SET status='queued', error=?, runAfter=? WHERE id=?").run(msg.slice(0, 500), runAfter, job.id);
        results.push(`#${job.id} ${job.kind}: retry ${attempts} (${msg.slice(0, 80)})`);
      }
    }
  }
  return { ran, results };
}

export function retryJob(id: number): void {
  getDb().prepare("UPDATE Job SET status='queued', error='', runAfter=datetime('now') WHERE id=? AND status='dead'").run(id);
}

export function purgeJobs(status: "done" | "dead"): number {
  const r = getDb().prepare("DELETE FROM Job WHERE status=?").run(status);
  return Number(r.changes);
}
