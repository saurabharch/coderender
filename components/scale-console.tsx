"use client";

import { IconBtn } from "@/components/admin-ux";

import { Plus } from "lucide-react"
import { useEffect, useState } from "react";
import { AdminCard, Empty, Skeleton } from "@/components/admin-ui";

interface Audit { id: number; actor: string; action: string; ref: string; detail: string; at: string }
interface Matrix { role: string; perms: string[] }
interface Preview { total: number; valid: number; invalid: number; duplicates: number; problems: { row: number; field: string; value: string; code: string; message: string }[] }
interface Batch { id: number; what: string; total: number; ok: number; actor: string; rolledBack: number; refs: number; at: string }

export function ScaleConsole() {
  const [audit, setAudit] = useState<Audit[]>([]);
  const [matrix, setMatrix] = useState<Matrix[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewWhat, setPreviewWhat] = useState("");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [fname, setFname] = useState("");
  const [chname, setChname] = useState("");

  async function load() {
    const [a, m, b] = await Promise.all([
      fetch("/api/scale/ops").then((r) => r.json()).catch(() => null),
      fetch("/api/scale/ops?view=roles").then((r) => r.json()).catch(() => null),
      fetch("/api/scale/ops?view=batches").then((r) => r.json()).catch(() => null),
    ]);
    if (a?.audit) setAudit(a.audit);
    if (m?.matrix) setMatrix(m.matrix);
    if (b?.batches) setBatches(b.batches);
    setLoaded(true);
  }

  useEffect(() => { void load(); }, []);

  async function runPreview(what: string) {
    setPreview(null);
    const res = await fetch("/api/scale/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preview: true, import: what, csv }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(d.error ?? "preview failed"); return; }
    setPreview(d);
    setPreviewWhat(what);
    setMsg(`${what}: ${d.valid}/${d.total} valid, ${d.invalid} invalid, ${d.duplicates} duplicates`);
  }

  async function runImport(what: string) {
    const res = await fetch("/api/scale/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ import: what, csv }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `${what}: ${d.imported} imported (batch #${d.batchId}), ${d.errors.length} errors${d.errors[0] ? ` — ${d.errors[0]}` : ""}` : (d.error ?? "failed"));
    if (res.ok) { setCsv(""); setPreview(null); void load(); }
  }

  async function runRollback(id: number) {
    if (!confirm(`Undo import batch #${id}? Rows already in trade are kept and reported.`)) return;
    const res = await fetch("/api/scale/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rollback: id }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Batch #${id}: ${d.removed} removed, ${d.skipped} kept (in trade)` : (d.error ?? "failed"));
    if (res.ok) void load();
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
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <IconBtn label="Add" onClick={() => void addFranchise()} disabled={!fname.trim()} tone="brand"><Plus size={20} /></IconBtn>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <input value={chname} onChange={(e) => setChname(e.target.value)} placeholder="Channel (Amazon, Instagram…)" maxLength={80}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <IconBtn label="Add channel" onClick={() => void addChannel()} disabled={!chname.trim()}><Plus size={20} /></IconBtn>
        </div>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Import CSV <span className="text-xs font-normal text-zinc-500">(products need name,price · customers need name · 500 rows max · preview first, rollback any batch)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button onClick={() => void runPreview("products")} disabled={!csv.trim()} className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Preview products</button>
          <button onClick={() => void runPreview("customers")} disabled={!csv.trim()} className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Preview customers</button>
          <button onClick={() => void runImport(previewWhat || "products")} disabled={!csv.trim() || !preview} className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Confirm import{preview ? ` (${preview.valid} valid)` : ""}</button>
          <a href="/api/scale/ops?export=products" className="flex min-h-[44px] items-center rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Export products</a>
          <a href="/api/scale/ops?export=customers" className="flex min-h-[44px] items-center rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Export customers</a>
        </div>
        <textarea value={csv} onChange={(e) => { setCsv(e.target.value); setPreview(null); }} placeholder="name,price,stock&#10;Widget,19900,10" rows={4} maxLength={500000}
          className="mt-1.5 w-full rounded-xl border border-black/15 bg-transparent px-3 py-2 font-mono text-xs dark:border-white/20" />
        {preview && (
          <div className="mt-1.5 rounded-xl border border-black/10 p-2 text-sm dark:border-white/10">
            <p className="font-bold">{previewWhat}: {preview.valid}/{preview.total} valid · {preview.invalid} invalid · {preview.duplicates} duplicates</p>
            {preview.problems.length > 0 && (
              <ul className="mt-1 space-y-0.5 font-mono text-xs text-red-700 dark:text-red-300">
                {preview.problems.slice(0, 10).map((p, i) => (
                  <li key={i}>row {p.row} · {p.field} “{p.value}” — {p.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {batches.length > 0 && (
          <div className="mt-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Recent batches</p>
            <ul className="mt-1 space-y-1 text-sm">
              {batches.slice(0, 5).map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                  <span>#{b.id} {b.what} · {b.ok}/{b.total} ok{b.rolledBack ? " · rolled back" : ""}</span>
                  {!b.rolledBack && (
                    <button onClick={() => void runRollback(b.id)}
                      className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Undo batch</button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
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
