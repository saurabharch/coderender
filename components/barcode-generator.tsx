"use client";

import { useState } from "react";
import { EanBars } from "@/components/labels";

// Generator: pick a type, enter/generate a value, see live validation +
// preview, then print. Never mislabels internal codes as GS1 retail.
export function BarcodeGenerator({ productId }: { productId: number }) {
  const [code, setCode] = useState("");
  const [info, setInfo] = useState<{ valid: boolean; type: string; errors: { message: string }[] } | null>(null);
  const [msg, setMsg] = useState("");

  async function check(v: string) {
    setCode(v);
    if (!v.trim()) { setInfo(null); return; }
    const d = await fetch("/api/shop/barcode", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "validate", code: v }),
    }).then((r) => r.json()).catch(() => null);
    if (d) setInfo(d);
  }

  async function mint() {
    const d = await fetch("/api/shop/barcode", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "generate" }),
    }).then((r) => r.json()).catch(() => null);
    if (d?.code) void check(d.code);
    else setMsg("generate failed");
  }

  async function assign() {
    if (!info?.valid) return;
    const res = await fetch("/api/shop/barcode", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "assign", code: info && code, productId, primary: true }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Assigned ${d.type} ✓` : (d.error ?? d.code ?? "failed"));
  }

  return (
    <div className="rounded-xl border border-black/10 p-3 dark:border-white/10">
      <p className="text-sm font-bold">Generator <span className="font-normal text-zinc-500">(internal codes are labeled INTERNAL, never GS1)</span></p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <input value={code} onChange={(e) => void check(e.target.value)} placeholder="Type or scan a code…" maxLength={100}
          className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 font-mono text-sm dark:border-white/20" />
        <button onClick={() => void mint()} className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Generate internal</button>
        <button onClick={() => void assign()} disabled={!info?.valid}
          className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Assign</button>
      </div>
      {info && (
        <p className={`mt-1 text-sm font-semibold ${info.valid ? "text-emerald-700" : "text-red-600"}`}>
          {info.valid ? `✓ Valid ${info.type}` : `✗ ${info.errors[0]?.message ?? "invalid"}`}
        </p>
      )}
      {info?.valid && /^\d{13}$/.test(code.replace(/\D/g, "")) && (
        <div className="mt-2 flex justify-center rounded-xl bg-white p-2"><EanBars code={code} height={52} /></div>
      )}
      {msg && <p className="mt-1 text-sm text-zinc-500">{msg}</p>}
    </div>
  );
}
