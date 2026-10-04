import { NextResponse } from "next/server";
import { z } from "zod";
import { createEndpoint, deleteEndpoint, deliveryLog, emitHook, listEndpoints, replayDelivery, rotateSecret, runHookTick } from "@/lib/hooks";
import { sessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const url = new URL(req.url);
  const logs = url.searchParams.get("logs");
  if (logs !== null) {
    const ep = Number(url.searchParams.get("endpoint") || 0) || undefined;
    return NextResponse.json({ deliveries: deliveryLog(ep) });
  }
  return NextResponse.json({ endpoints: listEndpoints().map((e) => ({ ...e, secret: `${e.secret.slice(0, 9)}…` })) });
}

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({
    op: z.enum(["create", "rotate", "delete", "emit", "replay", "tick"]),
    id: z.number().int().optional(),
    name: z.string().max(80).optional(), url: z.string().max(500).optional(),
    events: z.array(z.string().max(40)).max(20).optional(),
    event: z.string().max(40).optional(), payload: z.record(z.string(), z.unknown()).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad hook op" }, { status: 422 });
  const d = parsed.data;
  try {
    if (d.op === "create") {
      const r = createEndpoint({ name: d.name ?? "", url: d.url ?? "", events: d.events });
      return NextResponse.json({ ok: true, ...r });
    }
    if (d.op === "rotate") return NextResponse.json({ ok: true, secret: rotateSecret(Number(d.id)) });
    if (d.op === "delete") {
      deleteEndpoint(Number(d.id));
      return NextResponse.json({ ok: true });
    }
    if (d.op === "emit") {
      const n = emitHook(d.event ?? "ping", d.payload ?? {});
      await runHookTick(10);
      return NextResponse.json({ ok: true, fanned: n });
    }
    if (d.op === "replay") {
      replayDelivery(Number(d.id));
      await runHookTick(10);
      return NextResponse.json({ ok: true });
    }
    const n = await runHookTick(25);
    return NextResponse.json({ ok: true, ran: n });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
