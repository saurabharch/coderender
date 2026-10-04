"use client";

import { useEffect, useState } from "react";

interface Field { label: string; hint: string; set: boolean }
type Status = Record<string, { fields: Field[]; source: string }>;

export function ProviderTabs() {
  const [st, setSt] = useState<Status>({});
  const [vals, setVals] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<Record<string, string>>({});

  async function load() {
    const d = await fetch("/api/providers").then((r) => r.json()).catch(() => null);
    if (d?.providers) setSt(d.providers);
  }

  useEffect(() => { void load(); }, []);

  async function save(name: string) {
    const body: Record<string, string> = {};
    for (const f of st[name]?.fields ?? []) {
      const v = vals[`${name}:${f.label}`];
      if (v !== undefined) body[f.label] = v;
    }
    const res = await fetch("/api/providers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, values: body }),
    });
    setMsg((m) => ({ ...m, [name]: res.ok ? "Saved ✓ (AES-sealed)" : "Save failed" }));
    setVals((v) => {
      const n = { ...v };
      for (const f of st[name]?.fields ?? []) delete n[`${name}:${f.label}`];
      return n;
    });
    void load();
  }

  async function clear(name: string) {
    if (!confirm(`Clear dashboard ${name} credentials? (env still applies)`)) return;
    await fetch(`/api/providers?name=${name}`, { method: "DELETE" }).catch(() => {});
    void load();
  }

  async function test(name: string) {
    setMsg((m) => ({ ...m, [name]: "Testing…" }));
    const res = await fetch("/api/providers/test", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    setMsg((m) => ({ ...m, [name]: `${res.ok && data.ok !== false ? "✓" : "✗"} ${data.detail ?? data.error ?? ""}`.slice(0, 160) }));
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Object.entries(st).map(([name, p]) => (
        <div key={name} className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="flex items-center gap-2 font-bold capitalize">{name}
            <span className={`rounded-full px-2 py-0.5 text-[11px] ${p.source === "dashboard" ? "bg-brand/15 text-brand-deep" : p.source === "env" ? "bg-sky-500/15 text-sky-700" : "bg-zinc-500/15 text-zinc-500"}`}>
              {p.source}
            </span>
          </p>
          <div className="mt-2 grid gap-1.5">
            {p.fields.map((f) => (
              <label key={f.label} className="grid gap-0.5 text-sm">{f.label}
                <span className="flex gap-1">
                  <input type="password" autoComplete="off" placeholder={f.set ? "•••••• (set — leave blank to keep)" : f.hint}
                    value={vals[`${name}:${f.label}`] ?? ""}
                    onChange={(e) => setVals((v) => ({ ...v, [`${name}:${f.label}`]: e.target.value }))}
                    className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
                </span>
              </label>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button onClick={() => void save(name)} className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white">Save</button>
            <button onClick={() => void test(name)} className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm dark:border-white/20">Test</button>
            <button onClick={() => void clear(name)} className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm dark:border-white/20">Clear</button>
          </div>
          {msg[name] && <p className="mt-1 text-xs text-zinc-500">{msg[name]}</p>}
        </div>
      ))}
    </div>
  );
}
