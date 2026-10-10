import { NextResponse } from "next/server";
import { z } from "zod";
import { checkText } from "@/lib/proofread-core";
import { requireTeam } from "@/lib/auth";

// POST {text, lang?} → local checks always; LanguageTool merges in only
// when the vault holds an LT_URL (public tier needs no key). No network
// without configuration — the hook stays dormant.
export async function POST(req: Request) {
  try {
    await requireTeam();
  } catch {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }
  const parsed = z.object({ text: z.string().min(1).max(20000), lang: z.string().max(12).optional() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "text required" }, { status: 422 });
  const local = checkText(parsed.data.text);
  let remote: { message: string; sample: string }[] = [];
  let via: string | null = null;
  try {
    const { getProvider } = await import("@/lib/providers");
    const cfg = getProvider("languagetool") as Record<string, string>;
    const base = (cfg.LT_URL || "").replace(/\/$/, "");
    if (base) {
      const form = new URLSearchParams({
        text: parsed.data.text.slice(0, 5000),
        language: (parsed.data.lang || "en-US").slice(0, 12),
      });
      if (cfg.LT_KEY) {
        form.set("apiKey", cfg.LT_KEY);
        form.set("username", cfg.LT_USERNAME || "");
      }
      const r = await fetch(`${base}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
        signal: AbortSignal.timeout(20000),
      });
      if (r.ok) {
        const d = await r.json().catch(() => null);
        const matches = Array.isArray(d?.matches) ? d.matches.slice(0, 20) : [];
        remote = matches.map((m: { message?: string; context?: { text?: string } }) => ({
          message: String(m?.message ?? "grammar").slice(0, 160),
          sample: String(m?.context?.text ?? "").slice(0, 80),
        }));
        via = "languagetool";
      }
    }
  } catch { /* dormant without keys/network */ }
  return NextResponse.json({ ok: true, local, remote, via });
}
