import { NextResponse } from "next/server";
import { schemaFor } from "@/lib/cms-schemas";
import { deleteItem, getItem, updateItem } from "@/lib/cms";
import { sessionUser } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  if (!schemaFor(type)) return NextResponse.json({ error: "unknown type" }, { status: 404 });
  const item = getItem(type, Number(id));
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  const user = await sessionUser();
  if (!item.published && !user) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ type, item });
}

export async function PUT(req: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { type, id } = await params;
  if (!schemaFor(type)) return NextResponse.json({ error: "unknown type" }, { status: 404 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "bad body" }, { status: 422 });
  try {
    await updateItem(type, Number(id), body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: msg === "not found" ? 404 : 422 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { type, id } = await params;
  if (!schemaFor(type)) return NextResponse.json({ error: "unknown type" }, { status: 404 });
  await deleteItem(type, Number(id));
  return NextResponse.json({ ok: true });
}
