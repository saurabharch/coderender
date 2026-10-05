"use client";

import { useEffect, useState } from "react";
import { AdminCard, Empty, Skeleton } from "@/components/admin-ui";

interface Audit { id: number; actor: string; action: string; ref: string; detail: string; at: string }
interface Matrix { role: string; perms: string[] }

export function ScaleConsole() {
  const [audit, setAudit] = useState<Audit[]>([]);
  const [matrix, setMatrix] = useState<Matrix[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [csv, setCsv] = useState("");
  const [fname, setFname] = useState("");
  const [chname, setChname] = useState("");

  async function load() {
    const [a, m] = await Promise.all([
      fetch("/api/scale/ops").then((r) => r.json()).catch(() => null),
      fetch("/api/scale/ops?view=roles").then((r) => r.json()).catch(() => null),
    ]);
    if (a?.audit) setAudit(a.audit);
    if (m?.matrix) setMatrix(m.matrix);
    setLoaded(true);
  }

  useEffect(() => { void load(); }, []);

  async function runImport(what: string) {    const res = await fetch("/api/scale/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ import: what, csv }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `${what}: ${d.imported} imported, ${d.errors.length} errors${d.errors[0] ? ` — ${d.errors[0]}` : ""}` : (d.error ?? "failed"));
    if (res.ok) setCsv("");
  }

  async function addFranchise() {
    const res = await fetch("/api/scale/franchise", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fname }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Franchisee added ✓" : (d.error ?? "failed (owners/managers only)"));
    if (res.ok) { setFname(""); void load(); }
  }

  async function addChannel() {
    const res = await fetch("/api/scale/channels", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: chname }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Channel added ✓" : (d.error ?? "failed (owners/managers only)"));
    if (res.ok) { setChname(""); }
  }

  if (!loaded) return <Skeleton lines={5} />;
  return (
    <div className="grid gap-3">
      <AdminCard>
        <p className="font-bold">Roles & permissions</p>
        <ul className="mt-2 space-y-1 text-sm">
          {matrix.map((m) => (
            <li key={m.role} className="flex flex-wrap gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
              <b className="w-24 shrink-0 capitalize">{m.role}</b>
              <span className="text-zinc-500">{m.perms.length ? m.perms.join(" · ") : "no access"}</span>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-zinc-500">Enforced on franchise, royalty, channel, import and role-change writes. Change a member&apos;s role in Settings → Team.</p>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Franchise & channels</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={fname} onChange={(e) => setFname(e.target.value)} placeholder="Franchisee name" maxLength={120}
            className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void addFranchise()} disabled={!fname.trim()}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Add</button>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <input value={chname} onChange={(e) => setChname(e.target.value)} placeholder="Channel (Amazon, Instagram…)" maxLength={80}
            className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void addChannel()} disabled={!chname.trim()}
            className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Add channel</button>
        </div>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Import CSV <span className="text-xs font-normal text-zinc-500">(products need name,price · customers need name · 500 rows max)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button onClick={() => void runImport("products")} disabled={!csv.trim()} className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Import products</button>
          <button onClick={() => void runImport("customers")} disabled={!csv.trim()} className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Import customers</button>
          <a href="/api/scale/ops?export=products" className="flex min-h-[44px] items-center rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Export products</a>
          <a href="/api/scale/ops?export=customers" className="flex min-h-[44px] items-center rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Export customers</a>
        </div>
        <textarea value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="name,price,stock&#10;Widget,19900,10" rows={4} maxLength={500000}
          className="mt-1.5 w-full rounded-xl border border-black/15 bg-transparent px-3 py-2 font-mono text-xs dark:border-white/20" />
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Audit log ({audit.length})</p>
        {audit.length === 0 ? <div className="mt-2"><Empty>No audited actions yet.</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {audit.slice(0, 20).map((a) => (
              <li key={a.id} className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <b>{a.action}</b> <span className="text-zinc-500">by {a.actor || "?"} · {a.at.slice(0, 16)}</span>
                {(a.ref || a.detail) && <p className="text-zinc-600 dark:text-zinc-300">{a.ref} {a.detail}</p>}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      {msg && <p className="break-words text-sm text-zinc-500">{msg}</p>}
    </div>
  );
}
