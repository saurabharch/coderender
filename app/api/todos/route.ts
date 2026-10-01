import { NextResponse } from "next/server";
import { z } from "zod";
import { createTodo, listTodos } from "@/lib/todos";
import { sessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const status = new URL(req.url).searchParams.get("status") || undefined;
  return NextResponse.json({ todos: listTodos(status) });
}

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({
    title: z.string().min(1).max(120),
    body: z.string().max(2000).optional(),
    assigneeEmail: z.string().max(120).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad todo" }, { status: 422 });
  const id = createTodo(parsed.data);
  return NextResponse.json({ ok: true, id });
}
