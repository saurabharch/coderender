import { NextResponse } from "next/server";
import { z } from "zod";
import { assignJob, bookJob, getJob, invoiceJob, listJobs, setJobStatus } from "@/lib/serviceops";
import { shopGate } from "@/lib/shop-auth";

// GET ?id= | ?status=&branch=
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id") || 0);
  if (id) {
    const j = getJob(id);
    return j ? NextResponse.json({ job: j }) : NextResponse.json({ error: "no job" }, { status: 404 });
  }
  return NextResponse.json({ jobs: listJobs(url.searchParams.get("status") || "", Number(url.searchParams.get("branch") || 0)) });
}

// POST {customerId?, branchId?, service, staff?, slot?, notes?} → booked.
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({
    customerId: z.number().int().optional(), branchId: z.number().int().min(1).optional(),
    service: z.string().min(1).max(150), staff: z.string().max(120).optional(),
    slot: z.string().max(40).optional(), notes: z.string().max(1000).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad job" }, { status: 422 });
  try {
    const id = bookJob(parsed.data);
    return NextResponse.json({ ok: true, id, job: getJob(id) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "book failed" }, { status: 422 });
  }
}

// PUT {id, to} → status | {id, assign, slot?} → assign | {id, bill, lines} → invoice.
export async function PUT(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.assign) {
      const parsed = z.object({ id: z.number().int(), assign: z.string().min(1).max(120), slot: z.string().max(40).optional() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad assign" }, { status: 422 });
      assignJob(parsed.data.id, parsed.data.assign, parsed.data.slot ?? "");
      return NextResponse.json({ ok: true, job: getJob(parsed.data.id) });
    }
    if (body?.bill) {
      const parsed = z.object({
        id: z.number().int(), bill: z.literal(true),
        lines: z.array(z.object({ label: z.string().min(1).max(150), qty: z.number().min(0.001).max(100000), price: z.number().min(0).max(100000000) })).min(1).max(20),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad invoice" }, { status: 422 });
      const r = await invoiceJob(parsed.data.id, parsed.data.lines);
      return NextResponse.json({ ok: true, ...r, job: getJob(parsed.data.id) });
    }
    const parsed = z.object({
      id: z.number().int(),
      to: z.enum(["assigned", "in-progress", "done", "cancelled"]),
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "bad transition" }, { status: 422 });
    setJobStatus(parsed.data.id, parsed.data.to);
    return NextResponse.json({ ok: true, job: getJob(parsed.data.id) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
