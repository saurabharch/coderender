import { NextResponse } from "next/server";
import { z } from "zod";
import { requireScope, verifyApiKey } from "@/lib/api-auth";
import { AGENT_OPS, agentScopeFor } from "@/lib/agent-ops";

// Secure agent layer: ApiKey-authenticated allowlisted ops. With Inngest
// Cloud keys the call runs durably there; on-device it executes inline.
// Every op is PII-redacted + audited either way.
export async function POST(req: Request) {
  const ident = verifyApiKey(req.headers.get("authorization") ?? req.headers.get("x-api-key"));
  if (!ident) return NextResponse.json({ error: "bad key" }, { status: 401 });
  const parsed = z.object({ op: z.string().min(1).max(40), params: z.record(z.string(), z.unknown()).optional() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad call" }, { status: 422 });
  const need = agentScopeFor(parsed.data.op);
  if (!need) return NextResponse.json({ error: "unknown op", ops: Object.keys(AGENT_OPS) }, { status: 404 });
  if (!requireScope(ident, need)) return NextResponse.json({ error: "scope denied", need }, { status: 403 });

  const payload = { op: parsed.data.op, params: parsed.data.params ?? {}, keyName: ident.name };
  if (process.env.INNGEST_EVENT_KEY) {
    try {
      const { inngest } = await import("@/lib/jobs");
      await inngest.send({ name: "app/agent.call", data: payload });
      return NextResponse.json({ ok: true, queued: true });
    } catch { /* fall through to local */ }
  }
  try {
    const { runLocal } = await import("@/lib/jobs");
    const result = await runLocal("agentCall", payload);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}

export async function GET() {
  return NextResponse.json({ ops: AGENT_OPS });
}
