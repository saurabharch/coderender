import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/store";
import { sessionUser } from "@/lib/auth";

// Team conversation CRUD (identity-scoped, like the plugin contract).
export async function GET(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const t = getDb().prepare("SELECT id, title FROM ChatThread WHERE id=? AND userId=?").get(Number(id), user.id);
    if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });
    const messages = getDb().prepare("SELECT role, body FROM ChatMessage WHERE threadId=? ORDER BY id").all(Number(id));
    return NextResponse.json({ thread: t, messages });
  }
  const rows = getDb().prepare("SELECT id, title FROM ChatThread WHERE userId=? ORDER BY id DESC LIMIT 50").all(user.id);
  return NextResponse.json({ threads: rows });
}

export async function PUT(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({ id: z.number().int(), title: z.string().min(1).max(80) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad title" }, { status: 422 });
  const own = getDb().prepare("SELECT id FROM ChatThread WHERE id=? AND userId=?").get(parsed.data.id, user.id);
  if (!own) return NextResponse.json({ error: "not found" }, { status: 404 });
  getDb().prepare("UPDATE ChatThread SET title=? WHERE id=?").run(parsed.data.title, parsed.data.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const id = Number(new URL(req.url).searchParams.get("id") || 0);
  const own = getDb().prepare("SELECT id FROM ChatThread WHERE id=? AND userId=?").get(id, user.id);
  if (!own) return NextResponse.json({ error: "not found" }, { status: 404 });
  getDb().prepare("DELETE FROM ChatMessage WHERE threadId=?").run(id);
  getDb().prepare("DELETE FROM ChatThread WHERE id=?").run(id);
  return NextResponse.json({ ok: true });
}
