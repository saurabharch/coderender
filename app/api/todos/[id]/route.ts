import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteTodo, getTodo, updateTodo } from "@/lib/todos";
import { sessionUser } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id } = await params;
  const todo = getTodo(Number(id));
  if (!todo) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ todo });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id } = await params;
  const parsed = z.object({
    title: z.string().min(1).max(120).optional(),
    body: z.string().max(2000).optional(),
    status: z.enum(["open", "done"]).optional(),
    assigneeEmail: z.string().max(120).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad todo" }, { status: 422 });
  try {
    updateTodo(Number(id), parsed.data);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id } = await params;
  deleteTodo(Number(id));
  return NextResponse.json({ ok: true });
}
