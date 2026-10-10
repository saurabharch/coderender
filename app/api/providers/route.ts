import { NextResponse } from "next/server";
import { z } from "zod";
import { PROVIDER_FIELDS, clearProvider, providerStatus, saveProvider, type ProviderName } from "@/lib/providers";
import { isAdminEmail, sessionUser } from "@/lib/auth";

// Key managers: owner role or allowlisted superadmin email. Everyone else
// gets 403 — gateway secrets are never team-editable.
function canManageKeys(user: { email: string; role: string }): boolean {
  return user.role === "owner" || isAdminEmail(user.email);
}

export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const st = providerStatus();
  const masked: Record<string, { fields: { label: string; hint: string; set: boolean }[]; source: string }> = {};
  for (const name of Object.keys(PROVIDER_FIELDS) as ProviderName[]) {
    masked[name] = {
      fields: PROVIDER_FIELDS[name].map((f) => ({ ...f, set: st[name].set.includes(f.label) })),
      source: st[name].source,
    };
  }
  return NextResponse.json({ providers: masked });
}

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  if (!canManageKeys(user)) return NextResponse.json({ error: "owner only" }, { status: 403 });
  const parsed = z.object({ name: z.string(), values: z.record(z.string(), z.string()) })
    .safeParse(await req.json().catch(() => null));
  const name = parsed.success ? parsed.data.name as ProviderName : null;
  if (!parsed.success || !name || !PROVIDER_FIELDS[name]) return NextResponse.json({ error: "bad provider" }, { status: 422 });
  saveProvider(name, parsed.data.values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  if (!canManageKeys(user)) return NextResponse.json({ error: "owner only" }, { status: 403 });
  const name = new URL(req.url).searchParams.get("name") as ProviderName | null;
  if (!name || !PROVIDER_FIELDS[name]) return NextResponse.json({ error: "bad provider" }, { status: 422 });
  clearProvider(name);
  return NextResponse.json({ ok: true });
}
