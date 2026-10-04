import { NextResponse } from "next/server";
import { z } from "zod";
import { createFlow, deleteFlow, flowRuns, listFlows, runFlow, updateFlow } from "@/lib/flows";
import { sessionUser } from "@/lib/auth";

const stepSchema = z.object({
  channel: z.enum(["wa", "email", "telegram", "slack"]),
  template: z.string().max(80).optional(),
  body: z.string().max(2000).optional(),
});

export async function GET(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const runsFor = new URL(req.url).searchParams.get("runs");
  if (runsFor) return NextResponse.json({ runs: flowRuns(Number(runsFor)) });
  return NextResponse.json({ flows: listFlows() });
}

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({
    name: z.string().min(1).max(80),
    trigger: z.object({ kind: z.enum(["manual", "ticket", "lead"]), match: z.string().max(80).optional() }).optional(),
    steps: z.array(stepSchema).max(10).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad flow" }, { status: 422 });
  return NextResponse.json({ ok: true, id: createFlow(parsed.data) });
}

export async function PUT(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({
    id: z.number().int(), name: z.string().min(1).max(80).optional(),
    trigger: z.object({ kind: z.enum(["manual", "ticket", "lead"]), match: z.string().max(80).optional() }).optional(),
    steps: z.array(stepSchema).max(10).optional(), enabled: z.boolean().optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad flow" }, { status: 422 });
  try {
    updateFlow(parsed.data.id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}

export async function DELETE(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  deleteFlow(Number(new URL(req.url).searchParams.get("id") || 0));
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({
    id: z.number().int(), to: z.string().max(40).optional(), email: z.string().max(120).optional(),
    subject: z.string().max(160).optional(), text: z.string().max(2000).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad run" }, { status: 422 });
  try {
    const ran = await runFlow(parsed.data.id, parsed.data);
    return NextResponse.json({ ok: true, ran: ran.ran });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
