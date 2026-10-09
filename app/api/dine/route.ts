import { NextResponse } from "next/server";
import { z } from "zod";
import { fireKot, getTicket, listTables, listTickets, moveKot, saveTable } from "@/lib/serviceops";
import { sessionUser } from "@/lib/auth";
import { shopGate } from "@/lib/shop-auth";

const line = z.object({ productId: z.number().int(), qty: z.number().min(0.001).max(100), note: z.string().max(120).optional() });

// GET ?tables=1 | ?tickets=&status= | ?ticket=<id>
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  if (url.searchParams.get("tables") !== null) return NextResponse.json({ tables: listTables() });
  const tid = Number(url.searchParams.get("ticket") || 0);
  if (tid) {
    const t = getTicket(tid);
    return t ? NextResponse.json({ ticket: t }) : NextResponse.json({ error: "no ticket" }, { status: 404 });
  }
  return NextResponse.json({ tickets: listTickets(url.searchParams.get("status") || "") });
}

// POST {op: table|fire|move, ...}
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.op === "table") {
      const parsed = z.object({ op: z.literal("table"), name: z.string().min(1).max(40), seats: z.number().min(1).max(50).optional(), captain: z.string().max(120).optional() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad table" }, { status: 422 });
      return NextResponse.json({ ok: true, id: saveTable(parsed.data) });
    }
    if (body?.op === "fire") {
      const parsed = z.object({
        op: z.literal("fire"), tableId: z.number().int(),
        lines: z.array(line).min(1).max(30),
        captain: z.string().max(120).optional(), server: z.string().max(120).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad ticket" }, { status: 422 });
      const me = await sessionUser();
      const id = fireKot({ ...parsed.data, firedBy: me?.email ?? "" });
      return NextResponse.json({ ok: true, id, ticket: getTicket(id) });
    }
    if (body?.op === "move") {
      const parsed = z.object({ op: z.literal("move"), id: z.number().int(), to: z.string().max(20) }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad move" }, { status: 422 });
      moveKot(parsed.data.id, parsed.data.to);
      return NextResponse.json({ ok: true, ticket: getTicket(parsed.data.id) });
    }
    return NextResponse.json({ error: "unknown op" }, { status: 422 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "dine failed" }, { status: 422 });
  }
}
