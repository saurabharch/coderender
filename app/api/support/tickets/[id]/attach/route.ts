import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/store";
import { sessionUser } from "@/lib/auth";
import { ALLOWED_MIME, MAX_BYTES } from "@/lib/media-core";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticketId = Number(id);
  const t = getDb().prepare("SELECT id FROM Ticket WHERE id=?").get(ticketId);
  if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });
  const user = await sessionUser().catch(() => null);
  // Owner proof for anonymous filers: matching email field.
  if (!user) {
    // multipart parse happens below; pre-check via cloned request
    const probe = await req.clone().formData().catch(() => null);
    const email = String(probe?.get("email") ?? "");
    const row = getDb().prepare("SELECT email FROM Ticket WHERE id=?").get(ticketId) as { email: string } | undefined;
    if (!row || row.email !== email || email.length < 4)
      return NextResponse.json({ error: "email must match the ticket" }, { status: 403 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file") as File | null;
  if (!file || !ALLOWED_MIME.includes(file.type) || file.size > MAX_BYTES || file.size === 0)
    return NextResponse.json({ error: "png/jpg/webp/gif/svg up to 2MB" }, { status: 422 });
  const ext = (file.name.split(".").pop() || "bin").slice(0, 8).replace(/[^a-z0-9]/gi, "");
  const filename = `t${ticketId}-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const dir = join(process.cwd(), "public", "uploads", "tickets");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()));
  const r = getDb().prepare("INSERT INTO TicketAttachment (ticketId, filename, mime, size) VALUES (?,?,?,?)").run(
    ticketId, filename, file.type, file.size);
  const attachmentId = Number(r.lastInsertRowid);
  getDb().prepare("INSERT INTO TicketEvent (ticketId, actor, kind, body) VALUES (?,?,?,?)").run(
    ticketId, user?.email ?? "owner", "attach", `Uploaded ${file.name} — queued for safety scan`);
  // Quarantined until the background scan clears it.
  try {
    if (process.env.INNGEST_EVENT_KEY) {
      const { inngest } = await import("@/lib/jobs");
      await inngest.send({ name: "app/scan.ticketfile", data: { attachmentId } });
    } else {
      const { runLocal } = await import("@/lib/jobs");
      await runLocal("scanTicketFile", { attachmentId });
    }
  } catch { /* scan retries via ops tick */ }
  return NextResponse.json({ ok: true, id: attachmentId, queued: true });
}
