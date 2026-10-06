"use client";

import { useEffect, useState } from "react";

interface Ep { id: number; name: string; url: string; secret: string; events: string[]; active: number; ratePerMin: number }
interface Dl { id: number; endpointId: number; event: string; status: string; attempts: number; code: number; error: string; createdAt: string }

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "request failed");
  return data;
}

export function HooksConsole() {
  const [eps, setEps] = useState<Ep[]>([]);
  const [logs, setLogs] = useState<Dl[]>([]);
  const [epFilter, setEpFilter] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState("lead.created,ticket.created");
  const [shownSecret, setShownSecret] = useState<{ id: number; secret: string } | null>(null);
  const [emitEvent, setEmitEvent] = useState("ping");
  const [notice, setNotice] = useState("");

  async function load() {
    const d = await api("/api/hooks").catch(() => null);
    if (d?.endpoints) setEps(d.endpoints);
    const l = await api("/api/hooks?logs=1").catch(() => null);
    if (l?.deliveries) setLogs(l.deliveries);
  }

  useEffect(() => { void load(); }, []);

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <p className="font-bold">Endpoints</p>
        <div className="mt-2 grid gap-2 md:grid-cols-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={80}
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" maxLength={500}
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20 md:col-span-2" />
          <input value={events} onChange={(e) => setEvents(e.target.value)} placeholder="events, comma separated (blank = all)"
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        </div>
        <button onClick={async () => {
          try {
            const d = await api("/api/hooks", {
              method: "POST",
              body: JSON.stringify({ op: "create", name: name.trim(), url: url.trim(), events: events.split(",").map((s) => s.trim()).filter(Boolean) }),
            });
            setShownSecret({ id: d.id, secret: d.secret });
            setName("");
            setUrl("");
            void load();
          } catch (e) {
            setNotice(e instanceof Error ? e.message : "create failed");
          }
        }} className="mt-2 min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white">Add endpoint</button>
        {shownSecret && <p className="mt-1 rounded-xl bg-amber-500/10 p-2 font-mono text-xs">Endpoint #{shownSecret.id} secret (shown once): <b>{shownSecret.secret}</b></p>}
        {notice && <p className="mt-1 text-xs text-red-600">{notice}</p>}
        <ul className="mt-2 space-y-1.5 text-sm">
          {eps.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-black/10 p-2 dark:border-white/10">
              <b>{e.name}</b>
              <span className="truncate font-mono text-xs text-zinc-500">{e.url}</span>
              <span className="font-mono text-[11px] text-zinc-500">{e.secret} · {e.ratePerMin}/min · {(e.events ?? []).join(",") || "all"}</span>
              <span className="ml-auto flex gap-1">
                <button onClick={async () => {
                  const d = await api("/api/hooks", { method: "POST", body: JSON.stringify({ op: "rotate", id: e.id }) }).catch(() => null);
                  if (d?.secret) setShownSecret({ id: e.id, secret: d.secret });
                  void load();
                }} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Rotate secret</button>
                <button onClick={async () => {
                  if (!confirm(`Delete endpoint "${e.name}" + its logs?`)) return;
                  await api("/api/hooks", { method: "POST", body: JSON.stringify({ op: "delete", id: e.id }) }).catch(() => {});
                  void load();
                }} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Del</button>
              </span>
            </li>
          ))}
          {eps.length === 0 && <li className="text-sm text-zinc-500">No endpoints yet.</li>}
        </ul>
      </section>

      <section className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <p className="font-bold">Test emit</p>
        <div className="mt-2 flex flex-wrap gap-1">
          <input value={emitEvent} onChange={(e) => setEmitEvent(e.target.value)} placeholder="event name" maxLength={40}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={async () => {
            const d = await api("/api/hooks", {
              method: "POST", body: JSON.stringify({ op: "emit", event: emitEvent.trim() || "ping", payload: { hello: "world" } }),
            }).catch(() => null);
            setNotice(d ? `Fanned to ${d.fanned ?? 0} endpoint(s).` : "Emit failed");
            void load();
          }} className="min-h-[44px] shrink-0 rounded-xl bg-brand px-4 text-sm font-semibold text-white">Emit + deliver</button>
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <p className="flex flex-wrap items-center gap-2 font-bold">Delivery log
          <select value={epFilter} onChange={(e) => setEpFilter(e.target.value)}
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm font-normal dark:border-white/20">
            <option value="">All endpoints</option>
            {eps.map((e) => <option key={e.id} value={String(e.id)}>{e.name}</option>)}
          </select>
        </p>
        <ul className="mt-2 space-y-1 font-mono text-xs">
          {logs.filter((l) => !epFilter || String(l.endpointId) === epFilter).map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-black/10 p-2 dark:border-white/10">
              <b>#{l.id}</b> {l.event} ·
              <span className={l.status === "delivered" ? "text-emerald-700" : l.status === "dead" ? "text-red-600" : "text-amber-600"}>{l.status}</span>
              · try {l.attempts}{l.code ? ` · http ${l.code}` : ""} · {l.createdAt.slice(0, 16).replace("T", " ")}
              {l.error && <span className="w-full text-zinc-500">{l.error.slice(0, 140)}</span>}
              {(l.status === "retry" || l.status === "dead" || l.status === "queued") && (
                <button onClick={async () => {
                  await api("/api/hooks", { method: "POST", body: JSON.stringify({ op: "replay", id: l.id }) }).catch(() => {});
                  void load();
                }} className="ml-auto min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">Replay</button>
              )}
            </li>
          ))}
          {logs.length === 0 && <li className="text-zinc-500">No deliveries yet.</li>}
        </ul>
      </section>
    </div>
  );
}
