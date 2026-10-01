import { NextResponse } from "next/server";
import { schemaFor } from "@/lib/cms-schemas";
import { createItem, listItems } from "@/lib/cms";
import { sessionUser } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!schemaFor(type)) return NextResponse.json({ error: "unknown type" }, { status: 404 });
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
  const user = await sessionUser();
  const publishedOnly = !(url.searchParams.get("all") === "1" && user);
  return NextResponse.json({ type, items: listItems(type, limit, { publishedOnly }) });
}

export async function POST(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { type } = await params;
  if (!schemaFor(type)) return NextResponse.json({ error: "unknown type" }, { status: 404 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "bad body" }, { status: 422 });
  try {
    const id = await createItem(type, body);
    return NextResponse.json({ ok: true, id });
  } catch {
    return NextResponse.json({ error: "validation failed" }, { status: 422 });
  }
}
