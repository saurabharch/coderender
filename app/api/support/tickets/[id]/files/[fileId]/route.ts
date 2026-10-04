import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getDb } from "@/lib/store";
import { sessionUser } from "@/lib/auth";

// Only scanned-clean files are ever served. Pending/infected stay hidden.
export async function GET(req: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const { id, fileId } = await params;
  const row = getDb().prepare("SELECT * FROM TicketAttachment WHERE id=? AND ticketId=?").get(Number(fileId), Number(id)) as
    { filename: string; mime: string; status: string } | undefined;
  if (!row || row.status !== "clean")
    return NextResponse.json({ error: "not available" }, { status: 404 });
  const user = await sessionUser().catch(() => null);
  if (!user) {
    const email = new URL(req.url).searchParams.get("email") || "";
    const t = getDb().prepare("SELECT email FROM Ticket WHERE id=?").get(Number(id)) as { email: string } | undefined;
    if (!t || t.email !== email || email.length < 4)
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const buf = await readFile(join(process.cwd(), "public", "uploads", "tickets", row.filename));
    const bytes = new Uint8Array(buf);
    return new Response(bytes, { headers: { "Content-Type": row.mime, "Cache-Control": "private, max-age=3600" } });
  } catch {
    return NextResponse.json({ error: "gone" }, { status: 410 });
  }
}
