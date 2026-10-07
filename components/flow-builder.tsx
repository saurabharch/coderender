"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Play, X } from "lucide-react";
import { IconBtn } from "@/components/admin-ux";

const CHANNELS = ["wa", "email", "telegram", "slack"] as const;

interface Step { channel: string; body: string }
interface Flow {
  id: number; name: string;
  trigger: { kind: string; match?: string };
  steps: Step[]; enabled: number;
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "request failed");
  return data;
}

export function FlowBuilder() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("manual");
  const [match, setMatch] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [kills, setKills] = useState<Record<string, boolean>>({});
  const [runs, setRuns] = useState<Record<number, { status: string; detail: string }[]>>({});

  async function load() {
    const d = await api("/api/flows").catch(() => null);
    if (d?.flows) setFlows(d.flows);
    const k: Record<string, boolean> = {};
    for (const c of CHANNELS) {
      const p = await api(`/api/settings/prefs?key=channel_kill_${c}`).catch(() => ({}));
      k[c] = p.value !== "off";
    }
    setKills(k);
  }

  useEffect(() => { void load(); }, []);

  async function create() {
    if (!name.trim()) return;
    await api("/api/flows", {
      method: "POST",
      body: JSON.stringify({ name: name.trim(), trigger: { kind: trigger, match: match.trim() || undefined }, steps }),
    }).catch(() => {});
    setName("");
    setMatch("");
    setSteps([]);
    void load();
  }

  async function kill(channel: string, on: boolean) {
    await fetch("/api/settings/prefs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: `channel_kill_${channel}`, value: on ? "on" : "off" }),
    }).catch(() => {});
    void load();
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <p className="font-bold">Channel kill switches</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CHANNELS.map((c) => (
            <button key={c} onClick={() => void kill(c, !kills[c])} aria-pressed={!!kills[c]}
              className={`min-h-[44px] rounded-full px-4 text-sm font-semibold ${kills[c] === false ? "bg-red-500/15 text-red-700" : "border border-black/15 dark:border-white/20"}`}>
              {kills[c] === false ? "KILLED" : "live"} · {c}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <p className="font-bold">New workflow</p>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. VIP ticket ping)" maxLength={80}
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <select value={trigger} onChange={(e) => setTrigger(e.target.value)}
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20">
            <option value="manual">manual</option><option value="ticket">on ticket filed</option><option value="lead">on lead created</option>
          </select>
          <input value={match} onChange={(e) => setMatch(e.target.value)} placeholder="match text (optional)"
            maxLength={80} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        </div>
        <div className="mt-2 space-y-1.5">
          {steps.map((s, i) => (
            <div key={i} className="flex flex-wrap items-center gap-1.5 rounded-xl bg-black/5 p-2 dark:bg-white/5">
              <select value={s.channel} onChange={(e) => setSteps((ss) => ss.map((x, j) => (j === i ? { ...x, channel: e.target.value } : x)))}
                className="min-h-[44px] rounded-lg border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
                {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={s.body} onChange={(e) => setSteps((ss) => ss.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))}
                placeholder="Message ({{1}} = contact, {{2}} = subject)" maxLength={2000}
                className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-black/15 bg-transparent px-2 text-sm dark:border-white/20" />
              <IconBtn label="Move step up" onClick={() => setSteps((ss) => { if (i === 0) return ss; const c = [...ss]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; })}><ChevronUp size={18} /></IconBtn>
              <IconBtn label="Move step down" onClick={() => setSteps((ss) => { if (i === ss.length - 1) return ss; const c = [...ss]; [c[i + 1], c[i]] = [c[i], c[i + 1]]; return c; })}><ChevronDown size={18} /></IconBtn>
              <IconBtn label="Remove step" onClick={() => setSteps((ss) => ss.filter((_, j) => j !== i))}><X size={18} /></IconBtn>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button onClick={() => setSteps((ss) => [...ss, { channel: "wa", body: "" }])}
            className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm dark:border-white/20">+ Step</button>
          <button onClick={() => void create()} disabled={!name.trim()}
            className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:opacity-50">Create flow</button>
        </div>
      </section>

      <section className="grid gap-2">
        {flows.map((f) => (
          <div key={f.id} className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <b>{f.name}</b>
              <span className="font-mono text-xs text-zinc-500">on {f.trigger.kind}{f.trigger.match ? ` ~ ${f.trigger.match}` : ""}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${f.enabled ? "bg-emerald-500/15 text-emerald-700" : "bg-zinc-500/15 text-zinc-500"}`}>
                {f.enabled ? "live" : "off"}
              </span>
              <span className="ml-auto flex gap-1">
                <button onClick={async () => {
                  const to = prompt("Test target (phone for wa, email for email):", "");
                  if (to === null) return;
                  const res = await fetch("/api/flows", {
                    method: "PATCH", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: f.id, to, email: to.includes("@") ? to : undefined, subject: "Flow test", text: "test run" }),
                  }).catch(() => null);
                  const data = await res?.json().catch(() => ({}));
                  alert(res && res.ok ? (data.ran ?? []).join("\n") : (data?.error || "Run failed"));
                }} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Run</button>
                <button onClick={async () => {
                  await api("/api/flows", { method: "PUT", body: JSON.stringify({ id: f.id, enabled: !f.enabled }) }).catch(() => {});
                  void load();
                }} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">{f.enabled ? "Disable" : "Enable"}</button>
                <button onClick={async () => {
                  const d = await api(`/api/flows?runs=${f.id}`).catch(() => null);
                  if (d?.runs) setRuns((r) => ({ ...r, [f.id]: d.runs }));
                }} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Runs</button>
                <button onClick={async () => {
                  if (!confirm(`Delete flow "${f.name}"?`)) return;
                  await fetch(`/api/flows?id=${f.id}`, { method: "DELETE" }).catch(() => {});
                  void load();
                }} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Del</button>
              </span>
            </p>
            <p className="mt-1 font-mono text-xs text-zinc-500">{f.steps.map((s) => s.channel).join(" → ") || "no steps"}</p>
            {(runs[f.id] ?? []).length > 0 && (
              <ul className="mt-1 space-y-0.5 font-mono text-[11px] text-zinc-500">
                {runs[f.id].map((r, i) => <li key={i}>{r.status} · {String(r.detail).slice(0, 160)}</li>)}
              </ul>
            )}
          </div>
        ))}
        {flows.length === 0 && <p className="text-sm text-zinc-500">No flows yet — create the first above.</p>}
      </section>
    </div>
  );
}
