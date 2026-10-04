import { NextResponse } from "next/server";
import { getDb } from "@/lib/store";
import { sessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") || "";
  const audience = url.searchParams.get("audience") || "";
  const q = (url.searchParams.get("q") || "").slice(0, 120);
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
  const conds: string[] = [];
  const args: (string | number)[] = [];
  if (kind) { conds.push("kind=?"); args.push(kind); }
  if (audience) { conds.push("audience=?"); args.push(audience); }
  if (q) { conds.push("(title LIKE ? OR body LIKE ?)"); args.push(`%${q}%`, `%${q}%`); }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const items = getDb().prepare(`SELECT * FROM Notification ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...args, limit, offset);
  const total = (getDb().prepare(`SELECT COUNT(*) c FROM Notification ${where}`).get(...args) as { c: number }).c;
  const byKind = getDb().prepare(
    `SELECT kind, COUNT(*) n FROM Notification WHERE createdAt >= date('now','-30 days') GROUP BY kind ORDER BY n DESC`).all();
  const byAudience = getDb().prepare(
    `SELECT audience, COUNT(*) n FROM Notification WHERE createdAt >= date('now','-30 days') GROUP BY audience ORDER BY n DESC`).all();
  return NextResponse.json({ items, total, limit, offset, analytics: { byKind, byAudience } });
}
