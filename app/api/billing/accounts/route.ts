import { NextResponse } from "next/server";
import { z } from "zod";
import { bankMove, bankTransfer, listAccounts, saveAccount } from "@/lib/billing";
import { shopGate } from "@/lib/shop-auth";

export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  return NextResponse.json({ accounts: listAccounts() });
}

// POST {name,...} → account | {move: in|out, ...} → tx | {transfer...} → transfer.
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.move) {
      const parsed = z.object({
        move: z.enum(["in", "out"]), accountId: z.number().int(),
        amount: z.number().min(1).max(1000000000), ref: z.string().max(120).optional(), notes: z.string().max(300).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad tx" }, { status: 422 });
      const id = bankMove(parsed.data.accountId, parsed.data.move, parsed.data.amount, parsed.data.ref ?? "", parsed.data.notes ?? "");
      return NextResponse.json({ ok: true, id, accounts: listAccounts() });
    }
    if (body?.transfer) {
      const parsed = z.object({
        transfer: z.literal(true), fromId: z.number().int(), toId: z.number().int(),
        amount: z.number().min(1).max(1000000000), notes: z.string().max(300).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad transfer" }, { status: 422 });
      bankTransfer(parsed.data.fromId, parsed.data.toId, parsed.data.amount, parsed.data.notes ?? "");
      return NextResponse.json({ ok: true, accounts: listAccounts() });
    }
    const parsed = z.object({
      id: z.number().int().optional(), name: z.string().min(1).max(80),
      kind: z.enum(["cash", "bank", "upi", "wallet"]).optional(),
      opening: z.number().min(0).max(1000000000).optional(), active: z.boolean().optional(),
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "bad account" }, { status: 422 });
    return NextResponse.json({ ok: true, id: saveAccount(parsed.data) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "banking failed" }, { status: 422 });
  }
}
